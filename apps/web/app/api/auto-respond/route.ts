import { NextRequest } from "next/server";
import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { KworkClient } from "@repo/kwork-client";
import type { AutoRespondSettings, AutoRespondResult, UserProfile } from "@repo/types";
import { env } from "../../../env";

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

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const body: AutoRespondSettings = await request.json();

  const kworkLogin = env.KWORK_LOGIN;
  const kworkPassword = env.KWORK_PASSWORD;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (chunk: string) => new TextEncoder().encode(chunk);

      try {
        if (!kworkLogin || !kworkPassword) {
          controller.enqueue(
            encode(sseEvent("error", { message: "Необходимо указать переменные окружения KWORK_LOGIN и KWORK_PASSWORD" })),
          );
          controller.close();
          return;
        }

        const client = await KworkClient.signIn(kworkLogin, kworkPassword);
        const projects = await client.getProjects({});
        const newProjects = projects.filter((p) => !p.has_offer).slice(0, 10);

        controller.enqueue(encode(sseEvent("total", { count: newProjects.length })));

        for (const project of newProjects) {
          controller.enqueue(encode(sseEvent("processing", { projectId: project.id, projectTitle: project.title })));

          try {
            const analysis = await analyzeAndGenerateOffer(DEFAULT_PROFILE, project);

            const result: AutoRespondResult = {
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              analysis,
              sent: false,
            };

            if (analysis.isMatch && !body.dryRun && analysis.proposalText) {
              await client.submitOffer({
                projectId: project.id,
                description: analysis.proposalText,
                price: analysis.suggestedPrice,
              });
              result.sent = true;
            }

            controller.enqueue(encode(sseEvent("result", result)));
          } catch (err) {
            const result: AutoRespondResult = {
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              analysis: { isMatch: false, reason: "Ошибка анализа", suggestedPrice: 0, proposalText: "" },
              sent: false,
              error: err instanceof Error ? err.message : "Неизвестная ошибка",
            };
            controller.enqueue(encode(sseEvent("result", result)));
          }
        }

        controller.enqueue(encode(sseEvent("done", {})));
      } catch (error) {
        console.error("Ошибка автоответа:", error);
        const message = error instanceof Error ? error.message : "Не удалось выполнить автоответ";
        controller.enqueue(encode(sseEvent("error", { message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
