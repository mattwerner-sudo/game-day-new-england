import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { schools } from "@/db/schema";
import { ingestOneSchool } from "@/ingestion/ingestOneSchool";

// Highest duration Vercel allows on a Pro plan (Hobby caps lower and will just cut this off
// early - see the comment below on why that's an acceptable, self-healing failure mode, not a
// bug to design around here).
export const maxDuration = 300;

/**
 * Vercel Cron target (see vercel.json) - closes CLAUDE.md Section 0.3's standing gap that
 * nothing in this repo runs on its own; ingestion has been human-triggered via
 * `scripts/ingest.ts --all` this entire project. Reuses the exact same ingestOneSchool() the
 * CLI script calls - not a separate, drift-prone reimplementation.
 *
 * Deliberately does NOT batch/round-robin schools across invocations. A full run took
 * 15-25 minutes locally; on a constrained plan tier this may not finish inside maxDuration
 * before Vercel cuts it off. That's treated as an acceptable, self-healing failure mode, not
 * something to engineer around with added state: ingestion is fully idempotent (proven all
 * session - a run interrupted by anything, including a founder closing their laptop, has
 * always just been safe to resume), so a run that gets cut off partway through simply leaves
 * the remaining schools to pick up next time the schedule fires, same as any other
 * interruption this project has already relied on being harmless.
 */
export async function GET(request: Request): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
  } else {
    // No CRON_SECRET set (local dev only - always set it in Vercel's env vars) - an
    // unauthenticated version of this endpoint would let anyone trigger a full ingestion run
    // against every school's real site plus Neon, which is a real abuse/cost vector, not a
    // theoretical one.
    console.warn("[cron/ingest] CRON_SECRET not set - refusing to run outside local dev");
    if (process.env.NODE_ENV === "production") {
      return new NextResponse("CRON_SECRET not configured", { status: 500 });
    }
  }

  const allSchools = await db.select().from(schools);
  const results = [];
  for (const school of allSchools) {
    results.push(await ingestOneSchool(school));
  }

  const failed = results.filter((r) => !r.ok);
  const withPartialErrors = results.filter((r) => r.ok && r.errors.length > 0);

  return NextResponse.json({
    schoolsProcessed: results.length,
    totalSchools: allSchools.length,
    fullyFailed: failed.map((r) => r.schoolName),
    partialErrors: withPartialErrors.map((r) => ({ school: r.schoolName, errors: r.errors })),
  });
}
