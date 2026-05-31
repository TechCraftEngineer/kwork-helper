import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { KworkProject, ProjectAnalysis, UserProfile } from "@repo/types";
import { generateText, Output } from "ai";
import { z } from "zod";
import { buildSystemPrompt } from "./prompt";

const DEFAULT_MODEL = "openai/gpt-oss-120b:free";

function getModel() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не задан в переменных окружения");
  }
  const openrouter = createOpenRouter({ apiKey });
  return openrouter(DEFAULT_MODEL);
}

const analysisSchema = z.object({
  isMatch: z.boolean().describe("Подходит ли проект для данного профиля"),
  reason: z.string().describe("Краткое объяснение решения (1-2 предложения)"),
  suggestedPrice: z.number().describe("Рекомендуемая цена оффера в рублях"),
  proposalText: z
    .string()
    .describe(
      "Текст отклика на проект (без markdown, начинать с 'Добрый день')",
    ),
});

export async function analyzeAndGenerateOffer(
  profile: UserProfile,
  project: KworkProject,
): Promise<ProjectAnalysis> {
  const model = getModel();

  const systemPrompt = buildSystemPrompt();

  const userPrompt = `
Ты — опытный фрилансер. Проанализируй проект с биржи Kwork и реши, стоит ли на него откликаться.

ПРОФИЛЬ ИСПОЛНИТЕЛЯ:
- Имя: ${profile.name}
- Специализация: ${profile.specialization}
- Опыт: ${profile.experienceYears} лет
- Навыки: ${profile.skills.join(", ")}
- О себе: ${profile.bio}

ПРОЕКТ:
- ID: ${project.id}
- Название: ${project.title}
- Описание: ${project.description}
- Бюджет заказчика: ${project.price} руб.
- Готов рассмотреть цену выше: ${project.allow_higher_price ? "да" : "нет"}
- Максимально возможная цена: ${project.possible_price_limit ?? project.price} руб.
- Количество уже поданных откликов: ${project.offers}
- Процент найма у заказчика: ${project.user_hired_percent}%

ЗАДАЧА:
1. Определи, подходит ли проект под мои навыки (isMatch)
2. Объясни решение кратко (reason)
3. Предложи оптимальную цену (suggestedPrice). Учти бюджет заказчика, его готовность платить больше, и твой опыт. Цена должна быть конкурентоспособной и справедливой.
4. Если проект подходит — напиши убедительный отклик (proposalText). Без markdown, начинай с "Добрый день". Упомяни конкретные навыки из проекта.

Если проект НЕ подходит — в proposalText верни пустую строку.
`.trim();

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    output: Output.object({ schema: analysisSchema }),
    temperature: 0.4,
  });

  return result.output;
}
