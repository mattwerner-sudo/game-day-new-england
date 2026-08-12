import { WeekendEvent } from "@/db/queries";

export function formatGender(gender: string): string {
  if (gender === "mens") return "Men's";
  if (gender === "womens") return "Women's";
  return "Coed";
}

export function formatSport(sport: string): string {
  return sport
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/**
 * "Cole Field, Williamstown, MA" when we know the building; "Williamstown, MA" when we
 * only know the city (venueName falls back to the city itself in that case - see
 * parseLocation() - so skip it here rather than repeat "Williamstown, Williamstown, MA").
 */
export function formatLocation(event: WeekendEvent): string {
  const parts = [
    event.venueName && event.venueName !== event.venueCity ? event.venueName : null,
    event.venueCity,
    event.venueState,
  ].filter((p): p is string => Boolean(p));
  return parts.length > 0 ? parts.join(", ") : "Venue TBD";
}

/**
 * special_event rows (meets, invitationals, championships - CLAUDE.md Section 5/31) have no
 * single home/away side - eventName + the list of participating schools we know about (may
 * be a subset of everyone actually there, since it only accumulates as each participating
 * school's own feed gets ingested - see upsertSpecialEvent) stand in for the "X at Y" line a
 * regular game shows.
 */
export function formatParticipants(names: string[]): string {
  if (names.length === 0) return "Participating schools TBD";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** "Amherst College at Williams College" / a special_event's own name - the plain-text title
 * used for page titles, meta descriptions, and JSON-LD, where the styled two-line homepage
 * card layout doesn't apply. */
export function eventTitle(event: WeekendEvent): string {
  if (event.type === "special_event") return event.eventName ?? "Meet";
  return `${event.awaySchoolName ?? "TBD"} at ${event.homeSchoolName ?? "TBD"}`;
}
