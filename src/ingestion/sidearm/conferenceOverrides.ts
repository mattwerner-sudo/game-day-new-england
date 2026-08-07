/**
 * Known cases where a team's conference/division differs from its school's default,
 * verified via real research (WebSearch/WebFetch against Hockey East, Atlantic Hockey
 * America, and each school's own live SIDEARM site - see CLAUDE.md) rather than
 * assumed. All current cases are D1 ice hockey programs at schools whose other sports
 * play at a different level or in a conference that doesn't sponsor hockey at all:
 *
 * - Bentley, American International College: D2/Northeast-10 overall, D1 men's ice
 *   hockey in Atlantic Hockey America.
 * - Vermont, Connecticut, Maine, Merrimack, Northeastern: D1, but their primary
 *   conference (America East, Big East, MAAC, CAA - none of which sponsor D1 hockey)
 *   doesn't cover ice hockey; their hockey programs play in Hockey East instead.
 *
 * Keyed by school name (matching src/db/seed/schools.ts exactly) + sport + gender.
 */
export interface TeamOverride {
  conference: string;
  division?: string;
}

const OVERRIDES: Record<string, TeamOverride> = {
  "Bentley University|ice hockey|mens": { conference: "Atlantic Hockey America", division: "D1" },
  "American International College|ice hockey|mens": {
    conference: "Atlantic Hockey America",
    division: "D1",
  },
  "University of Vermont|ice hockey|mens": { conference: "Hockey East" },
  "University of Vermont|ice hockey|womens": { conference: "Hockey East" },
  "University of Connecticut|ice hockey|mens": { conference: "Hockey East" },
  "University of Connecticut|ice hockey|womens": { conference: "Hockey East" },
  "University of Maine|ice hockey|mens": { conference: "Hockey East" },
  "University of Maine|ice hockey|womens": { conference: "Hockey East" },
  "Merrimack College|ice hockey|mens": { conference: "Hockey East" },
  "Merrimack College|ice hockey|womens": { conference: "Hockey East" },
  "Northeastern University|ice hockey|mens": { conference: "Hockey East" },
  "Northeastern University|ice hockey|womens": { conference: "Hockey East" },
};

export function getTeamOverride(
  schoolName: string,
  sport: string,
  gender: string
): TeamOverride | null {
  return OVERRIDES[`${schoolName}|${sport}|${gender}`] ?? null;
}
