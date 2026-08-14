import { WeekendEvent } from "@/db/queries";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// Same sponsor slot/env-var convention as src/email/templates.ts - kept to a name only (no url)
// here since SMS cost scales per 160-char segment and there's already a manage-url link below.
const SPONSOR_NAME = process.env.DIGEST_SPONSOR_NAME;

/**
 * Better Auth's phoneNumber plugin's sendOTP callback (src/auth/auth.ts) - a login code, not a
 * marketing message, so it deliberately carries none of confirmationSms's old TCPA marketing
 * disclosure language (rates/frequency/STOP/HELP) - that consent is tracked completely
 * separately via users.smsConsentedAt (see schema.ts's comment on that column) and only applies
 * once someone opts into game-alert texts specifically, not to using their phone to log in.
 */
export function otpSms(code: string): string {
  return `Game Day New England: your code is ${code}`;
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
  const sponsor = SPONSOR_NAME ? ` (presented by ${SPONSOR_NAME})` : "";

  return (
    `Game Day New England${sponsor}: ${events.length} game${events.length === 1 ? "" : "s"} this week for ` +
    `${schoolNames.join(", ")}:\n${lines.join("\n")}${more}\nSee all: ${manageUrl}\nReply STOP to cancel.`
  );
}
