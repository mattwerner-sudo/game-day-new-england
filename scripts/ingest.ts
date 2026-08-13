import { ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { schools } from "../src/db/schema";
import { School } from "../src/ingestion/sidearm/ingestSchool";
import { ingestOneSchool } from "../src/ingestion/ingestOneSchool";

async function loadSchool(nameFragment: string): Promise<School> {
  const rows = await db
    .select()
    .from(schools)
    .where(ilike(schools.name, `%${nameFragment}%`))
    .limit(1);
  if (!rows[0]) throw new Error(`No seeded school matches "${nameFragment}"`);
  return rows[0];
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--all") {
    const allSchools = await db.select().from(schools);
    for (const school of allSchools) {
      await ingestOneSchool(school);
    }
  } else {
    const [nameFragment, ...sportSlugs] = args;
    if (!nameFragment) {
      console.error("Usage: tsx scripts/ingest.ts <school-name-fragment> [sportSlug ...]");
      console.error("       tsx scripts/ingest.ts --all");
      process.exit(1);
    }
    const school = await loadSchool(nameFragment);
    await ingestOneSchool(school, sportSlugs);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
