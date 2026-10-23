import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { createDb, kworkOffers, type NewKworkOffer } from "@repo/db";
import {
  KworkClient,
  KworkOfferLimitError,
  KworkProjectNotOfferableError,
} from "@repo/kwork-client";
import type { KworkProject, ProjectAnalysis } from "@repo/types";
import { DEFAULT_PROFILE } from "@repo/types";
import { eq } from "drizzle-orm";
import { hatchet } from "../hatchet-client";

const DEFAULT_MIN_PROJECT_PRICE = 10_000;
const SEND_GAP_MIN_MS = 20_000;
const SEND_GAP_MAX_MS = 60_000;
const RUN_BUDGET_MS = 17 * 60_000;

type Db = ReturnType<typeof createDb>;
type OfferFields = Omit<
  NewKworkOffer,
  "id" | "projectId" | "projectTitle" | "projectPrice" | "createdAt"
>;

function parseIntEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isNaN(value) ? undefined : value;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function saveOffer(
  db: Db,
  project: KworkProject,
  fields: OfferFields,
): Promise<void> {
  const values = {
    projectTitle: project.title,
    projectPrice: project.price,
    matchReason: null,
    suggestedPrice: null,
    proposalText: null,
    sent: false,
    sentAt: null,
    error: null,
    ...fields,
  };
  try {
    await db
      .insert(kworkOffers)
      .values({ projectId: project.id, ...values })
      .onConflictDoUpdate({ target: kworkOffers.projectId, set: values });
  } catch (err) {
    console.error(`Ошибка записи в БД для проекта #${project.id}: ${err}`);
  }
}

export const kworkAutoRespondWorkflow = hatchet.workflow({
  name: "kwork-auto-respond",
});

kworkAutoRespondWorkflow.task({
  name: "run",
  retries: 3,
  backoff: {
    maxSeconds: 10,
    factor: 2,
  },
  executionTimeout: "20m",
  fn: async () => {
    const startedAt = Date.now();
    const kworkLogin = process.env.KWORK_LOGIN;
    const kworkPassword = process.env.KWORK_PASSWORD;
    const postgresUrl = process.env.POSTGRES_URL;

    if (!kworkLogin || !kworkPassword) {
      throw new Error("KWORK_LOGIN и KWORK_PASSWORD должны быть заданы");
    }
    if (!postgresUrl) {
      throw new Error("POSTGRES_URL должен быть задан");
    }

    const minPrice =
      parseIntEnv("MIN_PROJECT_PRICE") ?? DEFAULT_MIN_PROJECT_PRICE;
    const maxOffers = parseIntEnv("MAX_OFFERS_PER_RUN");

    console.log("Запуск авто-отклика Kwork", {
      scheduledAt: new Date().toISOString(),
      minPrice,
      maxOffers,
    });

    const db = createDb(postgresUrl);
    const client = await KworkClient.signIn(kworkLogin, kworkPassword);
    const { projects, connects } = await client.getProjectsFeed({
      priceFrom: minPrice,
    });

    const candidates = projects
      .filter((p) => !p.has_offer && p.price >= minPrice)
      .sort((a, b) => a.offers - b.offers);

    const limits = [maxOffers, connects?.active_connects].filter(
      (v): v is number => typeof v === "number",
    );
    const sendLimit = limits.length > 0 ? Math.min(...limits) : Infinity;

    console.log(
      `Проектов от ${minPrice} руб. без отклика: ${candidates.length}, коннектов: ${connects?.active_connects ?? "н/д"}, лимит отправки: ${sendLimit}`,
    );

    let analyzed = 0;
    let matched = 0;
    let sent = 0;
    let skipped = 0;
    let failed = 0;

    if (sendLimit <= 0) {
      console.warn("Нет доступных коннектов или лимит отправки равен 0");
      return { analyzed, matched, sent, skipped, failed };
    }

    let lastSentAt: number | undefined;

    for (const project of candidates) {
      if (sent >= sendLimit) {
        console.log(`Достигнут лимит отправки (${sendLimit}), завершаем`);
        break;
      }
      if (Date.now() - startedAt > RUN_BUDGET_MS) {
        console.warn("Время запуска на исходе, остальное — в следующий раз");
        break;
      }

      const [record] = await db
        .select({
          isMatch: kworkOffers.isMatch,
          sent: kworkOffers.sent,
          error: kworkOffers.error,
        })
        .from(kworkOffers)
        .where(eq(kworkOffers.projectId, project.id))
        .limit(1);

      if (record) {
        if (record.sent || (!record.isMatch && !record.error)) {
          skipped++;
          continue;
        }
        console.log(
          `Повторная попытка по проекту #${project.id}: isMatch=${record.isMatch}, error=${record.error}`,
        );
      }

      console.log(
        `Анализирую проект #${project.id} (${project.price} руб., откликов: ${project.offers}): ${project.title}`,
      );

      let analysis: ProjectAnalysis;
      try {
        analysis = await analyzeAndGenerateOffer(DEFAULT_PROFILE, project);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        console.error(`Ошибка анализа проекта #${project.id}: ${errorMessage}`);
        failed++;
        await saveOffer(db, project, { isMatch: false, error: errorMessage });
        continue;
      }

      analyzed++;

      const analysisFields = {
        isMatch: analysis.isMatch,
        matchReason: analysis.reason || null,
        suggestedPrice: analysis.suggestedPrice || null,
        proposalText: analysis.proposalText?.trim() || null,
      };

      if (!analysis.isMatch) {
        await saveOffer(db, project, { ...analysisFields, proposalText: null });
        console.log(`Проект #${project.id} не подходит: ${analysis.reason}`);
        continue;
      }

      matched++;

      if (!analysisFields.proposalText) {
        failed++;
        await saveOffer(db, project, {
          ...analysisFields,
          error: "AI не сгенерировал текст отклика",
        });
        continue;
      }

      if (lastSentAt !== undefined) {
        const wait =
          lastSentAt + randomInt(SEND_GAP_MIN_MS, SEND_GAP_MAX_MS) - Date.now();
        if (wait > 0) await sleep(wait);
      }

      try {
        await client.submitOffer({
          projectId: project.id,
          description: analysisFields.proposalText,
          price: analysis.suggestedPrice,
          duration: analysis.suggestedDuration,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";

        if (err instanceof KworkProjectNotOfferableError) {
          console.warn(
            `Проект #${project.id} недоступен для отклика: ${errorMessage}`,
          );
          await saveOffer(db, project, {
            ...analysisFields,
            isMatch: false,
            matchReason: `Недоступен для отклика: ${errorMessage}`,
          });
          continue;
        }

        failed++;
        await saveOffer(db, project, {
          ...analysisFields,
          error: errorMessage,
        });

        if (err instanceof KworkOfferLimitError) {
          console.warn(`Лимит откликов исчерпан, завершаем: ${errorMessage}`);
          break;
        }

        console.error(
          `Ошибка отправки отклика на проект #${project.id}: ${errorMessage}`,
        );
        continue;
      }

      sent++;
      lastSentAt = Date.now();

      await saveOffer(db, project, {
        ...analysisFields,
        sent: true,
        sentAt: new Date(),
      });

      console.log(
        `Отклик отправлен на проект #${project.id} за ${analysis.suggestedPrice} руб. (${sent}/${sendLimit})`,
      );
    }

    console.log("Авто-отклик завершён", {
      analyzed,
      matched,
      sent,
      skipped,
      failed,
    });

    return { analyzed, matched, sent, skipped, failed };
  },
});
