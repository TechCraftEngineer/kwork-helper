import type { KworkProject, ProjectAnalysis, UserProfile } from "@repo/types";
import { generateText, Output } from "ai";
import { z } from "zod";
import { withModelFallback } from "./model-with-fallback";

const analysisSchema = z.object({
  isMatch: z.boolean().describe("Подходит ли проект для данного профиля"),
  reason: z.string().describe("Краткое объяснение решения (1-2 предложения)"),
  suggestedDuration: z
    .number()
    .int()
    .min(1)
    .describe("Реалистичный срок выполнения в днях, исходя из сложности задачи (целое число от 1 до 30)"),
  proposalText: z
    .string()
    .describe("Текст отклика (без markdown, 3-5 предложений, живой человеческий стиль)"),
});

const OPENING_VARIANTS = [
  "Добрый день.",
  "Здравствуйте.",
  "Привет.",
  "Добрый день!",
  "Здравствуйте!",
];

const CLOSING_VARIANTS = [
  "Готов обсудить детали.",
  "Напишите, если есть вопросы.",
  "Готов приступить.",
  "Можем обсудить подробнее.",
  "Пишите, обсудим.",
  "Готов взяться за задачу.",
];

const STRUCTURE_VARIANTS = [
  "Кратко покажи что понял задачу, назови 1-2 релевантных навыка из своего стека, заверши закрывающей фразой.",
  "Покажи что понял суть задачи, упомяни похожий опыт одним предложением, заверши закрывающей фразой.",
  "Сразу к делу: что именно ты сделаешь и каким стеком, заверши закрывающей фразой.",
  "Упомяни конкретный похожий проект из опыта одним предложением, скажи что готов сделать то же самое, заверши закрывающей фразой.",
];

const AUTO_OFFER_SYSTEM_PROMPT = `
Ты — живой фрилансер, пишешь короткий отклик на проект с биржи Kwork.

ПРАВИЛА ТЕКСТА:
- Максимум 4-5 предложений. Краткость — главное.
- Никакого markdown, никаких списков, никаких заголовков.
- Пиши как человек: живо, без канцелярита и шаблонов.
- Запрещённые слова и фразы: "рад", "готов предложить", "данный", "осуществить", "реализовать", "в рамках", "в кратчайшие сроки", "качественно", "профессионально", "под ключ", "с удовольствием", "интересный проект".
- Не начинай каждое предложение с "Я".
- Не обещай "гарантии", не хвали проект.
- Никогда не называй конкретные сроки выполнения (дни, часы, недели).
- Пиши уверенно и по делу, от первого лица.

ПРАВИЛА ВЫБОРА НАВЫКОВ:
- Внимательно прочитай описание проекта и выдели ключевые технологии/задачи.
- Из моего стека выбери только 1-2 технологии, которые ПРЯМО упомянуты в задаче или очевидно нужны для её решения.
- Не упоминай технологии, которых нет в задаче — это выглядит как спам.
- Если задача про AI/LLM — упомяни Vercel AI SDK, OpenRouter или LLM-интеграцию.
- Если задача про веб-приложение — упомяни Next.js, React или TypeScript.
- Если задача про backend/API — упомяни Node.js, tRPC, Hono.js или Bun.js.
- Если задача про базы данных — упомяни PostgreSQL или ClickHouse.
- Если задача про деплой/инфраструктуру — упомяни Docker, k3s или Vercel.
- Если задача про автоматизацию/фоновые задачи — упомяни trigger.dev или Inngest.

КРИТЕРИИ isMatch = false (не откликаться):
- Проект про вёрстку (HTML/CSS, landing page, сверстать, сверстай).
- Проект про WordPress, Bitrix, 1C-Bitrix.
- Проект требует навыков, которых нет в моём стеке (мобильная разработка iOS/Android нативно, Unity, C++, PHP, Python и т.д.).
- Проект слишком мелкий или разовый (исправить одну кнопку, поменять цвет).
`.trim();

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export async function analyzeAndGenerateOffer(
  profile: UserProfile,
  project: KworkProject,
): Promise<ProjectAnalysis> {
  const opening = pickRandom(OPENING_VARIANTS);
  const closing = pickRandom(CLOSING_VARIANTS);
  const structure = pickRandom(STRUCTURE_VARIANTS);

  const priceLimit = project.allow_higher_price
    ? (project.possible_price_limit ?? project.price)
    : project.price;
  const suggestedPrice = Math.min(
    Math.round(project.price * 1.1),
    priceLimit,
  );

  const userPrompt = `
Проанализируй проект и реши, стоит ли откликаться.

МОЙ ПРОФИЛЬ:
- Имя: ${profile.name}
- Специализация: ${profile.specialization}
- Опыт: ${profile.experienceYears} лет
- О себе: ${profile.bio}
- Портфолио: ${profile.portfolioDescription}

МОЙ СТЕК (сгруппирован по доменам):
- Frontend: Next.js, React, TypeScript, Tailwind CSS
- Backend/API: Node.js, Bun.js, tRPC, Hono.js
- Базы данных: PostgreSQL, ClickHouse
- AI/LLM: Vercel AI SDK, ChatGPT, LLM-интеграция, OpenRouter
- Инфраструктура: Docker, k3s, Vercel
- Автоматизация: trigger.dev, Inngest

ПРОЕКТ:
- Название: ${project.title}
- Описание: ${project.description}
- Бюджет: ${project.price} руб.${project.allow_higher_price ? ` (готов платить до ${project.possible_price_limit ?? project.price} руб.)` : ""}
- Откликов уже: ${project.offers}
- Процент найма: ${project.user_hired_percent}%

ЗАДАЧА:
1. isMatch — подходит ли проект под мой стек (см. критерии в системном промпте)
2. reason — кратко почему да/нет (1-2 предложения)
3. suggestedDuration — реалистичный срок выполнения в днях (целое число, от 1 до 30), исходя из сложности задачи. Если не подходит — верни 1.
4. proposalText — если подходит: напиши отклик. Начни с "${opening}", заверши фразой "${closing}". Структура: ${structure} Выбери из стека только те технологии, которые прямо нужны для этого проекта. Если не подходит — верни пустую строку.
`.trim();

  const result = await withModelFallback((model, modelId) =>
    generateText({
      model,
      system: AUTO_OFFER_SYSTEM_PROMPT,
      prompt: userPrompt,
      output: Output.object({ schema: analysisSchema }),
      temperature: 0.8,
      experimental_telemetry: {
        isEnabled: true,
        functionId: "analyze-and-generate-offer",
        metadata: { modelId },
      },
    }),
  );

  return { ...result.output, suggestedPrice, suggestedDuration: result.output.suggestedDuration };
}
