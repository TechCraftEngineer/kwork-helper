import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_kwork_helper",
  dirs: ["./src/tasks"],
  maxDuration: 300,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
});
