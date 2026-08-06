import { NextResponse } from "next/server";
import { findFanByToken, confirmFan, getFollowedSchools, logConsentEvent } from "@/fans/queries";

export async function POST(request: Request): Promise<Response> {
  const formData = await request.formData();
  const token = String(formData.get("token") ?? "");
  const fan = token ? await findFanByToken(token) : null;

  // Covers both first-time confirm and resubscribe (a previously-unsubscribed fan clicking a
  // fresh confirm link) - see confirmFan's doc comment.
  if (fan && (!fan.confirmedAt || fan.unsubscribedAt)) {
    await confirmFan(fan.id);
    const followedSchools = await getFollowedSchools(fan.id);
    await logConsentEvent(fan.id, "confirmed", followedSchools.map((s) => s.id));
  }

  return NextResponse.redirect(new URL(`/confirm?token=${token}`, request.url), 303);
}
