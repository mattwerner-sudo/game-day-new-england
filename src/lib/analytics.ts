import { db } from "@/db/client";
import { pageViews } from "@/db/schema";

/**
 * Fire-and-forget by design - a logging failure (or the DB being briefly slow) should never
 * break a real page render for a real visitor. Path only, no query string - keeps "/?" filter
 * combinations from fragmenting into hundreds of distinct rows that don't aggregate into
 * anything useful; the admin dashboard cares about "which school/event page," not which exact
 * filter combo someone had on the homepage.
 */
export function logPageView(path: string): void {
  db.insert(pageViews)
    .values({ path })
    .catch((err) => console.error("logPageView failed (non-fatal):", err));
}
