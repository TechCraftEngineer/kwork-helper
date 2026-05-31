import type { Config } from "drizzle-kit";

const postgresUrl = process.env.POSTGRES_URL;

if (!postgresUrl) {
  throw new Error("Missing POSTGRES_URL");
}

export default {
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: { url: postgresUrl },
  casing: "snake_case",
} satisfies Config;
