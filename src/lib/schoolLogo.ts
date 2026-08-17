/**
 * SIDEARM sites expose a real, consistent school logo at a fixed relative path off the site's
 * own domain - confirmed directly against 6 real schools (Amherst, Bates, Hamilton, Holy Cross,
 * MIT, Providence/JWU), not assumed from one example. The path 302-redirects through SIDEARM's
 * own image CDN (images.sidearmdev.com) to a real webp (confirmed via a header check following
 * the redirect) - a plain `<img src>` follows that transparently, no special handling needed.
 */
const SIDEARM_LOGO_PATH = "/images/logos/site/site.png";

/**
 * Presto has no equivalent universal path - each school uploads its own logo under its own
 * filename via its own admin panel, confirmed by checking several real Presto schools directly
 * (no shared convention the way SIDEARM's `site.png` is). Individually verified per school
 * instead, same allowlist discipline as VIVENU_TICKET_DOMAINS/SPECIAL_VENUES elsewhere in this
 * codebase - each entry below was confirmed via a direct fetch returning a real `image/*`
 * content-type (or the school's own `<meta name="profile-site-logo">` tag, where present) at
 * the exact URL listed, not guessed from a pattern.
 *
 * Several Presto schools sit behind an AWS WAF bot challenge that blocks even a real browser
 * render, not just a plain fetch (matches the same WAF issue already documented for feed
 * ingestion) - deliberately not pursued further, since defeating that would mean bypassing bot
 * detection. Those schools (Curry, Endicott, Suffolk, Wentworth, Lesley, Vermont State-Johnson)
 * simply have no logo here rather than a forced one. Repeated verification requests during
 * research also visibly triggered rate-limiting on a couple of the schools below (a previously-
 * clean fetch started returning the same WAF challenge on retry) - a reminder this shared
 * PrestoSports hosting infrastructure is sensitive to request volume; add new entries here
 * sparingly and manually, not via an automated per-school crawl.
 */
const PRESTO_SCHOOL_LOGOS: Record<string, string> = {
  "Bridgewater State University": "https://bsubears.com/assets/Primary_Logo_-_.5x.png",
  "Central Connecticut State University": "https://ccsubluedevils.com/images/setup/Primary_Logo_-_-0.5x-.png",
  "Albertus Magnus College": "https://albertusfalcons.com/images/setup/2025/Albertus_Falcon_Main_Logo-0.25x.png",
  "Regis College": "https://goregispride.com/assets/site-logo.png",
  "Mount Holyoke College": "https://athletics.mtholyoke.edu/images/setup/2024/logo-main.png",
  "Lasell University": "https://laserpride.lasell.edu/images/setup/LasellUniversity_Logo_Primary.png",
};

/**
 * Resolves a school to its logo url, or null if it isn't one this codebase has verified. `null`
 * is always safe/expected here - not every school resolves, and the caller (SchoolLogo.tsx)
 * already treats "no url" the same as "url that failed to load."
 */
export function getSchoolLogoUrl(
  schoolName: string | null,
  websiteUrl: string,
  cmsPlatform: string
): string | null {
  if (cmsPlatform === "sidearm") {
    try {
      return `${new URL(websiteUrl).origin}${SIDEARM_LOGO_PATH}`;
    } catch {
      return null;
    }
  }
  if (cmsPlatform === "presto" && schoolName) {
    return PRESTO_SCHOOL_LOGOS[schoolName] ?? null;
  }
  return null;
}
