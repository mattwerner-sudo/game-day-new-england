"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/auth/client";
import { normalizeUsPhone } from "@/fans/phone";

const inputClass =
  "mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
const buttonClass =
  "w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50";

const METHODS = [
  { key: "password", label: "Password" },
  { key: "email", label: "Email Code" },
  { key: "phone", label: "Phone Code" },
] as const;
type Method = (typeof METHODS)[number]["key"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {children}
    </label>
  );
}

export function SignInForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
  const onSuccess = () => router.push("/");
  const [method, setMethod] = useState<Method>("password");

  return (
    <div className="mt-6">
      <nav className="inline-flex rounded-lg border border-zinc-200 bg-white p-1 dark:border-zinc-800 dark:bg-zinc-950">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMethod(m.key)}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (m.key === method
                ? "bg-orange-600 text-white"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900")
            }
          >
            {m.label}
          </button>
        ))}
      </nav>

      <div className="mt-4">
        {method === "password" && <PasswordSignIn onSuccess={onSuccess} />}
        {method === "email" && <EmailCodeSignIn onSuccess={onSuccess} />}
        {method === "phone" && <PhoneCodeSignIn onSuccess={onSuccess} />}
      </div>

      {googleEnabled && (
        <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button
            type="button"
            className="w-full rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            onClick={() => authClient.signIn.social({ provider: "google", callbackURL: "/" })}
          >
            Continue with Google
          </button>
        </div>
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
    <form onSubmit={submit} className="space-y-3">
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
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
    <form onSubmit={step === "email" ? sendCode : verifyCode} className="space-y-3">
      <Field label="Email">
        <input
          type="email"
          required
          disabled={step === "code"}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      {step === "code" && (
        <Field label="6-digit code">
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </Field>
      )}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
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
    <form onSubmit={step === "phone" ? sendCode : verifyCode} className="space-y-3">
      <Field label="Phone number">
        <input
          type="tel"
          placeholder="(555) 555-5555"
          required
          disabled={step === "code"}
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          className={inputClass}
        />
      </Field>
      {step === "code" && (
        <Field label="6-digit code">
          <input
            type="text"
            inputMode="numeric"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={inputClass}
          />
        </Field>
      )}
      {status === "error" && <p className="text-xs text-red-600">{error}</p>}
      <button type="submit" disabled={status === "loading"} className={buttonClass}>
        {status === "loading" ? "Please wait..." : step === "phone" ? "Send code" : "Verify code"}
      </button>
    </form>
  );
}
