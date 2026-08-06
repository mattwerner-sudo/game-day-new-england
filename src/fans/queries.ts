import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { fans, fanFollows, consentEvents, schools } from "@/db/schema";
import { generateToken } from "./tokens";

export interface Fan {
  id: string;
  email: string;
  manageToken: string;
  confirmedAt: Date | null;
  unsubscribedAt: Date | null;
}

/** Same insert -> onConflictDoNothing -> select-if-not-returned idiom as upsertTeam. */
export async function findOrCreateFan(email: string): Promise<Fan> {
  const normalized = email.trim().toLowerCase();

  const inserted = await db
    .insert(fans)
    .values({ email: normalized, manageToken: generateToken() })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) return inserted[0];

  const existing = await db.select().from(fans).where(eq(fans.email, normalized)).limit(1);
  return existing[0];
}

export async function findFanByToken(token: string): Promise<Fan | null> {
  const rows = await db.select().from(fans).where(eq(fans.manageToken, token)).limit(1);
  return rows[0] ?? null;
}

export async function addFollows(fanId: string, schoolIds: string[]): Promise<void> {
  if (schoolIds.length === 0) return;
  await db
    .insert(fanFollows)
    .values(schoolIds.map((schoolId) => ({ fanId, schoolId })))
    .onConflictDoNothing();
}

export async function getFollowedSchools(
  fanId: string
): Promise<{ id: string; name: string }[]> {
  return db
    .select({ id: schools.id, name: schools.name })
    .from(fanFollows)
    .innerJoin(schools, eq(fanFollows.schoolId, schools.id))
    .where(eq(fanFollows.fanId, fanId));
}

export async function logConsentEvent(
  fanId: string,
  action: "registered" | "confirmed" | "unsubscribed",
  schoolIds: string[]
): Promise<void> {
  await db.insert(consentEvents).values({ fanId, action, schoolIds });
}

/**
 * Sets confirmedAt and clears unsubscribedAt - this is also the resubscribe path (a fan who
 * previously unsubscribed and submits /follow again isn't reactivated until they click a
 * fresh confirm link, per CLAUDE.md's explicit resubscribe decision).
 */
export async function confirmFan(fanId: string): Promise<void> {
  await db
    .update(fans)
    .set({ confirmedAt: new Date(), unsubscribedAt: null })
    .where(eq(fans.id, fanId));
}

export async function unsubscribeFan(fanId: string): Promise<void> {
  await db
    .update(fans)
    .set({ unsubscribedAt: new Date() })
    .where(eq(fans.id, fanId));
}
