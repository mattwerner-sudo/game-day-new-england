import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, fanFollows, consentEvents, schools } from "@/db/schema";

/**
 * findOrCreateFan/findFanByToken/confirmFan are gone - Better Auth (src/auth/auth.ts) now owns
 * account creation and email verification for all 3 signup methods. What's left here is purely
 * the follow/consent/unsubscribe layer, now keyed on Better Auth's users.id instead of the old
 * fans.id.
 */
export async function addFollows(userId: string, schoolIds: string[]): Promise<void> {
  if (schoolIds.length === 0) return;
  await db
    .insert(fanFollows)
    .values(schoolIds.map((schoolId) => ({ userId, schoolId })))
    .onConflictDoNothing();
}

export async function getFollowedSchools(
  userId: string
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: schools.id, name: schools.name })
    .from(fanFollows)
    .innerJoin(schools, eq(fanFollows.schoolId, schools.id))
    .where(eq(fanFollows.userId, userId));
}

export async function logConsentEvent(
  userId: string,
  action: "registered" | "onboarded" | "unsubscribed" | "sms_registered" | "sms_unsubscribed",
  schoolIds: string[]
): Promise<void> {
  await db.insert(consentEvents).values({ userId, action, schoolIds });
}

/** Looked up by the same no-login manage/unsubscribe token the old fans table used. */
export async function findUserByManageToken(token: string) {
  const rows = await db.select().from(users).where(eq(users.manageToken, token)).limit(1);
  return rows[0] ?? null;
}

export async function unsubscribeEmailAlerts(userId: string): Promise<void> {
  await db.update(users).set({ emailAlertsUnsubscribedAt: new Date() }).where(eq(users.id, userId));
}

/**
 * Unlike email, there's no separate click-to-confirm step - checking the SMS box on /onboarding
 * and submitting the form *is* the required "prior express written consent" (TCPA), so this
 * unconditionally (re)sets smsAlertsPhone + smsConsentedAt and clears smsUnsubscribedAt every
 * time it's called. Deliberately a separate fact from users.phoneNumber (login verification) -
 * see schema.ts's comment on the users table.
 */
export async function setSmsConsent(userId: string, phone: string): Promise<void> {
  await db
    .update(users)
    .set({ smsAlertsPhone: phone, smsConsentedAt: new Date(), smsUnsubscribedAt: null })
    .where(eq(users.id, userId));
}

export async function unsubscribeFromSms(userId: string): Promise<void> {
  await db.update(users).set({ smsUnsubscribedAt: new Date() }).where(eq(users.id, userId));
}

/** For the inbound Twilio webhook's STOP-keyword handling - looked up by phone, not token. */
export async function findUserBySmsPhone(phone: string) {
  const rows = await db.select().from(users).where(eq(users.smsAlertsPhone, phone)).limit(1);
  return rows[0] ?? null;
}
