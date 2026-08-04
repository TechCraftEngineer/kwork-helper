import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { LanguageModel } from "ai";
import { env } from "./env";

export const PRIMARY_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";

const FALLBACK_MODELS = [
  "nvidia/nemotron-3-ultra-550b-a55b:free",
  "inclusionai/ling-3.0-flash:free",
  "poolside/laguna-s-2.1:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "openai/gpt-oss-120b:free",
  "z-ai/glm-4.5-air:free",
  "google/gemma-4-31b-it:free",
  "moonshotai/kimi-k2.6:free",
] as const;

const PRIMARY_MAX_ATTEMPTS = 3;
const PRIMARY_RETRY_DELAY_MS = 5_000;

function createModel(modelId: string): LanguageModel {
  const openrouter = createOpenRouter({ apiKey: env.OPENROUTER_API_KEY });
  return openrouter(modelId);
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
