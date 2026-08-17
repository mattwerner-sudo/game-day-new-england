import { describe, expect, it } from "vitest";
import { getRangeWindow, isDateRange, parseDateParam, toDateParam } from "./dateRange";

describe("isDateRange", () => {
  it("accepts the five known ranges", () => {
    expect(isDateRange("today")).toBe(true);
    expect(isDateRange("weekend")).toBe(true);
    expect(isDateRange("week")).toBe(true);
    expect(isDateRange("month")).toBe(true);
    expect(isDateRange("season")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isDateRange("year")).toBe(false);
    expect(isDateRange("")).toBe(false);
  });
});

describe("getRangeWindow", () => {
  it("spans exactly one day for 'today'", () => {
    const now = new Date(2026, 7, 13, 15, 30); // Thu Aug 13 2026, 3:30pm local
    const { start, end } = getRangeWindow("today", now);
    expect(start).toEqual(new Date(2026, 7, 13, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 7, 14, 0, 0, 0, 0));
  });

  it("spans exactly seven days for 'week'", () => {
    const now = new Date(2026, 7, 13, 15, 30);
    const { start, end } = getRangeWindow("week", now);
    expect(start).toEqual(new Date(2026, 7, 13, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2026, 7, 20, 0, 0, 0, 0));
  });

  it("spans the full calendar month for 'month'", () => {
    const now = new Date(2026, 9, 15); // Oct 15 2026
    const { start, end } = getRangeWindow("month", now);
    expect(start).toEqual(new Date(2026, 9, 1));
    expect(end).toEqual(new Date(2026, 10, 1));
  });

  it("spans 150 days from today for 'season'", () => {
    const now = new Date(2026, 7, 13, 15, 30);
    const { start, end } = getRangeWindow("season", now);
    expect(start).toEqual(new Date(2026, 7, 13, 0, 0, 0, 0));
    expect(end).toEqual(new Date(2027, 0, 10, 0, 0, 0, 0));
  });

  describe("'weekend' - Friday 00:00 through Monday 00:00, for every day of the week", () => {
    it("rolls forward to the upcoming Friday from a Monday", () => {
      const monday = new Date(2026, 7, 10); // Mon Aug 10 2026
      const { start, end } = getRangeWindow("weekend", monday);
      expect(start).toEqual(new Date(2026, 7, 14)); // Fri Aug 14
      expect(end).toEqual(new Date(2026, 7, 17)); // Mon Aug 17
    });

    it("stays on the current Friday when now is already Friday", () => {
      const friday = new Date(2026, 7, 14, 9, 0);
      const { start, end } = getRangeWindow("weekend", friday);
      expect(start).toEqual(new Date(2026, 7, 14));
      expect(end).toEqual(new Date(2026, 7, 17));
    });

    it("rolls back to this weekend's Friday when now is Saturday", () => {
      const saturday = new Date(2026, 7, 15, 9, 0);
      const { start, end } = getRangeWindow("weekend", saturday);
      expect(start).toEqual(new Date(2026, 7, 14));
      expect(end).toEqual(new Date(2026, 7, 17));
    });

    it("rolls back to this weekend's Friday when now is Sunday", () => {
      const sunday = new Date(2026, 7, 16, 9, 0);
      const { start, end } = getRangeWindow("weekend", sunday);
      expect(start).toEqual(new Date(2026, 7, 14));
      expect(end).toEqual(new Date(2026, 7, 17));
    });
  });
});

describe("parseDateParam", () => {
  it("parses a valid YYYY-MM-DD string", () => {
    expect(parseDateParam("2026-10-01")).toEqual(new Date(2026, 9, 1));
  });

  it("returns undefined for missing or malformed input", () => {
    expect(parseDateParam(undefined)).toBeUndefined();
    expect(parseDateParam("")).toBeUndefined();
    expect(parseDateParam("10/01/2026")).toBeUndefined();
    expect(parseDateParam("not-a-date")).toBeUndefined();
  });
});

describe("toDateParam", () => {
  it("formats a Date as YYYY-MM-DD", () => {
    expect(toDateParam(new Date(2026, 9, 1))).toBe("2026-10-01");
  });

  it("pads single-digit months and days", () => {
    expect(toDateParam(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips with parseDateParam", () => {
    const original = "2026-03-07";
    expect(toDateParam(parseDateParam(original)!)).toBe(original);
  });
});
