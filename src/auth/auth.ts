import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { emailOTP } from "better-auth/plugins/email-otp";
import { phoneNumber } from "better-auth/plugins/phone-number";
import { db } from "@/db/client";
import * as schema from "@/db/schema";
import { sendEmail } from "@/email/send";
import { sendSms } from "@/sms/send";
import { otpEmail } from "@/email/templates";
import { otpSms } from "@/sms/templates";
import { generateToken } from "@/fans/tokens";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BASE_URL,
  secret: process.env.BETTER_AUTH_SECRET,

  // Rate limiting is on by default in production (Better Auth's own default), but its default
  // storage is in-memory - confirmed by reading the installed package's source
  // (context/create-context.mjs), not assumed. In-memory storage doesn't reliably work on
  // Vercel's serverless functions (no shared memory across invocations), which would silently
  // undermine the sign-in/sign-up/OTP rate limits already configured by Better Auth's own
  // defaults (3 attempts/10s on sign-in/up, 3/60s on OTP send+verify). Database-backed storage
  // (the `rateLimits` table below) persists across invocations the same way sessions do.
  rateLimit: { storage: "database" },

  // usePlural: true maps Better Auth's internal singular model names ("user", "session", ...)
  // onto this project's plural table exports (users, sessions, ...), matching every other table
  // in schema.ts. No `advanced.database.generateId` override - left at Better Auth's own
  // default (opaque generated id strings, no DB-level default expression) after confirming via
  // the CLI schema generator that `generateId: false` does NOT add one, which would leave
  // inserts with no id. See schema.ts's comment on the users/sessions/accounts/verifications
  // tables for the full reasoning.
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),

  emailAndPassword: {
    enabled: true,
    // OTP/Google signups are already proven-owned at creation time; password signups aren't,
    // so this preserves the old double-opt-in flow's deliverability confidence for that one path.
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Reset your Game Day New England password",
        html: `<p><a href="${url}">Reset your password</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    },
  },

  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email for Game Day New England",
        html: `<p><a href="${url}">Verify your email</a></p><p>If you didn't request this, you can ignore this email.</p>`,
      });
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    },
  },

  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // "change-email" isn't used anywhere in this app's UI, but the plugin's type allows it -
        // fall back to sign-in copy rather than mis-typing against otpEmail's narrower union.
        const { subject, html } = otpEmail(otp, type === "change-email" ? "sign-in" : type);
        await sendEmail({ to: email, subject, html });
      },
    }),
    phoneNumber({
      async sendOTP({ phoneNumber: to, code }) {
        await sendSms({ to, body: otpSms(code) });
      },
      // Without this, verifying a code for a phone number with no existing account just fails -
      // it does NOT auto-create a user by default (confirmed by reading the plugin's own verify
      // route). users.email is required+unique, so a phone-only signup needs a synthetic
      // placeholder; the onboarding step (src/app/onboarding) collects their real name right
      // after, and a real email can be added later - out of scope for this pass.
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@phone-signup.gamedaynewengland.internal`,
      },
    }),
  ],

  user: {
    additionalFields: {
      manageToken: { type: "string", required: false, input: false },
      emailAlertsUnsubscribedAt: { type: "date", required: false, input: false },
      smsAlertsPhone: { type: "string", required: false },
      smsConsentedAt: { type: "date", required: false, input: false },
      smsUnsubscribedAt: { type: "date", required: false, input: false },
    },
  },

  databaseHooks: {
    user: {
      create: {
        // reuses the same token primitive the old fans.manageToken used (src/fans/tokens.ts) -
        // every user gets one on creation regardless of which of the 3 signup methods they used.
        before: async (user) => ({ data: { ...user, manageToken: generateToken() } }),
      },
    },
  },
});
