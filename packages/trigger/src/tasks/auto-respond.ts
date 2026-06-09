import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { createDb, kworkOffers } from "@repo/db";
import {
  KworkClient,
  KworkOfferLimitError,
  KworkProjectNotOfferableError,
} from "@repo/kwork-client";
import { DEFAULT_PROFILE } from "@repo/types";
import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";

export const kworkAutoRespondTask = schedules.task({
  id: "kwork-auto-respond",
  cron: {
    pattern: "*/15 * * * *",
    timezone: "Europe/Moscow",
  },
  run: async (payload) => {
    const kworkLogin = process.env.KWORK_LOGIN;
    const kworkPassword = process.env.KWORK_PASSWORD;
    const postgresUrl = process.env.POSTGRES_URL;

    if (!kworkLogin || !kworkPassword) {
      throw new Error("KWORK_LOGIN и KWORK_PASSWORD должны быть заданы");
    }
    if (!postgresUrl) {
      throw new Error("POSTGRES_URL должен быть задан");
    }

    logger.info("Запуск авто-отклика Kwork", {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

    const db = createDb(postgresUrl);
    const client = await KworkClient.signIn(kworkLogin, kworkPassword);
    const allProjects = await client.getAllProjects({});
    const candidates = allProjects.filter((p) => !p.has_offer);
    const maxOffersEnv = process.env.MAX_OFFERS_PER_RUN;
    const maxOffers = maxOffersEnv ? parseInt(maxOffersEnv, 10) : undefined;
    const newProjects =
      typeof maxOffers === "number" && !Number.isNaN(maxOffers)
        ? candidates.slice(0, maxOffers)
        : candidates;

    logger.info(`Найдено проектов без отклика: ${newProjects.length}`);

    let analyzed = 0;
    let matched = 0;
    let sent = 0;
    let skipped = 0;

    for (const project of newProjects) {
      const existing = await db
        .select({
          id: kworkOffers.id,
          isMatch: kworkOffers.isMatch,
          sent: kworkOffers.sent,
          error: kworkOffers.error,
        })
        .from(kworkOffers)
        .where(eq(kworkOffers.projectId, project.id))
        .limit(1);

      if (existing.length > 0) {
        const record = existing[0]!;
        if (record.sent || (record.isMatch === false && !record.error)) {
          skipped++;
          continue;
        }

        logger.info(
          `Проект #${project.id} уже был обработан ранее, но попробуем ещё раз: sent=${record.sent}, isMatch=${record.isMatch}, error=${record.error}`,
        );

        await db
          .delete(kworkOffers)
          .where(eq(kworkOffers.projectId, project.id));
      }

      logger.info(`Анализирую проект #${project.id}: ${project.title}`);

      let analysis;
      try {
        analysis = await analyzeAndGenerateOffer(DEFAULT_PROFILE, project);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";
        logger.error(`Ошибка анализа проекта #${project.id}: ${errorMessage}`);
        await db
          .insert(kworkOffers)
          .values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: false,
            matchReason: null,
            suggestedPrice: null,
            proposalText: null,
            error: errorMessage ?? null,
          })
          .onConflictDoNothing();
        continue;
      }

      analyzed++;

      if (!analysis.isMatch) {
        await db
          .insert(kworkOffers)
          .values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: false,
            matchReason: analysis.reason ?? null,
            suggestedPrice: analysis.suggestedPrice ?? null,
            proposalText: null,
          })
          .onConflictDoNothing();
        logger.info(`Проект #${project.id} не подходит: ${analysis.reason}`);
        continue;
      }

      matched++;

      if (!analysis.proposalText) {
        await db
          .insert(kworkOffers)
          .values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: true,
            matchReason: analysis.reason ?? null,
            suggestedPrice: analysis.suggestedPrice ?? null,
            proposalText: null,
            error: "AI не сгенерировал текст отклика",
          })
          .onConflictDoNothing();
        continue;
      }

      try {
        await client.submitOffer({
          projectId: project.id,
          description: analysis.proposalText,
          price: analysis.suggestedPrice,
          duration: analysis.suggestedDuration,
        });

        sent++;

        await db
          .insert(kworkOffers)
          .values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: true,
            matchReason: analysis.reason ?? null,
            suggestedPrice: analysis.suggestedPrice ?? null,
            proposalText: analysis.proposalText ?? null,
            sent: true,
            sentAt: new Date(),
          })
          .onConflictDoNothing();

        logger.info(
          `Отклик отправлен на проект #${project.id} за ${analysis.suggestedPrice} руб.`,
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Неизвестная ошибка";

        if (err instanceof KworkOfferLimitError) {
          logger.warn(
            `Лимит откликов исчерпан, останавливаем крон: ${errorMessage}`,
          );
          await db
            .insert(kworkOffers)
            .values({
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              isMatch: false,
              proposalText: null,
              suggestedPrice: null,
              error: errorMessage ?? null,
            })
            .onConflictDoNothing();
          break;
        }

        if (err instanceof KworkProjectNotOfferableError) {
          logger.warn(
            `Проект #${project.id} недоступен для отклика: ${errorMessage}`,
          );
          await db
            .insert(kworkOffers)
            .values({
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              isMatch: false,
              proposalText: null,
              suggestedPrice: null,
              error: errorMessage ?? null,
            })
            .onConflictDoNothing();
          continue;
        }

        logger.error(
          `Ошибка отправки отклика на проект #${project.id}: ${errorMessage}`,
        );

        await db
          .insert(kworkOffers)
          .values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: true,
            matchReason: analysis.reason ?? null,
            suggestedPrice: analysis.suggestedPrice ?? null,
            proposalText: analysis.proposalText ?? null,
            sent: false,
            error: errorMessage ?? null,
          })
          .onConflictDoNothing();
      }
    }

    logger.info("Авто-отклик завершён", { analyzed, matched, sent, skipped });

    return { analyzed, matched, sent, skipped };
  },
});
