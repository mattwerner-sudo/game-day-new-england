import { Resend } from "resend";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

// RESEND_API_KEY set (founder's own Resend account - can't be provisioned by this session,
// same category as the Neon/Vercel accounts flagged in CLAUDE.md Section 14) -> real send.
// Unset -> log to console instead, so the whole registration/confirm/alert flow is testable
// end-to-end locally without a real email provider. Mirrors src/db/client.ts's DATABASE_URL
// branch pattern exactly.
export async function sendEmail({ to, subject, html }: SendEmailInput): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[email:dry-run] to=${to} subject="${subject}"\n${html}\n`);
    return;
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "Game Day New England <alerts@gamedaynewengland.com>";
  await resend.emails.send({ from, to, subject, html });
}
