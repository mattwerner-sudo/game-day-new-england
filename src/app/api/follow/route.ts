import { NextResponse } from "next/server";
import { findOrCreateFan, addFollows, logConsentEvent } from "@/fans/queries";
import { getFilterOptions } from "@/db/queries";
import { sendEmail } from "@/email/send";
import { confirmEmail } from "@/email/templates";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const schoolIds = formData.getAll("schoolIds").map(String);

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

  return NextResponse.redirect(new URL("/follow/check-email", request.url), 303);
}
