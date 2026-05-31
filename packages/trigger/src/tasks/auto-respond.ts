import { schedules, logger } from "@trigger.dev/sdk";
import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { KworkClient } from "@repo/kwork-client";
import type { UserProfile } from "@repo/types";
import { eq } from "drizzle-orm";
import { getDb, kworkOffers } from "../db";

const DEFAULT_PROFILE: UserProfile = {
  name: "Максим",
  specialization: "Fullstack & AI-разработка",
  experienceYears: 10,
  skills: [
    "Next.js", "React", "TypeScript", "Tailwind CSS",
    "Node.js", "Bun.js", "tRPC", "Hono.js",
    "PostgreSQL", "ClickHouse", "Docker", "k3s",
    "ChatGPT", "LLM", "AI интеграция", "trigger.dev", "Inngest",
  ],
  portfolioDescription:
    "Создаю прибыльные и масштабируемые веб-приложения с интеграцией AI. Работаю с CRM, ERP, личными кабинетами и корпоративными решениями «под ключ».",
  communicationStyle: "confident",
  pricingTier: "premium",
  bio: "Опытный Fullstack & AI-разработчик с 10+ лет опыта. Интегрирую ChatGPT/LLM для автоматизации и аналитики, строю быстрые интерфейсы и надёжный backend.",
  timezone: "UTC+3 (Москва)",
  responseTime: "1-2 часа",
};

export const kworkAutoRespondTask = schedules.task({
  id: "kwork-auto-respond",
  cron: {
    pattern: "*/15 * * * *",
    timezone: "Europe/Moscow",
  },
  run: async (payload) => {
    const db = getDb();

    const kworkLogin = process.env.KWORK_LOGIN;
    const kworkPassword = process.env.KWORK_PASSWORD;

    if (!kworkLogin || !kworkPassword) {
      throw new Error("KWORK_LOGIN и KWORK_PASSWORD должны быть заданы");
    }

    logger.info("Запуск авто-отклика Kwork", {
      scheduledAt: payload.timestamp,
      lastRun: payload.lastTimestamp,
    });

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
            suggestedPrice: analysis.suggestedPrice,
            proposalText: null,
            sent: false,
            dryRun: false,
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
            proposalText: null,
            sent: false,
            dryRun: false,
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
          dryRun: false,
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
          matchReason: null,
          suggestedPrice: null,
          proposalText: null,
          sent: false,
          dryRun: false,
          error: errorMessage,
        });
      }
    }

    logger.info("Авто-отклик завершён", { analyzed, matched, sent, skipped });

    return { analyzed, matched, sent, skipped };
  },
});
