import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_BASE_URL: z.string().url(),
    OPENAI_MODELS: z.string().min(1),
    KWORK_LOGIN: z.string().optional(),
    KWORK_PASSWORD: z.string().optional(),
    LANGFUSE_SECRET_KEY: z.string().optional(),
    LANGFUSE_PUBLIC_KEY: z.string().optional(),
    LANGFUSE_BASE_URL: z.string().url().optional(),
  },
  client: {},
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODELS: process.env.OPENAI_MODELS,
    KWORK_LOGIN: process.env.KWORK_LOGIN,
    KWORK_PASSWORD: process.env.KWORK_PASSWORD,
    LANGFUSE_SECRET_KEY: process.env.LANGFUSE_SECRET_KEY,
    LANGFUSE_PUBLIC_KEY: process.env.LANGFUSE_PUBLIC_KEY,
    LANGFUSE_BASE_URL: process.env.LANGFUSE_BASE_URL,
  },
});
