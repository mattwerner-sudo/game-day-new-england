import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  fanFollows,
  teamFollows,
  leagueFollows,
  specialVenueFollows,
  gameFollows,
  consentEvents,
  schools,
  teams,
  events,
} from "@/db/schema";

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

export async function unfollowSchool(userId: string, schoolId: string): Promise<void> {
  await db.delete(fanFollows).where(and(eq(fanFollows.userId, userId), eq(fanFollows.schoolId, schoolId)));
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

// --- teams ---

export async function addTeamFollows(userId: string, teamIds: string[]): Promise<void> {
  if (teamIds.length === 0) return;
  await db
    .insert(teamFollows)
    .values(teamIds.map((teamId) => ({ userId, teamId })))
    .onConflictDoNothing();
}

export async function unfollowTeam(userId: string, teamId: string): Promise<void> {
  await db.delete(teamFollows).where(and(eq(teamFollows.userId, userId), eq(teamFollows.teamId, teamId)));
}

export async function getFollowedTeams(
  userId: string
): Promise<{ id: string; sport: string; gender: string; schoolId: string; schoolName: string }[]> {
  return db
    .select({
      id: teams.id,
      sport: teams.sport,
      gender: teams.gender,
      schoolId: schools.id,
      schoolName: schools.name,
    })
    .from(teamFollows)
    .innerJoin(teams, eq(teamFollows.teamId, teams.id))
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teamFollows.userId, userId));
}

export async function isFollowingTeam(userId: string, teamId: string): Promise<boolean> {
  const rows = await db
    .select({ id: teamFollows.id })
    .from(teamFollows)
    .where(and(eq(teamFollows.userId, userId), eq(teamFollows.teamId, teamId)))
    .limit(1);
  return rows.length > 0;
}

// --- leagues (no join - a league is plain text, see schema.ts's comment on leagueFollows) ---

export async function addLeagueFollows(userId: string, leagues: string[]): Promise<void> {
  if (leagues.length === 0) return;
  await db
    .insert(leagueFollows)
    .values(leagues.map((league) => ({ userId, league })))
    .onConflictDoNothing();
}

export async function unfollowLeague(userId: string, league: string): Promise<void> {
  await db.delete(leagueFollows).where(and(eq(leagueFollows.userId, userId), eq(leagueFollows.league, league)));
}

export async function getFollowedLeagues(userId: string): Promise<string[]> {
  const rows = await db.select({ league: leagueFollows.league }).from(leagueFollows).where(eq(leagueFollows.userId, userId));
  return rows.map((r) => r.league);
}

export async function isFollowingLeague(userId: string, league: string): Promise<boolean> {
  const rows = await db
    .select({ id: leagueFollows.id })
    .from(leagueFollows)
    .where(and(eq(leagueFollows.userId, userId), eq(leagueFollows.league, league)))
    .limit(1);
  return rows.length > 0;
}

// --- special venues (canonical name, not a venues.id - see src/db/specialVenues.ts) ---

export async function addSpecialVenueFollows(userId: string, venueNames: string[]): Promise<void> {
  if (venueNames.length === 0) return;
  await db
    .insert(specialVenueFollows)
    .values(venueNames.map((venueName) => ({ userId, venueName })))
    .onConflictDoNothing();
}

export async function unfollowSpecialVenue(userId: string, venueName: string): Promise<void> {
  await db
    .delete(specialVenueFollows)
    .where(and(eq(specialVenueFollows.userId, userId), eq(specialVenueFollows.venueName, venueName)));
}

export async function getFollowedSpecialVenues(userId: string): Promise<string[]> {
  const rows = await db
    .select({ venueName: specialVenueFollows.venueName })
    .from(specialVenueFollows)
    .where(eq(specialVenueFollows.userId, userId));
  return rows.map((r) => r.venueName);
}

export async function isFollowingSpecialVenue(userId: string, venueName: string): Promise<boolean> {
  const rows = await db
    .select({ id: specialVenueFollows.id })
    .from(specialVenueFollows)
    .where(and(eq(specialVenueFollows.userId, userId), eq(specialVenueFollows.venueName, venueName)))
    .limit(1);
  return rows.length > 0;
}

// --- games ---

export async function addGameFollows(userId: string, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  await db
    .insert(gameFollows)
    .values(eventIds.map((eventId) => ({ userId, eventId })))
    .onConflictDoNothing();
}

export async function unfollowGame(userId: string, eventId: string): Promise<void> {
  await db.delete(gameFollows).where(and(eq(gameFollows.userId, userId), eq(gameFollows.eventId, eventId)));
}

export async function getFollowedGameIds(userId: string): Promise<string[]> {
  const rows = await db.select({ eventId: gameFollows.eventId }).from(gameFollows).where(eq(gameFollows.userId, userId));
  return rows.map((r) => r.eventId);
}

export async function isFollowingGame(userId: string, eventId: string): Promise<boolean> {
  const rows = await db
    .select({ id: gameFollows.id })
    .from(gameFollows)
    .where(and(eq(gameFollows.userId, userId), eq(gameFollows.eventId, eventId)))
    .limit(1);
  return rows.length > 0;
}

export async function logConsentEvent(
  userId: string,
  action: "registered" | "onboarded" | "unsubscribed" | "sms_registered" | "sms_unsubscribed",
  schoolIds: string[]
): Promise<void> {
  await db.insert(consentEvents).values({ userId, action, schoolIds });
}

export type FollowSubjectType = "school" | "team" | "league" | "venue" | "game";

/**
 * Parallel to logConsentEvent, for the new follow/unfollow actions - schoolIds is uuid[],
 * which can't hold league/venue name strings, so these go through the separate
 * subjectType/subjectIds columns (schema.ts) instead. Covers all 5 subject types, schools
 * included, going forward.
 */
export async function logFollowConsentEvent(
  userId: string,
  action: `followed_${FollowSubjectType}` | `unfollowed_${FollowSubjectType}`,
  subjectType: FollowSubjectType,
  subjectIds: string[]
): Promise<void> {
  await db.insert(consentEvents).values({ userId, action, subjectType, subjectIds });
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
