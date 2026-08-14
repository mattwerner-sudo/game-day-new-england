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

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const onSuccess = () => router.push("/");

  return (
    <div className="mt-6 space-y-4">
      <PasswordSignIn onSuccess={onSuccess} />
      <EmailCodeSignIn onSuccess={onSuccess} />
      <PhoneCodeSignIn onSuccess={onSuccess} />
      {googleEnabled && (
        <button
          type="button"
          className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
        >
          Continue with Google
        </button>
      )}
    </div>
  );
}

function PasswordSignIn({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    const { error: err } = await authClient.signIn.email({ email, password });
    if (err) {
      setStatus("error");
      setError(err.message ?? "That didn't work.");
      return;
    }
    onSuccess();
  }

  return (
    <form onSubmit={submit} className={sectionClass}>
      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Email + password</p>
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
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      {status === "error" && <p className="mt-2 text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={`${buttonClass} mt-3`}>
        {status === "loading" ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

function EmailCodeSignIn({ onSuccess }: { onSuccess: () => void }) {
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

function PhoneCodeSignIn({ onSuccess }: { onSuccess: () => void }) {
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
