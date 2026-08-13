import { WeekendEvent } from "@/db/queries";

// Founder-supplied CAN-SPAM mailing address - same bucket as the Resend account itself
// (see CLAUDE.md): a real physical address is required in every marketing/alert email.
const MAILING_ADDRESS = process.env.MAILING_ADDRESS ?? "[mailing address not yet configured]";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

function footer(manageToken: string): string {
  const manageUrl = `${BASE_URL}/manage?token=${manageToken}`;
  return `<p style="color:#666;font-size:12px;margin-top:24px;">
    ${MAILING_ADDRESS}<br/>
    <a href="${manageUrl}">Manage your alerts or unsubscribe</a>
  </p>`;
}

export function confirmEmail(schoolNames: string[], confirmUrl: string, manageToken: string): { subject: string; html: string } {
  return {
    subject: "Confirm your Game Day New England alerts",
    html: `<p>Confirm you'd like game alerts for: <strong>${schoolNames.join(", ")}</strong></p>
      <p><a href="${confirmUrl}">Confirm my email</a></p>
      <p>If you didn't request this, you can ignore this email.</p>
      ${footer(manageToken)}`,
  };
}

export function digestEmail(
  schoolNames: string[],
  events: WeekendEvent[],
  manageToken: string
): { subject: string; html: string } {
  const rows = events
    .map((e) => {
      // special_event rows (meets/championships) have no home/away side - fall back to
      // eventName + whichever participating schools we know about, same as the homepage.
      const matchup =
        (e.type === "special_event"
          ? `${e.eventName ?? "Meet"} (${e.participatingSchoolNames.join(", ") || "schools TBD"})`
          : `${e.awaySchoolName ?? "TBD"} at ${e.homeSchoolName ?? "TBD"}`) +
        (e.isExhibition ? " (Exhibition)" : "");
      const when = e.startDatetime.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
      return `<li>${when} — ${matchup} (${e.sport})</li>`;
    })
    .join("\n");

  return {
    subject: `This week: ${events.length} game${events.length === 1 ? "" : "s"} for your followed schools`,
    html: `<p>Upcoming games for ${schoolNames.join(", ")}:</p>
      <ul>${rows}</ul>
      ${footer(manageToken)}`,
  };
}
