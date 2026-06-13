import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) throw new Error("Missing POSTGRES_URL");

const pool = new Pool({ connectionString: postgresUrl });
const db = drizzle({ client: pool, casing: "snake_case" });

await migrate(db, {
  migrationsFolder: path.join(import.meta.dir, "../migrations"),
});

console.log("✓ Migrations applied");
await pool.end();
