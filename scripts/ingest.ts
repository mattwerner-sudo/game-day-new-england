import { ilike } from "drizzle-orm";
import { db } from "../src/db/client";
import { schools } from "../src/db/schema";
import { discoverSportSlugs, ingestSchoolSport, School } from "../src/ingestion/sidearm/ingestSchool";
import { ingestSchoolPresto } from "../src/ingestion/presto/ingestSchool";
import { recordFeedHealth } from "../src/ingestion/upsert";

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

  if (school.cmsPlatform === "presto") {
    // One combined feed covers every sport (see src/ingestion/presto/feed.ts) - tracked as
    // a single "composite" unit in feed_health rather than per-sport, since there's no
    // per-sport fetch to distinguish.
    console.log(`\n=== ${school.name} (${hostname}) — Presto composite feed ===`);
    try {
      const result = await ingestSchoolPresto(school);
      console.log(
        `  composite                    fetched ${result.fetched}, inserted ${result.inserted}, ` +
          `updated ${result.updated}, skipped ${result.skipped} (${result.sportsSeen} sports seen)`
      );
      await recordFeedHealth(school.id, "composite", { success: true });
    } catch (err) {
      const message = (err as Error).message;
      console.error(`  [error] composite: ${message}`);
      await recordFeedHealth(school.id, "composite", { success: false, error: message });
    }
    return;
  }

  let slugs: string[];
  if (sportSlugs && sportSlugs.length > 0) {
    slugs = sportSlugs;
  } else {
    try {
      slugs = await discoverSportSlugs(hostname);
    } catch (err) {
      // Pre-existing gap this fixes: discovery failing for one school (unreachable site,
      // DNS issue, etc.) used to crash the whole --all run for every remaining school.
      console.error(`  [error] sport discovery failed for ${hostname}: ${(err as Error).message}`);
      slugs = [];
    }
  }

  console.log(`\n=== ${school.name} (${hostname}) — ${slugs.length} sport(s) ===`);

  for (const slug of slugs) {
    try {
      const result = await ingestSchoolSport(school, slug);
      console.log(
        `  ${slug.padEnd(28)} "${result.sportTitle}" — fetched ${result.fetched}, ` +
          `inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}`
      );
      await recordFeedHealth(school.id, slug, { success: true });
    } catch (err) {
      const message = (err as Error).message;
      console.error(`  [error] ${slug}: ${message}`);
      await recordFeedHealth(school.id, slug, { success: false, error: message });
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
