"use client";

import { useState } from "react";
import { authClient } from "@/auth/client";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const buttonClass =
  "w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (err) {
      setStatus("error");
      setError(err.message ?? "Something went wrong.");
      return;
    }
    // Better Auth sends this response regardless of whether the email exists - deliberately
    // not surfacing "no account found" here, same account-enumeration-avoidance reasoning as
    // every other credential-recovery flow.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        If an account exists for that email, a password reset link is on its way.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </label>
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
        {status === "loading" ? "Sending..." : "Send reset link"}
      </button>
    </form>
  );
}
