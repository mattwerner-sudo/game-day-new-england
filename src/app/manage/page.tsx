import Link from "next/link";
import { findUserByManageToken, getFollowedSchools } from "@/fans/queries";

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

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
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
