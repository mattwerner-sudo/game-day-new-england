import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateRecap } from "./recap";

const createMock = vi.fn();

// Mock the SDK module itself (not a global, unlike embed.ts's plain fetch calls) since
// generateRecap goes through the Anthropic client class, not a bare network call. vi.mock is
// hoisted above this file's imports, so the mock is in place before recap.ts's own
// `import Anthropic from "@anthropic-ai/sdk"` resolves.
vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function MockAnthropic() {
    return { messages: { create: createMock } };
  }),
}));

const GAME = {
  sport: "baseball",
  gender: "mens",
  homeSchoolName: "Amherst College",
  awaySchoolName: "Williams College",
  homeScore: 7,
  awayScore: 3,
  venueName: "Memorial Field",
  startDatetime: new Date("2026-04-17T20:00:00.000Z"),
};

describe("generateRecap", () => {
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    createMock.mockReset();
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it("returns null without calling the API when ANTHROPIC_API_KEY is unset", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const result = await generateRecap(GAME);
    expect(result).toBeNull();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("returns the trimmed text from a successful response", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({
      content: [{ type: "text", text: "  Amherst defeated Williams 7-3 in baseball.  " }],
    });
    const result = await generateRecap(GAME);
    expect(result).toBe("Amherst defeated Williams 7-3 in baseball.");
  });

  it("returns null when the response has no text block", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockResolvedValue({ content: [{ type: "tool_use" }] });
    const result = await generateRecap(GAME);
    expect(result).toBeNull();
  });

  it("returns null if the API call throws (network error/timeout/rate limit)", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    createMock.mockRejectedValue(new Error("timeout"));
    const result = await generateRecap(GAME);
    expect(result).toBeNull();
  });
});
