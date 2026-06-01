import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { createDb, kworkOffers } from "@repo/db";
import { KworkClient } from "@repo/kwork-client";
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
    const projects = await client.getProjects({});
    const newProjects = projects.filter((p) => !p.has_offer);

    logger.info(`Найдено проектов без отклика: ${newProjects.length}`);

    let analyzed = 0;
    let matched = 0;
    let sent = 0;
    let skipped = 0;

    for (const project of newProjects) {
      const existing = await db
        .select({ id: kworkOffers.id })
        .from(kworkOffers)
        .where(eq(kworkOffers.projectId, project.id))
        .limit(1);

      if (existing.length > 0) {
        skipped++;
        continue;
      }

      logger.info(`Анализирую проект #${project.id}: ${project.title}`);

      try {
        const analysis = await analyzeAndGenerateOffer(DEFAULT_PROFILE, project);
        analyzed++;

        if (!analysis.isMatch) {
          await db.insert(kworkOffers).values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: false,
            matchReason: analysis.reason,
            suggestedPrice: analysis.suggestedPrice || null,
            proposalText: null,
          });
          logger.info(`Проект #${project.id} не подходит: ${analysis.reason}`);
          continue;
        }

        matched++;

        if (!analysis.proposalText) {
          await db.insert(kworkOffers).values({
            projectId: project.id,
            projectTitle: project.title,
            projectPrice: project.price,
            isMatch: true,
            matchReason: analysis.reason,
            suggestedPrice: analysis.suggestedPrice,
            error: "AI не сгенерировал текст отклика",
          });
          continue;
        }

        await client.submitOffer({
          projectId: project.id,
          description: analysis.proposalText,
          price: analysis.suggestedPrice,
        });

        sent++;

        await db.insert(kworkOffers).values({
          projectId: project.id,
          projectTitle: project.title,
          projectPrice: project.price,
          isMatch: true,
          matchReason: analysis.reason,
          suggestedPrice: analysis.suggestedPrice,
          proposalText: analysis.proposalText,
          sent: true,
          sentAt: new Date(),
        });

        logger.info(`Отклик отправлен на проект #${project.id} за ${analysis.suggestedPrice} руб.`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Неизвестная ошибка";
        logger.error(`Ошибка при обработке проекта #${project.id}: ${errorMessage}`);

        await db.insert(kworkOffers).values({
          projectId: project.id,
          projectTitle: project.title,
          projectPrice: project.price,
          isMatch: false,
          proposalText: null,
          suggestedPrice: null,
          error: errorMessage,
        });
      }
    }

    logger.info("Авто-отклик завершён", { analyzed, matched, sent, skipped });

    return { analyzed, matched, sent, skipped };
  },
});
