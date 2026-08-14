/**
 * Hudl's vCloud broadcast embed pages (unlike Hometown Ticketing, Etix, ESPN, etc. - see
 * CLAUDE.md Section 41) send no X-Frame-Options or CSP frame-ancestors header and set their
 * session cookie SameSite=None, which only matters for a cookie that's meant to work inside a
 * third-party iframe - confirmed via a direct header/body check, not assumed. The page itself
 * is a real Volar/BlueFrame player built for this (`body class="embed"`, `page_type: 'Embed'`).
 */
const HUDL_EMBED_PATTERN = /^https:\/\/vcloud\.hudl\.com\/broadcast\/embed\//;

/**
 * YouTube's /embed/ endpoint sends no X-Frame-Options or CSP frame-ancestors restriction either
 * (confirmed the same way as Hudl - a direct header check, not assumed from general knowledge)
 * - it's a documented, intentional public feature. The real constraint here isn't the platform,
 * it's the URL shape actually ingested: about half of real streamingVideoUrl values that mention
 * "youtube" are a *channel* or playlist link (a school's "@handle" or "/streams" tab), not one
 * specific video - there's no single video ID to embed, and guessing "whatever's live on that
 * channel right now" would often show the wrong game or nothing. Only resolve a real video ID
 * from watch/live/youtu.be/embed URL shapes; channel and playlist links fall through to the
 * existing external "Watch" link, same as any other non-embeddable provider.
 */
function extractYouTubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return parsed.pathname.slice(1).split("/")[0] || null;
  }

  if (host === "youtube.com" || host === "m.youtube.com") {
    if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
    const liveMatch = parsed.pathname.match(/^\/live\/([^/]+)/);
    if (liveMatch) return liveMatch[1];
    const embedMatch = parsed.pathname.match(/^\/embed\/([^/]+)/);
    if (embedMatch) return embedMatch[1];
  }

  return null;
}

export type EmbedInfo = { url: string; label: string };

/** Resolves a streaming URL to an in-app-embeddable iframe src, or null if it isn't one. */
export function resolveEmbed(url: string | null): EmbedInfo | null {
  if (!url) return null;
  if (HUDL_EMBED_PATTERN.test(url)) return { url, label: "Hudl" };

  const videoId = extractYouTubeVideoId(url);
  if (videoId) return { url: `https://www.youtube.com/embed/${videoId}`, label: "YouTube" };

  return null;
}

/**
 * Vivenu (a real ticketing platform, white-labeled per school under each school's own domain -
 * "tickets.saintanselmhawks.com", "bryanttickets.com", etc. - no shared domain suffix to
 * pattern-match generically the way YouTube/Hudl have). Confirmed via direct header checks that
 * it sends no X-Frame-Options or CSP frame-ancestors on any of these, and via an actual rendered
 * iframe test that the full purchase flow (seat selection, cart, checkout) works entirely inside
 * a cross-origin iframe without breaking out.
 *
 * Deliberately an explicit allowlist, not a heuristic like "starts with tickets." - several of
 * the *blocked* ticket vendors in this data (tickets.brown.edu, tickets.dartmouth.edu,
 * tickets.goholycross.com) share that exact naming pattern, so guessing by domain shape would
 * misfire. Only domains individually verified end-to-end are listed here; add a new one only
 * after the same real check (curl -I for the headers, then an actual iframe render), not by
 * assuming another school "probably" uses the same platform.
 */
const VIVENU_TICKET_DOMAINS = new Set([
  "tickets.saintanselmhawks.com",
  "bryanttickets.com",
  "tickets.merrimackathletics.com",
]);

/** Resolves a ticket URL to an in-app-embeddable iframe src, or null if it isn't one. */
export function resolveTicketEmbed(url: string | null): EmbedInfo | null {
  if (!url) return null;
  let host: string;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
  if (VIVENU_TICKET_DOMAINS.has(host)) return { url, label: "Buy Tickets" };
  return null;
}

/**
 * NEC Front Row (necfrontrow.com) is the Northeast Conference's own branded portal, not a
 * separate video platform - confirmed by inspecting a live game page: every sampled game across
 * 4 sports (soccer, baseball, softball, track) at 6+ different NEC schools resolves to the exact
 * same Hudl vCloud embed this file already whitelists above. Their public, unauthenticated API
 * (`api.necfrontrow.com/games/games/{id}`) returns an `event_code` field containing the raw
 * `<iframe src="https://vcloud.hudl.com/broadcast/embed/{hudlId}...">` HTML for that game -
 * confirmed via direct fetches, not assumed from their site's client-side JS alone.
 *
 * Unlike every other resolver in this file, this one needs a network call (the wrapper URL only
 * carries NEC Front Row's own numeric game id, not the underlying Hudl id) - the one exception to
 * this file's otherwise-pure-function pattern. Always falls through to null on any failure
 * (unresolvable id, network error, unexpected shape) so the caller's existing "no embed -> plain
 * external link" fallback still applies; never throws.
 */
const NEC_FRONTROW_HOSTS = new Set(["necfrontrow.com"]);

export async function resolveNecFrontRowEmbed(url: string | null): Promise<EmbedInfo | null> {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!NEC_FRONTROW_HOSTS.has(parsed.hostname.replace(/^www\./, ""))) return null;

  const gameIdMatch = parsed.pathname.match(/^\/game\/(\d+)/);
  if (!gameIdMatch) return null;

  try {
    // 5s cap + 5min cache: this runs during a real page render (see events/[id]/page.tsx), so a
    // slow/down third party can't be allowed to hang or repeatedly slow down that page.
    const res = await fetch(`https://api.necfrontrow.com/games/games/${gameIdMatch[1]}`, {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { event_code?: string | null };
    if (!data.event_code) return null; // real, observed case: video not assigned yet, or id expired

    const hudlSrcMatch = data.event_code.match(/https:\/\/vcloud\.hudl\.com\/broadcast\/embed\/\S+?(?="|\s|$)/);
    if (!hudlSrcMatch) return null;

    // Re-validates against HUDL_EMBED_PATTERN rather than trusting this third-party HTML blob
    // directly - same "only what's individually verified" discipline as VIVENU_TICKET_DOMAINS.
    return resolveEmbed(hudlSrcMatch[0]);
  } catch {
    return null;
  }
}
