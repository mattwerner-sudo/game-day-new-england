import twilio from "twilio";

export interface SendSmsInput {
  to: string; // E.164, see src/fans/phone.ts
  body: string;
}

// TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN/TWILIO_FROM_NUMBER set (founder's own Twilio account,
// including real 10DLC brand/campaign registration - can't be provisioned by this session, same
// category as the Resend/Neon/Vercel accounts flagged in CLAUDE.md) -> real send. Unset -> log
// to console instead, so the whole SMS opt-in/confirmation/digest flow is testable end-to-end
// locally without a real Twilio account. Mirrors src/email/send.ts's exact DATABASE_URL-style
// branch pattern.
export async function sendSms({ to, body }: SendSmsInput): Promise<void> {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    console.log(`[sms:dry-run] to=${to}\n${body}\n`);
    return;
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await client.messages.create({ to, from: TWILIO_FROM_NUMBER, body });
}
