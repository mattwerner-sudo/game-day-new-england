import { NextResponse } from "next/server";
import { getFilteredEvents, isDateRange, parseDateParam, DateRange, EventFilters, WeekendEvent } from "@/db/queries";

/**
 * Explicit allowlist of public fields, not a raw pass-through of WeekendEvent - the underlying
 * row objects carry extra internal-only columns (e.g. homeSchoolWebsiteUrl/homeSchoolCmsPlatform,
 * used internally to resolve logoUrl) that ride along silently because TS's structural typing
 * doesn't strip untyped extra fields. Confirmed this leak for real by hitting the endpoint
 * directly before shipping it, not assumed safe.
 */
function toPublicEvent(e: WeekendEvent) {
  return {
    id: e.id,
    type: e.type,
    sport: e.sport,
    gender: e.gender,
    season: e.season,
    division: e.division,
    startDatetime: e.startDatetime,
    status: e.status,
    isExhibition: e.isExhibition,
    homeSchoolName: e.homeSchoolName,
    awaySchoolName: e.awaySchoolName,
    homeSchoolLogoUrl: e.homeSchoolLogoUrl,
    awaySchoolLogoUrl: e.awaySchoolLogoUrl,
    eventName: e.eventName,
    participatingSchoolNames: e.participatingSchoolNames,
    venueName: e.venueName,
    venueCity: e.venueCity,
    venueState: e.venueState,
    ticketUrl: e.ticketUrl,
    sourceUrl: e.sourceUrl,
    tvNetwork: e.tvNetwork,
    streamingVideoUrl: e.streamingVideoUrl,
    radioNetwork: e.radioNetwork,
    streamingAudioUrl: e.streamingAudioUrl,
  };
}

/**
 * Public, unauthenticated, read-only - v1 of the small JSON API scoped in CLAUDE.md Section
 * 0.12, built now as the data source the Chrome extension (Section 0.10) needs (a popup can't
 * run this app's own server-rendering, it needs structured data to fetch). Mirrors the
 * homepage's own filter surface exactly (same EventFilters/DateRange this app already uses
 * internally) rather than inventing a second filter vocabulary. CORS is wide open (`*`) since
 * this is the same data already publicly rendered on every event/school/league page - nothing
 * here is sensitive, and an extension's `chrome-extension://` origin has no fixed value to
 * allowlist anyway.
 */
export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);

  const rangeParam = searchParams.get("range") ?? "weekend";
  const range: DateRange = isDateRange(rangeParam) ? rangeParam : "weekend";
  const anchorDate = parseDateParam(searchParams.get("date") ?? undefined);

  const filters: EventFilters = {
    division: searchParams.get("division") ?? undefined,
    state: searchParams.get("state") ?? undefined,
    schoolId: searchParams.get("school") ?? undefined,
    sport: searchParams.get("sport") ?? undefined,
    league: searchParams.get("league") ?? undefined,
  };

  const events = await getFilteredEvents(range, filters, anchorDate);

  return NextResponse.json(events.map(toPublicEvent), {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
