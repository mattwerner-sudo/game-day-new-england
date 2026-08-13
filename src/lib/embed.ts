/**
 * Hudl's vCloud broadcast embed pages (unlike Hometown Ticketing, Etix, ESPN, etc. - see
 * CLAUDE.md Section 41) send no X-Frame-Options or CSP frame-ancestors header and set their
 * session cookie SameSite=None, which only matters for a cookie that's meant to work inside a
 * third-party iframe - confirmed via a direct header/body check, not assumed. The page itself
 * is a real Volar/BlueFrame player built for this (`body class="embed"`, `page_type: 'Embed'`).
 */
const HUDL_EMBED_PATTERN = /^https:\/\/vcloud\.hudl\.com\/broadcast\/embed\//;

export function isEmbeddableStream(url: string | null): boolean {
  return url != null && HUDL_EMBED_PATTERN.test(url);
}
