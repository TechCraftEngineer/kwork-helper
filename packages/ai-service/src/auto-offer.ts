import type { KworkProject, ProjectAnalysis, UserProfile } from "@repo/types";
import { generateText, Output } from "ai";
import { z } from "zod";
import { withModelFallback } from "./model-with-fallback";

const analysisSchema = z.object({
  isMatch: z.boolean().describe("Подходит ли проект для данного профиля"),
  reason: z.string().describe("Краткое объяснение решения (1-2 предложения)"),
  suggestedPrice: z.number().describe("Рекомендуемая цена оффера в рублях"),
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

ПРАВИЛА:
- Максимум 4-5 предложений. Краткость — главное.
- Никакого markdown, никаких списков, никаких заголовков.
- Пиши как человек: живо, без канцелярита и шаблонов.
- Запрещённые слова и фразы: "рад", "готов предложить", "данный", "осуществить", "реализовать", "в рамках", "в кратчайшие сроки", "качественно", "профессионально", "под ключ", "с удовольствием".
- Не начинай каждое предложение с "Я".
- Не перечисляй все навыки — упомяни только 1-2 самых релевантных к задаче.
- Не обещай "гарантии", не хвали проект, не пиши "интересный проект".
- Пиши уверенно и по делу, от первого лица.
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

  const userPrompt = `
Проанализируй проект и реши, стоит ли откликаться.

МОЙ ПРОФИЛЬ:
- Имя: ${profile.name}
- Специализация: ${profile.specialization}
- Опыт: ${profile.experienceYears} лет
- Навыки: ${profile.skills.join(", ")}
- О себе: ${profile.bio}

ПРОЕКТ:
- Название: ${project.title}
- Описание: ${project.description}
- Бюджет: ${project.price} руб.${project.allow_higher_price ? ` (готов платить до ${project.possible_price_limit ?? project.price} руб.)` : ""}
- Откликов уже: ${project.offers}
- Процент найма: ${project.user_hired_percent}%

ЗАДАЧА:
1. isMatch — подходит ли проект под мои навыки
2. reason — кратко почему да/нет
3. suggestedPrice — оптимальная цена с учётом бюджета и опыта
4. proposalText — если подходит: напиши отклик. Начни с "${opening}", заверши фразой "${closing}". Структура: ${structure} Если не подходит — верни пустую строку.
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

  return result.output;
}
