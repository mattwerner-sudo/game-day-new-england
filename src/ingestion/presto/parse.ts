import ical, { VEvent } from "node-ical";

export interface RawPrestoGame {
  uid: string;
  summary: string;
  start: Date;
  end: Date | null;
  location: string | null;
  description: string | null;
  url: string | null; // relative, e.g. "/sports/fball/2025-26/boxscores/....xml"
  category: string | null; // e.g. "Men's Basketball" - sport+gender in one field, unlike SIDEARM
}

function isVEvent(entry: unknown): entry is VEvent {
  return !!entry && typeof entry === "object" && (entry as { type?: string }).type === "VEVENT";
}

/**
 * Same VEVENT-parsing shape as sidearm/parse.ts, plus `category` (Presto puts sport+gender
 * in a single CATEGORIES field per event, since one feed covers every sport - there's no
 * separate per-sport metadata fetch the way SIDEARM has). Confirmed node-ical correctly
 * computes `.end` from Presto's DURATION field (it never uses DTEND) - verified directly
 * against a real feed before relying on it.
 */
export function parsePrestoIcsEvents(icsText: string): RawPrestoGame[] {
  const parsed = ical.sync.parseICS(icsText);
  const games: RawPrestoGame[] = [];

  for (const entry of Object.values(parsed)) {
    if (!isVEvent(entry)) continue;
    if (!entry.start || !entry.summary) continue;

    games.push({
      uid: entry.uid,
      summary: String(entry.summary),
      start: new Date(entry.start as unknown as string | number | Date),
      end: entry.end ? new Date(entry.end as unknown as string | number | Date) : null,
      location: entry.location ? String(entry.location) : null,
      description: entry.description ? String(entry.description) : null,
      url: entry.url ? String(entry.url) : null,
      category: Array.isArray((entry as unknown as { categories?: string[] }).categories)
        ? (entry as unknown as { categories: string[] }).categories[0] ?? null
        : null,
    });
  }

  return games;
}
