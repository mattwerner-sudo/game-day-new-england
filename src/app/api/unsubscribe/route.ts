import { NextResponse } from "next/server";
import { findFanByToken, unsubscribeFan, unsubscribeFromSms, logConsentEvent } from "@/fans/queries";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  // Distinguishes "stop texts only" (fan keeps email) from the existing "stop everything"
  // button - two real, different asks, not the same action with a different label.
  const scope = String(formData.get("scope") ?? "all");
  const fan = token ? await findFanByToken(token) : null;

  if (fan && scope === "sms") {
    if (!fan.smsUnsubscribedAt) {
      await unsubscribeFromSms(fan.id);
      await logConsentEvent(fan.id, "sms_unsubscribed", []);
    }
  } else if (fan) {
    if (!fan.unsubscribedAt) {
      await unsubscribeFan(fan.id);
      await logConsentEvent(fan.id, "unsubscribed", []);
    }
    // "All" means all channels, not just email - a fan who consented to texts shouldn't keep
    // getting them after hitting the one "stop everything" button on this page.
    if (!fan.smsUnsubscribedAt && fan.smsConsentedAt) {
      await unsubscribeFromSms(fan.id);
      await logConsentEvent(fan.id, "sms_unsubscribed", []);
    }
  }

  return NextResponse.redirect(new URL(`/manage?token=${token}`, request.url), 303);
}
