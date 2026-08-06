import { alias } from "drizzle-orm/pg-core";
import { and, asc, eq, gte, inArray, lt, or } from "drizzle-orm";
import { db } from "./client";
import { events, teams, schools, venues } from "./schema";

const homeTeams = alias(teams, "home_teams");
const awayTeams = alias(teams, "away_teams");
const homeSchools = alias(schools, "home_schools");
const awaySchools = alias(schools, "away_schools");

// The whole product is scoped to New England (Section 1/2/3 of CLAUDE.md) - a game an
// NE school plays away in Pennsylvania or Florida isn't "a college sporting event near
// me" for this product's users. Applied unconditionally, not just as an optional filter
// value, and doubles as the canonical clean list for the State dropdown.
export const NE_STATES = ["CT", "ME", "MA", "NH", "RI", "VT"] as const;

export const DATE_RANGES = ["today", "weekend", "week", "month"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export function isDateRange(value: string): value is DateRange {
  return (DATE_RANGES as readonly string[]).includes(value);
}

/** Upcoming Friday 00:00 through Monday 00:00 (Fri/Sat/Sun inclusive), in server local time. */
function getWeekendWindow(now: Date): { start: Date; end: Date } {
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const daysUntilFriday = (5 - day + 7) % 7;
  const isWeekendNow = day === 5 || day === 6 || day === 0;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (!isWeekendNow) {
    start.setDate(start.getDate() + daysUntilFriday);
  } else if (day === 0) {
    // Sunday: weekend started this past Friday
    start.setDate(start.getDate() - 2);
  } else if (day === 6) {
    start.setDate(start.getDate() - 1);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 3); // Fri+3 = Monday 00:00

  return { start, end };
}

export function getRangeWindow(range: DateRange, now = new Date()): { start: Date; end: Date } {
  if (range === "weekend") return getWeekendWindow(now);

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === "today" ? 1 : 7));

  return { start, end };
}

/** Parse a "YYYY-MM-DD" search-param value into a local-time Date, or undefined if invalid. */
export function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "YYYY-MM-DD" for use in <input type="date"> and query params, in local time. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface WeekendEvent {
  id: string;
  sport: string;
  gender: string;
  season: string;
  division: string | null;
  startDatetime: Date;
  status: string;
  homeSchoolName: string | null;
  awaySchoolName: string | null;
  venueName: string | null;
  venueCity: string | null;
  venueState: string | null;
  ticketUrl: string | null;
  sourceUrl: string | null;
  tvNetwork: string | null;
  streamingVideoUrl: string | null;
  radioNetwork: string | null;
  streamingAudioUrl: string | null;
}

export interface EventFilters {
  division?: string;
  state?: string;
  schoolId?: string;
  sport?: string;
  league?: string;
}

export async function getFilteredEvents(
  range: DateRange,
  filters: EventFilters,
  now?: Date
): Promise<WeekendEvent[]> {
  const { start, end } = getRangeWindow(range, now);

  const conditions = [
    gte(events.startDatetime, start),
    lt(events.startDatetime, end),
    // Product scope: New England only, always - not conditional on the state filter.
    inArray(venues.state, NE_STATES),
  ];

  if (filters.sport) conditions.push(eq(events.sport, filters.sport));
  // Division is stored on the event itself (the division of whichever seeded school's
  // feed it came from) rather than derived from home/away, per Section 5's schema.
  if (filters.division) conditions.push(eq(events.division, filters.division));
  // A game "in" a state is really about where it's physically happening - the venue's
  // location - not either participating school's home state.
  if (filters.state) conditions.push(eq(venues.state, filters.state));
  // League and school are about *who's playing*, so match either side of the matchup.
  if (filters.league) {
    conditions.push(or(eq(homeSchools.conference, filters.league), eq(awaySchools.conference, filters.league))!);
  }
  if (filters.schoolId) {
    conditions.push(or(eq(homeSchools.id, filters.schoolId), eq(awaySchools.id, filters.schoolId))!);
  }

  const rows = await db
    .select({
      id: events.id,
      sport: events.sport,
      gender: events.gender,
      season: events.season,
      division: events.division,
      startDatetime: events.startDatetime,
      status: events.status,
      homeSchoolName: homeSchools.name,
      awaySchoolName: awaySchools.name,
      venueName: venues.name,
      venueCity: venues.city,
      venueState: venues.state,
      ticketUrl: events.ticketUrl,
      sourceUrl: events.sourceUrl,
      tvNetwork: events.tvNetwork,
      streamingVideoUrl: events.streamingVideoUrl,
      radioNetwork: events.radioNetwork,
      streamingAudioUrl: events.streamingAudioUrl,
    })
    .from(events)
    .leftJoin(homeTeams, eq(events.homeTeamId, homeTeams.id))
    .leftJoin(homeSchools, eq(homeTeams.schoolId, homeSchools.id))
    .leftJoin(awayTeams, eq(events.awayTeamId, awayTeams.id))
    .leftJoin(awaySchools, eq(awayTeams.schoolId, awaySchools.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(asc(events.startDatetime));

  return rows;
}

/**
 * Upcoming events (next 7 days) for the fan-follow alert digest - one game where either
 * side's school is in schoolIds. Uses the same homeSchools/awaySchools alias + or() pattern
 * as getFilteredEvents so a fan following two schools that play each other only sees the
 * game once. Excludes cancelled games (an unsolicited email about a cancelled game is worse
 * than a webpage silently listing one) and, like the rest of the product, anything outside
 * New England. Doesn't surface special_event rows once those exist later - this only checks
 * home/away team ids.
 */
export async function getUpcomingEventsForSchoolIds(
  schoolIds: string[],
  now?: Date
): Promise<WeekendEvent[]> {
  if (schoolIds.length === 0) return [];
  const { start, end } = getRangeWindow("week", now);

  const rows = await db
    .select({
      id: events.id,
      sport: events.sport,
      gender: events.gender,
      season: events.season,
      division: events.division,
      startDatetime: events.startDatetime,
      status: events.status,
      homeSchoolName: homeSchools.name,
      awaySchoolName: awaySchools.name,
      venueName: venues.name,
      venueCity: venues.city,
      venueState: venues.state,
      ticketUrl: events.ticketUrl,
      sourceUrl: events.sourceUrl,
      tvNetwork: events.tvNetwork,
      streamingVideoUrl: events.streamingVideoUrl,
      radioNetwork: events.radioNetwork,
      streamingAudioUrl: events.streamingAudioUrl,
    })
    .from(events)
    .leftJoin(homeTeams, eq(events.homeTeamId, homeTeams.id))
    .leftJoin(homeSchools, eq(homeTeams.schoolId, homeSchools.id))
    .leftJoin(awayTeams, eq(events.awayTeamId, awayTeams.id))
    .leftJoin(awaySchools, eq(awayTeams.schoolId, awaySchools.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(
      and(
        gte(events.startDatetime, start),
        lt(events.startDatetime, end),
        inArray(venues.state, NE_STATES),
        or(inArray(homeSchools.id, schoolIds), inArray(awaySchools.id, schoolIds)),
        or(eq(events.status, "scheduled"), eq(events.status, "postponed"), eq(events.status, "final"))
      )
    )
    .orderBy(asc(events.startDatetime));

  return rows;
}

export interface FilterOptions {
  divisions: string[];
  states: readonly string[];
  schools: { id: string; name: string }[];
  sports: string[];
  leagues: string[];
}

/** Populate filter dropdowns from what's actually in the seeded/ingested data today. */
export async function getFilterOptions(): Promise<FilterOptions> {
  const [divisionRows, schoolRows, sportRows, leagueRows] = await Promise.all([
    db.selectDistinct({ value: schools.division }).from(schools).orderBy(asc(schools.division)),
    db.select({ id: schools.id, name: schools.name }).from(schools).orderBy(asc(schools.name)),
    db.selectDistinct({ value: events.sport }).from(events).orderBy(asc(events.sport)),
    db.selectDistinct({ value: schools.conference }).from(schools).orderBy(asc(schools.conference)),
  ]);

  return {
    divisions: divisionRows.map((r) => r.value),
    states: NE_STATES,
    schools: schoolRows,
    sports: sportRows.map((r) => r.value),
    leagues: leagueRows.map((r) => r.value),
  };
}
