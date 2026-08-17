import { getSchoolBySlug, getFilteredEvents } from "@/db/queries";
import { eventTitle, formatLocation } from "@/lib/format";
import { buildICSEvent, buildICSCalendar } from "@/lib/ics";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/**
 * A real subscribable feed, not a one-time download - the same "season" window used by the
 * /schools/[slug] page itself (Section 55), so what a calendar app shows matches what the page
 * shows. Calendar apps that support subscriptions (Google/Apple Calendar's "From URL") re-fetch
 * this on their own schedule, so new/changed games show up without the user doing anything.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return new Response("Not found", { status: 404 });

  const events = await getFilteredEvents("season", { schoolId: school.id });

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
    `${school.name} Schedule`
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${school.name.replace(/[^a-z0-9]+/gi, "-")}.ics"`,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
