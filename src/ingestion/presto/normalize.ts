import { sportNameFromTitle, normalizeState } from "../sidearm/normalize";

/** "Women's Basketball" -> "womens", "Men's Ice Hockey" -> "mens", "Football" -> "coed" */
export function genderFromCategory(category: string): "mens" | "womens" | "coed" {
  if (/^women'?s\b/i.test(category)) return "womens";
  if (/^men'?s\b/i.test(category)) return "mens";
  return "coed";
}

/** Re-exported so callers don't need to know sport-name normalization lives in sidearm/. */
export const sportNameFromCategory = sportNameFromTitle;

export interface ParsedPrestoMatchup {
  isHome: boolean;
  opponentName: string;
  isNeutralSite: boolean;
}

/**
 * Presto's composite feed SUMMARY format: "(Sport) TeamA at/vs. TeamB (score)" - confirmed
 * via a real feed (Bridgewater State's), not assumed. Two real findings that shape this:
 *
 * 1. For "at", the ingesting school is always listed first (self at opponent = away),
 *    matching SIDEARM's convention.
 * 2. For "vs.", real home games list the OPPONENT first and the ingesting school SECOND
 *    (opponent vs. self = home) - the reverse of SIDEARM's "self vs opponent" convention.
 *    Confirmed by checking 14 real "vs" games from one school's feed - 13 of 14 had the
 *    school listed second.
 * 3. The 1 exception was a real neutral-site tournament game (a Las Vegas holiday
 *    tournament) - self was listed FIRST, and crucially it was the only "vs" event with a
 *    real LOCATION field. Normal home games never carry LOCATION at all (implied to be the
 *    school's own campus); neutral-site games always do. That's the actual signal used
 *    here, not word order - but with only one confirmed example, "self is listed first for
 *    neutral games" is a lower-confidence assumption than everything else in this function,
 *    worth re-verifying against more real neutral-site examples before trusting it fully.
 */
export function parsePrestoMatchup(summary: string, hasLocation: boolean): ParsedPrestoMatchup | null {
  const withoutSportPrefix = summary.replace(/^\([^)]+\)\s*/, "");
  // Strip a trailing " (score)" suffix, e.g. " (28-35)" - real scores only, so this can't
  // misfire on an opponent name that happens to end in a parenthetical (e.g. "Regis (Mass.)"
  // isn't touched since it's not at the very end followed by nothing).
  const cleaned = withoutSportPrefix.replace(/\s*\(\d[\d\s\-–]*\)\s*$/, "").trim();

  const atMatch = cleaned.match(/^(.+?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return { isHome: false, opponentName: atMatch[2].trim(), isNeutralSite: false };
  }

  const vsMatch = cleaned.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
  if (vsMatch) {
    if (hasLocation) {
      // Neutral site - see point 3 above on why this specific assumption is lower-confidence.
      return { isHome: false, opponentName: vsMatch[2].trim(), isNeutralSite: true };
    }
    return { isHome: true, opponentName: vsMatch[1].trim(), isNeutralSite: false };
  }

  return null; // multi-team meets/invitationals etc. - same log-and-skip handling as SIDEARM
}

export interface ParsedPrestoSpecialEvent {
  eventName: string;
  hostSchoolName: string | null;
  venueName: string | null;
  city: string | null;
  state: string | null;
}

/**
 * Presto meet/invitational/championship events (parsePrestoMatchup returns null for these -
 * no "vs"/"at" pattern) carry NO LOCATION field at all in the raw ICS (confirmed against a
 * real feed, Bridgewater State's - unlike SIDEARM, which does populate LOCATION for meets).
 * Venue and host-school info are instead baked directly into the SUMMARY text, in two
 * optional trailing patterns confirmed against real events from that same feed:
 *   "(Women's Cross Country) MASCAC Championships hosted by Worcester State University
 *    (Fort Devens Course - Devens, Mass.)"
 *   "(Women's Cross Country) Suffolk Short Course Classic (Mark Coogan Cross Country
 *    Course - Attleboro, Mass.)"
 * i.e. an optional bare "hosted by <School>" clause, and an optional trailing
 * "(Venue - City, State)" parenthetical. Either or both can be absent (e.g. a bare
 * "NCAA Division III Championships" with neither) - this degrades gracefully to just the
 * event name in that case rather than forcing a guess.
 */
export function parsePrestoSpecialEventInfo(summary: string): ParsedPrestoSpecialEvent {
  const withoutSportPrefix = summary.replace(/^\([^)]+\)\s*/, "").trim();

  const venueMatch = withoutSportPrefix.match(/\s*\(([^()]+?)\s*-\s*([^,()]+),\s*([^()]+)\)\s*$/);
  const withoutVenue = venueMatch
    ? withoutSportPrefix.slice(0, venueMatch.index).trim()
    : withoutSportPrefix;

  const hostMatch = withoutVenue.match(/\s+hosted by\s+(.+)$/i);
  const eventName = (hostMatch ? withoutVenue.slice(0, hostMatch.index) : withoutVenue).trim();

  return {
    eventName,
    hostSchoolName: hostMatch ? hostMatch[1].trim() : null,
    venueName: venueMatch ? venueMatch[1].trim() : null,
    city: venueMatch ? venueMatch[2].trim() : null,
    state: venueMatch ? normalizeState(venueMatch[3].trim()) : null,
  };
}

export interface ParsedPrestoLocation {
  venueName: string;
  city: string | null;
  state: string | null;
}

/**
 * Presto's LOCATION field (only present for neutral-site games - see parsePrestoMatchup)
 * is "Venue, City, ST" - venue FIRST, the reverse of SIDEARM's "City, ST, Venue" order.
 * Confirmed via the same real neutral-site example: "South Point Arena, Las Vegas, NV".
 */
export function parsePrestoLocation(location: string | null): ParsedPrestoLocation {
  if (!location) return { venueName: "TBD", city: null, state: null };
  const parts = location.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    return { venueName: parts[0], city: parts[1], state: parts[2].toUpperCase() };
  }
  if (parts.length === 2) {
    return { venueName: parts[0], city: null, state: parts[1].toUpperCase() };
  }
  return { venueName: parts[0] ?? "TBD", city: null, state: null };
}
