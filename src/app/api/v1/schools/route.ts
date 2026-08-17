import { NextResponse } from "next/server";
import { getFilterOptions } from "@/db/queries";

/** Public, unauthenticated - school picker data for the Chrome extension (see events/route.ts). */
export async function GET(): Promise<Response> {
  const { schools } = await getFilterOptions();

  return NextResponse.json(schools, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=300",
    },
  });
}
