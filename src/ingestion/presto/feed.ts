const UA = "Mozilla/5.0 (compatible; ne-sports-aggregator/0.1; +https://ne-sports-aggregator.local)";

/**
 * PrestoSports exposes one combined ICS feed per school covering every sport (discovered
 * via `<composite-url>?print=ics` - see CLAUDE.md), unlike SIDEARM's per-sport feeds. No
 * per-sport discovery step is needed at all - this is the entire fetch.
 *
 * Some Presto-hosted schools sit behind an AWS WAF bot challenge (HTTP 202, empty body,
 * `x-amzn-waf-action: challenge` header - confirmed for 5 of 8 schools checked, not present
 * on the other 3) that a plain fetch can't pass. Detected and surfaced as a clear error
 * rather than silently returning empty, so it shows up distinctly in feed_health instead of
 * looking identical to "this school has no games."
 */
export async function fetchPrestoIcsFeed(hostname: string): Promise<string> {
  const res = await fetch(`https://${hostname}/composite?print=ics`, { headers: { "User-Agent": UA } });
  if (res.headers.get("x-amzn-waf-action") === "challenge") {
    throw new Error(`${hostname} is behind an AWS WAF bot challenge - needs a real browser render, not a plain fetch`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch composite ICS feed for ${hostname}: ${res.status}`);
  }
  const text = await res.text();
  if (!text.includes("BEGIN:VCALENDAR")) {
    throw new Error(`${hostname}'s composite feed didn't return real ICS content (got ${text.length} bytes)`);
  }
  return text;
}
