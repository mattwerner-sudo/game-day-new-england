const UA = "Mozilla/5.0 (compatible; ne-sports-aggregator/0.1; +https://ne-sports-aggregator.local)";

export interface SidearmSportMeta {
  sportId: number;
  title: string; // e.g. "Women's Soccer"
  genderCode: string; // "m" | "f" | other
  slug: string; // URL slug, e.g. "womens-soccer"
  // Per-game ticket URLs, keyed by the same numeric game_id the ICS feed's own URL field
  // uses. Schools on the Paciolan/evenue ticket vendor get a real per-game deep link
  // rendered server-side on this same schedule page as `<a class="paciolan_link" ...
  // href="…tickets.ashx/go?game_id=N&…">`. This is a *better* source than the ICS
  // DESCRIPTION field's "Tickets:" line when both exist (per-game vs. a generic season
  // list page - see CLAUDE.md) and also catches real ticketed games the DESCRIPTION line
  // omits entirely. Empty for schools not on this vendor/widget - not every school will
  // have entries here, and that's expected, not a bug.
  ticketUrlsByGameId: Map<string, string>;
}

/** Extract Paciolan/evenue per-game ticket links from a SIDEARM schedule page's HTML. */
function extractPaciolanTicketLinks(html: string): Map<string, string> {
  const map = new Map<string, string>();
  const matches = html.matchAll(/<a class="paciolan_link"[^>]*href="([^"]+)"/g);
  for (const m of matches) {
    const href = m[1].replace(/&amp;/g, "&").replace(/^http:/, "https:");
    const gameId = href.match(/game_id=(\d+)/)?.[1];
    if (gameId) map.set(gameId, href);
  }
  return map;
}

/** Fetch a SIDEARM athletics homepage and extract every /sports/<slug>/schedule link. */
export async function discoverSportSlugs(hostname: string): Promise<string[]> {
  const res = await fetch(`https://${hostname}/`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to fetch homepage for ${hostname}: ${res.status}`);
  const html = await res.text();
  const matches = html.matchAll(/href="\/sports\/([a-zA-Z0-9-]+)\/schedule"/g);
  const slugs = new Set<string>();
  for (const m of matches) slugs.add(m[1]);
  return [...slugs];
}

/** Fetch a sport's schedule page and pull the embedded `associated_sport` JSON blob. */
export async function fetchSportMeta(
  hostname: string,
  slug: string
): Promise<SidearmSportMeta | null> {
  const res = await fetch(`https://${hostname}/sports/${slug}/schedule`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) return null;
  const html = await res.text();
  const match = html.match(/associated_sport\s*=\s*(\{[^;]*\});/);
  if (!match) return null;

  const parsed = JSON.parse(match[1]);
  if (!parsed || typeof parsed.id !== "number") return null;

  return {
    sportId: parsed.id,
    title: parsed.title,
    genderCode: parsed.gender ?? "",
    slug,
    ticketUrlsByGameId: extractPaciolanTicketLinks(html),
  };
}
