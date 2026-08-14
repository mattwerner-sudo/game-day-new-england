"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { normalizeUsPhone } from "@/fans/phone";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const buttonClass =
  "rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50";
const sectionClass = "rounded-lg border border-zinc-200 p-4 dark:border-zinc-800";

export function SignUpForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();

  return (
    <div className="mt-6 space-y-4">
      <PasswordSignUp onSuccess={() => router.push("/onboarding")} />
      <EmailCodeSignUp onSuccess={() => router.push("/onboarding")} />
      <PhoneCodeSignUp onSuccess={() => router.push("/onboarding")} />
      {googleEnabled && (
        <button
          type="button"
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/onboarding" })}
        >
          Continue with Google
        </button>
      )}
    </div>
  );
}

function PasswordSignUp({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.signUp.email({ name, email, password });
    if (err) {
      setStatus("error");
      setError(err.message ?? "Something went wrong.");
      return;
    }
    // requireEmailVerification is on, so this account can't sign in yet - it needs the emailed
    // verification link clicked first, same deliverability confidence the old double opt-in had.
    setStatus("sent");
  }

  if (status === "sent") {
    return (
      <div className={sectionClass}>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Check your email to verify your account, then come back and sign in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={sectionClass}>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email + password</p>
      <input
        type="text"
        placeholder="Name"
        required
        value={name}
        onChange={(e) => setName(e.target.value)}
        className={inputClass}
      />
      <input
        type="email"
        placeholder="Email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      <input
        type="password"
        placeholder="Password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      {status === "error" && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={`${buttonClass} mt-3`}>
        {status === "loading" ? "Signing up..." : "Sign up"}
      </button>
    </form>
  );
}

function EmailCodeSignUp({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" });
    if (err) {
      setStatus("error");
      setError(err.message ?? "Couldn't send a code.");
      return;
    }
    setStatus("idle");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.signIn.emailOtp({ email, otp: code });
    if (err) {
      setStatus("error");
      setError(err.message ?? "That code didn't work.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={step === "email" ? sendCode : verifyCode} className={sectionClass}>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email code</p>
      <input
        type="email"
        placeholder="Email"
        required
        disabled={step === "code"}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />
      {step === "code" && (
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClass}
        />
      )}
      {status === "error" && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={`${buttonClass} mt-3`}>
        {status === "loading" ? "Please wait..." : step === "email" ? "Send code" : "Verify code"}
      </button>
    </form>
  );
}

function PhoneCodeSignUp({ onSuccess }: { onSuccess: () => void }) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUsPhone(phoneNumber);
    if (!normalized) {
      setStatus("error");
      setError("Enter a valid US phone number.");
      return;
    }
    setStatus("loading");
    const { error: err } = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized });
    if (err) {
      setStatus("error");
      setError(err.message ?? "Couldn't send a code.");
      return;
    }
    setStatus("idle");
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUsPhone(phoneNumber);
    if (!normalized) return; // unreachable - sendCode already validated this same value
    setStatus("loading");
    const { error: err } = await authClient.phoneNumber.verify({ phoneNumber: normalized, code });
    if (err) {
      setStatus("error");
      setError(err.message ?? "That code didn't work.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={step === "phone" ? sendCode : verifyCode} className={sectionClass}>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone code</p>
      <input
        type="tel"
        placeholder="(555) 555-5555"
        required
        disabled={step === "code"}
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        className={inputClass}
      />
      {step === "code" && (
        <input
          type="text"
          inputMode="numeric"
          placeholder="6-digit code"
          required
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className={inputClass}
        />
      )}
      {status === "error" && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={`${buttonClass} mt-3`}>
        {status === "loading" ? "Please wait..." : step === "phone" ? "Send code" : "Verify code"}
      </button>
    </form>
  );
}
