import { fetchSportMeta } from "./discover";
import { fetchIcsFeed } from "./feed";
import { parseIcsEvents } from "./parse";
import {
  genderFromCode,
  sportNameFromTitle,
  deriveSeason,
  parseLocation,
  parseMatchup,
  parseSpecialEventName,
  looksLikeMeetName,
  isOutOfScopeSport,
  computeDedupeKey,
  computeSpecialEventDedupeKey,
  parseTicketUrl,
  parseStreamingInfo,
  isFeedStale,
} from "./normalize";
import { getTeamOverride } from "./conferenceOverrides";
import { findSchoolByName, upsertTeam, upsertVenue, upsertEvent, upsertSpecialEvent } from "../upsert";

export interface School {
  id: string;
  name: string;
  websiteUrl: string; // e.g. https://athletics.amherst.edu
  division: string;
  city: string;
  state: string;
  cmsPlatform: string; // "sidearm" | "presto" | "other"
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
  meets: number;
}

/** Fetch + parse + normalize + dedupe + upsert one sport's real schedule for one school. */
export async function ingestSchoolSport(school: School, sportSlug: string): Promise<IngestResult> {
  const hostname = hostnameFromUrl(school.websiteUrl);
  const meta = await fetchSportMeta(hostname, sportSlug);
  if (!meta) {
    console.warn(`  [skip] no associated_sport metadata found for ${hostname}/${sportSlug}`);
    return { sportSlug, sportTitle: "(unknown)", fetched: 0, inserted: 0, updated: 0, skipped: 0, meets: 0 };
  }

  if (isOutOfScopeSport(meta.title)) {
    console.warn(`  [skip] "${meta.title}" (${hostname}/${sportSlug}) - club/JV/esports, out of scope (Section 3)`);
    return { sportSlug, sportTitle: meta.title, fetched: 0, inserted: 0, updated: 0, skipped: 0, meets: 0 };
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
    return { sportSlug, sportTitle: meta.title, fetched: rawGames.length, inserted: 0, updated: 0, skipped: rawGames.length, meets: 0 };
  }

  const sport = sportNameFromTitle(meta.title);
  const gender = genderFromCode(meta.genderCode);
  const ownOverride = getTeamOverride(school.name, sport, gender);
  const ownTeamId = await upsertTeam(school.id, sport, gender, ownOverride);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let meets = 0;

  /** Shared by both meet-detection paths below - see their respective comments. */
  async function upsertMeet(eventName: string, game: (typeof rawGames)[number]): Promise<void> {
    const { venueName, city, state } = parseLocation(game.location);
    const venueId = await upsertVenue(venueName, null, city, state);
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
      source: "sidearm",
      sourceEventId: game.uid,
      dedupeKey,
    });

    if (result === "inserted") inserted++;
    else updated++;
    meets++;
  }

  for (const game of rawGames) {
    let matchup = parseMatchup(game.summary);

    if (!matchup) {
      const candidateName = parseSpecialEventName(game.summary, school.name, meta.title);
      if (!candidateName) {
        skipped++;
        console.warn(`  [skip] couldn't parse matchup from summary: "${game.summary}"`);
        continue;
      }

      // A third real SIDEARM summary format, found via a real misclassification (Saint
      // Joseph's College of Maine): "<School> <Sport>  <Opponent>" with no "vs"/"at"
      // connector word at all - confirmed real: "Saint Joseph's College of Maine Men's
      // Golf  Gordon College", where "Gordon College" is a real seeded opponent school, not
      // a meet name. Only treat the prefix-stripped remainder as a genuine meet name once
      // it's confirmed NOT to resolve to a real school - otherwise this is a real 2-team
      // game that just happens to lack the usual grammar. No "vs"/"at" word means no
      // grammatical signal for home/away either, so that's inferred from location instead:
      // a location that doesn't match this school's own city is a real signal this is away.
      const resolvedAsSchool = await findSchoolByName(candidateName);
      if (!resolvedAsSchool) {
        await upsertMeet(candidateName, game);
        continue;
      }
      const loc = parseLocation(game.location);
      const isHome = !loc.city || (loc.city === school.city && loc.state === school.state);
      matchup = { isHome, opponentName: candidateName };
    }

    const { venueName, city, state } = parseLocation(game.location);
    const opponent = await findSchoolByName(matchup.opponentName);

    // Second meet-detection path (see looksLikeMeetName's comment): some schools' feeds
    // (Williams' cross country, confirmed real) run meets through the same vs/at shape a
    // real game uses, e.g. "... at Little Three Championships". Only reclassify when the
    // "opponent" both fails to resolve to a real seeded school AND matches a real-world
    // meet/tournament keyword - a genuine opponent name essentially never does.
    if (!opponent && looksLikeMeetName(matchup.opponentName)) {
      await upsertMeet(matchup.opponentName, game);
      continue;
    }

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
      gender,
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
      opponentNameRaw: opponent ? null : opponentName,
      ...linkFields,
    });

    if (result === "inserted") inserted++;
    else updated++;
  }

  return { sportSlug, sportTitle: meta.title, fetched: rawGames.length, inserted, updated, skipped, meets };
}

export { discoverSportSlugs } from "./discover";
