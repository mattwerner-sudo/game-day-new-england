import { SPORTS_SEED } from "../../db/seed/sports";

const TYPICAL_SEASON_BY_SPORT = new Map<string, string>(
  SPORTS_SEED.map((s) => [s.name, s.typicalSeason])
);

export function genderFromCode(code: string): "mens" | "womens" | "coed" {
  if (code === "m") return "mens";
  if (code === "f") return "womens";
  return "coed";
}

/**
 * Sports listings this project explicitly doesn't cover ([Section 3](../../../CLAUDE.md) -
 * "Not covering club or intramural sports - varsity only"). Confirmed via real data that
 * these ride along in the same SIDEARM/Presto feeds as real varsity teams and are genuinely
 * separate programs, not just naming variants of a varsity team - e.g. Brown University has
 * both a real "baseball/mens" varsity team AND a wholly separate "necba baseball/coed" team
 * in the same feed. Checked against the *raw* title/category (before sportNameFromTitle's
 * normalization), so callers should check this before treating a title as a real sport.
 * Esports game titles are enumerated from real observed feed data (League of Legends,
 * Valorant, Overwatch, Super Smash Bros, Marvel Rivals) - not exhaustive, may need extending
 * if a school's feed surfaces a different game later.
 */
const OUT_OF_SCOPE_SPORT_PATTERN =
  /\b(club|jv|junior varsity|necba|esports|e-sports|league of legends|valorant|overwatch|super smash bros|smash bros|marvel rivals)\b/i;

export function isOutOfScopeSport(title: string): boolean {
  return OUT_OF_SCOPE_SPORT_PATTERN.test(title);
}

/** "Women's Soccer" -> "soccer", "Football" -> "football", "Field Hockey" -> "field hockey" */
export function sportNameFromTitle(title: string): string {
  const normalized = title
    .replace(/^#\d+\s+/, "") // AP/coaches-poll ranking prefix, e.g. "#12 Men's Tennis"
    .replace(/^(men'?s|women'?s)\s+/i, "")
    .replace(/^[mw]-/i, "") // abbreviated gender prefix some SIDEARM sites use, e.g. "M-Basketball"
    .replace(/\s*&\s*/g, " and ") // "Track & Field" and "Track and Field" are the same sport
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  // UMass Amherst's platform titles this sport bare "Hockey" (confirmed via real ingested
  // data - every other school says "Men's/Women's Ice Hockey") - without this, its games
  // would sit under a school-specific "hockey" sport name, invisible to the Sport filter's
  // "Ice Hockey" option and to conferenceOverrides.ts's lookup key. Exact match only, so it
  // can't misfire on "field hockey".
  if (normalized === "hockey") return "ice hockey";
  // Real naming variants/typos confirmed via live feed data, all describing the same real
  // sport as a differently-phrased or misspelled title - collapsed to one canonical name so
  // the Sport filter doesn't show near-duplicates for the same real program.
  if (normalized === "swiming and diving") return "swimming and diving";
  if (normalized === "indoor track") return "indoor track and field";
  if (normalized === "outdoor track") return "outdoor track and field";
  // Bare "track and field" with a parenthetical qualifier ("(indoor and outdoor)",
  // "(sprints, hurdles, jumps)") doesn't add real distinguishing info beyond the plain
  // "track and field" bucket - strip it rather than let every school's own phrasing become
  // its own filter entry. Genuine "indoor track and field"/"outdoor track and field" titles
  // (no parenthetical) are untouched - that split is real and intentional (see sports.ts).
  if (/^track and field\s*\(/.test(normalized)) return "track and field";
  if (normalized === "cross country, distance track") return "cross country";
  // Confirmed via real data (UMass Lowell) this rides alongside separately-listed "cross
  // country" and "track and field" teams for the same school/gender - a redundant combined
  // feed, not a genuinely distinct third program. Folds into "cross country" so
  // upsertTeam's (school, sport, gender) key naturally merges it with the real team instead
  // of creating a spurious fourth entry.
  if (normalized === "cross country/track and field") return "cross country";
  if (normalized === "coed sailing") return "sailing";
  if (normalized.startsWith("sailing - ")) return "sailing";
  if (normalized === "equestrian ida" || normalized === "equestrian ihsa") return "equestrian";
  if (normalized === "cheerleading") return "cheer";
  if (normalized === "dance team") return "dance";
  if (normalized === "ultimate") return "ultimate frisbee";
  // Heavyweight/lightweight are real, meaningful NCAA rowing distinctions (separate
  // competitive circuits), not fluff to collapse away - only the "crew" vs "rowing" naming
  // and prefix-vs-parenthetical phrasing are normalized here, the weight-class split itself
  // is preserved.
  if (normalized === "heavyweight crew" || normalized === "crew (heavyweight)") return "heavyweight rowing";
  if (normalized === "lightweight crew" || normalized === "crew (lightweight)") return "lightweight rowing";
  if (normalized === "openweight crew" || normalized === "crew") return "rowing";
  // Found on old Presto historical events (2016-2022, see PRESTO_HISTORY_CUTOFF_DAYS) while
  // investigating the sport-listing cleanup - real garbled/variant CATEGORIES values from
  // Presto's own feed, not a parsing bug on this end. "Cross Countrys Country" and "Golf
  // Schedule" look like source-side data-entry mistakes (the latter reads like a page title
  // that leaked into the category field); "M/W Cross Country", "Riding", and bare "Track"
  // are real if uncommon phrasings for legitimate programs.
  if (normalized === "cross countrys country" || normalized === "m/w cross country") return "cross country";
  if (normalized === "golf schedule") return "golf";
  if (normalized === "riding") return "equestrian";
  if (normalized === "track") return "track and field";
  return normalized;
}

/**
 * Season is primarily a property of the sport (basketball is always "winter" even
 * though its games start in November, overlapping fall sports' regular season) -
 * per the sports reference table. Date is only used as a fallback for sports that
 * aren't in the table (e.g. a generic "track and field" title that doesn't
 * distinguish indoor/outdoor).
 */
export function deriveSeason(sportName: string, date: Date): "fall" | "winter" | "spring" {
  const fromTable = TYPICAL_SEASON_BY_SPORT.get(sportName);
  if (fromTable) return fromTable as "fall" | "winter" | "spring";

  const month = date.getUTCMonth(); // 0-indexed
  if (month >= 7 && month <= 10) return "fall"; // Aug-Nov
  if (month === 11 || month <= 1) return "winter"; // Dec-Feb
  return "spring"; // Mar-Jul
}

const STALE_FEED_THRESHOLD_DAYS = 300;

/**
 * Some SIDEARM sites still link to defunct/renamed program pages in their nav alongside
 * real varsity sports - discoverSportSlugs() has no way to tell "Blue & White Women's
 * Soccer" apart from "Women's Soccer" just from the URL pattern, and both show up as real
 * /sports/<slug>/schedule links. Confirmed via a real example: Assumption's "Blue & White
 * Women's Soccer" feed (sport_id=44) has every event dated 2024 with nothing since, while
 * the real Women's Soccer feed (sport_id=18) at the same school runs into 2027. A feed with
 * nothing newer than this threshold is treated as inactive and skipped entirely, rather than
 * polluting the normalized sports list with a dead program name. This is evaluated fresh
 * against "now" on every ingest run, not a permanent blocklist - if a school later
 * republishes dates for a sport, the next run picks it back up automatically.
 */
export function isFeedStale(mostRecentStart: Date | null, now: Date): boolean {
  if (!mostRecentStart) return true; // no games in the feed at all
  const daysSinceLatest = (now.getTime() - mostRecentStart.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceLatest > STALE_FEED_THRESHOLD_DAYS;
}

// Different SIDEARM sites (and even different pages on the same site) format the same
// state inconsistently - "MA", "Mass.", "Massachusetts" all show up for one school.
// Normalize everything to a standard 2-letter USPS code so State is actually filterable.
const STATE_ALIASES: Record<string, string> = {
  alabama: "AL", ala: "AL", al: "AL",
  alaska: "AK", ak: "AK",
  arizona: "AZ", ariz: "AZ", az: "AZ",
  arkansas: "AR", ark: "AR", ar: "AR",
  california: "CA", calif: "CA", ca: "CA",
  colorado: "CO", colo: "CO", co: "CO",
  connecticut: "CT", conn: "CT", ct: "CT",
  delaware: "DE", del: "DE", de: "DE",
  "district of columbia": "DC", dc: "DC",
  florida: "FL", fla: "FL", fl: "FL",
  georgia: "GA", ga: "GA",
  hawaii: "HI", hi: "HI",
  idaho: "ID", id: "ID",
  illinois: "IL", ill: "IL", il: "IL",
  indiana: "IN", ind: "IN", in: "IN",
  iowa: "IA", ia: "IA",
  kansas: "KS", kan: "KS", ks: "KS",
  kentucky: "KY", ky: "KY",
  louisiana: "LA", la: "LA",
  maine: "ME", me: "ME",
  maryland: "MD", md: "MD",
  massachusetts: "MA", mass: "MA", ma: "MA",
  michigan: "MI", mich: "MI", mi: "MI",
  minnesota: "MN", minn: "MN", mn: "MN",
  mississippi: "MS", miss: "MS", ms: "MS",
  missouri: "MO", mo: "MO",
  montana: "MT", mont: "MT", mt: "MT",
  nebraska: "NE", neb: "NE", ne: "NE",
  nevada: "NV", nev: "NV", nv: "NV",
  "new hampshire": "NH", "n h": "NH", nh: "NH",
  "new jersey": "NJ", "n j": "NJ", nj: "NJ",
  "new mexico": "NM", "n m": "NM", nm: "NM",
  "new york": "NY", "n y": "NY", ny: "NY",
  "north carolina": "NC", "n c": "NC", nc: "NC",
  "north dakota": "ND", "n d": "ND", nd: "ND",
  ohio: "OH", oh: "OH",
  oklahoma: "OK", okla: "OK", ok: "OK",
  oregon: "OR", ore: "OR", or: "OR",
  pennsylvania: "PA", penn: "PA", pa: "PA",
  "rhode island": "RI", "r i": "RI", ri: "RI",
  "south carolina": "SC", "s c": "SC", sc: "SC",
  "south dakota": "SD", "s d": "SD", sd: "SD",
  tennessee: "TN", tenn: "TN", tn: "TN",
  texas: "TX", tex: "TX", tx: "TX",
  utah: "UT", ut: "UT",
  vermont: "VT", vt: "VT",
  virginia: "VA", va: "VA",
  washington: "WA", wash: "WA", wa: "WA",
  "west virginia": "WV", "w va": "WV", wv: "WV",
  wisconsin: "WI", wis: "WI", wi: "WI",
  wyoming: "WY", wyo: "WY", wy: "WY",
};

export function normalizeState(raw: string): string {
  const cleaned = raw.replace(/\./g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  return STATE_ALIASES[cleaned] ?? raw.replace(/\./g, "").trim().toUpperCase();
}

export interface ParsedLocation {
  city: string | null;
  state: string | null;
  venueName: string;
}

/**
 * The raw state token sometimes carries trailing tournament-round notes SIDEARM
 * operators tack on by hand, e.g. "Mass) | NCAA First Round" or "Conn) | NESCAC
 * Quarterfinals (3rd vs 6th seeds)". Cut at the first structural delimiter so only
 * the actual state text remains.
 */
function cleanStateToken(raw: string): string {
  return raw.split(/[|()]/)[0].trim();
}

/**
 * Meet-based sports (track & field, cross country, swimming invitationals) commonly use
 * a third real format for away/neutral-site meets: "Venue Name (City, ST[.])", e.g.
 * "Sherie and Don (1961) Morrison Track (Cambridge, Mass.)" - confirmed via Williams
 * College's real track & field feed. The naive comma-split in parseLocation() mishandles
 * this badly: splitting "Sherie and Don (1961) Morrison Track (Cambridge, Mass.)" on the
 * first comma produces city = venueName = the entire garbled "...Track (Cambridge" string
 * (state still comes out right by luck, since cleanStateToken independently strips at the
 * next "(" - but city/venue don't). Matched here by requiring a comma *inside* the
 * trailing parenthetical group, which disambiguates it from the "City, ST (Venue)" format
 * (no comma inside those parens) already handled by the comma-split branches below.
 */
function parseVenueWithParentheticalCityState(location: string): ParsedLocation | null {
  const match = location.match(/^(.+?)\s*\(([^,()]+),\s*([^()]+?)\)/);
  if (!match) return null;
  const [, venue, city, stateRaw] = match;
  return {
    city: city.trim(),
    state: normalizeState(cleanStateToken(stateRaw)),
    venueName: venue.trim(),
  };
}

/**
 * SIDEARM LOCATION format varies by site/sport - two real patterns show up in this
 * data: "City, ST, Venue Name" (comma-comma) and "City, ST / Venue Name" (comma then
 * a slash inside the second segment, no second comma). Often just "City, ST" (no
 * building name at all) for away games, since the ingesting school's feed doesn't
 * always know the opponent's venue name.
 */
export function parseLocation(location: string | null): ParsedLocation {
  if (!location) return { city: null, state: null, venueName: "TBD" };

  const parenParsed = parseVenueWithParentheticalCityState(location);
  if (parenParsed) return parenParsed;

  const parts = location
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    return {
      city: parts[0],
      state: normalizeState(cleanStateToken(parts[1])),
      venueName: parts.slice(2).join(", "),
    };
  }
  if (parts.length === 2) {
    const slashIndex = parts[1].indexOf("/");
    if (slashIndex !== -1) {
      const statePart = parts[1].slice(0, slashIndex).trim();
      const venuePart = parts[1].slice(slashIndex + 1).trim();
      return {
        city: parts[0],
        state: normalizeState(cleanStateToken(statePart)),
        // No real venue name known - just the city. State is shown separately by
        // callers (event.venueState), so don't bake it into venueName too.
        venueName: venuePart || parts[0],
      };
    }
    return {
      city: parts[0],
      state: normalizeState(cleanStateToken(parts[1])),
      venueName: parts[0],
    };
  }
  return { city: null, state: null, venueName: parts[0] ?? "TBD" };
}

/**
 * SIDEARM DESCRIPTION packs several "Label: value" lines into one field, e.g.
 * "...\nTV: ESPN+\nStreaming Video: https://...\nTickets: https://uvmathletics.evenue.net/list/MHK\n".
 * The Tickets line is only present on the home school's own feed entry for a game
 * (SIDEARM doesn't surface the opponent's ticket link on an away entry), so callers
 * should only trust this for the feed that's actually hosting the game.
 */
export function parseTicketUrl(description: string | null): string | null {
  if (!description) return null;
  const match = description.match(/^Tickets:\s*(\S+)/m);
  return match ? match[1] : null;
}

export interface ParsedStreamingInfo {
  tvNetwork: string | null;
  streamingVideoUrl: string | null;
  radioNetwork: string | null;
  streamingAudioUrl: string | null;
}

/**
 * Same DESCRIPTION field as parseTicketUrl(), different lines. Unlike Tickets (only home
 * schools sell tickets to their own games), both sides of a matchup can legitimately have
 * their own real TV/streaming info for the same game, but callers should still only trust
 * this per the same isHome gating as tickets/sourceUrl, for deterministic upserts - see
 * CLAUDE.md.
 */
export function parseStreamingInfo(description: string | null): ParsedStreamingInfo {
  if (!description) {
    return { tvNetwork: null, streamingVideoUrl: null, radioNetwork: null, streamingAudioUrl: null };
  }
  return {
    tvNetwork: description.match(/^TV:\s*(.+)$/m)?.[1]?.trim() ?? null,
    streamingVideoUrl: description.match(/^Streaming Video:\s*(\S+)/m)?.[1] ?? null,
    radioNetwork: description.match(/^Radio:\s*(.+)$/m)?.[1]?.trim() ?? null,
    streamingAudioUrl: description.match(/^Streaming Audio:\s*(\S+)/m)?.[1] ?? null,
  };
}

export interface ParsedMatchup {
  isHome: boolean;
  opponentName: string;
}

/**
 * SIDEARM SUMMARY format: "<School> <Sport> vs <Opponent>" or "... at <Opponent>".
 * Operators sometimes tack a promo suffix onto the opponent, e.g.
 * "vs Southern Connecticut State - Family Weekend" - cut at " - " since real
 * opponent names in this data never contain that pattern.
 */
export function parseMatchup(summary: string): ParsedMatchup | null {
  const match = summary.match(/\s+(vs\.?|at)\s+(.+)$/i);
  if (!match) return null;
  return {
    isHome: match[1].toLowerCase().startsWith("vs"),
    opponentName: match[2].split(/\s+-\s+/)[0].trim(),
  };
}

// Meet-based sports (track & field, cross country, golf, tennis, swimming, rowing) also
// publish their multi-team meets through the SAME "<School> <Sport> vs/at <Name>" shape a
// real 2-team game uses (confirmed via a real feed, Williams' cross country: "Williams
// College Men's Cross Country at Little Three Championships", "...vs Purple Valley
// Classic") - a different convention than Amherst's own feed (which never runs meets through
// parseMatchup at all - see parseSpecialEventName). Without this check, parseMatchup()
// happily returns a "successful" match with "Little Three Championships" treated as a
// literal opponent school name - confirmed via a real query against this project's own
// database that this has been silently happening across the ENTIRE 98-school dataset for
// as long as ingestion has run (~4,100 of ~42,800 existing event rows, spanning cross
// country, track, golf, tennis, swimming, rowing - not just Williams or just one sport).
// The gate below only reclassifies when BOTH signals agree: the name failed to resolve to
// any real seeded school AND it contains a real-world meet/tournament keyword - a genuine
// opponent name essentially never contains these words, while every confirmed real meet name
// in this data does.
const MEET_NAME_PATTERN =
  /\b(championships?|invitational|classic|regionals?|nationals?|open|relays?|tournament|qualifiers?|multis?|round.?robin|festival|shootout|meet|challenge)\b/i;

export function looksLikeMeetName(name: string): boolean {
  return MEET_NAME_PATTERN.test(name);
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * SIDEARM meets (cross country, track & field, invitationals, tournaments with 3+ teams)
 * don't fit the "<School> <Sport> vs/at <Opponent>" shape parseMatchup() expects - confirmed
 * via a real feed (Amherst's cross country/track & field): "[N] Amherst College Men's Cross
 * Country  Little Three Championships" (school+sport exactly as it appears elsewhere in this
 * same feed, then the actual meet name - note the real double space before it). The leading
 * "[N]" is confirmed to be a literal, un-templated placeholder string on some entries (not a
 * numeric id as it first appeared) - other entries for the very same sport have no bracket at
 * all. Strip whatever bracket token (if any) is present rather than assume digits, so both
 * forms normalize the same way. Strip the known prefix rather than guess at the remainder
 * generically, so a summary that doesn't match the expected shape falls through to null
 * (still logged and skipped by the caller) instead of a low-confidence guess getting treated
 * as a meet name.
 */
export function parseSpecialEventName(
  summary: string,
  schoolName: string,
  sportTitle: string
): string | null {
  const withoutIndex = summary.replace(/^\[[^\]]*\]\s*/, "");
  const prefixPattern = new RegExp(`^${escapeRegex(schoolName)}\\s+${escapeRegex(sportTitle)}\\s+`, "i");
  const match = withoutIndex.match(prefixPattern);
  if (!match) return null;
  const eventName = withoutIndex.slice(match[0].length).trim();
  return eventName || null;
}

/** Collapse whitespace/case so both sides of a matchup produce the same dedupe key. */
export function normalizeForKey(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Deliberately excludes venue: the same real game's venue string is often reported
 * differently by the two schools' own feeds (the home school's feed names the exact
 * building; the away school's feed often only has "City, ST"). Keying on venue too
 * would defeat the whole point of deduping - two schools' feeds would never collapse
 * into one row. Date + home + away + gender is the actual unique identity of a game.
 *
 * gender is included for exactly the same reason computeSpecialEventDedupeKey() includes
 * it (see that function's comment) - found via a real, serious bug this session: dual-meet
 * sports (swimming and diving, indoor/outdoor track, tennis) very commonly play the men's and
 * women's meet against the same opponent on the same date. Without gender in the key, both
 * genders' real games produced the IDENTICAL dedupe key and silently overwrote each other on
 * every ingest pass - confirmed directly via a real case (Bridgewater State vs. Bentley
 * University swimming, both men's and women's on 2027-01-27): the women's game was correctly
 * upserted, then immediately clobbered by the men's game processed later in the same run,
 * leaving only one gender's data behind with no error or warning. This was present since this
 * dedupe key was first written (Day 1) and had nothing to do with the special_event or
 * third-summary-format work that surfaced it - those investigations just happened to produce
 * a same-day same-opponent dual meet as a test case, which is what exposed it.
 */
export function computeDedupeKey(params: {
  startDatetime: Date;
  homeName: string;
  awayName: string;
  gender: string;
}): string {
  return [
    params.startDatetime.toISOString(),
    normalizeForKey(params.homeName),
    normalizeForKey(params.awayName),
    params.gender,
  ].join("|");
}

/**
 * Same venue-exclusion reasoning as computeDedupeKey() above, plus participatingSchoolIds is
 * deliberately excluded too - it's meant to *accumulate* as each participating school's own
 * feed gets ingested (see upsertSpecialEvent), so it can't be part of the identity a later
 * pass has to match against. Uses the calendar date only (not exact time) since different
 * schools' feeds sometimes list slightly different start times for the same real meet.
 *
 * gender IS part of the key, unlike the game dedupe key's home/away pair - confirmed via real
 * data (Amherst's own feed) that men's and women's races at the same meet share the exact same
 * event name and date ("Little Three Championships" runs both the same day), but are two
 * separate real events with different participants. sportNameFromTitle() also collapses
 * "Men's Cross Country"/"Women's Cross Country" to the same "cross country" sport string, so
 * without gender in the key the two races would incorrectly collapse into one row, with
 * whichever gender's feed happened to be ingested second silently overwriting the first.
 *
 * Known limitation: if two schools' feeds spell/format the same meet's name differently, this
 * won't collapse them into one row - accepted as a real gap (each shows up as its own row)
 * rather than risk merging two genuinely different events on a fuzzy match.
 */
export function computeSpecialEventDedupeKey(params: {
  startDatetime: Date;
  sport: string;
  gender: string;
  eventName: string;
}): string {
  return [
    "special",
    params.startDatetime.toISOString().slice(0, 10),
    normalizeForKey(params.sport),
    params.gender,
    normalizeForKey(params.eventName),
  ].join("|");
}
