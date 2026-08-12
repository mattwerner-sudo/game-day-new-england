import { fetchPrestoIcsFeed } from "./feed";
import { parsePrestoIcsEvents } from "./parse";
import {
  genderFromCategory,
  sportNameFromCategory,
  parsePrestoMatchup,
  parsePrestoLocation,
  parsePrestoSpecialEventInfo,
} from "./normalize";
import {
  deriveSeason,
  computeDedupeKey,
  computeSpecialEventDedupeKey,
  looksLikeMeetName,
  isOutOfScopeSport,
} from "../sidearm/normalize";
import { findSchoolByName, upsertTeam, upsertVenue, upsertEvent, upsertSpecialEvent } from "../upsert";
import type { School } from "../sidearm/ingestSchool";

export interface PrestoIngestResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  sportsSeen: number;
  meets: number;
  tooOld: number;
}

// Confirmed real, not assumed: Presto's composite feed returns each school's entire
// historical archive, not just the current/upcoming schedule - a direct query found 8,751
// ingested events predating 2025 (some back to 2016), all from Presto (SIDEARM's per-sport
// feeds don't have this problem - confirmed zero old SIDEARM events). None of that serves
// this product's "what's happening near me this weekend" discovery framing - it's pure dead
// weight, and it's also where most of the stray pre-normalization sport-name variants
// actually lived. 90 days back is generous slack for "recently happened, still relevant
// context" while comfortably excluding years-old history.
const PRESTO_HISTORY_CUTOFF_DAYS = 90;

/**
 * One school's entire varsity slate in one pass - Presto's composite feed covers every
 * sport already (see feed.ts), unlike SIDEARM's per-sport-page discovery + per-sport feed
 * model. No isFeedStale check here (unlike sidearm/ingestSchool.ts): that check exists to
 * catch defunct *duplicate nav-linked pages* (confirmed real cases: Assumption's dead
 * "Blue & White Women's Soccer", CLAUDE.md Section 21) - a failure mode specific to
 * discovering sport pages via a site's nav, which doesn't apply here since there's no
 * per-sport discovery step at all to have a defunct duplicate of.
 */
export async function ingestSchoolPresto(school: School): Promise<PrestoIngestResult> {
  const hostname = new URL(school.websiteUrl).hostname;
  const icsText = await fetchPrestoIcsFeed(hostname);
  const allRawGames = parsePrestoIcsEvents(icsText);

  const cutoff = new Date(Date.now() - PRESTO_HISTORY_CUTOFF_DAYS * 24 * 60 * 60 * 1000);
  const rawGames = allRawGames.filter((g) => g.start >= cutoff);
  const tooOld = allRawGames.length - rawGames.length;

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let meets = 0;
  const ownTeamIds = new Map<string, string>(); // "sport|gender" -> teamId, avoids repeat upserts

  /** Shared by both meet-detection paths below - see their respective comments. */
  async function upsertMeet(eventName: string, game: (typeof rawGames)[number], sport: string, gender: string, venue: { venueName: string | null; city: string | null; state: string | null }): Promise<void> {
    const venueId = await upsertVenue(venue.venueName ?? "TBD", null, venue.city, venue.state);
    const dedupeKey = computeSpecialEventDedupeKey({ startDatetime: game.start, sport, gender, eventName });

    const result = await upsertSpecialEvent({
      sport,
      gender,
      season: deriveSeason(sport, game.start),
      division: null,
      eventName,
      venueId,
      participatingSchoolId: school.id,
      startDatetime: game.start,
      endDatetime: game.end,
      status: "scheduled",
      source: "presto",
      sourceEventId: game.uid,
      dedupeKey,
    });

    if (result === "inserted") inserted++;
    else updated++;
    meets++;
  }

  for (const game of rawGames) {
    if (!game.category) {
      skipped++;
      continue;
    }
    if (isOutOfScopeSport(game.category)) {
      skipped++;
      continue;
    }
    const sport = sportNameFromCategory(game.category);
    const gender = genderFromCategory(game.category);

    let matchup = parsePrestoMatchup(game.summary, game.location !== null);

    if (!matchup) {
      const info = parsePrestoSpecialEventInfo(game.summary);
      if (!info.eventName) {
        skipped++;
        console.warn(`  [skip] couldn't parse matchup from summary: "${game.summary}"`);
        continue;
      }

      // Same real bug as the SIDEARM adapter (see sidearm/ingestSchool.ts's mirror of this
      // comment): confirmed real, University of Saint Joseph's own feed has
      // "(Women's Swimming & Diving) Trinity" with no "vs"/"at" connector at all, where
      // "Trinity" is a real seeded opponent (Trinity College), not a meet name. Only treat
      // the extracted text as a genuine meet once it's confirmed NOT to resolve to a real
      // school. Unlike SIDEARM, Presto's LOCATION field is null for ordinary home/away games
      // (only populated for neutral-site games - see parsePrestoMatchup) so there's no venue
      // signal to infer home/away from here - defaults to away, matching Presto's own
      // convention that an entry with no location is a normal (usually away) game.
      const resolvedAsSchool = await findSchoolByName(info.eventName);
      if (!resolvedAsSchool) {
        await upsertMeet(info.eventName, game, sport, gender, info);
        continue;
      }
      matchup = { isHome: false, opponentName: info.eventName, isNeutralSite: false };
    }

    const teamKey = `${sport}|${gender}`;
    let ownTeamId = ownTeamIds.get(teamKey);
    if (!ownTeamId) {
      ownTeamId = await upsertTeam(school.id, sport, gender);
      ownTeamIds.set(teamKey, ownTeamId);
    }

    const opponent = await findSchoolByName(matchup.opponentName);

    // Second meet-detection path (see looksLikeMeetName's comment on the SIDEARM side, and
    // sidearm/ingestSchool.ts's mirror of this same check): some Presto meets also run
    // through the plain vs/at shape - confirmed real, e.g. Central Connecticut's "... at NEC
    // Tournament". Only reclassify when the "opponent" both fails to resolve to a real
    // seeded school AND matches a real-world meet/tournament keyword.
    if (!opponent && looksLikeMeetName(matchup.opponentName)) {
      const venue = game.location ? parsePrestoLocation(game.location) : { venueName: null, city: null, state: null };
      await upsertMeet(matchup.opponentName, game, sport, gender, venue);
      continue;
    }

    const opponentName = opponent?.name ?? matchup.opponentName;
    const opponentTeamId = opponent ? await upsertTeam(opponent.id, sport, gender) : null;

    const homeName = matchup.isHome ? school.name : opponentName;
    const awayName = matchup.isHome ? opponentName : school.name;

    // No LOCATION field at all for normal home/away games (Presto only includes it for
    // neutral-site games - see normalize.ts) - fall back to whichever participating
    // school's own known city/state applies, same "best known approximation, not a real
    // building name" spirit as SIDEARM's away-game handling.
    let venueName: string;
    let city: string | null;
    let state: string | null;
    let homeSchoolId: string | null;
    if (matchup.isNeutralSite) {
      const loc = parsePrestoLocation(game.location);
      venueName = loc.venueName;
      city = loc.city;
      state = loc.state;
      homeSchoolId = null;
    } else if (matchup.isHome) {
      venueName = "TBD";
      city = school.city;
      state = school.state;
      homeSchoolId = school.id;
    } else {
      venueName = "TBD";
      city = opponent?.city ?? null;
      state = opponent?.state ?? null;
      homeSchoolId = opponent?.id ?? null;
    }
    const venueId = await upsertVenue(venueName, homeSchoolId, city, state);

    const dedupeKey = computeDedupeKey({ startDatetime: game.start, homeName, awayName, gender });

    const result = await upsertEvent({
      type: "game",
      sport,
      gender,
      season: deriveSeason(sport, game.start),
      division: school.division,
      homeTeamId: matchup.isHome ? ownTeamId : opponentTeamId,
      awayTeamId: matchup.isHome ? opponentTeamId : ownTeamId,
      venueId,
      startDatetime: game.start,
      endDatetime: game.end,
      status: "scheduled",
      source: "presto",
      sourceEventId: game.uid,
      dedupeKey,
      opponentNameRaw: opponent ? null : opponentName,
      sourceUrl: game.url ? `https://${hostname}${game.url}` : null,
      // No structured "Tickets:/TV:/Streaming Video:" lines in Presto's DESCRIPTION the way
      // SIDEARM has (confirmed - it's just a plain restatement of the summary) - ticketUrl/
      // streaming fields intentionally left unset, not force-parsed from something that
      // isn't there.
    });

    if (result === "inserted") inserted++;
    else updated++;
  }

  return { fetched: rawGames.length, inserted, updated, skipped, sportsSeen: ownTeamIds.size, meets, tooOld };
}
