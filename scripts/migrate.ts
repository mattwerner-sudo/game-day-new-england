import { migrate } from "drizzle-orm/pglite/migrator";
import { db } from "../src/db/client";

async function main() {
  await migrate(db, { migrationsFolder: "./drizzle" });
  console.log("Migrations applied.");
  process.exit(0);
}

main();
