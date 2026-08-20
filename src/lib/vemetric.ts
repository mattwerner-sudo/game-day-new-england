import { Vemetric } from "@vemetric/node";

// Same lazy-construction/env-var-gated pattern as src/lib/recap.ts - a missing token means
// this stays fully inert, and every call site wraps its own trackEvent in a catch so a
// Vemetric outage or bad token can never break a real user action (sign-up, follow, etc.).
let client: Vemetric | null = null;
function getClient(): Vemetric | null {
  if (!process.env.NEXT_PUBLIC_VEMETRIC_TOKEN) return null;
  if (!client) client = new Vemetric({ token: process.env.NEXT_PUBLIC_VEMETRIC_TOKEN });
  return client;
}

/**
 * Fire-and-forget server-side event tracking - same discipline as logPageView()
 * (src/lib/analytics.ts): never awaited by the caller, never throws, a tracking failure is
 * invisible to the actual user-facing action it's attached to. `userIdentifier` is required by
 * the underlying SDK on every call - always pass the app's own opaque internal user id
 * (session.user.id), never an email or phone number.
 */
export function trackEvent(
  name: string,
  userIdentifier: string,
  eventData?: Record<string, unknown>
): void {
  const vemetric = getClient();
  if (!vemetric) return;
  vemetric.trackEvent(name, { userIdentifier, eventData }).catch(() => {});
}
