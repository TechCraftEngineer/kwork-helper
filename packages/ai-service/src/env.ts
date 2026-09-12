import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_BASE_URL: z.string().url(),
    OPENAI_MODELS: z.string().min(1),
  },
  runtimeEnv: process.env,
});
