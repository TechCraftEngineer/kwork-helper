import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText, Output } from "ai";
import { z } from "zod";

const provider = createOpenAICompatible({
  name: "openai-compatible",
  baseURL: process.env.OPENAI_BASE_URL!,
  apiKey: process.env.OPENAI_API_KEY!,
  supportsStructuredOutputs: true,
});
const schema = z.object({ isMatch: z.boolean(), reason: z.string(), days: z.number().int().min(1) });
for (const id of process.env.OPENAI_MODELS!.split(",").map((s) => s.trim())) {
  try {
    const r = await generateText({
      model: provider(id),
      prompt: "Проект: сделать Telegram-бота на Node.js. Подходит ли fullstack-разработчику на TypeScript? Срок в днях.",
      output: Output.object({ schema }),
    });
    console.log(id, "OK", JSON.stringify(r.output), "warnings:", r.warnings?.length ?? 0);
  } catch (e: any) {
    console.log(id, "FAIL", e.message?.slice(0, 300), e.responseBody?.slice?.(0, 300) ?? "");
  }
}
