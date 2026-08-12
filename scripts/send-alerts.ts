import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../src/db/client";
import { fans, fanAlertLog } from "../src/db/schema";
import { getFollowedSchools } from "../src/fans/queries";
import { getUpcomingEventsForSchoolIds, WeekendEvent } from "../src/db/queries";
import { sendEmail } from "../src/email/send";
import { digestEmail } from "../src/email/templates";
import { sendSms } from "../src/sms/send";
import { digestSms } from "../src/sms/templates";

/**
 * Human-triggered like ingest.ts - not cron'd yet (CLAUDE.md Section 0.3: nothing in this
 * repo is autonomous). Safe to re-run: fan_alert_log dedupes per (fan, event, channel) so
 * already-sent games are never re-sent on either channel, which matters a lot here since
 * re-sending the same game repeatedly would poison the exact "will fans register with a third
 * party" trust test this feature exists to run.
 *
 * Email and SMS are independent channels with independent eligibility (confirmedAt/
 * unsubscribedAt for email, smsConsentedAt/smsUnsubscribedAt for SMS) and independent dedup -
 * a fan subscribed to both gets both, a fan who stopped texts but kept email still gets email,
 * and sending one channel never marks the other as sent (see fanAlertLog's channel column).
 */
async function sentEventIds(fanId: string, channel: "email" | "sms"): Promise<Set<string>> {
  const rows = await db
    .select({ eventId: fanAlertLog.eventId })
    .from(fanAlertLog)
    .where(and(eq(fanAlertLog.fanId, fanId), eq(fanAlertLog.channel, channel)));
  return new Set(rows.map((r) => r.eventId));
}

async function logSent(fanId: string, events: WeekendEvent[], channel: "email" | "sms"): Promise<void> {
  await db.insert(fanAlertLog).values(events.map((e) => ({ fanId, eventId: e.id, channel })));
}

async function main() {
  const eligibleFans = await db
    .select()
    .from(fans)
    .where(
      or(
        and(isNull(fans.unsubscribedAt), isNotNull(fans.confirmedAt)),
        and(isNull(fans.smsUnsubscribedAt), isNotNull(fans.smsConsentedAt))
      )
    );

  console.log(`${eligibleFans.length} fan(s) eligible for at least one channel`);

  for (const fan of eligibleFans) {
    const followedSchools = await getFollowedSchools(fan.id);
    if (followedSchools.length === 0) continue;

    const schoolIds = followedSchools.map((s) => s.id);
    const upcoming = await getUpcomingEventsForSchoolIds(schoolIds);
    const schoolNames = followedSchools.map((s) => s.name);

    const emailEligible = fan.confirmedAt && !fan.unsubscribedAt;
    if (emailEligible) {
      const alreadySent = await sentEventIds(fan.id, "email");
      const toSend = upcoming.filter((e) => !alreadySent.has(e.id));
      if (toSend.length > 0) {
        const { subject, html } = digestEmail(schoolNames, toSend, fan.manageToken);
        await sendEmail({ to: fan.email, subject, html });
        await logSent(fan.id, toSend, "email");
        console.log(`  ${fan.email} [email]: sent digest with ${toSend.length} game(s)`);
      } else {
        console.log(`  ${fan.email} [email]: nothing new`);
      }
    }

    const smsEligible = fan.smsConsentedAt && !fan.smsUnsubscribedAt && fan.phone;
    if (smsEligible) {
      const alreadySent = await sentEventIds(fan.id, "sms");
      const toSend = upcoming.filter((e) => !alreadySent.has(e.id));
      if (toSend.length > 0) {
        const body = digestSms(schoolNames, toSend, fan.manageToken);
        await sendSms({ to: fan.phone!, body });
        await logSent(fan.id, toSend, "sms");
        console.log(`  ${fan.phone} [sms]: sent digest with ${toSend.length} game(s)`);
      } else {
        console.log(`  ${fan.phone} [sms]: nothing new`);
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
