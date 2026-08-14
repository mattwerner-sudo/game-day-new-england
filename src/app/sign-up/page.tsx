import Link from "next/link";
import { SignUpForm } from "./SignUpForm";

export default function SignUpPage() {
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID);

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
          Sign up
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Get game alerts for the schools you follow. Pick whichever way is easiest.
        </p>

        <SignUpForm googleEnabled={googleEnabled} />

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-orange-600 hover:underline dark:text-orange-400">
            Sign in
          </Link>
        </p>
      </main>
    </div>
  );
}
