import { analyzeAndGenerateOffer } from "@repo/ai-service";
import { KworkClient } from "@repo/kwork-client";
import type { AutoRespondResult, AutoRespondSettings } from "@repo/types";
import { DEFAULT_PROFILE } from "@repo/types";
import type { NextRequest } from "next/server";
import { env } from "../../../env";

const DELAY_MIN_MS = 35_000;
const DELAY_MAX_MS = 90_000;
const DELAY_DRY_RUN_MIN_MS = 800;
const DELAY_DRY_RUN_MAX_MS = 2_500;
const DEFAULT_MAX_OFFERS = 5;

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: NextRequest): Promise<Response> {
  const body: AutoRespondSettings = await request.json();

  const kworkLogin = env.KWORK_LOGIN;
  const kworkPassword = env.KWORK_PASSWORD;

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (chunk: string) => new TextEncoder().encode(chunk);

      try {
        if (!kworkLogin || !kworkPassword) {
          controller.enqueue(
            encode(
              sseEvent("error", {
                message:
                  "Необходимо указать переменные окружения KWORK_LOGIN и KWORK_PASSWORD",
              }),
            ),
          );
          controller.close();
          return;
        }

        const MIN_PROJECT_PRICE = 10_000;

        const client = await KworkClient.signIn(kworkLogin, kworkPassword);
        const allProjects = await client.getAllProjects({
          priceFrom: MIN_PROJECT_PRICE,
        });
        const maxOffers = body.maxOffers ?? DEFAULT_MAX_OFFERS;
        const candidates = shuffleArray(
          allProjects.filter(
            (p) => !p.has_offer && p.price >= MIN_PROJECT_PRICE,
          ),
        );
        const newProjects = candidates.slice(0, maxOffers);

        controller.enqueue(
          encode(
            sseEvent("total", {
              count: newProjects.length,
              totalFetched: allProjects.length,
            }),
          ),
        );

        for (const project of newProjects) {
          controller.enqueue(
            encode(
              sseEvent("processing", {
                projectId: project.id,
                projectTitle: project.title,
              }),
            ),
          );

          try {
            const analysis = await analyzeAndGenerateOffer(
              DEFAULT_PROFILE,
              project,
            );

            const result: AutoRespondResult = {
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              analysis,
              sent: false,
            };

            if (analysis.isMatch && !body.dryRun && analysis.proposalText) {
              await client.submitOffer({
                projectId: project.id,
                description: analysis.proposalText,
                price: analysis.suggestedPrice,
                duration: analysis.suggestedDuration,
              });
              result.sent = true;
            }

            controller.enqueue(encode(sseEvent("result", result)));

            const isLast = project === newProjects[newProjects.length - 1];
            if (!isLast) {
              const [min, max] = body.dryRun
                ? [DELAY_DRY_RUN_MIN_MS, DELAY_DRY_RUN_MAX_MS]
                : [DELAY_MIN_MS, DELAY_MAX_MS];
              await randomDelay(min, max);
            }
          } catch (err) {
            const result: AutoRespondResult = {
              projectId: project.id,
              projectTitle: project.title,
              projectPrice: project.price,
              analysis: {
                isMatch: false,
                reason: "Ошибка анализа",
                suggestedPrice: 0,
                suggestedDuration: 1,
                proposalText: "",
              },
              sent: false,
              error: err instanceof Error ? err.message : "Неизвестная ошибка",
            };
            controller.enqueue(encode(sseEvent("result", result)));
          }
        }

        controller.enqueue(encode(sseEvent("done", {})));
      } catch (error) {
        console.error("Ошибка автоответа:", error);
        const message =
          error instanceof Error
            ? error.message
            : "Не удалось выполнить автоответ";
        controller.enqueue(encode(sseEvent("error", { message })));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
