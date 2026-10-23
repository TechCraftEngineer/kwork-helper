import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    OPENAI_API_KEY: z.string().min(1),
    OPENAI_BASE_URL: z.url({ protocol: /^https$/ }),
    OPENAI_MODELS: z
      .string()
      .refine((value) =>
        value.split(",").some((model) => model.trim().length > 0),
      ),
    KWORK_LOGIN: z.string().optional(),
    KWORK_PASSWORD: z.string().optional(),
  },
  client: {},
  runtimeEnv: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_BASE_URL: process.env.OPENAI_BASE_URL,
    OPENAI_MODELS: process.env.OPENAI_MODELS,
    KWORK_LOGIN: process.env.KWORK_LOGIN,
    KWORK_PASSWORD: process.env.KWORK_PASSWORD,
  },
});
