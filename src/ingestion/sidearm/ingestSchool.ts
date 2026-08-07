import { fetchSportMeta } from "./discover";
import { fetchIcsFeed } from "./feed";
import { parseIcsEvents } from "./parse";
import {
  genderFromCode,
  sportNameFromTitle,
  deriveSeason,
  parseLocation,
  parseMatchup,
  computeDedupeKey,
  parseTicketUrl,
  parseStreamingInfo,
  isFeedStale,
} from "./normalize";
import { getTeamOverride } from "./conferenceOverrides";
import { findSchoolByName, upsertTeam, upsertVenue, upsertEvent } from "../upsert";

export interface School {
  id: string;
  name: string;
  websiteUrl: string; // e.g. https://athletics.amherst.edu
  division: string;
}

function hostnameFromUrl(url: string): string {
  return new URL(url).hostname;
}

export interface IngestResult {
  sportSlug: string;
  sportTitle: string;
  fetched: number;
  inserted: number;
  updated: number;
  skipped: number;
}

/** Fetch + parse + normalize + dedupe + upsert one sport's real schedule for one school. */
export async function ingestSchoolSport(school: School, sportSlug: string): Promise<IngestResult> {
  const hostname = hostnameFromUrl(school.websiteUrl);
  const meta = await fetchSportMeta(hostname, sportSlug);
  if (!meta) {
    console.warn(`  [skip] no associated_sport metadata found for ${hostname}/${sportSlug}`);
    return { sportSlug, sportTitle: "(unknown)", fetched: 0, inserted: 0, updated: 0, skipped: 0 };
  }

  const icsText = await fetchIcsFeed(hostname, meta.sportId);
  const rawGames = parseIcsEvents(icsText);

  const mostRecentStart = rawGames.reduce<Date | null>(
    (latest, g) => (!latest || g.start > latest ? g.start : latest),
    null
  );
  if (isFeedStale(mostRecentStart, new Date())) {
    console.warn(
      `  [skip] "${meta.title}" (${hostname}/${sportSlug}) - feed is stale, most recent event ` +
        `${mostRecentStart?.toISOString() ?? "(none)"}, likely a defunct/renamed program page ` +
        `still linked in site nav, not a real active sport`
    );
    return { sportSlug, sportTitle: meta.title, fetched: rawGames.length, inserted: 0, updated: 0, skipped: rawGames.length };
  }

  const sport = sportNameFromTitle(meta.title);
  const gender = genderFromCode(meta.genderCode);
  const ownOverride = getTeamOverride(school.name, sport, gender);
  const ownTeamId = await upsertTeam(school.id, sport, gender, ownOverride);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const game of rawGames) {
    const matchup = parseMatchup(game.summary);
    if (!matchup) {
      skipped++;
      console.warn(`  [skip] couldn't parse matchup from summary: "${game.summary}"`);
      continue;
    }

    const { venueName, city, state } = parseLocation(game.location);
    const opponent = await findSchoolByName(matchup.opponentName);
    // Use the opponent's own canonical name (from our schools table) when resolved,
    // not the raw text this feed happened to call them - the two sides of the same
    // real game often name each other differently ("Amherst College" vs "Amherst"),
    // which would otherwise produce two different dedupe keys for one real game.
    const opponentName = opponent?.name ?? matchup.opponentName;

    const homeSchoolId = matchup.isHome ? school.id : (opponent?.id ?? null);
    const homeName = matchup.isHome ? school.name : opponentName;
    const awayName = matchup.isHome ? opponentName : school.name;

    const venueId = await upsertVenue(venueName, homeSchoolId, city, state);

    const opponentOverride = opponent ? getTeamOverride(opponent.name, sport, gender) : null;
    const opponentTeamId = opponent
      ? await upsertTeam(opponent.id, sport, gender, opponentOverride)
      : null;

    const dedupeKey = computeDedupeKey({
      startDatetime: game.start,
      homeName,
      awayName,
    });

    // Ticket/source links are only trustworthy from the feed that's actually hosting
    // the game - SIDEARM doesn't surface the opponent's ticket link on an away entry,
    // and we don't want an away-pass's own school-site link overwriting the home
    // school's more useful one on whichever pass happens to run second.
    // Prefer the schedule page's per-game Paciolan/evenue widget link (matched by the
    // same game_id the ICS URL field carries) over the ICS DESCRIPTION "Tickets:" line -
    // it's per-game rather than a generic season page, and catches real ticketed games
    // the DESCRIPTION line omits entirely (see CLAUDE.md).
    const gameId = game.url?.match(/game_id=(\d+)/)?.[1];
    const ticketUrl =
      (gameId && meta.ticketUrlsByGameId.get(gameId)) || parseTicketUrl(game.description);
    const streaming = parseStreamingInfo(game.description);
    const linkFields = matchup.isHome
      ? { ticketUrl, sourceUrl: game.url, ...streaming }
      : {};

    const result = await upsertEvent({
      type: "game",
      sport,
      gender,
      season: deriveSeason(sport, game.start),
      division: ownOverride?.division ?? school.division,
      homeTeamId: matchup.isHome ? ownTeamId : opponentTeamId,
      awayTeamId: matchup.isHome ? opponentTeamId : ownTeamId,
      venueId,
      startDatetime: game.start,
      endDatetime: game.end,
      status: "scheduled",
      source: "sidearm",
      sourceEventId: game.uid,
      dedupeKey,
      ...linkFields,
    });

    if (result === "inserted") inserted++;
    else updated++;
  }

  return { sportSlug, sportTitle: meta.title, fetched: rawGames.length, inserted, updated, skipped };
}

export { discoverSportSlugs } from "./discover";
