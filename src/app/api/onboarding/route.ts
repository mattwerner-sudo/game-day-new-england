import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/auth/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { addFollows, logConsentEvent, setSmsConsent } from "@/fans/queries";
import { normalizeUsPhone } from "@/fans/phone";

export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url), 303);
  }

  const formData = await request.formData();
  const name = String(formData.get("name") ?? "").trim();
  const schoolIds = formData.getAll("schoolIds").map(String);
  const phoneRaw = String(formData.get("phone") ?? "");
  const smsConsent = formData.get("smsConsent") === "yes";

  if (name) {
    await db.update(users).set({ name }).where(eq(users.id, session.user.id));
  }

  await addFollows(session.user.id, schoolIds);
  await logConsentEvent(session.user.id, "onboarded", schoolIds);

  const phone = smsConsent ? normalizeUsPhone(phoneRaw) : null;
  if (phone) {
    await setSmsConsent(session.user.id, phone);
    await logConsentEvent(session.user.id, "sms_registered", []);
  }

  return NextResponse.redirect(new URL("/", request.url), 303);
}
