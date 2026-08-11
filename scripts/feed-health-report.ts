/**
 * Human-triggered report over feed_health (populated by every ingest.ts run) - the thing
 * that makes accumulated feed breakage visible instead of requiring someone to re-read raw
 * ingest.ts console output after every run. Run this after ingest.ts --all, or any time to
 * check current status. Exits 1 if anything needs attention, so it's usable as a simple
 * pass/fail check too (e.g. `npx tsx scripts/feed-health-report.ts && echo "all clear"`).
 */
import { desc, eq, gt, sql } from "drizzle-orm";
import { db } from "../src/db/client";
import { feedHealth, schools } from "../src/db/schema";

// A single failed attempt is common and usually transient (this session alone saw several
// one-off network blips that cleared on the next run) - not worth flagging. Genuinely
// broken feeds keep failing across multiple real ingest runs.
const ATTENTION_THRESHOLD = 2;

async function main() {
  const broken = await db
    .select({
      school: schools.name,
      sportSlug: feedHealth.sportSlug,
      consecutiveFailures: feedHealth.consecutiveFailures,
      lastError: feedHealth.lastError,
      lastSuccessAt: feedHealth.lastSuccessAt,
      lastAttemptedAt: feedHealth.lastAttemptedAt,
    })
    .from(feedHealth)
    .innerJoin(schools, eq(feedHealth.schoolId, schools.id))
    .where(gt(feedHealth.consecutiveFailures, ATTENTION_THRESHOLD - 1))
    .orderBy(desc(feedHealth.consecutiveFailures));

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(feedHealth);

  if (broken.length === 0) {
    console.log(`All clear - ${total} feeds tracked, none with ${ATTENTION_THRESHOLD}+ consecutive failures.`);
    process.exit(0);
  }

  console.log(`${broken.length} of ${total} tracked feeds need attention (${ATTENTION_THRESHOLD}+ consecutive failures):\n`);
  for (const f of broken) {
    const lastGood = f.lastSuccessAt ? f.lastSuccessAt.toISOString() : "never";
    console.log(`  ${f.school} / ${f.sportSlug}`);
    console.log(`    ${f.consecutiveFailures} consecutive failures, last success: ${lastGood}`);
    console.log(`    last error: ${f.lastError}`);
  }
  process.exit(1);
}

main();
