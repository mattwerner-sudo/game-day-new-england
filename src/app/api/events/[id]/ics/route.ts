import { getEventById } from "@/db/queries";
import { eventTitle, formatLocation } from "@/lib/format";
import { buildICSEvent, buildICSCalendar } from "@/lib/ics";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/** "Add to Calendar" for a single game - a plain download, not a subscription feed. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return new Response("Not found", { status: 404 });

  const ics = buildICSCalendar(
    [
      buildICSEvent({
        uid: event.id,
        start: event.startDatetime,
        summary: eventTitle(event),
        location: formatLocation(event),
        url: `${BASE_URL}/events/${event.id}`,
      }),
    ],
    eventTitle(event)
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="game.ics"`,
    },
  });
}
