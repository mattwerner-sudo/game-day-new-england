import { NextResponse } from "next/server";
import { findFanByPhone, setSmsConsent, unsubscribeFromSms, logConsentEvent } from "@/fans/queries";
import { normalizeUsPhone } from "@/fans/phone";

// Twilio's own standard keyword list for opt-out/opt-back-in (matches what Advanced Opt-Out
// recognizes at the carrier level) - recognizing the same words here keeps this app's own
// fans.smsUnsubscribedAt in sync with Twilio's carrier-side block, rather than trusting Twilio
// alone and letting this app's own state (and the manage page's display of it) drift stale.
const STOP_WORDS = new Set(["stop", "stopall", "unsubscribe", "cancel", "end", "quit"]);
const START_WORDS = new Set(["start", "yes", "unstop"]);

/**
 * Twilio webhook target (configure on the phone number/Messaging Service, not user-facing).
 * Deliberately returns an empty TwiML response rather than sending our own reply text -
 * Twilio's platform-level Advanced Opt-Out already sends its own STOP/START confirmation when
 * enabled, so replying here too would double-message the fan.
 */
export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const from = String(formData.get("From") ?? "");
  const body = String(formData.get("Body") ?? "").trim().toLowerCase();

  const phone = normalizeUsPhone(from);
  const fan = phone ? await findFanByPhone(phone) : null;

  if (fan) {
    if (STOP_WORDS.has(body)) {
      if (!fan.smsUnsubscribedAt) {
        await unsubscribeFromSms(fan.id);
        await logConsentEvent(fan.id, "sms_unsubscribed", []);
      }
    } else if (START_WORDS.has(body) && phone) {
      await setSmsConsent(fan.id, phone);
      await logConsentEvent(fan.id, "sms_registered", []);
    }
  }

  return new NextResponse("<Response></Response>", {
    headers: { "Content-Type": "text/xml" },
  });
}
