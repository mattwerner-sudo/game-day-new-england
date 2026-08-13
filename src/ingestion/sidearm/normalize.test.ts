import { describe, expect, it } from "vitest";
import {
  computeDedupeKey,
  computeSpecialEventDedupeKey,
  genderFromCode,
  isFeedStale,
  isOutOfScopeSport,
  looksLikeMeetName,
  normalizeState,
  parseLocation,
  parseMatchup,
  parseStreamingInfo,
  parseTicketUrl,
  sportNameFromTitle,
} from "./normalize";

describe("genderFromCode", () => {
  it("maps m/f/other codes", () => {
    expect(genderFromCode("m")).toBe("mens");
    expect(genderFromCode("f")).toBe("womens");
    expect(genderFromCode("x")).toBe("coed");
  });
});

describe("isOutOfScopeSport", () => {
  it("flags club/JV/esports titles", () => {
    expect(isOutOfScopeSport("Club Golf")).toBe(true);
    expect(isOutOfScopeSport("JV Basketball")).toBe(true);
    expect(isOutOfScopeSport("NECBA Baseball")).toBe(true);
    expect(isOutOfScopeSport("Esports - League of Legends")).toBe(true);
    expect(isOutOfScopeSport("Valorant")).toBe(true);
  });

  it("leaves real varsity titles alone", () => {
    expect(isOutOfScopeSport("Men's Basketball")).toBe(false);
    expect(isOutOfScopeSport("Women's Soccer")).toBe(false);
    expect(isOutOfScopeSport("Field Hockey")).toBe(false);
  });
});

describe("sportNameFromTitle", () => {
  it("strips gender/ranking prefixes", () => {
    expect(sportNameFromTitle("Women's Soccer")).toBe("soccer");
    expect(sportNameFromTitle("#12 Men's Tennis")).toBe("tennis");
    expect(sportNameFromTitle("M-Basketball")).toBe("basketball");
  });

  it("collapses known real-world naming variants to one canonical sport", () => {
    expect(sportNameFromTitle("Hockey")).toBe("ice hockey"); // UMass Amherst's bare title
    expect(sportNameFromTitle("Swiming and Diving")).toBe("swimming and diving"); // real typo
    expect(sportNameFromTitle("Indoor Track")).toBe("indoor track and field");
    expect(sportNameFromTitle("Outdoor Track")).toBe("outdoor track and field");
    expect(sportNameFromTitle("Track and Field (Sprints, Hurdles, Jumps)")).toBe("track and field");
    expect(sportNameFromTitle("Cross Country, Distance Track")).toBe("cross country");
    expect(sportNameFromTitle("Cross Country/Track and Field")).toBe("cross country");
    expect(sportNameFromTitle("Coed Sailing")).toBe("sailing");
    expect(sportNameFromTitle("Cheerleading")).toBe("cheer");
    expect(sportNameFromTitle("Ultimate")).toBe("ultimate frisbee");
  });

  it("preserves the real heavyweight/lightweight rowing distinction", () => {
    expect(sportNameFromTitle("Heavyweight Crew")).toBe("heavyweight rowing");
    expect(sportNameFromTitle("Crew (Heavyweight)")).toBe("heavyweight rowing");
    expect(sportNameFromTitle("Lightweight Crew")).toBe("lightweight rowing");
    expect(sportNameFromTitle("Crew")).toBe("rowing");
  });
});

describe("normalizeState", () => {
  it("normalizes full names and abbreviations to USPS codes", () => {
    expect(normalizeState("Massachusetts")).toBe("MA");
    expect(normalizeState("Mass.")).toBe("MA");
    expect(normalizeState("ma")).toBe("MA");
    expect(normalizeState("Conn")).toBe("CT");
  });

  it("falls back to uppercasing unknown input rather than dropping it", () => {
    expect(normalizeState("Ontario")).toBe("ONTARIO");
  });
});

describe("parseLocation", () => {
  it("parses the common City, ST, Venue Name format", () => {
    expect(parseLocation("Burlington, VT, Virtue Field")).toEqual({
      city: "Burlington",
      state: "VT",
      venueName: "Virtue Field",
    });
  });

  it("parses City, ST with no venue name", () => {
    expect(parseLocation("Kingston, RI")).toEqual({
      city: "Kingston",
      state: "RI",
      venueName: "Kingston",
    });
  });

  it("parses the comma-slash format (City, ST/Venue)", () => {
    expect(parseLocation("Worcester, MA/Fitton Field")).toEqual({
      city: "Worcester",
      state: "MA",
      venueName: "Fitton Field",
    });
  });

  it("parses a venue with a parenthetical City, ST group", () => {
    expect(
      parseLocation("Sherie and Don (1961) Morrison Track (Cambridge, Mass.)")
    ).toEqual({
      city: "Cambridge",
      state: "MA",
      venueName: "Sherie and Don (1961) Morrison Track",
    });
  });

  it("strips a trailing tournament-round note from the state token", () => {
    expect(parseLocation("Worcester, Mass) | NCAA First Round, Fitton Field")).toEqual({
      city: "Worcester",
      state: "MA",
      venueName: "Fitton Field",
    });
  });

  it("returns TBD for a null location", () => {
    expect(parseLocation(null)).toEqual({ city: null, state: null, venueName: "TBD" });
  });
});

describe("parseTicketUrl", () => {
  it("extracts the Tickets: line from a description", () => {
    expect(parseTicketUrl("TV: ESPN+\nTickets: https://example.com/buy\n")).toBe(
      "https://example.com/buy"
    );
  });

  it("returns null when there's no Tickets line", () => {
    expect(parseTicketUrl("TV: ESPN+\n")).toBeNull();
    expect(parseTicketUrl(null)).toBeNull();
  });
});

describe("parseStreamingInfo", () => {
  it("extracts TV/streaming/radio lines from a description", () => {
    expect(
      parseStreamingInfo(
        "TV: ESPN+\nStreaming Video: https://espn.com/watch/1\nRadio: WFSB\nStreaming Audio: https://example.com/audio\n"
      )
    ).toEqual({
      tvNetwork: "ESPN+",
      streamingVideoUrl: "https://espn.com/watch/1",
      radioNetwork: "WFSB",
      streamingAudioUrl: "https://example.com/audio",
    });
  });

  it("returns all-null for a missing description", () => {
    expect(parseStreamingInfo(null)).toEqual({
      tvNetwork: null,
      streamingVideoUrl: null,
      radioNetwork: null,
      streamingAudioUrl: null,
    });
  });
});

describe("parseMatchup", () => {
  it("parses a home (vs) matchup", () => {
    expect(parseMatchup("Saint Anselm College Women's Tennis vs Franklin Pierce")).toEqual({
      isHome: true,
      opponentName: "Franklin Pierce",
      isExhibition: false,
    });
  });

  it("parses an away (at) matchup", () => {
    expect(parseMatchup("UConn Men's Basketball at Syracuse")).toEqual({
      isHome: false,
      opponentName: "Syracuse",
      isExhibition: false,
    });
  });

  it("detects a ' - Exhibition' suffix and strips it from the opponent name", () => {
    expect(
      parseMatchup("UConn Men's Basketball vs Syracuse - Hall of Fame Exhibition")
    ).toEqual({ isHome: true, opponentName: "Syracuse", isExhibition: true });
  });

  it("detects the real source typo 'PRESEASON EXHIBITON'", () => {
    expect(parseMatchup("UConn Men's Basketball vs Syracuse - PRESEASON EXHIBITON")).toEqual({
      isHome: true,
      opponentName: "Syracuse",
      isExhibition: true,
    });
  });

  it("detects a parenthetical (exh.) suffix on the opponent name", () => {
    expect(parseMatchup("UConn Men's Basketball vs Syracuse (exh.)")).toEqual({
      isHome: true,
      opponentName: "Syracuse",
      isExhibition: true,
    });
  });

  it("does not flag a normal, non-exhibition suffix as an exhibition", () => {
    expect(parseMatchup("Bates Women's Tennis vs Southern Connecticut State - Family Weekend")).toEqual({
      isHome: true,
      opponentName: "Southern Connecticut State",
      isExhibition: false,
    });
  });

  it("returns null when the summary has no vs/at matchup shape", () => {
    expect(parseMatchup("NESCAC Championships")).toBeNull();
  });
});

describe("looksLikeMeetName", () => {
  it("matches real meet/tournament keywords", () => {
    expect(looksLikeMeetName("Little Three Championships")).toBe(true);
    expect(looksLikeMeetName("Purple Valley Classic")).toBe(true);
    expect(looksLikeMeetName("NESCAC Invitational")).toBe(true);
  });

  it("does not match a genuine opponent school name", () => {
    expect(looksLikeMeetName("Bowdoin College")).toBe(false);
  });
});

describe("isFeedStale", () => {
  const now = new Date("2026-08-13T00:00:00Z");

  it("treats a feed with no games as stale", () => {
    expect(isFeedStale(null, now)).toBe(true);
  });

  it("treats a feed whose latest game is far in the past as stale", () => {
    expect(isFeedStale(new Date("2024-01-01T00:00:00Z"), now)).toBe(true);
  });

  it("treats a feed with a recent game as not stale", () => {
    expect(isFeedStale(new Date("2026-08-01T00:00:00Z"), now)).toBe(false);
  });
});

describe("computeDedupeKey", () => {
  const startDatetime = new Date("2026-08-16T17:00:00Z");

  it("is deterministic for the same inputs", () => {
    const a = computeDedupeKey({ startDatetime, homeName: "University of Vermont", awayName: "Sacred Heart University", gender: "womens" });
    const b = computeDedupeKey({ startDatetime, homeName: "University of Vermont", awayName: "Sacred Heart University", gender: "womens" });
    expect(a).toBe(b);
  });

  it("produces the same key regardless of how each side's feed capitalizes/punctuates the name", () => {
    const a = computeDedupeKey({ startDatetime, homeName: "University of Vermont", awayName: "Sacred Heart University", gender: "womens" });
    const b = computeDedupeKey({ startDatetime, homeName: "university of vermont", awayName: "Sacred Heart University!", gender: "womens" });
    expect(a).toBe(b);
  });

  it("produces a different key for a different gender - regression test for the dual-meet clobbering bug", () => {
    const mens = computeDedupeKey({ startDatetime, homeName: "Bridgewater State University", awayName: "Bentley University", gender: "mens" });
    const womens = computeDedupeKey({ startDatetime, homeName: "Bridgewater State University", awayName: "Bentley University", gender: "womens" });
    expect(mens).not.toBe(womens);
  });

  it("does not fold venue into the key", () => {
    // computeDedupeKey's signature has no venue param at all - this just documents/locks the
    // key shape (4 pipe-delimited segments) so a future edit can't silently add one back in.
    const key = computeDedupeKey({ startDatetime, homeName: "Home", awayName: "Away", gender: "mens" });
    expect(key.split("|")).toHaveLength(4);
  });
});

describe("computeSpecialEventDedupeKey", () => {
  const startDatetime = new Date("2026-10-17T12:00:00Z");

  it("produces a different key for a different gender at the same meet/date", () => {
    const mens = computeSpecialEventDedupeKey({ startDatetime, sport: "cross country", gender: "mens", eventName: "Little Three Championships" });
    const womens = computeSpecialEventDedupeKey({ startDatetime, sport: "cross country", gender: "womens", eventName: "Little Three Championships" });
    expect(mens).not.toBe(womens);
  });

  it("uses only the calendar date, not the exact time", () => {
    const a = computeSpecialEventDedupeKey({ startDatetime: new Date("2026-10-17T09:00:00Z"), sport: "rowing", gender: "womens", eventName: "Head of the Charles" });
    const b = computeSpecialEventDedupeKey({ startDatetime: new Date("2026-10-17T21:00:00Z"), sport: "rowing", gender: "womens", eventName: "Head of the Charles" });
    expect(a).toBe(b);
  });
});
