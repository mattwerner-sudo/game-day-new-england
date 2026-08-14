/**
 * Tags an outbound ticket link for click attribution. Always applies UTM params (real, safe,
 * universally-ignored-if-unused - this alone already answers "does this even drive clicks",
 * CLAUDE.md Section 0.11). Only applies a real affiliate tag once TICKET_AFFILIATE_PARAM/
 * TICKET_AFFILIATE_VALUE are both set - same "unset env var = inert" convention as
 * RESEND_API_KEY/TWILIO_* elsewhere in this codebase. Deliberately generic (a param name/value
 * pair, not a hardcoded per-vendor scheme): no specific vendor's real affiliate program has been
 * verified yet (that needs actual enrollment, a founder action - see CLAUDE.md), so this never
 * guesses at one.
 *
 * Only meant for a plain top-level `<a href>` navigation - never apply this to an *embedded*
 * checkout iframe's src (e.g. the Vivenu ticketEmbed in events/[id]/page.tsx): an unexpected
 * query param on a live checkout flow rendered in-app is a real risk an outbound link isn't.
 */
export function withTicketAffiliateTag(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }

  parsed.searchParams.set("utm_source", "gamedaynewengland");
  parsed.searchParams.set("utm_medium", "referral");
  parsed.searchParams.set("utm_campaign", "ticket_link");

  const affParam = process.env.TICKET_AFFILIATE_PARAM;
  const affValue = process.env.TICKET_AFFILIATE_VALUE;
  if (affParam && affValue) parsed.searchParams.set(affParam, affValue);

  return parsed.toString();
}
