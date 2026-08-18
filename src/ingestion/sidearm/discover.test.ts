import { describe, expect, it } from "vitest";
import { extractGameResults } from "./discover";

// Fixtures are real fragments captured from athletics.amherst.edu/sports/baseball/schedule
// on 2026-08-17 (CLAUDE.md Section 0.13/61's feasibility check) - not synthesized.
describe("extractGameResults", () => {
  it("extracts a real completed win with a boxscore link", () => {
    const html =
      '"result":{"game_id":14757,"status":"W","team_score":"24","opponent_score":"7",' +
      '"prescore":"","postscore":"7 Inn.","bid":"dhtN16BnFQIRVjxiEQg8Gg%3d%3d",' +
      '"boxscore":"/boxscore.aspx?id=14757","line_scores":null}';
    const results = extractGameResults(html);
    expect(results.get("14757")).toEqual({
      status: "W",
      teamScore: 24,
      opponentScore: 7,
      boxscoreUrl: "/boxscore.aspx?id=14757",
    });
  });

  it("extracts a real completed loss, including one with a nested line_scores object", () => {
    const html =
      '"result":{"game_id":14759,"status":"L","team_score":"3","opponent_score":"6",' +
      '"prescore":null,"postscore":null,"bid":"epa57jxhtuhnEUUPsq5Q3g%3d%3d",' +
      '"boxscore":"/boxscore.aspx?id=14759","line_scores":{"game_winner":"A",' +
      '"this_team_is_home_team":false,"home_full_name":"Amherst","home_short_name":"AMHERST"}}';
    const results = extractGameResults(html);
    expect(results.get("14759")).toEqual({
      status: "L",
      teamScore: 3,
      opponentScore: 6,
      boxscoreUrl: "/boxscore.aspx?id=14759",
    });
  });

  it("skips a not-yet-played game (all-null result block)", () => {
    const html =
      '"result":{"game_id":14885,"status":null,"team_score":null,"opponent_score":null,' +
      '"prescore":null,"postscore":null,"bid":"L7PmIN%2byoobuEyb9bXxadw%3d%3d",' +
      '"boxscore":null,"line_scores":null}';
    const results = extractGameResults(html);
    expect(results.size).toBe(0);
  });

  it("extracts multiple games from one page and ignores unrelated JSON", () => {
    const html = [
      '{"unrelated":{"foo":"bar"}}',
      '"result":{"game_id":1,"status":"W","team_score":"10","opponent_score":"2","prescore":null,"postscore":null,"bid":"x","boxscore":"/boxscore.aspx?id=1","line_scores":null}',
      '"result":{"game_id":2,"status":null,"team_score":null,"opponent_score":null,"prescore":null,"postscore":null,"bid":"y","boxscore":null,"line_scores":null}',
      '"result":{"game_id":3,"status":"T","team_score":"1","opponent_score":"1","prescore":null,"postscore":null,"bid":"z","boxscore":null,"line_scores":null}',
    ].join("\n");
    const results = extractGameResults(html);
    expect(results.size).toBe(2);
    expect(results.get("1")?.teamScore).toBe(10);
    expect(results.get("2")).toBeUndefined();
    expect(results.get("3")).toEqual({ status: "T", teamScore: 1, opponentScore: 1, boxscoreUrl: null });
  });

  it("returns an empty map for a page with no result blocks at all", () => {
    expect(extractGameResults("<html><body>no games here</body></html>").size).toBe(0);
  });
});
