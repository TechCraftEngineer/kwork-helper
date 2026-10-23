import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  extractJsonMiddleware,
  type LanguageModel,
  type LanguageModelMiddleware,
  wrapLanguageModel,
} from "ai";
import { env } from "./env";

const MODELS = env.OPENAI_MODELS.split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export const PRIMARY_MODEL = MODELS[0] as string;

const FALLBACK_MODELS = MODELS.slice(1);

const PRIMARY_MAX_ATTEMPTS = 3;
const PRIMARY_RETRY_DELAY_MS = 5_000;

const provider = createOpenAICompatible({
  name: "openai-compatible",
  baseURL: env.OPENAI_BASE_URL,
  apiKey: env.OPENAI_API_KEY,
  supportsStructuredOutputs: true,
});

const stripCodeFences = extractJsonMiddleware();

const jsonOutputMiddleware: LanguageModelMiddleware = {
  specificationVersion: "v4",
  transformParams: async ({ params }) => {
    const format = params.responseFormat;
    if (format?.type !== "json" || !format.schema) return params;

    const instruction = `Ответь только одним JSON-объектом, без markdown и пояснений, строго по JSON Schema:\n${JSON.stringify(format.schema)}`;
    const firstNonSystem = params.prompt.findIndex((m) => m.role !== "system");
    const insertAt = firstNonSystem === -1 ? params.prompt.length : firstNonSystem;

    return {
      ...params,
      prompt: [
        ...params.prompt.slice(0, insertAt),
        { role: "system", content: instruction },
        ...params.prompt.slice(insertAt),
      ],
    };
  },
  wrapGenerate: async (options) =>
    options.params.responseFormat?.type === "json" &&
    stripCodeFences.wrapGenerate
      ? stripCodeFences.wrapGenerate(options)
      : options.doGenerate(),
};

export function createModel(modelId: string): LanguageModel {
  return wrapLanguageModel({
    model: provider(modelId),
    middleware: jsonOutputMiddleware,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withModelFallback<T>(
  fn: (model: LanguageModel, modelId: string) => Promise<T>,
): Promise<T> {
  const errors: unknown[] = [];

  for (let attempt = 1; attempt <= PRIMARY_MAX_ATTEMPTS; attempt++) {
    try {
      return await fn(createModel(PRIMARY_MODEL), PRIMARY_MODEL);
    } catch (err) {
      errors.push(err);
      if (attempt < PRIMARY_MAX_ATTEMPTS) {
        await sleep(PRIMARY_RETRY_DELAY_MS);
      }
    }
  }

  for (const fallbackId of FALLBACK_MODELS) {
    try {
      return await fn(createModel(fallbackId), fallbackId);
    } catch (err) {
      errors.push(err);
    }
  }

  const messages = errors.map((e) =>
    e instanceof Error ? e.message : String(e),
  );
  throw new Error(
    `All models failed.\n${messages.map((m, i) => `[${i + 1}] ${m}`).join("\n")}`,
  );
}
