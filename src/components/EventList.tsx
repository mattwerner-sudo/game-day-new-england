import Link from "next/link";
import { WeekendEvent } from "@/db/queries";
import { formatGender, formatSport, formatDay, formatTime, formatLocation, formatParticipants } from "@/lib/format";
import { withTicketAffiliateTag } from "@/lib/affiliate";
import { SchoolLogo } from "@/components/SchoolLogo";

/**
 * Extracted from the homepage (Section 55) once a third caller (the new /schools/[slug] and
 * /leagues/[slug] SEO pages) needed the identical day-grouped event list rendering - matches
 * this project's own precedent for when duplication crosses into worth extracting
 * (SchoolLogo.tsx's comment on the same judgment call).
 */
function groupByDay(events: WeekendEvent[]): Map<string, WeekendEvent[]> {
  const groups = new Map<string, WeekendEvent[]>();
  for (const event of events) {
    const key = formatDay(event.startDatetime);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return groups;
}

export function EventList({ events, emptyMessage }: { events: WeekendEvent[]; emptyMessage: string }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-zinc-600 dark:text-zinc-400">{emptyMessage}</p>
      </div>
    );
  }

  const grouped = groupByDay(events);

  return (
    <div className="space-y-8">
      {[...grouped.entries()].map(([day, dayEvents]) => (
        <section key={day}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {day}
          </h2>
          <ul className="space-y-2">
            {dayEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                      {formatGender(event.gender)} {formatSport(event.sport)}
                    </span>
                    {event.isExhibition && (
                      <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                        Exhibition
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">{formatTime(event.startDatetime)}</span>
                </div>
                <Link href={`/events/${event.id}`} className="block hover:opacity-80">
                  {event.type === "special_event" ? (
                    <>
                      <p className="mt-2 text-base font-medium text-zinc-950 dark:text-zinc-50">
                        {event.eventName ?? "Meet"}
                      </p>
                      {event.participatingSchoolNames.length > 0 && (
                        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {formatParticipants(event.participatingSchoolNames)}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-base font-medium text-zinc-950 dark:text-zinc-50">
                      <SchoolLogo
                        src={event.awaySchoolLogoUrl}
                        alt=""
                        className="mr-1 inline-block h-5 w-5 align-text-bottom object-contain"
                      />
                      {event.awaySchoolName ?? "TBD"}{" "}
                      <span className="text-zinc-400">at</span>{" "}
                      <SchoolLogo
                        src={event.homeSchoolLogoUrl}
                        alt=""
                        className="mr-1 inline-block h-5 w-5 align-text-bottom object-contain"
                      />
                      {event.homeSchoolName ?? "TBD"}
                    </p>
                  )}
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {formatLocation(event)}
                    {event.division ? ` · ${event.division}` : ""}
                  </p>
                </Link>
                {(event.ticketUrl || event.sourceUrl || event.streamingVideoUrl || event.streamingAudioUrl) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {event.ticketUrl && (
                      <a
                        href={withTicketAffiliateTag(event.ticketUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
                      >
                        Buy Tickets
                      </a>
                    )}
                    {event.streamingVideoUrl && (
                      <a
                        href={event.streamingVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700"
                      >
                        Watch{event.tvNetwork ? ` on ${event.tvNetwork}` : ""}
                      </a>
                    )}
                    {event.streamingAudioUrl && (
                      <a
                        href={event.streamingAudioUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-indigo-300 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950"
                      >
                        Listen{event.radioNetwork ? ` on ${event.radioNetwork}` : ""}
                      </a>
                    )}
                    {event.sourceUrl && (
                      <a
                        href={event.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                      >
                        Game Info
                      </a>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
