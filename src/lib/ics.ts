/**
 * Minimal RFC 5545 ICS generation - no library, this app only needs VEVENT/VCALENDAR with a
 * handful of fields, not the full spec. \r\n line endings and text-escaping are the two real
 * correctness requirements calendar clients actually enforce; everything else here is optional.
 */

export function toICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function escapeICSText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export interface ICSEventInput {
  uid: string;
  start: Date;
  end?: Date | null;
  summary: string;
  location?: string | null;
  description?: string | null;
  url?: string | null;
}

/** Defaults to a 2-hour block when no real end time is known - matches this app's own EventDetail fallback elsewhere. */
export function buildICSEvent(e: ICSEventInput): string {
  const end = e.end ?? new Date(e.start.getTime() + 2 * 60 * 60 * 1000);
  const lines = [
    "BEGIN:VEVENT",
    `UID:${e.uid}@gamedaynewengland.com`,
    `DTSTAMP:${toICSDate(new Date())}`,
    `DTSTART:${toICSDate(e.start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${escapeICSText(e.summary)}`,
    e.location ? `LOCATION:${escapeICSText(e.location)}` : null,
    e.description ? `DESCRIPTION:${escapeICSText(e.description)}` : null,
    e.url ? `URL:${e.url}` : null,
    "END:VEVENT",
  ].filter((l): l is string => l !== null);
  return lines.join("\r\n");
}

export function buildICSCalendar(events: string[], calendarName: string): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Game Day New England//Schedule//EN",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeICSText(calendarName)}`,
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}
