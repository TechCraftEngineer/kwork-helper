import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENROUTER_API_KEY: z.string().min(1),
    KWORK_LOGIN: z.string().optional(),
    KWORK_PASSWORD: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
    KWORK_LOGIN: process.env.KWORK_LOGIN,
    KWORK_PASSWORD: process.env.KWORK_PASSWORD,
  },
});
