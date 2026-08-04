import { ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { schools } from "../src/db/schema";
import { discoverSportSlugs, ingestSchoolSport, School } from "../src/ingestion/sidearm/ingestSchool";

async function loadSchool(nameFragment: string): Promise<School> {
  const rows = await db
    .select()
    .from(schools)
    .where(ilike(schools.name, `%${nameFragment}%`))
    .limit(1);
  if (!rows[0]) throw new Error(`No seeded school matches "${nameFragment}"`);
  return rows[0];
}

async function ingestOneSchool(school: School, sportSlugs?: string[]) {
  const hostname = new URL(school.websiteUrl).hostname;
  const slugs = sportSlugs && sportSlugs.length > 0 ? sportSlugs : await discoverSportSlugs(hostname);

  console.log(`\n=== ${school.name} (${hostname}) — ${slugs.length} sport(s) ===`);

  for (const slug of slugs) {
    try {
      const result = await ingestSchoolSport(school, slug);
      console.log(
        `  ${slug.padEnd(28)} "${result.sportTitle}" — fetched ${result.fetched}, ` +
          `inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}`
      );
    } catch (err) {
      console.error(`  [error] ${slug}: ${(err as Error).message}`);
    }
  }
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
