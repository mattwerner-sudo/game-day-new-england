import { NextResponse } from "next/server";
import { findOrCreateFan, addFollows, logConsentEvent, setSmsConsent } from "@/fans/queries";
import { getFilterOptions } from "@/db/queries";
import { sendEmail } from "@/email/send";
import { confirmEmail } from "@/email/templates";
import { sendSms } from "@/sms/send";
import { confirmationSms } from "@/sms/templates";
import { normalizeUsPhone } from "@/fans/phone";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const schoolIds = formData.getAll("schoolIds").map(String);
  const rawPhone = String(formData.get("phone") ?? "").trim();
  const smsConsentChecked = formData.get("smsConsent") === "yes";

  if (!email || schoolIds.length === 0) {
    return NextResponse.redirect(new URL("/follow", request.url), 303);
  }

  const fan = await findOrCreateFan(email);
  await addFollows(fan.id, schoolIds);
  await logConsentEvent(fan.id, "registered", schoolIds);

  const { schools } = await getFilterOptions();
  const schoolNames = schools.filter((s) => schoolIds.includes(s.id)).map((s) => s.name);

  const confirmUrl = `${BASE_URL}/confirm?token=${fan.manageToken}`;
  const { subject, html } = confirmEmail(schoolNames, confirmUrl, fan.manageToken);
  await sendEmail({ to: fan.email, subject, html });

  // SMS consent requires both the checkbox AND a real, normalizable phone number - a checked
  // box with no usable number isn't consent to anything, and a number with no checked box is
  // just contact info, not TCPA consent. Silently skip (not error) if either is missing/invalid
  // rather than block the email signup that just succeeded above.
  if (smsConsentChecked) {
    const phone = normalizeUsPhone(rawPhone);
    if (phone) {
      await setSmsConsent(fan.id, phone);
      await logConsentEvent(fan.id, "sms_registered", schoolIds);
      const body = confirmationSms(schoolNames, fan.manageToken);
      await sendSms({ to: phone, body });
    }
  }

  return NextResponse.redirect(new URL("/follow/check-email", request.url), 303);
}
