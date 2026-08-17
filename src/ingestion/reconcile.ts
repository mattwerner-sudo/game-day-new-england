import { alias } from "drizzle-orm/pg-core";
import { and, eq, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "../db/client";
import { events, gameFollows, fanAlertLog, teams, schools } from "../db/schema";

/**
 * Root cause this fixes (confirmed real, not hypothetical - CLAUDE.md Section 53): a game's
 * dedupeKey is built from home/away NAME text (computeDedupeKey, sidearm/normalize.ts). When
 * School A's feed reports a game against School B by a shorthand ("Stonehill") before School B
 * is seeded in this app, that side stays unresolved (opponentNameRaw set, that side's teamId
 * null) and the row's dedupeKey is built from the raw text. Once School B gets seeded and
 * ingests its own feed for the same real game, it names itself by its own official name
 * ("Stonehill College"), producing a DIFFERENT dedupeKey - so it inserts as a brand-new row
 * instead of updating the old one. Confirmed real via 20 instances found after onboarding
 * Stonehill/New Haven (Section 48) - but the same mechanism can trigger for ANY two schools
 * whose feeds disagree on naming, not just those two, so this reconciles the whole table.
 *
 * A real false-positive class was caught and fixed before this shipped, not assumed safe: an
 * early version matched purely on (exact startDatetime + sport + gender + a shared team on
 * either side), which looked right for 1-vs-1 games but badly misfires on multi-team meets
 * (a swim triangular/cross-country invitational where "Williams" legitimately appears in
 * *several different real matchups* - Williams-MIT and Williams-NYU - at the exact same meet
 * time). That version flagged 1,365 "duplicates" against real data; manually inspecting a
 * sample found two of the first three were exactly this false positive, not the real bug.
 * Fixed by additionally requiring the orphan's raw opponent text to plausibly name the OTHER
 * side of the candidate row (not just share a team) - the actual signal that distinguishes "two
 * schools describing the same one game differently" from "two different games at one meet."
 */

/** Strips a trailing "(...)" qualifier (e.g. "Trinity College (Conn.)") before comparing. */
function normalizeForCompare(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

/** Deliberately loose (substring, not exact) - the whole point is catching name-text
 * disagreements ("Stonehill" vs "Stonehill College"), the same spirit as findSchoolByName's own
 * ilike matching, just scoped to one specific candidate's name rather than a whole-table search. */
function namesLikelyMatch(a: string, b: string): boolean {
  const na = normalizeForCompare(a);
  const nb = normalizeForCompare(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

interface OrphanEvent {
  id: string;
  startDatetime: Date;
  sport: string;
  gender: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  opponentNameRaw: string | null;
}

interface ResolvedEvent {
  id: string;
  startDatetime: Date;
  sport: string;
  gender: string;
  // Always non-null at runtime here - both queries below filter to rows where both are set
  // (the query via isNotNull, the inner joins in reconcileOrphanedOpponents) - typed nullable
  // only because Drizzle doesn't narrow column types based on WHERE clause filtering.
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeSchoolName: string;
  awaySchoolName: string;
}

/** Pure matching logic, kept separate from DB access so it's directly unit-testable. */
export function findDuplicateMatch<T extends ResolvedEvent>(orphan: OrphanEvent, resolvedCandidates: T[]): T | null {
  const knownTeamId = orphan.homeTeamId ?? orphan.awayTeamId;
  if (!knownTeamId || !orphan.opponentNameRaw) return null;

  return (
    resolvedCandidates.find((r) => {
      if (r.id === orphan.id) return false;
      if (r.startDatetime.getTime() !== orphan.startDatetime.getTime()) return false;
      if (r.sport !== orphan.sport || r.gender !== orphan.gender) return false;

      const isHomeKnown = r.homeTeamId === knownTeamId;
      const isAwayKnown = r.awayTeamId === knownTeamId;
      if (!isHomeKnown && !isAwayKnown) return false;

      // The team NOT already known to the orphan must be the one the orphan's raw text names -
      // not just "any shared team" - this is what rejects the multi-team-meet false positives.
      const otherSideName = isHomeKnown ? r.awaySchoolName : r.homeSchoolName;
      return namesLikelyMatch(orphan.opponentNameRaw!, otherSideName);
    }) ?? null
  );
}

const MERGEABLE_FIELDS = [
  "ticketUrl",
  "sourceUrl",
  "tvNetwork",
  "streamingVideoUrl",
  "radioNetwork",
  "streamingAudioUrl",
  "isFree",
] as const;

export interface ReconcileResult {
  merged: { keptId: string; deletedId: string; mergedFields: string[] }[];
  skippedFollowed: { orphanId: string; reason: string }[];
}

const homeSchools = alias(schools, "reconcile_home_schools");
const awaySchools = alias(schools, "reconcile_away_schools");
const homeTeams = alias(teams, "reconcile_home_teams");
const awayTeams = alias(teams, "reconcile_away_teams");

/**
 * Finds and merges orphaned raw-opponent rows into their real duplicate, if one now exists.
 * `dryRun` (default true) only computes and returns the plan - no writes. Real deletion is
 * additionally guarded by checking gameFollows/fanAlertLog first: a row a real user has already
 * followed or been alerted about is skipped, not force-deleted, and reported in `skippedFollowed`
 * so a human can look at it rather than silently losing a user's data.
 */
export async function reconcileOrphanedOpponents(options: { dryRun?: boolean } = {}): Promise<ReconcileResult> {
  const dryRun = options.dryRun ?? true;

  const orphanRows = await db
    .select({
      id: events.id,
      startDatetime: events.startDatetime,
      sport: events.sport,
      gender: events.gender,
      homeTeamId: events.homeTeamId,
      awayTeamId: events.awayTeamId,
      opponentNameRaw: events.opponentNameRaw,
    })
    .from(events)
    .where(
      and(
        eq(events.type, "game"),
        isNotNull(events.opponentNameRaw),
        or(isNull(events.homeTeamId), isNull(events.awayTeamId))
      )
    );

  const resolvedRows = await db
    .select({
      id: events.id,
      startDatetime: events.startDatetime,
      sport: events.sport,
      gender: events.gender,
      homeTeamId: events.homeTeamId,
      awayTeamId: events.awayTeamId,
      homeSchoolName: homeSchools.name,
      awaySchoolName: awaySchools.name,
    })
    .from(events)
    .innerJoin(homeTeams, eq(events.homeTeamId, homeTeams.id))
    .innerJoin(homeSchools, eq(homeTeams.schoolId, homeSchools.id))
    .innerJoin(awayTeams, eq(events.awayTeamId, awayTeams.id))
    .innerJoin(awaySchools, eq(awayTeams.schoolId, awaySchools.id))
    .where(and(eq(events.type, "game"), isNotNull(events.homeTeamId), isNotNull(events.awayTeamId)));

  const result: ReconcileResult = { merged: [], skippedFollowed: [] };

  for (const orphan of orphanRows) {
    const match = findDuplicateMatch(orphan, resolvedRows);
    if (!match) continue;

    const [followRefs, alertRefs] = await Promise.all([
      db.select().from(gameFollows).where(eq(gameFollows.eventId, orphan.id)),
      db.select().from(fanAlertLog).where(eq(fanAlertLog.eventId, orphan.id)),
    ]);
    if (followRefs.length > 0 || alertRefs.length > 0) {
      result.skippedFollowed.push({
        orphanId: orphan.id,
        reason: `${followRefs.length} follow(s), ${alertRefs.length} alert log row(s) reference this row`,
      });
      continue;
    }

    const [orphanFull] = await db.select().from(events).where(eq(events.id, orphan.id));
    const [matchFull] = await db.select().from(events).where(eq(events.id, match.id));
    const updates: Record<string, unknown> = {};
    for (const field of MERGEABLE_FIELDS) {
      if (matchFull[field] == null && orphanFull[field] != null) updates[field] = orphanFull[field];
    }

    if (!dryRun) {
      if (Object.keys(updates).length > 0) {
        await db.update(events).set(updates).where(eq(events.id, match.id));
      }
      await db.delete(events).where(eq(events.id, orphan.id));
    }

    result.merged.push({ keptId: match.id, deletedId: orphan.id, mergedFields: Object.keys(updates) });
  }

  return result;
}
