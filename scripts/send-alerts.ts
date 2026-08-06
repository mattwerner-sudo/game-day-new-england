import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db } from "../src/db/client";
import { fans, fanAlertLog } from "../src/db/schema";
import { getFollowedSchools } from "../src/fans/queries";
import { getUpcomingEventsForSchoolIds } from "../src/db/queries";
import { sendEmail } from "../src/email/send";
import { digestEmail } from "../src/email/templates";

/**
 * Human-triggered like ingest.ts - not cron'd yet (CLAUDE.md Section 0.3: nothing in this
 * repo is autonomous). Safe to re-run: fan_alert_log dedupes so already-sent games are never
 * re-emailed, which matters a lot here since re-sending the same game repeatedly would poison
 * the exact "will fans register with a third party" trust test this feature exists to run.
 */
async function main() {
  const confirmedFans = await db
    .select()
    .from(fans)
    .where(and(isNull(fans.unsubscribedAt), isNotNull(fans.confirmedAt)));

  console.log(`${confirmedFans.length} confirmed, subscribed fan(s)`);

  for (const fan of confirmedFans) {
    const followedSchools = await getFollowedSchools(fan.id);
    if (followedSchools.length === 0) continue;

    const schoolIds = followedSchools.map((s) => s.id);
    const upcoming = await getUpcomingEventsForSchoolIds(schoolIds);

    const alreadySent = await db
      .select({ eventId: fanAlertLog.eventId })
      .from(fanAlertLog)
      .where(eq(fanAlertLog.fanId, fan.id));
    const alreadySentIds = new Set(alreadySent.map((r) => r.eventId));

    const toSend = upcoming.filter((e) => !alreadySentIds.has(e.id));
    if (toSend.length === 0) {
      console.log(`  ${fan.email}: nothing new`);
      continue;
    }

    const { subject, html } = digestEmail(
      followedSchools.map((s) => s.name),
      toSend,
      fan.manageToken
    );
    await sendEmail({ to: fan.email, subject, html });
    await db.insert(fanAlertLog).values(toSend.map((e) => ({ fanId: fan.id, eventId: e.id })));

    console.log(`  ${fan.email}: sent digest with ${toSend.length} game(s)`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
