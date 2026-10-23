import { runAutoRespond } from "../auto-respond";
import { hatchet } from "../hatchet-client";

const RUN_BUDGET_MS = 17 * 60_000;

export const kworkAutoRespondWorkflow = hatchet.workflow({
  name: "kwork-auto-respond",
});

kworkAutoRespondWorkflow.task({
  name: "run",
  retries: 3,
  backoff: {
    maxSeconds: 10,
    factor: 2,
  },
  executionTimeout: "20m",
  fn: async () => {
    const summary = await runAutoRespond({ timeBudgetMs: RUN_BUDGET_MS });
    return { ...summary };
  },
});
