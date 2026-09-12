import { createEnv } from "@t3-oss/env-core";
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
  },
  runtimeEnv: process.env,
});
