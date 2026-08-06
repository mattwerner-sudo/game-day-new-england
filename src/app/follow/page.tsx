import { getFilterOptions } from "@/db/queries";

export const dynamic = "force-dynamic";

export default async function FollowPage() {
  const { schools } = await getFilterOptions();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-xl px-4 py-10">
        <p className="text-sm font-medium text-orange-600 dark:text-orange-400">
          New England College Sports
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Follow your school
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Get a weekly email with upcoming games for the schools you follow. No account, no
          password - just confirm your email and you&apos;re set.
        </p>

        <form method="POST" action="/api/follow" className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="schoolIds" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Schools (select one or more)
            </label>
            <select
              id="schoolIds"
              name="schoolIds"
              multiple
              required
              size={10}
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Cmd/Ctrl-click to select more than one.
            </p>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
          >
            Send confirmation email
          </button>
        </form>
      </main>
    </div>
  );
}
