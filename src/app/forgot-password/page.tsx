import Link from "next/link";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
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
          Reset your password
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        <ForgotPasswordForm />

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          <Link href="/sign-in" className="text-orange-600 hover:underline dark:text-orange-400">
            Back to sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
