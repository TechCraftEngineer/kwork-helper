import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { kworkOffers } from "./schema";

export { kworkOffers };

let _db: ReturnType<typeof drizzle> | null = null;

export function getDb() {
  if (!_db) {
    const pool = new Pool({ connectionString: process.env.POSTGRES_URL });
    _db = drizzle({ client: pool, casing: "snake_case" });
  }
  return _db;
}
