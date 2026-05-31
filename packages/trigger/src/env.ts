import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().min(1),
    KWORK_LOGIN: z.string().min(1),
    KWORK_PASSWORD: z.string().min(1),
    POSTGRES_URL: z.string().min(1),
    TRIGGER_SECRET_KEY: z.string().min(1),
  },
  runtimeEnv: process.env,
});
