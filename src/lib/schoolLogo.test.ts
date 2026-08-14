import { describe, expect, it } from "vitest";
import { getSchoolLogoUrl } from "./schoolLogo";

describe("getSchoolLogoUrl", () => {
  it("resolves a sidearm school to its site logo path", () => {
    expect(getSchoolLogoUrl("https://athletics.amherst.edu", "sidearm")).toBe(
      "https://athletics.amherst.edu/images/logos/site/site.png"
    );
  });

  it("preserves the site's own origin (not a hardcoded domain)", () => {
    expect(getSchoolLogoUrl("https://ccsubluedevils.com", "sidearm")).toBe(
      "https://ccsubluedevils.com/images/logos/site/site.png"
    );
  });

  it("returns null for presto (no equivalent convention confirmed)", () => {
    expect(getSchoolLogoUrl("https://ccsubluedevils.com", "presto")).toBeNull();
  });

  it("returns null for other/unknown platforms", () => {
    expect(getSchoolLogoUrl("https://uconnhuskies.com", "other")).toBeNull();
  });

  it("returns null for a malformed website url", () => {
    expect(getSchoolLogoUrl("not a url", "sidearm")).toBeNull();
  });
});
