"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/auth/client";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const buttonClass =
  "w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const error_ = searchParams.get("error");

  const [newPassword, setNewPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  if (!token || error_) {
    return (
      <p className="mt-6 text-sm text-red-600">
        This reset link is invalid or has expired. Request a new one from the{" "}
        <a href="/forgot-password" className="underline">
          forgot password
        </a>{" "}
        page.
      </p>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.resetPassword({ newPassword, token: token! });
    if (err) {
      setStatus("error");
      setError(err.message ?? "That didn't work.");
      return;
    }
    router.push("/sign-in");
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <label className="block">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">New password</span>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className={inputClass}
        />
      </label>
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
        {status === "loading" ? "Saving..." : "Set new password"}
      </button>
    </form>
  );
}
