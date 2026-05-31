import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type DbSchema = typeof schema;

export function createDb(connectionString: string): NodePgDatabase<DbSchema> {
  const pool = new Pool({ connectionString });
  return drizzle({ client: pool, schema, casing: "snake_case" });
}

let _defaultDb: NodePgDatabase<DbSchema> | null = null;

export function getDefaultDb(): NodePgDatabase<DbSchema> {
  if (!_defaultDb) {
    const url = process.env.POSTGRES_URL;
    if (!url) throw new Error("POSTGRES_URL is not set");
    _defaultDb = createDb(url);
  }
  return _defaultDb;
}

export const db = new Proxy({} as NodePgDatabase<DbSchema>, {
  get(_target, prop) {
    return getDefaultDb()[prop as keyof NodePgDatabase<DbSchema>];
  },
});
