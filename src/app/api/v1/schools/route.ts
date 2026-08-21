import { NextResponse } from "next/server";
import { getPublicSchools } from "@/db/queries";

/**
 * Public, unauthenticated - school picker data for the Chrome extension (see events/route.ts),
 * now also carrying websiteUrl (Section 67) so the extension can build its own
 * hostname-to-school lookup for site detection.
 */
export async function GET(): Promise<Response> {
  const schools = await getPublicSchools();

  return NextResponse.json(schools, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
