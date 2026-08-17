import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(slugify("Amherst College")).toBe("amherst-college");
  });

  it("collapses multiple separators into one hyphen", () => {
    expect(slugify("Saint  Anselm   College")).toBe("saint-anselm-college");
  });

  it("strips accents to plain ASCII", () => {
    expect(slugify("Café University")).toBe("cafe-university");
  });

  it("preserves a real hyphenated league name", () => {
    expect(slugify("Northeast-10")).toBe("northeast-10");
  });

  it("strips punctuation that isn't alphanumeric", () => {
    expect(slugify("St. Joseph's College of Maine")).toBe("st-joseph-s-college-of-maine");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("  Wesleyan University  ")).toBe("wesleyan-university");
  });
});
