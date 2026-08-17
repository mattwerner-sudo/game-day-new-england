import type { Metadata } from "next";
import Link from "next/link";
import { getFilterOptions } from "@/db/queries";
import { slugify } from "@/lib/slug";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All Schools | Game Day New England",
  description: "Every New England college sports program covered by Game Day New England, with a full varsity schedule for each.",
};

export default async function SchoolsIndexPage() {
  const { schools } = await getFilterOptions();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          All Schools
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {schools.length} New England schools covered. Pick one for its full schedule.
        </p>

        <ul className="mt-6 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          {schools.map((school) => (
            <li key={school.id}>
              <Link
                href={`/schools/${slugify(school.name)}`}
                className="block rounded-lg px-2 py-1.5 text-sm text-zinc-700 hover:bg-white hover:text-orange-600 dark:text-zinc-300 dark:hover:bg-zinc-950 dark:hover:text-orange-400"
              >
                {school.name}
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
