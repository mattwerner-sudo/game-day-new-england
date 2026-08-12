/**
 * Known cases where a short/colloquial opponent name from a feed is genuinely ambiguous
 * against this app's seeded schools - more than one seeded school's full name contains the
 * short form as a substring, so a plain ILIKE match can silently pick the wrong one with no
 * warning (Postgres/PGlite return an arbitrary row among ties when there's no ORDER BY).
 *
 * Found via a real founder-reported bug: UMass Lowell's own feed said
 * "... Men's Soccer at Rhode Island - Exhibition", which resolved to "Rhode Island College"
 * instead of the real opponent, University of Rhode Island - confirmed wrong via the event's
 * own venue field, "Kingston, RI, URI Soccer Complex" (Kingston is URI's campus, not Rhode
 * Island College's). Both "Rhode Island College" and "University of Rhode Island" are seeded
 * schools whose names contain "Rhode Island".
 *
 * "Massachusetts" has the same real ambiguity risk - four seeded schools' names contain it
 * ("University of Massachusetts Amherst", "University of Massachusetts Boston",
 * "Massachusetts College of Liberal Arts", "Massachusetts Institute of Technology") -
 * confirmed via UMass Lowell's own feed using bare "at Massachusetts" for a game whose venue,
 * "Amherst, MA, Rudd Field", confirms it means UMass Amherst specifically.
 *
 * Keyed by the lowercased short form as it appears in feed text, mapped to the seeded
 * school's canonical name (matching src/db/seed/schools.ts exactly). Checked in
 * findSchoolByName() before the generic substring search - not exhaustive, add more entries
 * here as new real ambiguous collisions are confirmed, don't guess ahead of evidence.
 */
export const SCHOOL_NAME_ALIASES: Record<string, string> = {
  "rhode island": "University of Rhode Island",
  massachusetts: "University of Massachusetts Amherst",
};
