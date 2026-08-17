import Link from "next/link";
import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          🏆 Game Day New England
        </Link>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
          Set a new password
        </h1>

        {/* useSearchParams requires a Suspense boundary in the App Router. */}
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/sign-in" className="text-orange-600 hover:underline dark:text-orange-400">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
