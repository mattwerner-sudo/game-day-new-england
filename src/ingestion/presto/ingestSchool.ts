import { fetchPrestoIcsFeed } from "./feed";
import { parsePrestoIcsEvents } from "./parse";
import {
  genderFromCategory,
  sportNameFromCategory,
  parsePrestoMatchup,
  parsePrestoLocation,
} from "./normalize";
import { deriveSeason, computeDedupeKey } from "../sidearm/normalize";
import { findSchoolByName, upsertTeam, upsertVenue, upsertEvent } from "../upsert";
import type { School } from "../sidearm/ingestSchool";

export interface PrestoIngestResult {
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
  sportsSeen: number;
}

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
  const rawGames = parsePrestoIcsEvents(icsText);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const ownTeamIds = new Map<string, string>(); // "sport|gender" -> teamId, avoids repeat upserts

  for (const game of rawGames) {
    if (!game.category) {
      skipped++;
      continue;
    }
    const sport = sportNameFromCategory(game.category);
    const gender = genderFromCategory(game.category);

    const matchup = parsePrestoMatchup(game.summary, game.location !== null);
    if (!matchup) {
      skipped++;
      console.warn(`  [skip] couldn't parse matchup from summary: "${game.summary}"`);
      continue;
    }

    const teamKey = `${sport}|${gender}`;
    let ownTeamId = ownTeamIds.get(teamKey);
    if (!ownTeamId) {
      ownTeamId = await upsertTeam(school.id, sport, gender);
      ownTeamIds.set(teamKey, ownTeamId);
    }

    const opponent = await findSchoolByName(matchup.opponentName);
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

    const dedupeKey = computeDedupeKey({ startDatetime: game.start, homeName, awayName });

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
      sourceUrl: game.url ? `https://${hostname}${game.url}` : null,
      // No structured "Tickets:/TV:/Streaming Video:" lines in Presto's DESCRIPTION the way
      // SIDEARM has (confirmed - it's just a plain restatement of the summary) - ticketUrl/
      // streaming fields intentionally left unset, not force-parsed from something that
      // isn't there.
    });

    if (result === "inserted") inserted++;
    else updated++;
  }

  return { fetched: rawGames.length, inserted, updated, skipped, sportsSeen: ownTeamIds.size };
}
