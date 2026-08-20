import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getEventById } from "@/db/queries";
import { withTicketAffiliateTag } from "@/lib/affiliate";
import { trackEvent } from "@/lib/vemetric";
import { auth } from "@/auth/auth";

/**
 * Real "Buy Tickets" links point here instead of straight at the vendor, so a click can be
 * tracked server-side before redirecting on - a plain outbound <a href> never touches our own
 * server, so this is the only way to observe the click at all (Section 65's flagged follow-up).
 * Takes an event id, not a raw destination URL, specifically to avoid being an open redirect -
 * the actual target is always looked up from our own data, never taken from the request.
 * Never used for embeddable-checkout games (Section 47/56 already route those to an in-app
 * iframe via a plain internal <Link>, which never reaches this route at all).
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const event = await getEventById(id);

  // No event, or no real ticket link on it (e.g. the link went stale between page render and
  // click) - land on the game's own page rather than a dead end.
  if (!event || !event.ticketUrl) {
    return NextResponse.redirect(new URL(`/events/${id}`, request.url), 302);
  }

  const session = await auth.api.getSession({ headers: await headers() });
  trackEvent("TicketClicked", session?.user.id ?? "anonymous", {
    eventId: event.id,
    sport: event.sport,
    gender: event.gender,
    homeSchoolName: event.homeSchoolName,
    awaySchoolName: event.awaySchoolName,
  });

  return NextResponse.redirect(withTicketAffiliateTag(event.ticketUrl), 302);
}
