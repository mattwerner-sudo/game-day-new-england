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
  // have entries here, and that's expected, not a bug. Always empty for schools on the
  // newer API-driven platform below - its ticket widget isn't scraped (yet).
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

interface ApiSportEntry {
  id: number;
  title: string;
  globalSportGender: string;
  globalSportNameSlug: string;
  nonSport: boolean;
}

/**
 * A newer generation of SIDEARM sites (a Nuxt.js SPA, confirmed for UMass Lowell, UNH,
 * UMass Amherst, and Sacred Heart - see CLAUDE.md) has no server-rendered nav links and no
 * embedded `associated_sport` JSON on schedule pages at all - not a JS-rendering timing
 * issue, a genuinely different template with neither of those things present even after
 * full client-side hydration. It exposes a clean `/api/v2/sports` REST endpoint instead,
 * discovered via its own network traffic, returning every sport's id/title/gender/slug in
 * one plain HTTP call (confirmed working with a plain fetch, no browser needed at all).
 * The classic `calendar.ashx/calendar.ics?sport_id=N` feed URL still works unchanged
 * underneath this newer template once you have the right sport_id, so the entire rest of
 * the ingestion pipeline (parse.ts, normalize.ts) needs no changes for these schools.
 *
 * `nonSport: true` entries are real administrative pages (Academics, Compliance, etc.),
 * excluded here. A few real API entries (e.g. a "General" or "Mascots" catch-all) aren't
 * flagged nonSport but also aren't real varsity programs with actual schedules - rather
 * than hand-curate exclusions per school, this deliberately lets those through and relies
 * on isFeedStale() in normalize.ts (already proven for exactly this class of noise - see
 * CLAUDE.md Section 21) to filter them out downstream when their feed turns out empty.
 */
async function fetchSportsViaApi(hostname: string): Promise<SidearmSportMeta[] | null> {
  const res = await fetch(`https://${hostname}/api/v2/sports`, { headers: { "User-Agent": UA } });
  if (!res.ok) return null;
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    return null;
  }
  if (!Array.isArray(data)) return null;

  return (data as ApiSportEntry[])
    .filter((s) => !s.nonSport && s.globalSportNameSlug)
    .map((s) => ({
      sportId: s.id,
      title: s.title,
      genderCode: s.globalSportGender,
      slug: s.globalSportNameSlug,
      ticketUrlsByGameId: new Map<string, string>(),
    }));
}

/**
 * Fetch a SIDEARM athletics homepage and extract every schedule-page nav link. Tries the
 * classic server-rendered nav first (fast, works for most schools), then falls back to the
 * newer platform's API when that finds nothing.
 */
export async function discoverSportSlugs(hostname: string): Promise<string[]> {
  const res = await fetch(`https://${hostname}/`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`Failed to fetch homepage for ${hostname}: ${res.status}`);
  const html = await res.text();
  const matches = html.matchAll(/href="\/sports\/([a-zA-Z0-9-]+)\/schedule"/g);
  const slugs = new Set<string>();
  for (const m of matches) slugs.add(m[1]);
  if (slugs.size > 0) return [...slugs];

  console.warn(`  [info] no static nav links for ${hostname}, trying the newer API-based platform`);
  const apiSports = await fetchSportsViaApi(hostname);
  return apiSports ? apiSports.map((s) => s.slug) : [];
}

/** Fetch a sport's schedule page and pull the embedded `associated_sport` JSON blob. */
export async function fetchSportMeta(
  hostname: string,
  slug: string
): Promise<SidearmSportMeta | null> {
  const res = await fetch(`https://${hostname}/sports/${slug}/schedule`, {
    headers: { "User-Agent": UA },
  });
  if (res.ok) {
    const html = await res.text();
    const match = html.match(/associated_sport\s*=\s*(\{[^;]*\});/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      if (parsed && typeof parsed.id === "number") {
        return {
          sportId: parsed.id,
          title: parsed.title,
          genderCode: parsed.gender ?? "",
          slug,
          ticketUrlsByGameId: extractPaciolanTicketLinks(html),
        };
      }
    }
  }

  const apiSports = await fetchSportsViaApi(hostname);
  return apiSports?.find((s) => s.slug === slug) ?? null;
}
