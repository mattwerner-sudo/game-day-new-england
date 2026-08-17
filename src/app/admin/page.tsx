import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/auth/auth";
import { getAdminStats } from "@/admin/queries";

export const dynamic = "force-dynamic";

// Same "founder-supplied, not-yet-configured" bucket as MAILING_ADDRESS/LEGAL_ENTITY_NAME - a
// single hardcoded admin email is deliberate, not a placeholder for a real roles system: there's
// exactly one admin (the founder), and building real role-based access for a single user would
// be infrastructure ahead of any actual need. 404s rather than a 403/login-redirect for anyone
// else, so this page's existence isn't advertised to a logged-out or non-admin visitor.
function isAdmin(email: string | undefined): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  return Boolean(adminEmail && email && email.toLowerCase() === adminEmail.toLowerCase());
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-950 dark:text-zinc-50">{value}</p>
    </div>
  );
}

function RankedList({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">No data yet.</p>
      ) : (
        <ol className="mt-2 space-y-1 text-sm">
          {rows.map((r, i) => (
            <li key={r.label} className="flex justify-between text-zinc-700 dark:text-zinc-300">
              <span>
                {i + 1}. {r.label}
              </span>
              <span className="font-medium text-zinc-950 dark:text-zinc-50">{r.count}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!isAdmin(session?.user.email)) notFound();

  const stats = await getAdminStats();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Admin</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Real usage data, not estimates. Page views are anonymous/aggregate only.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total users" value={stats.totalUsers} />
          <StatCard label="New users (7d)" value={stats.newUsersLast7Days} />
          <StatCard label="New users (30d)" value={stats.newUsersLast30Days} />
          <StatCard label="Schools tracked" value={stats.totalSchools} />
          <StatCard label="Events tracked" value={stats.totalEvents} />
          <StatCard label="Page views (7d)" value={stats.pageViewsLast7Days} />
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Follows by type</h2>
          <div className="mt-2 grid grid-cols-5 gap-2 text-center text-sm">
            <div>
              <p className="font-bold text-zinc-950 dark:text-zinc-50">{stats.followCounts.school}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Schools</p>
            </div>
            <div>
              <p className="font-bold text-zinc-950 dark:text-zinc-50">{stats.followCounts.team}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Teams</p>
            </div>
            <div>
              <p className="font-bold text-zinc-950 dark:text-zinc-50">{stats.followCounts.league}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Leagues</p>
            </div>
            <div>
              <p className="font-bold text-zinc-950 dark:text-zinc-50">{stats.followCounts.venue}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Venues</p>
            </div>
            <div>
              <p className="font-bold text-zinc-950 dark:text-zinc-50">{stats.followCounts.game}</p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Games</p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <RankedList
            title="Most-followed schools"
            rows={stats.mostFollowedSchools.map((s) => ({ label: s.name, count: s.count }))}
          />
          <RankedList
            title="Most-followed leagues"
            rows={stats.mostFollowedLeagues.map((l) => ({ label: l.league, count: l.count }))}
          />
          <RankedList
            title="Top pages (7d)"
            rows={stats.topPathsLast7Days.map((p) => ({ label: p.path, count: p.count }))}
          />
          <RankedList
            title="Digests sent, by channel"
            rows={stats.digestsSentByChannel.map((d) => ({ label: d.channel, count: d.count }))}
          />
        </div>

        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">Consent/follow activity</h2>
          <ol className="mt-2 space-y-1 text-sm">
            {stats.consentActionCounts.map((c) => (
              <li key={c.action} className="flex justify-between text-zinc-700 dark:text-zinc-300">
                <span>{c.action}</span>
                <span className="font-medium text-zinc-950 dark:text-zinc-50">{c.count}</span>
              </li>
            ))}
          </ol>
        </div>
      </main>
    </div>
  );
}
