/**
 * SIDEARM sites expose a real, consistent school logo at a fixed relative path off the site's
 * own domain - confirmed directly against 6 real schools (Amherst, Bates, Hamilton, Holy Cross,
 * MIT, Providence/JWU), not assumed from one example. The path 302-redirects through SIDEARM's
 * own image CDN (images.sidearmdev.com) to a real webp (confirmed via a header check following
 * the redirect) - a plain `<img src>` follows that transparently, no special handling needed.
 *
 * Presto and other platforms don't share this convention - checked a real Presto school (CCSU)
 * directly and found no equivalent - so this only resolves for cmsPlatform === "sidearm";
 * everything else gets null and renders with no logo rather than a guessed/broken one.
 */
export function getSchoolLogoUrl(websiteUrl: string, cmsPlatform: string): string | null {
  if (cmsPlatform !== "sidearm") return null;
  try {
    return `${new URL(websiteUrl).origin}/images/logos/site/site.png`;
  } catch {
    return null;
  }
}
