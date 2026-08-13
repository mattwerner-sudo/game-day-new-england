import { WeekendEvent } from "@/db/queries";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

/**
 * Sent immediately on opt-in - this text itself IS the required TCPA disclosure receipt
 * (sender identity, message frequency, rates, STOP/HELP), not a confirm-to-activate step like
 * email's double opt-in (see setSmsConsent's comment for why: the checkbox submission is
 * already the consent). Deliberately short - a real 2-segment message for a fan following
 * several schools is an acceptable, bounded cost for a one-time send, unlike the recurring
 * digest below where per-segment cost matters more.
 */
export function confirmationSms(schoolNames: string[], manageToken: string): string {
  const manageUrl = `${BASE_URL}/manage?token=${manageToken}`;
  return (
    `Game Day New England: You're subscribed to text alerts for ${schoolNames.join(", ")}. ` +
    `Msg freq varies, msg&data rates may apply. Reply STOP to cancel, HELP for help. ${manageUrl}`
  );
}

/**
 * Unlike the email digest (one line per game, no real length constraint), SMS cost scales per
 * 160-char segment on every single send, and this goes out weekly to every subscribed fan - so
 * this is deliberately compact rather than exhaustive: a short summary line per game, capped at
 * 4, with a "+N more" pointer to the full list on the site rather than reproducing it verbatim.
 */
export function digestSms(schoolNames: string[], events: WeekendEvent[], manageToken: string): string {
  const manageUrl = `${BASE_URL}/manage?token=${manageToken}`;
  const maxLines = 4;
  const lines = events.slice(0, maxLines).map((e) => {
    const matchup =
      (e.type === "special_event"
        ? e.eventName ?? "Meet"
        : `${e.awaySchoolName ?? "TBD"} at ${e.homeSchoolName ?? "TBD"}`) +
      (e.isExhibition ? " (Exh)" : "");
    const when = e.startDatetime.toLocaleString("en-US", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${when}: ${matchup}`;
  });
  const remaining = events.length - lines.length;
  const more = remaining > 0 ? ` +${remaining} more` : "";

  return (
    `Game Day New England: ${events.length} game${events.length === 1 ? "" : "s"} this week for ` +
    `${schoolNames.join(", ")}:\n${lines.join("\n")}${more}\nSee all: ${manageUrl}\nReply STOP to cancel.`
  );
}
