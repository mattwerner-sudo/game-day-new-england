import { discoverSportSlugs, ingestSchoolSport, School } from "./sidearm/ingestSchool";
import { ingestSchoolPresto } from "./presto/ingestSchool";
import { recordFeedHealth } from "./upsert";

export interface SchoolIngestSummary {
  schoolName: string;
  ok: boolean; // false only if the whole school failed outright (e.g. discovery/composite fetch)
  errors: string[]; // per-sport errors that didn't abort the whole school
}

/**
 * Shared by scripts/ingest.ts (human-triggered) and src/app/api/cron/ingest/route.ts
 * (Vercel Cron) - extracted so the two callers can't silently drift into different ingestion
 * behavior. Still logs to console (useful in both a CLI run and Vercel's function logs) and
 * now also returns a summary so the cron route can report something back in its response body
 * instead of just relying on log output nobody's watching in real time.
 */
export async function ingestOneSchool(school: School, sportSlugs?: string[]): Promise<SchoolIngestSummary> {
  const hostname = new URL(school.websiteUrl).hostname;
  const errors: string[] = [];

  if (school.cmsPlatform === "presto") {
    // One combined feed covers every sport (see src/ingestion/presto/feed.ts) - tracked as
    // a single "composite" unit in feed_health rather than per-sport, since there's no
    // per-sport fetch to distinguish.
    console.log(`\n=== ${school.name} (${hostname}) — Presto composite feed ===`);
    try {
      const result = await ingestSchoolPresto(school);
      console.log(
        `  composite                    fetched ${result.fetched}, inserted ${result.inserted}, ` +
          `updated ${result.updated}, skipped ${result.skipped} (${result.sportsSeen} sports seen)` +
          (result.meets > 0 ? `, meets ${result.meets}` : "") +
          (result.tooOld > 0 ? `, ${result.tooOld} too old (skipped)` : "")
      );
      await recordFeedHealth(school.id, "composite", { success: true });
      return { schoolName: school.name, ok: true, errors: [] };
    } catch (err) {
      const message = (err as Error).message;
      console.error(`  [error] composite: ${message}`);
      await recordFeedHealth(school.id, "composite", { success: false, error: message });
      return { schoolName: school.name, ok: false, errors: [message] };
    }
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
      const message = (err as Error).message;
      console.error(`  [error] sport discovery failed for ${hostname}: ${message}`);
      return { schoolName: school.name, ok: false, errors: [`discovery: ${message}`] };
    }
  }

  console.log(`\n=== ${school.name} (${hostname}) — ${slugs.length} sport(s) ===`);

  for (const slug of slugs) {
    try {
      const result = await ingestSchoolSport(school, slug);
      console.log(
        `  ${slug.padEnd(28)} "${result.sportTitle}" — fetched ${result.fetched}, ` +
          `inserted ${result.inserted}, updated ${result.updated}, skipped ${result.skipped}` +
          (result.meets > 0 ? `, meets ${result.meets}` : "")
      );
      await recordFeedHealth(school.id, slug, { success: true });
    } catch (err) {
      const message = (err as Error).message;
      console.error(`  [error] ${slug}: ${message}`);
      await recordFeedHealth(school.id, slug, { success: false, error: message });
      errors.push(`${slug}: ${message}`);
    }
  }

  return { schoolName: school.name, ok: true, errors };
}
