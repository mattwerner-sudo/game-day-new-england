import { afterEach, describe, expect, it, vi } from "vitest";
import { withTicketAffiliateTag } from "./affiliate";

describe("withTicketAffiliateTag", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("adds UTM params even with no affiliate env vars set", () => {
    vi.stubEnv("TICKET_AFFILIATE_PARAM", "");
    vi.stubEnv("TICKET_AFFILIATE_VALUE", "");
    const result = withTicketAffiliateTag("https://tickets.saintanselmhawks.com/event/abc123");
    const parsed = new URL(result);
    expect(parsed.searchParams.get("utm_source")).toBe("gamedaynewengland");
    expect(parsed.searchParams.get("utm_medium")).toBe("referral");
    expect(parsed.searchParams.get("utm_campaign")).toBe("ticket_link");
  });

  it("does not add a vendor affiliate param when the env vars are unset", () => {
    vi.stubEnv("TICKET_AFFILIATE_PARAM", "");
    vi.stubEnv("TICKET_AFFILIATE_VALUE", "");
    const result = withTicketAffiliateTag("https://tickets.saintanselmhawks.com/event/abc123");
    expect(result).not.toContain("undefined");
  });

  it("adds the configured affiliate param/value when both env vars are set", () => {
    vi.stubEnv("TICKET_AFFILIATE_PARAM", "ref");
    vi.stubEnv("TICKET_AFFILIATE_VALUE", "gdne123");
    const result = withTicketAffiliateTag("https://tickets.saintanselmhawks.com/event/abc123");
    const parsed = new URL(result);
    expect(parsed.searchParams.get("ref")).toBe("gdne123");
  });

  it("preserves existing query params on the original url", () => {
    vi.stubEnv("TICKET_AFFILIATE_PARAM", "");
    vi.stubEnv("TICKET_AFFILIATE_VALUE", "");
    const result = withTicketAffiliateTag("https://example.com/event?seat=upper");
    const parsed = new URL(result);
    expect(parsed.searchParams.get("seat")).toBe("upper");
    expect(parsed.searchParams.get("utm_source")).toBe("gamedaynewengland");
  });

  it("returns the original string unchanged for a malformed url", () => {
    expect(withTicketAffiliateTag("not a url")).toBe("not a url");
  });
});
