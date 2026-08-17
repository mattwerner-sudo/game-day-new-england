import { describe, expect, it } from "vitest";
import { findDuplicateMatch } from "./reconcile";

const T1 = "2026-08-17T20:00:00.000Z";
const BU = "bu-team-id";
const STONEHILL = "stonehill-team-id";
const MIT = "mit-team-id";
const WILLIAMS = "williams-team-id";

describe("findDuplicateMatch", () => {
  it("matches an orphan (unresolved home side text) to a resolved row whose other side it plausibly names", () => {
    // Real case: BU's own feed lists this game with awayTeamId null (opponent "Stonehill"
    // unresolved at ingest time); Stonehill's own feed later ingests the same game fully
    // resolved on both sides, naming itself "Stonehill College".
    const orphan = {
      id: "orphan-1",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    const resolved = {
      id: "resolved-1",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: STONEHILL,
      homeSchoolName: "Boston University",
      awaySchoolName: "Stonehill College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBe(resolved);
  });

  it("matches when the orphan's known side is the away team instead of home", () => {
    const orphan = {
      id: "orphan-2",
      startDatetime: new Date(T1),
      sport: "soccer",
      gender: "mens",
      homeTeamId: null,
      awayTeamId: STONEHILL,
      opponentNameRaw: "Boston University",
    };
    const resolved = {
      id: "resolved-2",
      startDatetime: new Date(T1),
      sport: "soccer",
      gender: "mens",
      homeTeamId: STONEHILL,
      awayTeamId: BU,
      homeSchoolName: "Stonehill College",
      awaySchoolName: "Boston University",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBe(resolved);
  });

  it("matches through a trailing state qualifier like \"(Conn.)\"", () => {
    const orphan = {
      id: "orphan-3",
      startDatetime: new Date(T1),
      sport: "soccer",
      gender: "womens",
      homeTeamId: null,
      awayTeamId: STONEHILL,
      opponentNameRaw: "Trinity College (Conn.)",
    };
    const resolved = {
      id: "resolved-3",
      startDatetime: new Date(T1),
      sport: "soccer",
      gender: "womens",
      homeTeamId: STONEHILL,
      awayTeamId: BU,
      homeSchoolName: "Stonehill College",
      awaySchoolName: "Trinity College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBe(resolved);
  });

  it("does NOT match two different legs of the same multi-team meet sharing a team/time/sport/gender", () => {
    // Real false positive caught during verification (CLAUDE.md Section 53): a swim triangular
    // where Williams legitimately appears in two distinct real matchups (MIT-Williams and
    // Williams-NYU) at the exact same meet time - an earlier version of this matcher (team +
    // exact time/sport/gender only, no name check) wrongly flagged these as duplicates.
    const orphan = {
      id: "orphan-4",
      startDatetime: new Date(T1),
      sport: "swimming and diving",
      gender: "mens",
      homeTeamId: WILLIAMS,
      awayTeamId: null,
      opponentNameRaw: "New York University",
    };
    const resolved = {
      id: "resolved-4",
      startDatetime: new Date(T1),
      sport: "swimming and diving",
      gender: "mens",
      homeTeamId: MIT,
      awayTeamId: WILLIAMS,
      homeSchoolName: "Massachusetts Institute of Technology",
      awaySchoolName: "Williams College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBeNull();
  });

  it("does not match a different sport at the same time/team/name", () => {
    const orphan = {
      id: "orphan-5",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    const resolved = {
      id: "resolved-5",
      startDatetime: new Date(T1),
      sport: "soccer",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: STONEHILL,
      homeSchoolName: "Boston University",
      awaySchoolName: "Stonehill College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBeNull();
  });

  it("does not match a different exact start time", () => {
    const orphan = {
      id: "orphan-6",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    const resolved = {
      id: "resolved-6",
      startDatetime: new Date("2026-08-18T20:00:00.000Z"),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: STONEHILL,
      homeSchoolName: "Boston University",
      awaySchoolName: "Stonehill College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBeNull();
  });

  it("never matches itself", () => {
    const orphan = {
      id: "same-id",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    const asResolvedShape = {
      id: "same-id",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: STONEHILL,
      homeSchoolName: "Boston University",
      awaySchoolName: "Stonehill College",
    };
    expect(findDuplicateMatch(orphan, [asResolvedShape])).toBeNull();
  });

  it("returns null when the orphan has neither side resolved", () => {
    const orphan = {
      id: "orphan-7",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: null,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    const resolved = {
      id: "resolved-7",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: STONEHILL,
      homeSchoolName: "Boston University",
      awaySchoolName: "Stonehill College",
    };
    expect(findDuplicateMatch(orphan, [resolved])).toBeNull();
  });

  it("returns null with no candidates", () => {
    const orphan = {
      id: "orphan-8",
      startDatetime: new Date(T1),
      sport: "field hockey",
      gender: "womens",
      homeTeamId: BU,
      awayTeamId: null,
      opponentNameRaw: "Stonehill",
    };
    expect(findDuplicateMatch(orphan, [])).toBeNull();
  });
});
