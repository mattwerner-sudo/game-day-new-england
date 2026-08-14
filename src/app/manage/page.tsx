import Link from "next/link";
import { headers } from "next/headers";
import { auth } from "@/auth/auth";
import {
  findUserByManageToken,
  getFollowedSchools,
  getFollowedTeams,
  getFollowedLeagues,
  getFollowedSpecialVenues,
  getFollowedGameIds,
} from "@/fans/queries";
import { getFilterOptions, getTeamPickerOptions, getEventById } from "@/db/queries";
import { formatGender, formatSport, eventTitle } from "@/lib/format";
import { SPECIAL_VENUES } from "@/db/specialVenues";

export const dynamic = "force-dynamic";

function HomeLink() {
  return (
    <Link
      href="/"
      className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
    >
      🏆 Game Day New England
    </Link>
  );
}

const smallButtonClass =
  "rounded-lg border border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900";

function UnfollowForm({ type, id, redirectTo }: { type: string; id: string; redirectTo: string }) {
  return (
    <form method="POST" action="/api/follow" className="inline-block">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="unfollow" />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className={smallButtonClass}>
        Unfollow
      </button>
    </form>
  );
}

function FollowedList({
  title,
  items,
  type,
  redirectTo,
}: {
  title: string;
  items: { id: string; label: string }[];
  type: string;
  redirectTo: string;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center justify-between gap-2 text-sm text-zinc-600 dark:text-zinc-400">
            {item.label}
            <UnfollowForm type={type} id={item.id} redirectTo={redirectTo} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });

  // Session present: full experience - all 5 follow types, individual remove controls, and
  // add-follow pickers. Add-follow needs a real account, unlike unsubscribing - a bare token
  // is fine for idempotent unsubscribe but not for "add an arbitrary new follow" (see
  // schema.ts's comment on manageToken).
  if (session) {
    const user = session.user;
    const redirectTo = "/manage";

    const [followedSchools, followedTeams, followedLeagues, followedVenues, followedGameIds, filterOptions, teamOptions] =
      await Promise.all([
        getFollowedSchools(user.id),
        getFollowedTeams(user.id),
        getFollowedLeagues(user.id),
        getFollowedSpecialVenues(user.id),
        getFollowedGameIds(user.id),
        getFilterOptions(),
        getTeamPickerOptions(),
      ]);
    // Followed games need their own display details (title/date), not just ids - reused via
    // getEventById per id rather than adding a new bulk-fetch function, since a user is only
    // ever expected to have a handful of specific-game follows, not hundreds.
    const followedGames = (await Promise.all(followedGameIds.map((id) => getEventById(id)))).filter(
      (e): e is NonNullable<typeof e> => e !== null
    );

    const teamsBySchool = new Map<string, typeof teamOptions>();
    for (const t of teamOptions) {
      if (!teamsBySchool.has(t.schoolName)) teamsBySchool.set(t.schoolName, []);
      teamsBySchool.get(t.schoolName)!.push(t);
    }

    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-xl px-4 py-10">
          <HomeLink />
          <h1 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Your subscriptions</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>

          <FollowedList
            title="Schools"
            type="school"
            redirectTo={redirectTo}
            items={followedSchools.map((s) => ({ id: s.id, label: s.name }))}
          />
          <FollowedList
            title="Teams"
            type="team"
            redirectTo={redirectTo}
            items={followedTeams.map((t) => ({
              id: t.id,
              label: `${t.schoolName} ${formatGender(t.gender)} ${formatSport(t.sport)}`,
            }))}
          />
          <FollowedList
            title="Leagues"
            type="league"
            redirectTo={redirectTo}
            items={followedLeagues.map((l) => ({ id: l, label: l }))}
          />
          <FollowedList
            title="Venues"
            type="venue"
            redirectTo={redirectTo}
            items={followedVenues.map((v) => ({ id: v, label: v }))}
          />
          <FollowedList
            title="Games"
            type="game"
            redirectTo={redirectTo}
            items={followedGames.map((e) => ({ id: e.id, label: eventTitle(e) }))}
          />

          <div className="mt-8 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Add more</p>

            <form method="POST" action="/api/follow" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="type" value="school" />
              <input type="hidden" name="action" value="follow" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <select
                name="id"
                required
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {filterOptions.schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={smallButtonClass}>
                Follow school
              </button>
            </form>

            <form method="POST" action="/api/follow" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="type" value="team" />
              <input type="hidden" name="action" value="follow" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <select
                name="id"
                required
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {[...teamsBySchool.entries()].map(([schoolName, teamsForSchool]) => (
                  <optgroup key={schoolName} label={schoolName}>
                    {teamsForSchool.map((t) => (
                      <option key={t.id} value={t.id}>
                        {formatGender(t.gender)} {formatSport(t.sport)}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <button type="submit" className={smallButtonClass}>
                Follow team
              </button>
            </form>

            <form method="POST" action="/api/follow" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="type" value="league" />
              <input type="hidden" name="action" value="follow" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <select
                name="id"
                required
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {filterOptions.leagues.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
              <button type="submit" className={smallButtonClass}>
                Follow league
              </button>
            </form>

            <form method="POST" action="/api/follow" className="mt-3 flex flex-wrap items-end gap-2">
              <input type="hidden" name="type" value="venue" />
              <input type="hidden" name="action" value="follow" />
              <input type="hidden" name="redirectTo" value={redirectTo} />
              <select
                name="id"
                required
                className="rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              >
                {SPECIAL_VENUES.map((v) => (
                  <option key={v.name} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
              <button type="submit" className={smallButtonClass}>
                Follow venue
              </button>
            </form>
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Games are followed from the game&apos;s own page, not here.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {user.smsConsentedAt && !user.smsUnsubscribedAt && (
              <form method="POST" action="/api/unsubscribe">
                <input type="hidden" name="token" value={user.manageToken ?? ""} />
                <input type="hidden" name="scope" value="sms" />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Stop texts only
                </button>
              </form>
            )}
            <form method="POST" action="/api/unsubscribe">
              <input type="hidden" name="token" value={user.manageToken ?? ""} />
              <input type="hidden" name="scope" value="all" />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Unsubscribe from all alerts
              </button>
            </form>
          </div>
        </main>
      </div>
    );
  }

  // No session - fall back to the original token-only, read + unsubscribe-only view,
  // unchanged. No pickers exposed to a bare, potentially-forwarded token link.
  const user = token ? await findUserByManageToken(token) : null;

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <HomeLink />
          <h1 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Link not found</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This manage link isn&apos;t valid.
          </p>
        </main>
      </div>
    );
  }

  const followedSchools = await getFollowedSchools(user.id);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-xl px-4 py-10">
        <HomeLink />
        <h1 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Your alerts</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{user.email}</p>

        {user.emailAlertsUnsubscribedAt ? (
          <p className="mt-6 rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
            You&apos;re unsubscribed from game alerts.{" "}
            <a href="/sign-in" className="text-orange-600 dark:text-orange-400">
              Sign in
            </a>{" "}
            to your account to start receiving them again.
          </p>
        ) : (
          <>
            <p className="mt-6 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Following:
            </p>
            <ul className="mt-2 list-disc pl-5 text-sm text-zinc-600 dark:text-zinc-400">
              {followedSchools.map((s) => (
                <li key={s.id}>{s.name}</li>
              ))}
            </ul>

            <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
              {user.smsConsentedAt && !user.smsUnsubscribedAt
                ? `Text alerts: on (${user.smsAlertsPhone})`
                : "Text alerts: off"}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {user.smsConsentedAt && !user.smsUnsubscribedAt && (
                <form method="POST" action="/api/unsubscribe">
                  <input type="hidden" name="token" value={token} />
                  <input type="hidden" name="scope" value="sms" />
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  >
                    Stop texts only
                  </button>
                </form>
              )}
              <form method="POST" action="/api/unsubscribe">
                <input type="hidden" name="token" value={token} />
                <input type="hidden" name="scope" value="all" />
                <button
                  type="submit"
                  className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Unsubscribe from all alerts
                </button>
              </form>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
