import Link from "next/link";
import {
  getFilteredEvents,
  getFilterOptions,
  getRangeWindow,
  isDateRange,
  parseDateParam,
  toDateParam,
  DateRange,
  EventFilters,
} from "@/db/queries";
import { EventList } from "@/components/EventList";
import { formatSport } from "@/lib/format";

export const dynamic = "force-dynamic";

const RANGE_LABELS: Record<DateRange, string> = {
  today: "Today",
  weekend: "This Weekend",
  week: "Next 7 Days",
  month: "Month",
  // Not a homepage toggle button (no nav entry below) - only used by the school/league SEO
  // pages (Section 55). Included here only to satisfy this Record's exhaustiveness.
  season: "This Season",
};

type SearchParams = {
  range?: string;
  date?: string;
  division?: string;
  state?: string;
  school?: string;
  sport?: string;
  league?: string;
};

/** Carry the current filters/date forward as hidden inputs so switching one control doesn't reset the others. */
function HiddenFilterFields({
  params,
  except,
}: {
  params: SearchParams;
  except: (keyof SearchParams)[];
}) {
  const fields: (keyof SearchParams)[] = ["date", "division", "state", "school", "sport", "league"];
  return (
    <>
      {fields
        .filter((f) => !except.includes(f) && params[f])
        .map((f) => (
          <input key={f} type="hidden" name={f} value={params[f]} />
        ))}
    </>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const anchorDate = parseDateParam(params.date);
  // Picking a date without an explicit range means "show me that whole month".
  const range: DateRange = params.range && isDateRange(params.range)
    ? params.range
    : anchorDate
      ? "month"
      : "weekend";

  const filters: EventFilters = {
    division: params.division || undefined,
    state: params.state || undefined,
    schoolId: params.school || undefined,
    sport: params.sport || undefined,
    league: params.league || undefined,
  };
  const hasFilters = Object.values(filters).some(Boolean);

  const [events, filterOptions] = await Promise.all([
    getFilteredEvents(range, filters, anchorDate),
    getFilterOptions(),
  ]);
  const { start, end } = getRangeWindow(range, anchorDate);

  const prevMonth = new Date(start.getFullYear(), start.getMonth() - 1, 1);
  const nextMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  const title =
    range === "month"
      ? start.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : RANGE_LABELS[range];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              🏆 Game Day New England
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
            >
              Follow your school →
            </Link>
          </div>
          <nav className="mt-1 flex gap-3 text-xs text-zinc-500 dark:text-zinc-400">
            <Link href="/schools" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
              Browse all schools
            </Link>
            <Link href="/leagues" className="hover:text-orange-600 hover:underline dark:hover:text-orange-400">
              Browse all leagues
            </Link>
          </nav>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            {title}
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {start.toLocaleDateString("en-US", { month: "short", day: "numeric" })} –{" "}
            {new Date(end.getTime() - 1).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}{" "}
            · {events.length} game{events.length === 1 ? "" : "s"}
            {hasFilters
              ? " matching your filters"
              : ` across ${filterOptions.schools.length} schools`}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <nav className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
              {(["today", "weekend", "week"] as const).map((r) => (
                <Link
                  key={r}
                  href={r === "weekend" ? "/" : `/?range=${r}`}
                  className={
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                    (r === range
                      ? "bg-orange-600 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
                  }
                >
                  {RANGE_LABELS[r]}
                </Link>
              ))}
            </nav>

            <form
              action="/"
              method="GET"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <input type="hidden" name="range" value="month" />
              <HiddenFilterFields params={params} except={["date"]} />
              <input
                type="date"
                name="date"
                defaultValue={toDateParam(anchorDate ?? start)}
                className="rounded-md bg-transparent px-2 py-1 text-sm text-zinc-700 outline-none dark:text-zinc-300"
              />
              <button
                type="submit"
                className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Go
              </button>
            </form>
          </div>

          {range === "month" && (
            <div className="mt-3 flex items-center gap-3 text-sm">
              <Link
                href={`/?range=month&date=${toDateParam(prevMonth)}`}
                className="font-medium text-orange-600 hover:underline dark:text-orange-400"
              >
                ← {prevMonth.toLocaleDateString("en-US", { month: "long" })}
              </Link>
              <Link
                href={`/?range=month&date=${toDateParam(nextMonth)}`}
                className="font-medium text-orange-600 hover:underline dark:text-orange-400"
              >
                {nextMonth.toLocaleDateString("en-US", { month: "long" })} →
              </Link>
            </div>
          )}

          <form
            key={JSON.stringify(params)}
            action="/"
            method="GET"
            className="mt-4 flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <input type="hidden" name="range" value={range} />
            <HiddenFilterFields
              params={params}
              except={["division", "state", "school", "sport", "league"]}
            />

            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Division
              <select
                name="division"
                defaultValue={params.division ?? ""}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All</option>
                {filterOptions.divisions.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              State
              <select
                name="state"
                defaultValue={params.state ?? ""}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All</option>
                {filterOptions.states.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              School
              <select
                name="school"
                defaultValue={params.school ?? ""}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All</option>
                {filterOptions.schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Sport
              <select
                name="sport"
                defaultValue={params.sport ?? ""}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All</option>
                {filterOptions.sports.map((s) => (
                  <option key={s} value={s}>
                    {formatSport(s)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              League
              <select
                name="league"
                defaultValue={params.league ?? ""}
                className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">All</option>
                {filterOptions.leagues.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="rounded-md bg-orange-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-orange-700"
            >
              Apply Filters
            </button>

            {hasFilters && (
              <Link
                href={`/?range=${range}${params.date ? `&date=${params.date}` : ""}`}
                className="text-sm font-medium text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                Clear filters
              </Link>
            )}
          </form>
        </header>

        <EventList
          events={events}
          emptyMessage={`No games ${
            range === "today" ? "today" : range === "week" ? "in the next 7 days" : range === "month" ? "that month" : "this weekend"
          }${hasFilters ? " match your filters" : ""} across the ${filterOptions.schools.length} schools currently covered. Most varsity seasons run fall (Aug–Nov), winter (Nov–Mar), and spring (Mar–May) — check back closer to the season, widen ingestion coverage, or adjust your filters.`}
        />
      </main>
    </div>
  );
}
