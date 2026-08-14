import Link from "next/link";
import { SignInForm } from "./SignInForm";

export default function SignInPage() {
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
          Sign in
        </h1>

        <SignInForm googleEnabled={googleEnabled} />

        <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up" className="text-orange-600 hover:underline dark:text-orange-400">
            Sign up
          </Link>
        </p>
      </main>
    </div>
  );
}
