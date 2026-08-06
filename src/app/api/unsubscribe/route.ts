import { NextResponse } from "next/server";
import { findFanByToken, unsubscribeFan, logConsentEvent } from "@/fans/queries";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const fan = token ? await findFanByToken(token) : null;

  if (fan && !fan.unsubscribedAt) {
    await unsubscribeFan(fan.id);
    await logConsentEvent(fan.id, "unsubscribed", []);
  }

  return NextResponse.redirect(new URL(`/manage?token=${token}`, request.url), 303);
}
