/**
 * Curated list of notable/pro/public venues a user can follow, independent of any single
 * school - checked directly against real data before building this (not assumed): a first
 * hypothesis ("a venue row with no schoolId is a neutral/notable venue") turned out to be
 * wrong (2,447 of 2,950 NE venues have a null schoolId, almost all golf courses, bare
 * city-name fallback rows, and unmatched away venues - noise, not a signal).
 *
 * Real, known venues (TD Garden, Gillette Stadium, Fenway Park, etc.) genuinely are in the
 * data, but each one is fragmented across multiple distinct `venues` rows - different schools'
 * own feeds spell/format the same real physical venue differently ("Dunkin' Park" / "Dunkin
 * Donuts Park" / "Dunkin' Donuts Park", "Amica Mutual Pavilion" misspelled "Pavillion" on some
 * rows, "MassMutual Center" / "MassMutual Center | Springfield"), and upsertVenue's dedupe key
 * includes schoolId, so the same venue name even gets a fresh row per hosting school. This is
 * the same class of problem already solved once for Head of the Charles (CLAUDE.md Section 43)
 * - one real thing, fragmented across many rows because each school's feed names it slightly
 * differently.
 *
 * A venue follow is therefore matched by a CANONICAL name (resolveSpecialVenue below), never a
 * raw venues.id - following a single row would silently miss games at the same real venue
 * ingested via a different school's feed. This list is expected to grow over time as more
 * notable venues are noticed in the data, not a one-time exhaustive enumeration - same
 * maintenance pattern as conferenceOverrides.ts.
 */
export interface SpecialVenue {
  name: string; // canonical display name - what gets stored in special_venue_follows
  matches: string[]; // known raw venues.name variants seen in real data
}

export const SPECIAL_VENUES: SpecialVenue[] = [
  { name: "TD Garden", matches: ["TD Garden"] },
  { name: "Gillette Stadium", matches: ["Gillette Stadium"] },
  { name: "Fenway Park", matches: ["Fenway Park"] },
  { name: "Mohegan Sun Arena", matches: ["Mohegan Sun Arena"] },
  { name: "Amica Mutual Pavilion", matches: ["Amica Mutual Pavilion", "Amica Mutual Pavillion"] },
  { name: "Dunkin' Park", matches: ["Dunkin' Park", "Dunkin Donuts Park", "Dunkin' Donuts Park"] },
  // "| Springfield" style trailing garbage is stripped by normalizeVenueNameKey, not listed here.
  { name: "MassMutual Center", matches: ["MassMutual Center"] },
  { name: "Cross Insurance Arena", matches: ["Cross Insurance Arena"] },
  { name: "DCU Center", matches: ["DCU Center"] },
  { name: "Tsongas Center", matches: ["Tsongas Center"] },
  { name: "XL Center", matches: ["XL Center", "PeoplesBank Arena (Formerly XL Center)", "PeoplesBank Arena"] },
];

/** Lowercase, strip punctuation/whitespace and any trailing "| City" garbage, for tolerant matching. */
export function normalizeVenueNameKey(raw: string): string {
  return raw.split("|")[0].toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Resolves a raw venues.name to a canonical special-venue name, or null if it isn't one. */
export function resolveSpecialVenue(rawName: string | null): string | null {
  if (!rawName) return null;
  const key = normalizeVenueNameKey(rawName);
  for (const sv of SPECIAL_VENUES) {
    if (sv.matches.some((m) => normalizeVenueNameKey(m) === key)) return sv.name;
  }
  return null;
}
