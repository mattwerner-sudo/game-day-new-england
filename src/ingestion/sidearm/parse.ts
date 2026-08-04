import ical, { VEvent } from "node-ical";

export interface RawIcsGame {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  location: string | null;
}

function isVEvent(entry: unknown): entry is VEvent {
  return !!entry && typeof entry === "object" && (entry as { type?: string }).type === "VEVENT";
}

/** Parse raw iCalendar text into the VEVENT entries, skipping timezone/other components. */
export function parseIcsEvents(icsText: string): RawIcsGame[] {
  const parsed = ical.sync.parseICS(icsText);
  const games: RawIcsGame[] = [];

  for (const entry of Object.values(parsed)) {
    if (!isVEvent(entry)) continue;
    if (!entry.start || !entry.summary) continue;

    games.push({
      uid: entry.uid,
      summary: String(entry.summary),
      start: new Date(entry.start as unknown as string | number | Date),
      end: entry.end ? new Date(entry.end as unknown as string | number | Date) : null,
      location: entry.location ? String(entry.location) : null,
    });
  }

  return games;
}
