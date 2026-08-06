import { findFanByToken } from "@/fans/queries";

export const dynamic = "force-dynamic";

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const fan = token ? await findFanByToken(token) : null;

  if (!fan) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Link not found</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            This confirmation link isn&apos;t valid. Try signing up again.
          </p>
        </main>
      </div>
    );
  }

  if (fan.confirmedAt && !fan.unsubscribedAt) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <main className="mx-auto max-w-xl px-4 py-10 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Already confirmed</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {fan.email} is already confirmed for game alerts.
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50">Confirm your email</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Confirming {fan.email} for game alerts.
        </p>
        <form method="POST" action="/api/confirm" className="mt-6">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Confirm my email
          </button>
        </form>
      </main>
    </div>
  );
}
