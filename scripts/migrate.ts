import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import type { PgliteDatabase } from "drizzle-orm/pglite";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { db } from "../src/db/client";

async function main() {
  if (process.env.DATABASE_URL) {
    await migratePostgres(db as unknown as PostgresJsDatabase, { migrationsFolder: "./drizzle" });
  } else {
    await migratePglite(db as unknown as PgliteDatabase, { migrationsFolder: "./drizzle" });
  }
  console.log("Migrations applied.");
  process.exit(0);
}

main();
