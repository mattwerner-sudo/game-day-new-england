import Link from "next/link";

export default function CheckEmailPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-zinc-950 dark:text-zinc-50">Check your email</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          We sent a confirmation link - click it to start getting game alerts.
        </p>
      </main>
    </div>
  );
}
