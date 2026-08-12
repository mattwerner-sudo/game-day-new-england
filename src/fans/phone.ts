/**
 * US-only E.164 normalization ("+1XXXXXXXXXX") - deliberately minimal rather than pulling in
 * a full phone-parsing library (libphonenumber-js etc.), matching CLAUDE.md Section 6's "boring
 * tools" principle: every fan this product serves is a New England college sports fan, a US
 * phone number is a safe assumption for this feature's actual scope, not a guess ahead of need.
 * Returns null for anything that doesn't reduce to a plausible 10-digit US number - callers
 * should treat that as "reject the input," not silently store something malformed.
 */
export function normalizeUsPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
