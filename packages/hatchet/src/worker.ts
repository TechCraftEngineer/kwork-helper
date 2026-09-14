import { hatchet } from "./hatchet-client";
import { kworkAutoRespondWorkflow } from "./workflows/auto-respond";

async function main() {
  const worker = await hatchet.worker("kwork-helper-worker", {
    workflows: [kworkAutoRespondWorkflow],
  });

  await worker.start();
}

main();
