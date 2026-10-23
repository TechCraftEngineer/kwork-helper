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

const DEFAULT_MIN_PROJECT_PRICE = 10_000;
const SEND_GAP_MIN_MS = 20_000;
const SEND_GAP_MAX_MS = 60_000;

type Db = ReturnType<typeof createDb>;
type OfferFields = Omit<
  NewKworkOffer,
  "id" | "projectId" | "projectTitle" | "projectPrice" | "createdAt"
>;

export interface AutoRespondOptions {
  dryRun?: boolean;
  minPrice?: number;
  maxOffers?: number;
  timeBudgetMs?: number;
}

export interface AutoRespondSummary {
  dryRun: boolean;
  analyzed: number;
  matched: number;
  sent: number;
  skipped: number;
  failed: number;
}

export function parseIntEnv(name: string): number | undefined {
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

async function findOfferRecord(db: Db, projectId: number) {
  const query = () =>
    db
      .select({
        isMatch: kworkOffers.isMatch,
        sent: kworkOffers.sent,
        error: kworkOffers.error,
      })
      .from(kworkOffers)
      .where(eq(kworkOffers.projectId, projectId))
      .limit(1);

  try {
    const [record] = await query();
    return record;
  } catch (err) {
    console.warn(
      `Повтор запроса к БД для проекта #${projectId}: ${err instanceof Error ? (err.cause ?? err.message) : err}`,
    );
    await sleep(1_000);
    const [record] = await query();
    return record;
  }
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

export async function runAutoRespond(
  options: AutoRespondOptions = {},
): Promise<AutoRespondSummary> {
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

  const dryRun = options.dryRun ?? false;
  const minPrice =
    options.minPrice ??
    parseIntEnv("MIN_PROJECT_PRICE") ??
    DEFAULT_MIN_PROJECT_PRICE;
  const maxOffers = options.maxOffers ?? parseIntEnv("MAX_OFFERS_PER_RUN");
  const { timeBudgetMs } = options;

  console.log("Запуск авто-отклика Kwork", {
    startedAt: new Date(startedAt).toISOString(),
    dryRun,
    minPrice,
    maxOffers,
  });

  const db = createDb(postgresUrl);
  const summary: AutoRespondSummary = {
    dryRun,
    analyzed: 0,
    matched: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
  };

  const save = (project: KworkProject, fields: OfferFields) =>
    dryRun ? Promise.resolve() : saveOffer(db, project, fields);

  try {
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

    if (sendLimit <= 0) {
      console.warn("Нет доступных коннектов или лимит отправки равен 0");
      return summary;
    }

    let lastSentAt: number | undefined;

    for (const project of candidates) {
      if (summary.sent >= sendLimit) {
        console.log(`Достигнут лимит отправки (${sendLimit}), завершаем`);
        break;
      }
      if (timeBudgetMs !== undefined && Date.now() - startedAt > timeBudgetMs) {
        console.warn("Время запуска на исходе, остальное — в следующий раз");
        break;
      }

      let record: Awaited<ReturnType<typeof findOfferRecord>>;
      try {
        record = await findOfferRecord(db, project.id);
      } catch (err) {
        console.error(
          `БД недоступна для проекта #${project.id}, пропускаю:`,
          err instanceof Error ? (err.cause ?? err.message) : err,
        );
        summary.failed++;
        continue;
      }

      if (record) {
        if (record.sent || (!record.isMatch && !record.error)) {
          summary.skipped++;
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
        summary.failed++;
        await save(project, { isMatch: false, error: errorMessage });
        continue;
      }

      summary.analyzed++;

      const analysisFields = {
        isMatch: analysis.isMatch,
        matchReason: analysis.reason || null,
        suggestedPrice: analysis.suggestedPrice || null,
        proposalText: analysis.proposalText?.trim() || null,
      };

      if (!analysis.isMatch) {
        await save(project, { ...analysisFields, proposalText: null });
        console.log(`Проект #${project.id} не подходит: ${analysis.reason}`);
        continue;
      }

      summary.matched++;

      if (!analysisFields.proposalText) {
        summary.failed++;
        await save(project, {
          ...analysisFields,
          error: "AI не сгенерировал текст отклика",
        });
        continue;
      }

      if (dryRun) {
        summary.sent++;
        console.log(
          `[dry-run] Отправил бы отклик на проект #${project.id} за ${analysis.suggestedPrice} руб., срок ${analysis.suggestedDuration} дн. (${summary.sent}/${sendLimit}):\n${analysisFields.proposalText}\n`,
        );
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
          await save(project, {
            ...analysisFields,
            isMatch: false,
            matchReason: `Недоступен для отклика: ${errorMessage}`,
          });
          continue;
        }

        summary.failed++;
        await save(project, { ...analysisFields, error: errorMessage });

        if (err instanceof KworkOfferLimitError) {
          console.warn(`Лимит откликов исчерпан, завершаем: ${errorMessage}`);
          break;
        }

        console.error(
          `Ошибка отправки отклика на проект #${project.id}: ${errorMessage}`,
        );
        continue;
      }

      summary.sent++;
      lastSentAt = Date.now();

      await save(project, {
        ...analysisFields,
        sent: true,
        sentAt: new Date(),
      });

      console.log(
        `Отклик отправлен на проект #${project.id} за ${analysis.suggestedPrice} руб. (${summary.sent}/${sendLimit})`,
      );
    }
  } finally {
    await db.$client.end();
  }

  console.log("Авто-отклик завершён", summary);

  return summary;
}
