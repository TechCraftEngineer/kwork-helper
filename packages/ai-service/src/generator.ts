import type {
  GeneratedProposal,
  GenerationOptions,
  TaskBrief,
  UserProfile,
} from "@repo/types";
import { generateText } from "ai";
import { withModelFallback } from "./model-with-fallback";
import { buildSystemPrompt, buildUserPrompt } from "./prompt";

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

function calculateCreativityTemperature(creativity?: number): number {
  if (creativity === undefined) return 0.7;
  return 0.3 + creativity * 0.7;
}

export async function generateProposal(
  profile: UserProfile,
  task: TaskBrief,
  options: GenerationOptions = {},
): Promise<GeneratedProposal> {
  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(profile, task, options);

  const { result, modelId } = await withModelFallback(
    async (model, modelId) => ({
      result: await generateText({
        model,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: calculateCreativityTemperature(options.creativity),
        experimental_telemetry: {
          isEnabled: true,
          functionId: "generate-proposal",
        },
      }),
      modelId,
    }),
  );

  console.log("Generated single proposal:", result.text);

  let text = (result.text ?? "").trim();

  // Форматируем для textarea
  text = formatForTextarea(text);

  return {
    text,
    metadata: {
      model: modelId,
      promptTokens: result.usage.inputTokens ?? 0,
      completionTokens: result.usage.outputTokens ?? 0,
      generatedAt: new Date().toISOString(),
    },
  };
}
