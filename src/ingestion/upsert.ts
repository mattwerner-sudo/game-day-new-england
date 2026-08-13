import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { db } from "../db/client";
import { events, schools, teams, venues, feedHealth } from "../db/schema";
import { SCHOOL_NAME_ALIASES } from "./schoolAliases";

/**
 * Fuzzy-matches an opponent name parsed from one school's feed against our seeded
 * schools. Returns the *canonical* school name too, not just the id - the two sides
 * of the same real game often name each other differently ("Amherst College" from
 * Amherst's own feed vs. just "Amherst" from Bowdoin's) which otherwise produces two
 * different dedupe keys for one real game.
 *
 * Checks the known-ambiguous-alias table first (see schoolAliases.ts) - a plain substring
 * match alone can silently pick the wrong school when more than one seeded school's name
 * contains the same short form (confirmed real: "Rhode Island" matching both "Rhode Island
 * College" and "University of Rhode Island", with no ORDER BY to make the pick deterministic
 * let alone correct). The substring fallback below now orders by name for at least
 * reproducible behavior on any other, not-yet-discovered collision.
 */
export async function findSchoolByName(
  name: string
): Promise<{ id: string; name: string; city: string; state: string } | null> {
  const alias = SCHOOL_NAME_ALIASES[name.trim().toLowerCase()];
  if (alias) {
    const aliasRows = await db
      .select({ id: schools.id, name: schools.name, city: schools.city, state: schools.state })
      .from(schools)
      .where(eq(schools.name, alias))
      .limit(1);
    if (aliasRows[0]) return aliasRows[0];
  }

  const rows = await db
    .select({ id: schools.id, name: schools.name, city: schools.city, state: schools.state })
    .from(schools)
    .where(ilike(schools.name, `%${name}%`))
    .orderBy(schools.name)
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTeam(
  schoolId: string,
  sport: string,
  gender: string,
  override?: { conference: string; division?: string } | null
): Promise<string> {
  const inserted = await db
    .insert(teams)
    .values({
      schoolId,
      sport,
      gender,
      conference: override?.conference ?? null,
      division: override?.division ?? null,
    })
    .onConflictDoNothing()
    .returning({ id: teams.id });

  if (inserted[0]) return inserted[0].id;

  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.schoolId, schoolId), eq(teams.sport, sport), eq(teams.gender, gender)))
    .limit(1);

  // Backfill/correct the override on an already-existing team row too, so fixing or
  // adding an entry in conferenceOverrides.ts self-corrects on the next ingest run
  // rather than only applying to brand-new teams.
  if (override) {
    await db
      .update(teams)
      .set({ conference: override.conference, division: override.division ?? null })
      .where(eq(teams.id, existing[0].id));
  }

  return existing[0].id;
}

export async function upsertVenue(
  name: string,
  schoolId: string | null,
  city: string | null,
  state: string | null
): Promise<string> {
  const whereClause = schoolId
    ? and(eq(venues.name, name), eq(venues.schoolId, schoolId))
    : and(eq(venues.name, name), isNull(venues.schoolId));

  const existing = await db.select({ id: venues.id }).from(venues).where(whereClause).limit(1);
  if (existing[0]) {
    // Backfill city/state on venue rows created before those columns existed.
    await db.update(venues).set({ city, state }).where(eq(venues.id, existing[0].id));
    return existing[0].id;
  }

  const inserted = await db
    .insert(venues)
    .values({ name, schoolId: schoolId ?? undefined, city, state })
    .returning({ id: venues.id });

  return inserted[0].id;
}

export interface EventUpsertInput {
  type: string;
  sport: string;
  gender: string;
  season: string;
  division: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  venueId: string;
  startDatetime: Date;
  endDatetime: Date | null;
  status: string;
  source: string;
  sourceEventId: string;
  dedupeKey: string;
  ticketUrl?: string | null;
  sourceUrl?: string | null;
  tvNetwork?: string | null;
  streamingVideoUrl?: string | null;
  radioNetwork?: string | null;
  streamingAudioUrl?: string | null;
  opponentNameRaw?: string | null;
  isExhibition?: boolean;
}

/**
 * Records one ingest attempt for a (school, sport) pair - success resets the failure
 * streak, failure increments it. Called for every sport on every ingest run (not just
 * failures), since a feed that's fine needs its lastSuccessAt refreshed too, otherwise a
 * long-untouched-but-healthy feed would look identical to a truly stale one in a report.
 */
export async function recordFeedHealth(
  schoolId: string,
  sportSlug: string,
  result: { success: true } | { success: false; error: string }
): Promise<void> {
  const now = new Date();
  if (result.success) {
    await db
      .insert(feedHealth)
      .values({
        schoolId,
        sportSlug,
        lastAttemptedAt: now,
        lastSuccessAt: now,
        lastError: null,
        consecutiveFailures: 0,
      })
      .onConflictDoUpdate({
        target: [feedHealth.schoolId, feedHealth.sportSlug],
        set: { lastAttemptedAt: now, lastSuccessAt: now, lastError: null, consecutiveFailures: 0 },
      });
  } else {
    await db
      .insert(feedHealth)
      .values({
        schoolId,
        sportSlug,
        lastAttemptedAt: now,
        lastError: result.error,
        consecutiveFailures: 1,
      })
      .onConflictDoUpdate({
        target: [feedHealth.schoolId, feedHealth.sportSlug],
        set: {
          lastAttemptedAt: now,
          lastError: result.error,
          consecutiveFailures: sql`${feedHealth.consecutiveFailures} + 1`,
        },
      });
  }
}

export async function upsertEvent(data: EventUpsertInput): Promise<"inserted" | "updated"> {
  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.dedupeKey, data.dedupeKey))
    .limit(1);

  if (existing[0]) {
    await db
      .update(events)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(events.dedupeKey, data.dedupeKey));
    return "updated";
  }

  await db.insert(events).values(data);
  return "inserted";
}

export interface SpecialEventUpsertInput {
  sport: string;
  gender: string;
  season: string;
  division: string | null;
  eventName: string;
  venueId: string | null;
  participatingSchoolId: string;
  startDatetime: Date;
  endDatetime: Date | null;
  status: string;
  source: string;
  sourceEventId: string;
  dedupeKey: string;
}

/**
 * Multi-team meets (cross country, track & field, invitationals, tournaments) show up once
 * per participating school's own feed, each pass only knowing about itself - unlike a 2-team
 * game's dedupeKey (home+away), a meet's dedupeKey can't include the school list (see
 * computeSpecialEventDedupeKey), so participatingSchoolIds has to be *merged* across passes
 * rather than overwritten like upsertEvent()'s other fields. Whichever pass runs first "wins"
 * for the shared fields (venue, division, etc.) - acceptable since those should be the same
 * real meet regardless of which participating school's feed is read first.
 */
export async function upsertSpecialEvent(data: SpecialEventUpsertInput): Promise<"inserted" | "updated"> {
  const existing = await db
    .select({ id: events.id, participatingSchoolIds: events.participatingSchoolIds })
    .from(events)
    .where(eq(events.dedupeKey, data.dedupeKey))
    .limit(1);

  if (existing[0]) {
    const merged = Array.from(
      new Set([...(existing[0].participatingSchoolIds ?? []), data.participatingSchoolId])
    );
    await db
      .update(events)
      .set({
        type: "special_event",
        sport: data.sport,
        gender: data.gender,
        season: data.season,
        division: data.division,
        eventName: data.eventName,
        venueId: data.venueId,
        participatingSchoolIds: merged,
        startDatetime: data.startDatetime,
        endDatetime: data.endDatetime,
        status: data.status,
        source: data.source,
        sourceEventId: data.sourceEventId,
        updatedAt: new Date(),
      })
      .where(eq(events.dedupeKey, data.dedupeKey));
    return "updated";
  }

  await db.insert(events).values({
    type: "special_event",
    sport: data.sport,
    gender: data.gender,
    season: data.season,
    division: data.division,
    eventName: data.eventName,
    homeTeamId: null,
    awayTeamId: null,
    participatingSchoolIds: [data.participatingSchoolId],
    venueId: data.venueId,
    startDatetime: data.startDatetime,
    endDatetime: data.endDatetime,
    status: data.status,
    source: data.source,
    sourceEventId: data.sourceEventId,
    dedupeKey: data.dedupeKey,
  });
  return "inserted";
}
