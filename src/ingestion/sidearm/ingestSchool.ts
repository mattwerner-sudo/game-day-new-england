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
} from "./normalize";
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

  const sport = sportNameFromTitle(meta.title);
  const gender = genderFromCode(meta.genderCode);
  const ownTeamId = await upsertTeam(school.id, sport, gender);

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

    const opponentTeamId = opponent
      ? await upsertTeam(opponent.id, sport, gender)
      : null;

    const dedupeKey = computeDedupeKey({
      startDatetime: game.start,
      homeName,
      awayName,
    });

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
      source: "sidearm",
      sourceEventId: game.uid,
      dedupeKey,
    });

    if (result === "inserted") inserted++;
    else updated++;
  }

  return { sportSlug, sportTitle: meta.title, fetched: rawGames.length, inserted, updated, skipped };
}

export { discoverSportSlugs } from "./discover";
