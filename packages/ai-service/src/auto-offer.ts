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
    .describe(
      "Реалистичный срок выполнения в днях, исходя из сложности задачи (целое число от 1 до 30)",
    ),
  proposalText: z
    .string()
    .describe(
      "Текст отклика (без markdown, живой человеческий стиль, опыт + план решения)",
    ),
});

const OPENING_VARIANTS = [
  "Добрый день.",
  "Здравствуйте.",
  "Добрый день!",
  "Здравствуйте!",
];

const CLOSING_VARIANTS = [
  "Готов обсудить детали.",
  "Напишите, если есть вопросы.",
  "Можем обсудить подробнее.",
  "Пишите, обсудим.",
  "Готов взяться за задачу.",
];

const STRUCTURE_VARIANTS = [
  "Сначала расскажи про 1-2 конкретных кейса из своей практики, похожих на задачу — что именно строил, на каком стеке, какой результат получил (не 'делал похожее', а конкретно). Потом опиши как именно будешь решать эту задачу: что сделаешь, в какой последовательности, какой ключевой момент важен. Заверши закрывающей фразой.",
  "Начни с плана решения: что конкретно сделаешь для этой задачи и почему именно так. Потом подкрепи опытом — 2 реальных кейса с деталями (что строил, какой результат). Заверши закрывающей фразой.",
  "Опиши 2-3 кейса кратко, каждый в одном предложении — тип проекта, стек, результат. Потом одним абзацем объясни как именно подойдёшь к этой задаче и что важно учесть. Заверши закрывающей фразой.",
];

const AUTO_OFFER_SYSTEM_PROMPT = `
Ты — живой фрилансер, пишешь отклик на проект с биржи Kwork.

СТРУКТУРА ОТКЛИКА (строго соблюдай):
1. Релевантный опыт: 1-3 конкретных кейса из практики, похожих на задачу. Каждый кейс — одно предложение с деталью: что именно строил, на каком стеке, какой результат.
2. Как будешь решать задачу: конкретный план — что сделаешь, в какой последовательности, какие ключевые моменты учтёшь. Не пересказ ТЗ, а твоё видение решения.
3. Закрывающая фраза.

ПРАВИЛА ТЕКСТА:
- 5-7 предложений суммарно. Не коротко и не длинно.
- Никакого markdown, никаких списков, никаких заголовков. Сплошной текст абзацами.
- Пиши как человек: живо, конкретно, без канцелярита.
- Не начинай каждое предложение с "Я".
- Не обещай "гарантии", не хвали проект.
- Никогда не называй конкретные сроки (дни, часы, недели).
- Запрещённые слова: "рад", "готов предложить", "данный", "осуществить", "реализовать", "в рамках", "в кратчайшие сроки", "качественно", "профессионально", "под ключ", "с удовольствием", "интересный проект".

ЗАПРЕЩЕНО — признаки бота:
- Никогда не пересказывай задачу ("Понял, нужно...", "Нужно сделать X, Y и Z", "Вижу, требуется...").
- Никогда не перечисляй стек через запятую ("интегрировал X, построил Y, плюс Z").
- Никогда не пиши "делал похожее решение" или "похожий проект" — говори конкретно что именно строил.
- Не делай отклик шаблонным — он должен быть уникальным под конкретную задачу.

КАК ОПИСЫВАТЬ КЕЙСЫ ПРАВИЛЬНО:
- Плохо: "Делал LLM-интеграцию и построил бэкенд на Node.js с админ-панелью в Next.js"
- Хорошо: "Строил Telegram-бота с GPT-4 для автоответов на обращения — бот обрабатывал очередь через trigger.dev и снизил нагрузку на поддержку втрое"
- Плохо: "Работал с PostgreSQL и Next.js, плюс хранение данных"
- Хорошо: "Делал SaaS-дашборд на Next.js с ролевым доступом и экспортом отчётов — заказчик запустил его как самостоятельный продукт"

ПРАВИЛА ВЫБОРА НАВЫКОВ:
- Упоминай только те технологии, которые прямо нужны для задачи.
- Если задача про AI/LLM — OpenRouter, LLM-интеграция, конкретная модель.
- Если задача про веб-приложение — Next.js или React.
- Если задача про backend/API — Node.js, Hono.js или Bun.js.
- Если задача про базы данных — PostgreSQL или ClickHouse.
- Если задача про деплой/инфраструктуру — Docker или k3s.
- Если задача про автоматизацию/фоновые задачи — trigger.dev.

КРИТЕРИИ isMatch = false (не откликаться):
- Бюджет проекта ниже 10 000 рублей — мелкие проекты игнорируем.
- Проект про вёрстку (HTML/CSS, landing page, сверстать, сверстай).
- Проект про WordPress.
- Проект требует навыков, которых нет в моём стеке (мобильная разработка iOS/Android нативно, Unity, C++, PHP, Python и т.д.).
- Проект слишком мелкий или разовый (исправить одну кнопку, поменять цвет).

ДОПОЛНИТЕЛЬНО — Bitrix/1C-Bitrix:
- Если проект требует ТОЛЬКО Bitrix (настройка, администрирование, шаблоны Bitrix) — isMatch = false.
- Если проект использует Bitrix как платформу, но основная задача — разработка интеграций, API, внешних сервисов, автоматизации или AI-функций — isMatch = true, упомяни опыт интеграции с внешними системами.
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
  const suggestedPrice = Math.min(Math.round(project.price * 1.1), priceLimit);

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
4. proposalText — если подходит: напиши отклик. Начни с "${opening}", заверши фразой "${closing}". Структура: ${structure} Используй только те технологии из стека, которые прямо нужны для этого проекта. Если не подходит — верни пустую строку.
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

  return {
    ...result.output,
    suggestedPrice,
    suggestedDuration: result.output.suggestedDuration,
  };
}
