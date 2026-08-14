import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../src/db/client";
import { users, fanAlertLog } from "../src/db/schema";
import { getFollowedSchools } from "../src/fans/queries";
import { getUpcomingEventsForSchoolIds, WeekendEvent } from "../src/db/queries";
import { sendEmail } from "../src/email/send";
import { digestEmail } from "../src/email/templates";
import { sendSms } from "../src/sms/send";
import { digestSms } from "../src/sms/templates";

/**
 * Human-triggered like ingest.ts - not cron'd yet (CLAUDE.md Section 0.3: nothing in this
 * repo is autonomous). Safe to re-run: fan_alert_log dedupes per (user, event, channel) so
 * already-sent games are never re-sent on either channel, which matters a lot here since
 * re-sending the same game repeatedly would poison the exact "will people register with a
 * third party" trust test this feature exists to run.
 *
 * Email and SMS are independent channels with independent eligibility (emailVerified/
 * emailAlertsUnsubscribedAt for email, smsConsentedAt/smsUnsubscribedAt for SMS) and independent
 * dedup - someone subscribed to both gets both, someone who stopped texts but kept email still
 * gets email, and sending one channel never marks the other as sent (see fanAlertLog's channel
 * column).
 */
async function sentEventIds(userId: string, channel: "email" | "sms"): Promise<Set<string>> {
  const rows = await db
    .select({ eventId: fanAlertLog.eventId })
    .from(fanAlertLog)
    .where(and(eq(fanAlertLog.userId, userId), eq(fanAlertLog.channel, channel)));
  return new Set(rows.map((r) => r.eventId));
}

async function logSent(userId: string, events: WeekendEvent[], channel: "email" | "sms"): Promise<void> {
  await db.insert(fanAlertLog).values(events.map((e) => ({ userId, eventId: e.id, channel })));
}

async function main() {
  const eligibleUsers = await db
    .select()
    .from(users)
    .where(
      or(
        and(isNull(users.emailAlertsUnsubscribedAt), eq(users.emailVerified, true)),
        and(isNull(users.smsUnsubscribedAt), isNotNull(users.smsConsentedAt))
      )
    );

  console.log(`${eligibleUsers.length} user(s) eligible for at least one channel`);

  for (const user of eligibleUsers) {
    const followedSchools = await getFollowedSchools(user.id);
    if (followedSchools.length === 0) continue;

    const schoolIds = followedSchools.map((s) => s.id);
    const upcoming = await getUpcomingEventsForSchoolIds(schoolIds);
    const schoolNames = followedSchools.map((s) => s.name);

    // manageToken is always populated on creation (src/auth/auth.ts's databaseHooks) - nullable
    // at the DB level only because Better Auth's additionalFields don't support NOT NULL.
    const manageToken = user.manageToken!;

    const emailEligible = user.emailVerified && !user.emailAlertsUnsubscribedAt;
    if (emailEligible) {
      const alreadySent = await sentEventIds(user.id, "email");
      const toSend = upcoming.filter((e) => !alreadySent.has(e.id));
      if (toSend.length > 0) {
        const { subject, html } = digestEmail(schoolNames, toSend, manageToken);
        await sendEmail({ to: user.email, subject, html });
        await logSent(user.id, toSend, "email");
        console.log(`  ${user.email} [email]: sent digest with ${toSend.length} game(s)`);
      } else {
        console.log(`  ${user.email} [email]: nothing new`);
      }
    }

    const smsEligible = user.smsConsentedAt && !user.smsUnsubscribedAt && user.smsAlertsPhone;
    if (smsEligible) {
      const alreadySent = await sentEventIds(user.id, "sms");
      const toSend = upcoming.filter((e) => !alreadySent.has(e.id));
      if (toSend.length > 0) {
        const body = digestSms(schoolNames, toSend, manageToken);
        await sendSms({ to: user.smsAlertsPhone!, body });
        await logSent(user.id, toSend, "sms");
        console.log(`  ${user.smsAlertsPhone} [sms]: sent digest with ${toSend.length} game(s)`);
      } else {
        console.log(`  ${user.smsAlertsPhone} [sms]: nothing new`);
      }
    }
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
