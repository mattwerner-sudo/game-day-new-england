import { describe, expect, it } from "vitest";
import { resolveEmbed } from "./embed";

describe("resolveEmbed", () => {
  it("returns null for a null url", () => {
    expect(resolveEmbed(null)).toBeNull();
  });

  it("resolves a Hudl vCloud embed url unchanged", () => {
    const url = "https://vcloud.hudl.com/broadcast/embed/2552615?w=640";
    expect(resolveEmbed(url)).toEqual({ url, label: "Hudl" });
  });

  it("resolves a YouTube watch url to an embed url", () => {
    const result = resolveEmbed("https://www.youtube.com/watch?v=HEVBe-plTtI");
    expect(result).toEqual({ url: "https://www.youtube.com/embed/HEVBe-plTtI", label: "YouTube" });
  });

  it("resolves a youtu.be short url to an embed url", () => {
    const result = resolveEmbed("https://youtu.be/HEVBe-plTtI");
    expect(result).toEqual({ url: "https://www.youtube.com/embed/HEVBe-plTtI", label: "YouTube" });
  });

  it("resolves a YouTube live url to an embed url", () => {
    const result = resolveEmbed("https://www.youtube.com/live/Pj3qqdb3SOU?si=jUHl25334SXscZP0");
    expect(result).toEqual({ url: "https://www.youtube.com/embed/Pj3qqdb3SOU", label: "YouTube" });
  });

  it("returns null for a YouTube channel handle url (no specific video)", () => {
    expect(resolveEmbed("https://www.youtube.com/@Bates-Squash")).toBeNull();
  });

  it("returns null for a YouTube channel streams-tab url", () => {
    expect(resolveEmbed("https://www.youtube.com/@thegnac/streams")).toBeNull();
  });

  it("returns null for a YouTube playlist url", () => {
    expect(
      resolveEmbed("https://www.youtube.com/playlist?list=PLNt6bATA09xD84FPopqCZAZJwolHOqbYt")
    ).toBeNull();
  });

  it("returns null for a legacy /username-style YouTube channel url", () => {
    expect(resolveEmbed("https://www.youtube.com/fairfieldstags")).toBeNull();
  });

  it("returns null for an unrelated provider (ESPN)", () => {
    expect(resolveEmbed("https://www.espn.com/watch/player/_/id/8fd915db")).toBeNull();
  });

  it("returns null for a malformed url", () => {
    expect(resolveEmbed("not a url")).toBeNull();
  });
});
