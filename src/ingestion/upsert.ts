import { and, eq, ilike, isNull } from "drizzle-orm";
import { db } from "../db/client";
import { events, schools, teams, venues } from "../db/schema";

/**
 * Fuzzy-matches an opponent name parsed from one school's feed against our seeded
 * schools. Returns the *canonical* school name too, not just the id - the two sides
 * of the same real game often name each other differently ("Amherst College" from
 * Amherst's own feed vs. just "Amherst" from Bowdoin's) which otherwise produces two
 * different dedupe keys for one real game.
 */
export async function findSchoolByName(
  name: string
): Promise<{ id: string; name: string } | null> {
  const rows = await db
    .select({ id: schools.id, name: schools.name })
    .from(schools)
    .where(ilike(schools.name, `%${name}%`))
    .limit(1);
  return rows[0] ?? null;
}

export async function upsertTeam(schoolId: string, sport: string, gender: string): Promise<string> {
  const inserted = await db
    .insert(teams)
    .values({ schoolId, sport, gender })
    .onConflictDoNothing()
    .returning({ id: teams.id });

  if (inserted[0]) return inserted[0].id;

  const existing = await db
    .select({ id: teams.id })
    .from(teams)
    .where(and(eq(teams.schoolId, schoolId), eq(teams.sport, sport), eq(teams.gender, gender)))
    .limit(1);

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
