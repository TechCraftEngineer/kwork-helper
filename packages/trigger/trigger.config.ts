import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { defineConfig } from "@trigger.dev/sdk/v3";

const langfuseExporter = new OTLPTraceExporter({
  url: "https://cloud.langfuse.com/api/public/otel/v1/traces",
  headers: {
    Authorization: `Basic ${Buffer.from(
      `${process.env.LANGFUSE_PUBLIC_KEY}:${process.env.LANGFUSE_SECRET_KEY}`,
    ).toString("base64")}`,
  },
});

export default defineConfig({
  project: "proj_atcasknseqxsbaocdwfm",
  dirs: ["./src/tasks"],
  maxDuration: 30000,
  retries: {
    enabledInDev: false,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
    },
  },
  telemetry: {
    exporters: [langfuseExporter],
  },
});
