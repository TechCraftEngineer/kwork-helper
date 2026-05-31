import { NextRequest, NextResponse } from "next/server";
import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { KworkClient } from "@repo/kwork-client";
import type {
  AutoRespondSettings,
  AutoRespondResult,
  ApiError,
  UserProfile,
} from "@repo/types";

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

export async function POST(
  request: NextRequest,
): Promise<NextResponse<{ results: AutoRespondResult[] } | ApiError>> {
  try {
    const body: AutoRespondSettings = await request.json();

    const kworkLogin = body.kworkLogin || process.env.KWORK_LOGIN;
    const kworkPassword = body.kworkPassword || process.env.KWORK_PASSWORD;

    if (!kworkLogin || !kworkPassword) {
      return NextResponse.json(
        { error: "Необходимо указать kworkLogin и kworkPassword (в теле запроса или в переменных окружения KWORK_LOGIN и KWORK_PASSWORD)" },
        { status: 400 },
      );
    }

    const client = await KworkClient.signIn(kworkLogin, kworkPassword);

    const projects = await client.getProjects({
      priceFrom: body.priceFrom,
      priceTo: body.priceTo,
    });

    const newProjects = projects.filter((p) => !p.has_offer);

    const results: AutoRespondResult[] = [];

    for (const project of newProjects.slice(0, 10)) {
      try {
        const analysis = await analyzeAndGenerateOffer(
          DEFAULT_PROFILE,
          project,
        );

        const result: AutoRespondResult = {
          projectId: project.id,
          projectTitle: project.title,
          projectPrice: project.price,
          analysis,
          sent: false,
        };

        if (analysis.isMatch && !body.dryRun && analysis.proposalText) {
          await client.sendOffer({
            userId: project.user_id,
            text: analysis.proposalText,
          });
          result.sent = true;
        }

        results.push(result);
      } catch (err) {
        results.push({
          projectId: project.id,
          projectTitle: project.title,
          projectPrice: project.price,
          analysis: {
            isMatch: false,
            reason: "Ошибка анализа",
            suggestedPrice: 0,
            proposalText: "",
          },
          sent: false,
          error: err instanceof Error ? err.message : "Неизвестная ошибка",
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Ошибка автоответа:", error);
    const message =
      error instanceof Error ? error.message : "Не удалось выполнить автоответ";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
