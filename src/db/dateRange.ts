// Pure date/range logic, deliberately kept dependency-free (no drizzle, no ./client, no
// ./schema) so it can be unit-tested without importing the DB client - queries.ts's `db` export
// instantiates a real connection (Postgres, or a local PGlite file on disk) as a side effect of
// module import, which is exactly what CLAUDE.md's documented PGlite concurrency corruption
// history warns against triggering incidentally (e.g. from a test run). Re-exported from
// queries.ts so existing call sites (`@/db/queries`) don't need to change.

// The whole product is scoped to New England (Section 1/2/3 of CLAUDE.md) - a game an
// NE school plays away in Pennsylvania or Florida isn't "a college sporting event near
// me" for this product's users. Applied unconditionally, not just as an optional filter
// value, and doubles as the canonical clean list for the State dropdown.
export const NE_STATES = ["CT", "ME", "MA", "NH", "RI", "VT"] as const;

export const DATE_RANGES = ["today", "weekend", "week", "month"] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export function isDateRange(value: string): value is DateRange {
  return (DATE_RANGES as readonly string[]).includes(value);
}

/** Upcoming Friday 00:00 through Monday 00:00 (Fri/Sat/Sun inclusive), in server local time. */
function getWeekendWindow(now: Date): { start: Date; end: Date } {
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  const daysUntilFriday = (5 - day + 7) % 7;
  const isWeekendNow = day === 5 || day === 6 || day === 0;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (!isWeekendNow) {
    start.setDate(start.getDate() + daysUntilFriday);
  } else if (day === 0) {
    // Sunday: weekend started this past Friday
    start.setDate(start.getDate() - 2);
  } else if (day === 6) {
    start.setDate(start.getDate() - 1);
  }

  const end = new Date(start);
  end.setDate(end.getDate() + 3); // Fri+3 = Monday 00:00

  return { start, end };
}

export function getRangeWindow(range: DateRange, now = new Date()): { start: Date; end: Date } {
  if (range === "weekend") return getWeekendWindow(now);

  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + (range === "today" ? 1 : 7));

  return { start, end };
}

/** Parse a "YYYY-MM-DD" search-param value into a local-time Date, or undefined if invalid. */
export function parseDateParam(value: string | undefined): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

/** "YYYY-MM-DD" for use in <input type="date"> and query params, in local time. */
export function toDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
