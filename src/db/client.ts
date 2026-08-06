import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

// DATABASE_URL set (Neon/Supabase/any standard Postgres) -> real Postgres over postgres-js.
// Unset -> local embedded PGlite, for dev on a machine with no Postgres server running.
// Both adapters implement the same select/insert/update/delete surface the app actually
// uses, so this is typed as PostgresJsDatabase for callers rather than exposing a driver
// union - the two dialects' generated types don't overload cleanly against each other.
//
// Cached on globalThis: Next.js dev mode (Turbopack) compiles each route's module graph
// separately and can re-evaluate this module more than once per process (once per route
// touched), which would otherwise create multiple separate PGlite engine instances all
// pointed at the same .pglite/ directory. PGlite doesn't tolerate that - confirmed directly
// (writes from one route's instance were invisible to another route's instance in the same
// dev server run, same underlying class of issue as CLAUDE.md Section 10's documented
// cross-process corruption, just within one process instead of across two). Real Postgres
// via postgres-js doesn't have this problem, but caching is harmless there too.
declare global {
  // eslint-disable-next-line no-var
  var __neSportsDb: PostgresJsDatabase<typeof schema> | undefined;
}

function createDb(): PostgresJsDatabase<typeof schema> {
  return (
    process.env.DATABASE_URL
      ? drizzlePostgres(postgres(process.env.DATABASE_URL), { schema })
      : drizzlePglite(new PGlite(`${process.cwd()}/.pglite`), { schema })
  ) as PostgresJsDatabase<typeof schema>;
}

export const db = globalThis.__neSportsDb ?? (globalThis.__neSportsDb = createDb());
