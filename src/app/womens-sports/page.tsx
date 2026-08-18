import type { Metadata } from "next";
import Link from "next/link";
import { getFilteredEvents } from "@/db/queries";
import { EventList } from "@/components/EventList";
import { logPageView } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

// A dedicated landing page for one specific, fixed filter combination (gender=womens), same
// pattern as /schools/[slug] and /leagues/[slug] (Section 55) but with no slug param since
// there's only one of these. Exists because "every varsity sport, women's included" was
// already true of this product's coverage (Section 1) but had no page of its own to rank for
// searches like "women's college basketball schedule near me" - real, current search/viewership
// growth in this category (CLAUDE.md Section 0.13, finding #4) made that gap worth closing.
export const metadata: Metadata = {
  title: "Women's College Sports Schedule | Game Day New England",
  description:
    "Every New England women's college sports game and meet, one page - every varsity sport and every division, not just marquee ones.",
  alternates: { canonical: `${BASE_URL}/womens-sports` },
  openGraph: {
    title: "Women's College Sports Schedule | Game Day New England",
    description: "Every New England women's college sports game and meet, one page.",
    url: `${BASE_URL}/womens-sports`,
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Women's College Sports Schedule | Game Day New England",
    description: "Every New England women's college sports game and meet, one page.",
  },
};

export default async function WomensSportsPage() {
  logPageView("/womens-sports");
  const events = await getFilteredEvents("season", { gender: "womens" });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>

        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Women&apos;s College Sports
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Upcoming schedule across every New England women&apos;s varsity program - basketball
          and hockey alongside rowing, squash, lacrosse, and every other sport a school fields.
        </p>

        <div className="mt-6">
          <EventList
            events={events}
            emptyMessage="No upcoming women's games found in the next 150 days. Check back closer to the season, or browse the full schedule from the homepage."
          />
        </div>
      </main>
    </div>
  );
}
