import { describe, expect, it } from "vitest";
import { toICSDate, escapeICSText, buildICSEvent, buildICSCalendar } from "./ics";

describe("toICSDate", () => {
  it("formats a UTC date as YYYYMMDDTHHMMSSZ", () => {
    expect(toICSDate(new Date("2026-09-12T16:00:00.000Z"))).toBe("20260912T160000Z");
  });
});

describe("escapeICSText", () => {
  it("escapes commas, semicolons, and newlines", () => {
    expect(escapeICSText("Home, Away; Overtime\nDouble header")).toBe(
      "Home\\, Away\\; Overtime\\nDouble header"
    );
  });

  it("escapes a literal backslash before other escaping", () => {
    expect(escapeICSText("a\\b")).toBe("a\\\\b");
  });
});

describe("buildICSEvent", () => {
  it("produces a VEVENT block with a default 2-hour end time", () => {
    const ics = buildICSEvent({
      uid: "abc123",
      start: new Date("2026-09-12T16:00:00.000Z"),
      summary: "Bentley at Saint Anselm",
      location: "Grappone Stadium, Manchester, NH",
    });
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("UID:abc123@gamedaynewengland.com");
    expect(ics).toContain("DTSTART:20260912T160000Z");
    expect(ics).toContain("DTEND:20260912T180000Z");
    expect(ics).toContain("SUMMARY:Bentley at Saint Anselm");
    expect(ics).toContain("LOCATION:Grappone Stadium\\, Manchester\\, NH");
    expect(ics).toContain("END:VEVENT");
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n"); // every newline is part of \r\n, none bare
  });

  it("uses a real end time when given one", () => {
    const ics = buildICSEvent({
      uid: "x",
      start: new Date("2026-09-12T16:00:00.000Z"),
      end: new Date("2026-09-12T19:30:00.000Z"),
      summary: "Doubleheader",
    });
    expect(ics).toContain("DTEND:20260912T193000Z");
  });

  it("omits optional fields that are null rather than emitting empty lines", () => {
    const ics = buildICSEvent({
      uid: "x",
      start: new Date("2026-09-12T16:00:00.000Z"),
      summary: "Game",
      location: null,
      description: null,
      url: null,
    });
    expect(ics).not.toContain("LOCATION:");
    expect(ics).not.toContain("DESCRIPTION:");
    expect(ics).not.toContain("URL:");
  });
});

describe("buildICSCalendar", () => {
  it("wraps events in a VCALENDAR with the given name", () => {
    const cal = buildICSCalendar(["BEGIN:VEVENT\r\nEND:VEVENT"], "Saint Anselm College");
    expect(cal).toContain("BEGIN:VCALENDAR");
    expect(cal).toContain("VERSION:2.0");
    expect(cal).toContain("X-WR-CALNAME:Saint Anselm College");
    expect(cal).toContain("BEGIN:VEVENT");
    expect(cal).toContain("END:VCALENDAR");
  });

  it("escapes the calendar name", () => {
    const cal = buildICSCalendar([], "Team, A; Team B");
    expect(cal).toContain("X-WR-CALNAME:Team\\, A\\; Team B");
  });
});
