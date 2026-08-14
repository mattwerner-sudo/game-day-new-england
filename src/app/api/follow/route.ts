import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/auth/auth";
import {
  addFollows,
  unfollowSchool,
  addTeamFollows,
  unfollowTeam,
  addLeagueFollows,
  unfollowLeague,
  addSpecialVenueFollows,
  unfollowSpecialVenue,
  addGameFollows,
  unfollowGame,
  logFollowConsentEvent,
  FollowSubjectType,
} from "@/fans/queries";

/**
 * One route, a `type` discriminator field - matches the existing precedent
 * (api/unsubscribe/route.ts's `scope` field), simpler to extend than a per-type route tree.
 * Both /manage's remove forms and /events/[id]'s quick-follow forms post here.
 */
export async function POST(request: Request): Promise<Response> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.redirect(new URL("/sign-in", request.url), 303);

  const formData = await request.formData();
  const type = String(formData.get("type")) as FollowSubjectType;
  // uuid for school/team/game, canonical name string for league/venue.
  const id = String(formData.get("id"));
  const action = String(formData.get("action")); // "follow" | "unfollow"
  const redirectToRaw = String(formData.get("redirectTo") ?? "/manage");
  // Open-redirect guard - redirectTo is user-controlled form data.
  const redirectTo = redirectToRaw.startsWith("/") && !redirectToRaw.startsWith("//") ? redirectToRaw : "/manage";

  const handlers: Record<FollowSubjectType, { follow: () => Promise<void>; unfollow: () => Promise<void> }> = {
    school: { follow: () => addFollows(session.user.id, [id]), unfollow: () => unfollowSchool(session.user.id, id) },
    team: { follow: () => addTeamFollows(session.user.id, [id]), unfollow: () => unfollowTeam(session.user.id, id) },
    league: { follow: () => addLeagueFollows(session.user.id, [id]), unfollow: () => unfollowLeague(session.user.id, id) },
    venue: {
      follow: () => addSpecialVenueFollows(session.user.id, [id]),
      unfollow: () => unfollowSpecialVenue(session.user.id, id),
    },
    game: { follow: () => addGameFollows(session.user.id, [id]), unfollow: () => unfollowGame(session.user.id, id) },
  };
  if (!handlers[type]) return NextResponse.redirect(new URL(redirectTo, request.url), 303);

  await (action === "unfollow" ? handlers[type].unfollow() : handlers[type].follow());
  await logFollowConsentEvent(
    session.user.id,
    `${action === "unfollow" ? "unfollowed" : "followed"}_${type}` as const,
    type,
    [id]
  );

  return NextResponse.redirect(new URL(redirectTo, request.url), 303);
}
