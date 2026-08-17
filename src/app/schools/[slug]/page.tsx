import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSchoolBySlug, getFilteredEvents } from "@/db/queries";
import { EventList } from "@/components/EventList";
import { SchoolLogo } from "@/components/SchoolLogo";
import { logPageView } from "@/lib/analytics";

export const dynamic = "force-dynamic";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return { title: "School not found | Game Day New England" };

  const title = `${school.name} Schedule | Game Day New England`;
  const desc = `Upcoming ${school.name} varsity schedule - every sport, one page. ${school.conference}, ${school.division}, ${school.city}, ${school.state}.`;
  const url = `${BASE_URL}/schools/${slug}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, type: "website" },
    twitter: { card: "summary", title, description: desc },
  };
}

export default async function SchoolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();
  logPageView(`/schools/${slug}`);

  const events = await getFilteredEvents("season", { schoolId: school.id });

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>

        <h1 className="mt-3 flex items-center gap-2 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          <SchoolLogo src={school.logoUrl} alt="" className="h-9 w-9 object-contain" />
          {school.name}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {school.conference} · {school.division} · {school.city}, {school.state}
        </p>
        <a
          href={`/api/schools/${slug}/ics`}
          className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          📅 Subscribe to full schedule
        </a>

        <div className="mt-6">
          <EventList
            events={events}
            emptyMessage={`No upcoming games found for ${school.name} in the next 150 days. Check back closer to the season.`}
          />
        </div>
      </main>
    </div>
  );
}
