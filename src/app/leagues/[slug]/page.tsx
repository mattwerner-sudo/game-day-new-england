import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLeagueSlug, getFilteredEvents } from "@/db/queries";
import { EventList } from "@/components/EventList";
import { logPageView } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const league = await resolveLeagueSlug(slug);
  if (!league) return { title: "League not found | Game Day New England" };

  const title = `${league} Schedule | Game Day New England`;
  const desc = `Upcoming ${league} games across every New England member school, one page.`;
  const url = `${BASE_URL}/leagues/${slug}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, type: "website" },
    twitter: { card: "summary", title, description: desc },
  };
}

export default async function LeaguePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const league = await resolveLeagueSlug(slug);
  if (!league) notFound();
  logPageView(`/leagues/${slug}`);

  const events = await getFilteredEvents("season", { league });

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
          {league}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Upcoming schedule</p>
        <a
          href={`/api/leagues/${slug}/ics`}
          className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          📅 Subscribe to full schedule
        </a>

        <div className="mt-6">
          <EventList
            events={events}
            emptyMessage={`No upcoming ${league} games found in the next 150 days. Check back closer to the season.`}
          />
        </div>
      </main>
    </div>
  );
}
