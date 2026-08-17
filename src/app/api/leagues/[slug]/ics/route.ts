import { resolveLeagueSlug, getFilteredEvents } from "@/db/queries";
import { eventTitle, formatLocation } from "@/lib/format";
import { buildICSEvent, buildICSCalendar } from "@/lib/ics";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** Same subscribable-feed pattern as schools/[slug]/ics - see that route's comment. */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const league = await resolveLeagueSlug(slug);
  if (!league) return new Response("Not found", { status: 404 });

  const events = await getFilteredEvents("season", { league });

  const ics = buildICSCalendar(
    events.map((event) =>
      buildICSEvent({
        uid: event.id,
        start: event.startDatetime,
        summary: eventTitle(event),
        location: formatLocation(event),
        url: `${BASE_URL}/events/${event.id}`,
      })
    ),
    `${league} Schedule`
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${league.replace(/[^a-z0-9]+/gi, "-")}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
