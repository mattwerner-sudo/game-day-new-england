import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveEmbed, resolveTicketEmbed, resolveNecFrontRowEmbed } from "./embed";

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

describe("resolveTicketEmbed", () => {
  it("returns null for a null url", () => {
    expect(resolveTicketEmbed(null)).toBeNull();
  });

  it("resolves a verified Vivenu ticket domain unchanged", () => {
    const url = "https://tickets.saintanselmhawks.com/event/saint-anselm-football-vs-bentley-y4ctu3";
    expect(resolveTicketEmbed(url)).toEqual({ url, label: "Buy Tickets" });
  });

  it("resolves other verified Vivenu domains", () => {
    expect(resolveTicketEmbed("https://bryanttickets.com/event/mens-lacrosse-vs-vermont-lqkxw5")).toEqual({
      url: "https://bryanttickets.com/event/mens-lacrosse-vs-vermont-lqkxw5",
      label: "Buy Tickets",
    });
  });

  it("returns null for an unverified vendor even with a similar 'tickets.' naming pattern", () => {
    // tickets.brown.edu/tickets.dartmouth.edu are confirmed BLOCKED (X-Frame-Options) despite
    // sharing this exact naming shape with the verified Vivenu domains - this is the regression
    // this allowlist-not-heuristic design exists to prevent.
    expect(resolveTicketEmbed("https://tickets.brown.edu/athletics/Online/default.asp")).toBeNull();
    expect(resolveTicketEmbed("https://tickets.dartmouth.edu/online/default.asp")).toBeNull();
  });

  it("returns null for other known-blocked vendors", () => {
    expect(resolveTicketEmbed("https://bceagles.evenue.net/promotions/HEP26")).toBeNull();
    expect(resolveTicketEmbed("https://events.hometownticketing.com/boxoffice/amherst")).toBeNull();
    expect(resolveTicketEmbed("https://www.ticketmaster.com/boston-university-womens-basketball-tickets/artist/848478")).toBeNull();
  });

  it("returns null for a malformed url", () => {
    expect(resolveTicketEmbed("not a url")).toBeNull();
  });
});

describe("resolveNecFrontRowEmbed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for a null url without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await resolveNecFrontRowEmbed(null)).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null for an unrelated domain without calling fetch", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await resolveNecFrontRowEmbed("https://www.espn.com/watch/player/_/id/8fd915db")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null for a necfrontrow.com url with no /game/{id} path", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/schedule")).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("resolves a real game id to its underlying Hudl embed url", async () => {
    // Real observed shape from api.necfrontrow.com/games/games/{id} (CLAUDE.md Section 48).
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          event_code:
            '<iframe src="https://vcloud.hudl.com/broadcast/embed/4117912?autoplay=1" width="640" height="360" allow="fullscreen;" style="border:0;overflow:hidden;"></iframe>',
        }),
      })
    );
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/game/14665")).toEqual({
      url: "https://vcloud.hudl.com/broadcast/embed/4117912?autoplay=1",
      label: "Hudl",
    });
  });

  it("returns null when the game id doesn't resolve (empty event_code)", async () => {
    // Real observed case: an id whose video hasn't been assigned yet, or no longer exists.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ event_code: null }) })
    );
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/game/99999999")).toBeNull();
  });

  it("returns null for a real API response shape: 200 OK with an empty body", async () => {
    // Confirmed directly against the real API (CLAUDE.md Section 48): expired/never-populated
    // game ids return HTTP 200 with a literal 0-byte body, not `{}` - .json() throws on that.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new SyntaxError("Unexpected end of JSON input");
        },
      })
    );
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/game/14560")).toBeNull();
  });

  it("returns null on a non-ok API response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/game/14665")).toBeNull();
  });

  it("returns null if the fetch throws (network error/timeout)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));
    expect(await resolveNecFrontRowEmbed("https://necfrontrow.com/game/14665")).toBeNull();
  });

  it("returns null for a malformed url", async () => {
    expect(await resolveNecFrontRowEmbed("not a url")).toBeNull();
  });
});
