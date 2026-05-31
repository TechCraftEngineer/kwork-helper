import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type {
  GeneratedProposal,
  GenerationOptions,
  TaskBrief,
  UserProfile,
} from "@repo/types";
import { generateText } from "ai";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

const DEFAULT_MODEL = "arcee-ai/trinity-large-preview:free";

function formatForTextarea(text: string): string {
  return (
    text
      // Убираем markdown-разметку
      .replace(/\*\*(.*?)\*\*/g, "$1") // **жирный**
      .replace(/\*(.*?)\*/g, "$1") // *курсив*
      .replace(/`(.*?)`/g, "$1") // `код`
      .replace(/#{1,6}\s*/g, "") // # заголовки
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [текст](ссылка)
      // Убираем лишние пустые строки
      .replace(/\n\s*\n\s*\n/g, "\n\n")
      // Заменяем множественные пробелы на одинарные
      .replace(/[ \t]+/g, " ")
      // Убираем пробелы в начале и конце строк
      .split("\n")
      .map((line) => line.trim())
      .join("\n")
      .trim()
  );
}

function getModel(modelName?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY не задан в переменных окружения");
  }

  const openrouter = createOpenRouter({
    apiKey,
  });

  return openrouter(modelName ?? DEFAULT_MODEL);
}

function calculateCreativityTemperature(creativity?: number): number {
  if (creativity === undefined) return 0.7;
  return 0.3 + creativity * 0.7;
}

export async function generateProposal(
  profile: UserProfile,
  task: TaskBrief,
  options: GenerationOptions = {},
): Promise<GeneratedProposal> {
  const model = getModel();
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, task, options);

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: calculateCreativityTemperature(options.creativity),
  });

  console.log("Generated single proposal:", result.text);

  let text = (result.text ?? "").trim();

  // Форматируем для textarea
  text = formatForTextarea(text);

  // Принудительно добавляем "Добрый день" если его нет
  if (!text.startsWith("Добрый день")) {
    text = `Добрый день\n\n${text}`;
  }

  return {
    text,
    metadata: {
      model: DEFAULT_MODEL,
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      generatedAt: new Date().toISOString(),
    },
  };
}
