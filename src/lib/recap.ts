import Anthropic from "@anthropic-ai/sdk";

// Lazily constructed so a missing ANTHROPIC_API_KEY doesn't throw at import time (this file
// is imported by the event page on every request, final games or not) - the SDK's zero-arg
// constructor reads the key from the environment itself, same pattern as this project's other
// env-var-gated integrations (Resend, Twilio).
let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic();
  return client;
}

export interface RecapInput {
  sport: string;
  gender: string;
  homeSchoolName: string;
  awaySchoolName: string;
  homeScore: number;
  awayScore: number;
  venueName: string | null;
  startDatetime: Date;
}

/**
 * One factual sentence recapping a completed game, generated from structured score data -
 * see CLAUDE.md Section 63. Haiku 4.5 (not a larger model): this is pure structured-data-to-
 * short-text, no reasoning required. Returns null on any failure (missing key, network error,
 * timeout, empty response) - the caller's job is to skip rendering, not to surface an error to
 * a page visitor over something as low-stakes as a missing recap sentence.
 */
export async function generateRecap(game: RecapInput): Promise<string | null> {
  const anthropic = getClient();
  if (!anthropic) return null;

  try {
    const response = await anthropic.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 100,
        system:
          "Write one factual sentence recapping this completed college sports game: the " +
          "winner, the final score, and the sport. No speculation, no play-by-play, no " +
          "exclamation points, no filler.",
        messages: [{ role: "user", content: JSON.stringify(game) }],
      },
      { timeout: 15_000 }
    );
    const block = response.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text.trim() : null;
  } catch {
    return null;
  }
}
