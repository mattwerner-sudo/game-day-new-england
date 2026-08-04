import { SPORTS_SEED } from "../../db/seed/sports";

const TYPICAL_SEASON_BY_SPORT = new Map<string, string>(
  SPORTS_SEED.map((s) => [s.name, s.typicalSeason])
);

export function genderFromCode(code: string): "mens" | "womens" | "coed" {
  if (code === "m") return "mens";
  if (code === "f") return "womens";
  return "coed";
}

/** "Women's Soccer" -> "soccer", "Football" -> "football", "Field Hockey" -> "field hockey" */
export function sportNameFromTitle(title: string): string {
  return title
    .replace(/^(men'?s|women'?s)\s+/i, "")
    .replace(/\s*&\s*/g, " and ") // "Track & Field" and "Track and Field" are the same sport
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

function normalizeState(raw: string): string {
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
 * SIDEARM LOCATION format varies by site/sport - two real patterns show up in this
 * data: "City, ST, Venue Name" (comma-comma) and "City, ST / Venue Name" (comma then
 * a slash inside the second segment, no second comma). Often just "City, ST" (no
 * building name at all) for away games, since the ingesting school's feed doesn't
 * always know the opponent's venue name.
 */
export function parseLocation(location: string | null): ParsedLocation {
  if (!location) return { city: null, state: null, venueName: "TBD" };
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
 * into one row. Date + home + away is the actual unique identity of a game.
 */
export function computeDedupeKey(params: {
  startDatetime: Date;
  homeName: string;
  awayName: string;
}): string {
  return [
    params.startDatetime.toISOString(),
    normalizeForKey(params.homeName),
    normalizeForKey(params.awayName),
  ].join("|");
}
