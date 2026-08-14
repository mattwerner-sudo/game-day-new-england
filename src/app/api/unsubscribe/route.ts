import { NextResponse } from "next/server";
import { findUserByManageToken, unsubscribeEmailAlerts, unsubscribeFromSms, logConsentEvent } from "@/fans/queries";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  // Distinguishes "stop texts only" (keeps email) from the existing "stop everything" button -
  // two real, different asks, not the same action with a different label.
  const scope = String(formData.get("scope") ?? "all");
  const user = token ? await findUserByManageToken(token) : null;

  if (user && scope === "sms") {
    if (!user.smsUnsubscribedAt) {
      await unsubscribeFromSms(user.id);
      await logConsentEvent(user.id, "sms_unsubscribed", []);
    }
  } else if (user) {
    if (!user.emailAlertsUnsubscribedAt) {
      await unsubscribeEmailAlerts(user.id);
      await logConsentEvent(user.id, "unsubscribed", []);
    }
    // "All" means all channels, not just email - someone who consented to texts shouldn't keep
    // getting them after hitting the one "stop everything" button on this page.
    if (!user.smsUnsubscribedAt && user.smsConsentedAt) {
      await unsubscribeFromSms(user.id);
      await logConsentEvent(user.id, "sms_unsubscribed", []);
    }
  }

  return NextResponse.redirect(new URL(`/manage?token=${token}`, request.url), 303);
}
