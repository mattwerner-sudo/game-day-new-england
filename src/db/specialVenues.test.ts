import { describe, expect, it } from "vitest";
import { normalizeVenueNameKey, resolveSpecialVenue } from "./specialVenues";

describe("normalizeVenueNameKey", () => {
  it("lowercases and strips punctuation/whitespace", () => {
    expect(normalizeVenueNameKey("TD Garden")).toBe("tdgarden");
    expect(normalizeVenueNameKey("Dunkin' Park")).toBe("dunkinpark");
  });

  it("strips trailing '| City' garbage", () => {
    expect(normalizeVenueNameKey("MassMutual Center | Springfield")).toBe("massmutualcenter");
  });
});

describe("resolveSpecialVenue", () => {
  it("resolves an exact match to its canonical name", () => {
    expect(resolveSpecialVenue("TD Garden")).toBe("TD Garden");
    expect(resolveSpecialVenue("Gillette Stadium")).toBe("Gillette Stadium");
  });

  it("resolves a known real spelling variant to the same canonical name", () => {
    expect(resolveSpecialVenue("Dunkin Donuts Park")).toBe("Dunkin' Park");
    expect(resolveSpecialVenue("Dunkin' Donuts Park")).toBe("Dunkin' Park");
    expect(resolveSpecialVenue("Amica Mutual Pavillion")).toBe("Amica Mutual Pavilion");
    expect(resolveSpecialVenue("PeoplesBank Arena (Formerly XL Center)")).toBe("XL Center");
  });

  it("resolves the '| City' suffix variant to the same canonical name", () => {
    expect(resolveSpecialVenue("MassMutual Center | Springfield")).toBe("MassMutual Center");
  });

  it("returns null for an ordinary campus venue", () => {
    expect(resolveSpecialVenue("Stoutenburgh Gymnasium - Saint Anselm College")).toBeNull();
    expect(resolveSpecialVenue("Fitton Field")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(resolveSpecialVenue(null)).toBeNull();
  });
});
