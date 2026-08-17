import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getEventById, EventDetail, WeekendEvent } from "@/db/queries";
import { formatGender, formatSport, formatLocation, formatParticipants, eventTitle } from "@/lib/format";
import { resolveEmbed, resolveTicketEmbed, resolveNecFrontRowEmbed } from "@/lib/embed";
import { withTicketAffiliateTag } from "@/lib/affiliate";
import { SchoolLogo } from "@/components/SchoolLogo";
import { logPageView } from "@/lib/analytics";
import { auth } from "@/auth/auth";
import {
  isFollowingTeam,
  isFollowingLeague,
  isFollowingSpecialVenue,
  isFollowingGame,
  FollowSubjectType,
} from "@/fans/queries";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

const followButtonClass = {
  following:
    "rounded-lg border border-orange-300 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-950",
  notFollowing:
    "rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900",
};

/**
 * Plain POST form, not a client component - this page is SSR-per-request already, so a full
 * reload after the toggle correctly reflects the new state. Keeps this codebase's stated
 * discipline of client JS contained to exactly SignUpForm.tsx/SignInForm.tsx intact.
 */
function FollowForm({
  type,
  id,
  isFollowing,
  label,
  redirectTo,
}: {
  type: FollowSubjectType;
  id: string;
  isFollowing: boolean;
  label: string;
  redirectTo: string;
}) {
  return (
    <form method="POST" action="/api/follow" className="inline-block">
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={isFollowing ? "unfollow" : "follow"} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <button type="submit" className={isFollowing ? followButtonClass.following : followButtonClass.notFollowing}>
        {isFollowing ? `Following ${label} ✓` : `Follow ${label}`}
      </button>
    </form>
  );
}

function description(event: WeekendEvent): string {
  const when = event.startDatetime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return `${formatGender(event.gender)} ${formatSport(event.sport)} - ${when} at ${formatLocation(event)}.`;
}

/**
 * Real per-event pages, server-rendered with real metadata - CLAUDE.md Section 6 has called
 * this a first-class requirement since Day 1 ("organic search is the likely primary
 * acquisition channel") but nothing crawlable/individually-linkable existed until now; the
 * whole product was one list page. JSON-LD uses schema.org's SportsEvent type specifically
 * (not a generic Event) since that's what search engines use to build rich results for games.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) return { title: "Event not found | Game Day New England" };

  const title = `${eventTitle(event)} - ${formatGender(event.gender)} ${formatSport(event.sport)} | Game Day New England`;
  const desc = description(event);
  const url = `${BASE_URL}/events/${event.id}`;

  return {
    title,
    description: desc,
    alternates: { canonical: url },
    openGraph: { title, description: desc, url, type: "website" },
    twitter: { card: "summary", title, description: desc },
  };
}

function jsonLd(event: WeekendEvent): object {
  const location = {
    "@type": "Place",
    name: event.venueName ?? "TBD",
    address: [event.venueCity, event.venueState].filter(Boolean).join(", ") || undefined,
  };

  const base: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: eventTitle(event),
    startDate: event.startDatetime.toISOString(),
    location,
    url: `${BASE_URL}/events/${event.id}`,
    eventStatus:
      event.status === "cancelled"
        ? "https://schema.org/EventCancelled"
        : event.status === "postponed"
          ? "https://schema.org/EventPostponed"
          : "https://schema.org/EventScheduled",
  };

  if (event.type !== "special_event") {
    base.homeTeam = { "@type": "SportsTeam", name: event.homeSchoolName ?? "TBD" };
    base.awayTeam = { "@type": "SportsTeam", name: event.awaySchoolName ?? "TBD" };
  } else if (event.participatingSchoolNames.length > 0) {
    base.competitor = event.participatingSchoolNames.map((name) => ({
      "@type": "SportsTeam",
      name,
    }));
  } else {
    // No seeded participating schools (e.g. a manually-entered neutral-site game between two
    // out-of-region schools, like Notre Dame vs. Navy at Gillette Stadium) - fall back to
    // splitting a real "X vs. Y" eventName rather than leaving competitor data out entirely.
    // Only fires on that specific pattern, so a genuine non-two-team meet name (e.g. "FPU Fall
    // Kickoff") correctly falls through with no competitor field instead of a bad guess.
    const vsMatch = (event.eventName ?? "").match(/^(.+?)\s+vs\.?\s+(.+)$/i);
    if (vsMatch) {
      base.competitor = [vsMatch[1], vsMatch[2]].map((name) => ({
        "@type": "SportsTeam",
        name: name.trim(),
      }));
    }
  }

  return base;
}

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();
  logPageView(`/events/${id}`);

  const embed = resolveEmbed(event.streamingVideoUrl) ?? (await resolveNecFrontRowEmbed(event.streamingVideoUrl));
  const ticketEmbed = resolveTicketEmbed(event.ticketUrl);

  // Session check - deliberately NOT redirecting when absent, this page must stay
  // public/crawlable for SEO (Section 6/39). Only the follow buttons below are gated.
  const session = await auth.api.getSession({ headers: await headers() });
  const redirectTo = `/events/${event.id}`;

  const leagues = [...new Set([event.homeLeague, event.awayLeague].filter((l): l is string => Boolean(l)))];

  let followButtons: React.ReactNode[] = [];
  if (session) {
    const userId = session.user.id;
    const [awayFollowing, homeFollowing, leagueFollowing, venueFollowing, gameFollowing] = await Promise.all([
      event.awayTeamId ? isFollowingTeam(userId, event.awayTeamId) : Promise.resolve(false),
      event.homeTeamId ? isFollowingTeam(userId, event.homeTeamId) : Promise.resolve(false),
      Promise.all(leagues.map((l) => isFollowingLeague(userId, l))),
      event.specialVenueName ? isFollowingSpecialVenue(userId, event.specialVenueName) : Promise.resolve(false),
      isFollowingGame(userId, event.id),
    ]);

    if (event.awayTeamId) {
      followButtons.push(
        <FollowForm key="away" type="team" id={event.awayTeamId} isFollowing={awayFollowing} label={event.awaySchoolName ?? "away team"} redirectTo={redirectTo} />
      );
    }
    if (event.homeTeamId) {
      followButtons.push(
        <FollowForm key="home" type="team" id={event.homeTeamId} isFollowing={homeFollowing} label={event.homeSchoolName ?? "home team"} redirectTo={redirectTo} />
      );
    }
    leagues.forEach((league, i) => {
      followButtons.push(
        <FollowForm key={`league-${league}`} type="league" id={league} isFollowing={leagueFollowing[i]} label={league} redirectTo={redirectTo} />
      );
    });
    if (event.specialVenueName) {
      followButtons.push(
        <FollowForm key="venue" type="venue" id={event.specialVenueName} isFollowing={venueFollowing} label={event.specialVenueName} redirectTo={redirectTo} />
      );
    }
    followButtons.push(
      <FollowForm key="game" type="game" id={event.id} isFollowing={gameFollowing} label="this game" redirectTo={redirectTo} />
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(event)) }}
      />
      <main className="mx-auto max-w-xl px-4 py-10">
        <Link
          href="/"
          className="text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          ← 🏆 Game Day New England
        </Link>

        <div className="mt-4 flex items-center justify-between gap-3">
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
          {event.status !== "scheduled" && (
            <span className="text-xs font-medium uppercase text-zinc-500 dark:text-zinc-400">
              {event.status}
            </span>
          )}
        </div>

        {event.type === "special_event" ? (
          <>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {event.eventName ?? "Meet"}
            </h1>
            {event.participatingSchoolNames.length > 0 && (
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                {formatParticipants(event.participatingSchoolNames)}
              </p>
            )}
          </>
        ) : (
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            <SchoolLogo
              src={event.awaySchoolLogoUrl}
              alt=""
              className="mr-1.5 inline-block h-7 w-7 align-text-bottom object-contain"
            />
            {event.awaySchoolName ?? "TBD"}{" "}
            <span className="text-zinc-400">at</span>{" "}
            <SchoolLogo
              src={event.homeSchoolLogoUrl}
              alt=""
              className="mr-1.5 inline-block h-7 w-7 align-text-bottom object-contain"
            />
            {event.homeSchoolName ?? "TBD"}
          </h1>
        )}

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          {event.startDatetime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}{" "}
          ·{" "}
          {event.startDatetime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {formatLocation(event)}
          {event.division ? ` · ${event.division}` : ""}
        </p>
        <a
          href={`/api/events/${event.id}/ics`}
          className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline dark:text-orange-400"
        >
          📅 Add to Calendar
        </a>

        {session ? (
          followButtons.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">{followButtons}</div>
          )
        ) : (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            <Link href="/sign-in" className="text-orange-600 hover:underline dark:text-orange-400">
              Sign in
            </Link>{" "}
            to follow this game, team, league, or venue.
          </p>
        )}

        {embed && (
          <div className="mt-6">
            <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Watch on {event.tvNetwork ?? embed.label}
            </p>
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-black">
              <iframe
                src={embed.url}
                className="h-full w-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
        )}

        {ticketEmbed && (
          <div className="mt-6">
            <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Buy tickets
            </p>
            <div className="h-[600px] w-full overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <iframe src={ticketEmbed.url} className="h-full w-full border-0" loading="lazy" />
            </div>
          </div>
        )}

        {(event.ticketUrl || event.sourceUrl || event.streamingVideoUrl || event.streamingAudioUrl) && (
          <div className="mt-6 flex flex-wrap gap-2">
            {event.ticketUrl && !ticketEmbed && (
              <a
                href={withTicketAffiliateTag(event.ticketUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700"
              >
                Buy Tickets
              </a>
            )}
            {event.streamingVideoUrl && !embed && (
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
      </main>
    </div>
  );
}
