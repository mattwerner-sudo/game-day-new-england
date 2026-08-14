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
