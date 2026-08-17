import { describe, expect, it } from "vitest";
import { getSchoolLogoUrl } from "./schoolLogo";

describe("getSchoolLogoUrl", () => {
  it("resolves a sidearm school to its site logo path", () => {
    expect(getSchoolLogoUrl("Amherst College", "https://athletics.amherst.edu", "sidearm")).toBe(
      "https://athletics.amherst.edu/images/logos/site/site.png"
    );
  });

  it("preserves the site's own origin for sidearm (not a hardcoded domain)", () => {
    expect(getSchoolLogoUrl("Some School", "https://example-athletics.com", "sidearm")).toBe(
      "https://example-athletics.com/images/logos/site/site.png"
    );
  });

  it("resolves a known Presto school from the curated allowlist", () => {
    expect(getSchoolLogoUrl("Central Connecticut State University", "https://ccsubluedevils.com", "presto")).toBe(
      "https://ccsubluedevils.com/images/setup/Primary_Logo_-_-0.5x-.png"
    );
  });

  it("returns null for a Presto school not in the curated allowlist", () => {
    // Real case: several Presto schools sit behind a WAF bot challenge and were deliberately
    // not added rather than guessed at - Suffolk is one of them.
    expect(getSchoolLogoUrl("Suffolk University", "https://gosuffolkrams.com", "presto")).toBeNull();
  });

  it("returns null for presto with no school name to look up", () => {
    expect(getSchoolLogoUrl(null, "https://ccsubluedevils.com", "presto")).toBeNull();
  });

  it("returns null for other/unknown platforms", () => {
    expect(getSchoolLogoUrl("UConn", "https://uconnhuskies.com", "other")).toBeNull();
  });

  it("returns null for a malformed sidearm website url", () => {
    expect(getSchoolLogoUrl("Some School", "not a url", "sidearm")).toBeNull();
  });
});
