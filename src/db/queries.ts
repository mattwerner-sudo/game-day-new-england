import { alias } from "drizzle-orm/pg-core";
import { and, arrayOverlaps, asc, eq, gte, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "./client";
import { events, teams, schools, venues } from "./schema";
import { NE_STATES, DateRange, getRangeWindow } from "./dateRange";
import { resolveSpecialVenue } from "./specialVenues";
import { getSchoolLogoUrl } from "@/lib/schoolLogo";
import { slugify } from "@/lib/slug";

export * from "./dateRange";

const homeTeams = alias(teams, "home_teams");
const awayTeams = alias(teams, "away_teams");
const homeSchools = alias(schools, "home_schools");
const awaySchools = alias(schools, "away_schools");

/** Left-joined school columns are nullable regardless of the underlying not-null constraint. */
function resolveLogo(
  schoolName: string | null,
  websiteUrl: string | null,
  cmsPlatform: string | null
): string | null {
  if (!websiteUrl || !cmsPlatform) return null;
  return getSchoolLogoUrl(schoolName, websiteUrl, cmsPlatform);
}

export interface WeekendEvent {
  id: string;
  type: string;
  sport: string;
  gender: string;
  season: string;
  division: string | null;
  startDatetime: Date;
  status: string;
  isExhibition: boolean;
  homeSchoolName: string | null;
  awaySchoolName: string | null;
  homeSchoolLogoUrl: string | null;
  awaySchoolLogoUrl: string | null;
  // special_event only (meets, invitationals, championships - see CLAUDE.md Section 5/31).
  // homeSchoolName/awaySchoolName stay null for these rows - there's no single home team.
  eventName: string | null;
  participatingSchoolNames: string[];
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

/**
 * Resolves a special_event's participatingSchoolIds (uuid[]) to real school names via a
 * correlated subquery, sorted so display order is stable. Empty array (not null) for game
 * rows, so callers never need a null check before .map()/.join().
 */
const participatingSchoolNamesSql = sql<string[]>`coalesce(
  (select array_agg(${schools.name} order by ${schools.name}) from ${schools}
   where ${schools.id} = any(${events.participatingSchoolIds})),
  array[]::text[]
)`;

export interface EventFilters {
  division?: string;
  state?: string;
  schoolId?: string;
  sport?: string;
  league?: string;
  gender?: string;
}

async function getFilteredEventsUncached(
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
  // gender is NOT NULL on every event, games and special_events alike, so this needs no
  // third arm the way schoolId's participatingSchoolIds check does.
  if (filters.gender) conditions.push(eq(events.gender, filters.gender));
  // Division is stored on the event itself (the division of whichever seeded school's
  // feed it came from) rather than derived from home/away, per Section 5's schema.
  if (filters.division) conditions.push(eq(events.division, filters.division));
  // A game "in" a state is really about where it's physically happening - the venue's
  // location - not either participating school's home state.
  if (filters.state) conditions.push(eq(venues.state, filters.state));
  // League and school are about *who's playing*, so match either side of the matchup.
  // A team's own conference (set for the real exceptions - see conferenceOverrides.ts,
  // e.g. Bentley's hockey team plays Atlantic Hockey America despite Bentley itself
  // being a Northeast-10 school) takes precedence over the school's default conference.
  if (filters.league) {
    const homeLeague = sql`coalesce(${homeTeams.conference}, ${homeSchools.conference})`;
    const awayLeague = sql`coalesce(${awayTeams.conference}, ${awaySchools.conference})`;
    conditions.push(or(eq(homeLeague, filters.league), eq(awayLeague, filters.league))!);
  }
  if (filters.schoolId) {
    // A special_event has no home/away side to match against - a participating school shows
    // up in participatingSchoolIds instead, so the school filter needs a third arm to catch
    // meets/championships a filtered school is actually in.
    conditions.push(
      or(
        eq(homeSchools.id, filters.schoolId),
        eq(awaySchools.id, filters.schoolId),
        sql`${filters.schoolId} = any(${events.participatingSchoolIds})`
      )!
    );
  }

  const rows = await db
    .select({
      id: events.id,
      type: events.type,
      sport: events.sport,
      gender: events.gender,
      season: events.season,
      division: events.division,
      startDatetime: events.startDatetime,
      status: events.status,
      isExhibition: events.isExhibition,
      // Falls back to the raw opponent name text when a side didn't resolve to a seeded
      // New England school (e.g. UConn vs. Syracuse - Syracuse isn't in this app's schools
      // table, but the feed did name them) - only "TBD" (page.tsx/templates.ts's own final
      // fallback) when even that raw text is missing.
      homeSchoolName: sql<string | null>`coalesce(${homeSchools.name}, ${events.opponentNameRaw})`,
      awaySchoolName: sql<string | null>`coalesce(${awaySchools.name}, ${events.opponentNameRaw})`,
      homeSchoolWebsiteUrl: homeSchools.websiteUrl,
      homeSchoolCmsPlatform: homeSchools.cmsPlatform,
      awaySchoolWebsiteUrl: awaySchools.websiteUrl,
      awaySchoolCmsPlatform: awaySchools.cmsPlatform,
      eventName: events.eventName,
      participatingSchoolNames: participatingSchoolNamesSql,
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

  return rows.map((r) => ({
    ...r,
    homeSchoolLogoUrl: resolveLogo(r.homeSchoolName, r.homeSchoolWebsiteUrl, r.homeSchoolCmsPlatform),
    awaySchoolLogoUrl: resolveLogo(r.awaySchoolName, r.awaySchoolWebsiteUrl, r.awaySchoolCmsPlatform),
  }));
}

/**
 * Extends WeekendEvent with the raw ids/text a follow action needs (team ids, resolved league
 * per side, resolved special-venue canonical name) - kept as a distinct type/query rather than
 * adding these to WeekendEvent itself, which getFilteredEvents also returns for the hot list
 * page. Section 42's caching-bug lesson was a bloated payload silently causing problems - don't
 * grow that payload for fields only the single-event detail page needs.
 */
export interface EventDetail extends WeekendEvent {
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLeague: string | null;
  awayLeague: string | null;
  specialVenueName: string | null;
}

/** Single event for its detail page (src/app/events/[id]/page.tsx) - not date-range scoped. */
export async function getEventById(id: string): Promise<EventDetail | null> {
  const rows = await db
    .select({
      id: events.id,
      type: events.type,
      sport: events.sport,
      gender: events.gender,
      season: events.season,
      division: events.division,
      startDatetime: events.startDatetime,
      status: events.status,
      isExhibition: events.isExhibition,
      homeSchoolName: sql<string | null>`coalesce(${homeSchools.name}, ${events.opponentNameRaw})`,
      awaySchoolName: sql<string | null>`coalesce(${awaySchools.name}, ${events.opponentNameRaw})`,
      homeSchoolWebsiteUrl: homeSchools.websiteUrl,
      homeSchoolCmsPlatform: homeSchools.cmsPlatform,
      awaySchoolWebsiteUrl: awaySchools.websiteUrl,
      awaySchoolCmsPlatform: awaySchools.cmsPlatform,
      eventName: events.eventName,
      participatingSchoolNames: participatingSchoolNamesSql,
      venueName: venues.name,
      venueCity: venues.city,
      venueState: venues.state,
      ticketUrl: events.ticketUrl,
      sourceUrl: events.sourceUrl,
      tvNetwork: events.tvNetwork,
      streamingVideoUrl: events.streamingVideoUrl,
      radioNetwork: events.radioNetwork,
      streamingAudioUrl: events.streamingAudioUrl,
      homeTeamId: events.homeTeamId,
      awayTeamId: events.awayTeamId,
      homeLeague: sql<string | null>`coalesce(${homeTeams.conference}, ${homeSchools.conference})`,
      awayLeague: sql<string | null>`coalesce(${awayTeams.conference}, ${awaySchools.conference})`,
    })
    .from(events)
    .leftJoin(homeTeams, eq(events.homeTeamId, homeTeams.id))
    .leftJoin(homeSchools, eq(homeTeams.schoolId, homeSchools.id))
    .leftJoin(awayTeams, eq(events.awayTeamId, awayTeams.id))
    .leftJoin(awaySchools, eq(awayTeams.schoolId, awaySchools.id))
    .leftJoin(venues, eq(events.venueId, venues.id))
    .where(eq(events.id, id))
    .limit(1);

  if (!rows[0]) return null;
  return {
    ...rows[0],
    startDatetime: new Date(rows[0].startDatetime),
    specialVenueName: resolveSpecialVenue(rows[0].venueName),
    homeSchoolLogoUrl: resolveLogo(rows[0].homeSchoolName, rows[0].homeSchoolWebsiteUrl, rows[0].homeSchoolCmsPlatform),
    awaySchoolLogoUrl: resolveLogo(rows[0].awaySchoolName, rows[0].awaySchoolWebsiteUrl, rows[0].awaySchoolCmsPlatform),
  };
}

/**
 * No caching layer here (there used to be an unstable_cache wrapper - removed after a
 * confirmed real bug: a full month's result set across all 98 schools serializes past
 * unstable_cache's hard 2MB per-entry limit - "items over 2MB can not be cached" - and on
 * that write failure Next silently served stale/wrong data instead of throwing, with no
 * way to detect it short of reading the dev server's own logs. The page is already
 * `export const dynamic = "force-dynamic"` and re-runs this on every request regardless, so
 * the wrapper was only ever saving repeat-visitor Postgres round-trips - not worth
 * reintroducing without a caching approach that has a real bound on entry size).
 */
export async function getFilteredEvents(
  range: DateRange,
  filters: EventFilters,
  now?: Date
): Promise<WeekendEvent[]> {
  return getFilteredEventsUncached(range, filters, now);
}

/**
 * Upcoming events (next 7 days) for the fan-follow alert digest - one game where either
 * side's school is in schoolIds, or a special_event (meet/championship) any of schoolIds is
 * participating in. Uses the same homeSchools/awaySchools alias + or() pattern as
 * getFilteredEvents so a fan following two schools that play each other only sees the game
 * once. Excludes cancelled games (an unsolicited email about a cancelled game is worse than a
 * webpage silently listing one) and, like the rest of the product, anything outside New
 * England.
 */
export interface FollowCriteria {
  schoolIds?: string[];
  teamIds?: string[];
  leagues?: string[];
  specialVenueNames?: string[]; // canonical names from src/db/specialVenues.ts, e.g. "TD Garden"
  eventIds?: string[];
}

/**
 * Resolves canonical special-venue names to the underlying venues.id rows that actually match
 * them - the same real venue is fragmented across multiple rows (see specialVenues.ts's
 * comment), so this can return several ids per canonical name. A small table scan (id+name
 * only, no join) - fine at this table's size; revisit only if it shows up in real profiling
 * later, matching this project's own "don't optimize before it's a proven problem" precedent
 * (Section 36).
 */
async function resolveSpecialVenueIds(canonicalNames: string[]): Promise<string[]> {
  if (canonicalNames.length === 0) return [];
  const wanted = new Set(canonicalNames);
  const allVenues = await db.select({ id: venues.id, name: venues.name }).from(venues);
  return allVenues
    .filter((v) => {
      const resolved = resolveSpecialVenue(v.name);
      return resolved !== null && wanted.has(resolved);
    })
    .map((v) => v.id);
}

/**
 * One OR-joined query covering all 5 subscription types (schools, teams, leagues, special
 * venues, specific games) - matches this file's existing multi-condition or() pattern rather
 * than running several separate queries and merging/deduping in JS, so a game matching two
 * followed criteria at once (e.g. a followed team's game that's also at a followed venue)
 * naturally rows out once for free. Excludes cancelled games and, like the rest of the product,
 * anything outside New England.
 */
export async function getUpcomingEventsForFollows(
  criteria: FollowCriteria,
  now?: Date
): Promise<WeekendEvent[]> {
  const { schoolIds = [], teamIds = [], leagues = [], specialVenueNames = [], eventIds = [] } = criteria;
  const venueIds = await resolveSpecialVenueIds(specialVenueNames);
  if (schoolIds.length + teamIds.length + leagues.length + venueIds.length + eventIds.length === 0) {
    return [];
  }

  const { start, end } = getRangeWindow("week", now);
  const matchConditions = [];
  if (schoolIds.length) {
    matchConditions.push(
      inArray(homeSchools.id, schoolIds),
      inArray(awaySchools.id, schoolIds),
      // Confirmed real bug, not assumed: a hand-rolled `sql` template interpolating a
      // plain JS array here bound it as a single malformed scalar parameter ("malformed
      // array literal" from Postgres) rather than a real array - drizzle-orm's own
      // arrayOverlaps() handles array-parameter binding correctly, this doesn't.
      arrayOverlaps(events.participatingSchoolIds, schoolIds)
    );
  }
  if (teamIds.length) {
    matchConditions.push(inArray(events.homeTeamId, teamIds), inArray(events.awayTeamId, teamIds));
  }
  if (leagues.length) {
    const homeLeague = sql`coalesce(${homeTeams.conference}, ${homeSchools.conference})`;
    const awayLeague = sql`coalesce(${awayTeams.conference}, ${awaySchools.conference})`;
    matchConditions.push(inArray(homeLeague, leagues), inArray(awayLeague, leagues));
  }
  if (venueIds.length) matchConditions.push(inArray(events.venueId, venueIds));
  if (eventIds.length) matchConditions.push(inArray(events.id, eventIds));

  const rows = await db
    .select({
      id: events.id,
      type: events.type,
      sport: events.sport,
      gender: events.gender,
      season: events.season,
      division: events.division,
      startDatetime: events.startDatetime,
      status: events.status,
      isExhibition: events.isExhibition,
      // Falls back to the raw opponent name text when a side didn't resolve to a seeded
      // New England school (e.g. UConn vs. Syracuse - Syracuse isn't in this app's schools
      // table, but the feed did name them) - only "TBD" (page.tsx/templates.ts's own final
      // fallback) when even that raw text is missing.
      homeSchoolName: sql<string | null>`coalesce(${homeSchools.name}, ${events.opponentNameRaw})`,
      awaySchoolName: sql<string | null>`coalesce(${awaySchools.name}, ${events.opponentNameRaw})`,
      homeSchoolWebsiteUrl: homeSchools.websiteUrl,
      homeSchoolCmsPlatform: homeSchools.cmsPlatform,
      awaySchoolWebsiteUrl: awaySchools.websiteUrl,
      awaySchoolCmsPlatform: awaySchools.cmsPlatform,
      eventName: events.eventName,
      participatingSchoolNames: participatingSchoolNamesSql,
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
        or(...matchConditions)!,
        or(eq(events.status, "scheduled"), eq(events.status, "postponed"), eq(events.status, "final"))
      )
    )
    .orderBy(asc(events.startDatetime));

  return rows.map((r) => ({
    ...r,
    homeSchoolLogoUrl: resolveLogo(r.homeSchoolName, r.homeSchoolWebsiteUrl, r.homeSchoolCmsPlatform),
    awaySchoolLogoUrl: resolveLogo(r.awaySchoolName, r.awaySchoolWebsiteUrl, r.awaySchoolCmsPlatform),
  }));
}

export interface FilterOptions {
  divisions: string[];
  states: readonly string[];
  schools: { id: string; name: string }[];
  sports: string[];
  leagues: string[];
}

/** Populate filter dropdowns from what's actually in the seeded/ingested data today. */
async function getFilterOptionsUncached(): Promise<FilterOptions> {
  const [divisionRows, schoolRows, sportRows, schoolLeagueRows, teamLeagueRows] = await Promise.all([
    db.selectDistinct({ value: schools.division }).from(schools).orderBy(asc(schools.division)),
    db.select({ id: schools.id, name: schools.name }).from(schools).orderBy(asc(schools.name)),
    db.selectDistinct({ value: events.sport }).from(events).orderBy(asc(events.sport)),
    db.selectDistinct({ value: schools.conference }).from(schools),
    // Team-level conference overrides (e.g. "Hockey East", "Atlantic Hockey America")
    // aren't a school's own conference, so they'd never show up in the query above -
    // see conferenceOverrides.ts.
    db.selectDistinct({ value: teams.conference }).from(teams).where(isNotNull(teams.conference)),
  ]);

  const leagues = [
    ...new Set([...schoolLeagueRows.map((r) => r.value), ...teamLeagueRows.map((r) => r.value as string)]),
  ].sort();

  return {
    divisions: divisionRows.map((r) => r.value),
    states: NE_STATES,
    schools: schoolRows,
    sports: sportRows.map((r) => r.value),
    leagues,
  };
}

/**
 * Cached wrapper - divisions/schools/sports/leagues barely change (only when a new school
 * or sport gets ingested, which happens rarely and manually), yet this scans schools/events/
 * teams from scratch on every single homepage request today. A 5-minute revalidate window
 * is imperceptible against how infrequently this data actually changes. See
 * getFilteredEvents's cached wrapper above for why this is safe to import from standalone
 * scripts (none of which call this specific wrapper).
 */
export const getFilterOptions = unstable_cache(
  getFilterOptionsUncached,
  ["getFilterOptions"],
  { revalidate: 300 }
);

export interface SchoolProfile {
  id: string;
  name: string;
  conference: string;
  division: string;
  city: string;
  state: string;
  logoUrl: string | null;
}

/**
 * Backs the /schools/[slug] SEO page (Section 55). No stored slug column - schools.name has a
 * DB-level unique constraint, so slugifying it at request time is always stable and collision-
 * free, the same reasoning specialVenues.ts already applies to venue name matching. Only ~100
 * rows, cheap to scan.
 */
export async function getSchoolBySlug(slug: string): Promise<SchoolProfile | null> {
  const allSchools = await db.select().from(schools);
  const match = allSchools.find((s) => slugify(s.name) === slug);
  if (!match) return null;
  return {
    id: match.id,
    name: match.name,
    conference: match.conference,
    division: match.division,
    city: match.city,
    state: match.state,
    logoUrl: getSchoolLogoUrl(match.name, match.websiteUrl, match.cmsPlatform),
  };
}

/**
 * Backs the /leagues/[slug] SEO page (Section 55). No leagues table exists (Section 5/47) - a
 * league is just one of getFilterOptions().leagues' already-deduped text values, so resolving a
 * slug back to the real display name is a lookup against that same list, not a new query.
 */
export async function resolveLeagueSlug(slug: string): Promise<string | null> {
  const { leagues } = await getFilterOptions();
  return leagues.find((l) => slugify(l) === slug) ?? null;
}

/**
 * Team picker source for /manage's team-follow picker only - kept separate from
 * getFilterOptions (which the homepage also consumes) rather than folding this in, since at
 * ~2,453 rows this is a meaningfully larger payload than anything else that function returns.
 * Not cached: /manage is a low-traffic page, unlike the homepage.
 */
export async function getTeamPickerOptions(): Promise<
  { id: string; sport: string; gender: string; schoolId: string; schoolName: string }[]
> {
  return db
    .select({
      id: teams.id,
      sport: teams.sport,
      gender: teams.gender,
      schoolId: schools.id,
      schoolName: schools.name,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .orderBy(asc(schools.name), asc(teams.sport), asc(teams.gender));
}
