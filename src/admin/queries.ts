import { sql, gte, count, desc } from "drizzle-orm";
import { db } from "@/db/client";
import {
  users,
  schools,
  events,
  fanFollows,
  teamFollows,
  leagueFollows,
  specialVenueFollows,
  gameFollows,
  consentEvents,
  fanAlertLog,
  pageViews,
} from "@/db/schema";

/**
 * Almost everything here reuses data this app already collects for real product reasons (the
 * follow tables, consent log, alert log) - the only genuinely new tracking is pageViews
 * (Section 60), and even that's anonymous/aggregate-only, no user/session identifier, to stay
 * consistent with this app's own "no tracking cookies" privacy claim.
 */
export interface AdminStats {
  totalUsers: number;
  newUsersLast7Days: number;
  newUsersLast30Days: number;
  totalSchools: number;
  totalEvents: number;
  followCounts: { school: number; team: number; league: number; venue: number; game: number };
  mostFollowedSchools: { name: string; count: number }[];
  mostFollowedLeagues: { league: string; count: number }[];
  digestsSentByChannel: { channel: string; count: number }[];
  consentActionCounts: { action: string; count: number }[];
  pageViewsLast7Days: number;
  topPathsLast7Days: { path: string; count: number }[];
}

export async function getAdminStats(): Promise<AdminStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    [{ count: totalUsers }],
    [{ count: newUsersLast7Days }],
    [{ count: newUsersLast30Days }],
    [{ count: totalSchools }],
    [{ count: totalEvents }],
    [{ count: schoolFollowCount }],
    [{ count: teamFollowCount }],
    [{ count: leagueFollowCount }],
    [{ count: venueFollowCount }],
    [{ count: gameFollowCount }],
    mostFollowedSchools,
    mostFollowedLeagues,
    digestsSentByChannel,
    consentActionCounts,
    [{ count: pageViewsLast7Days }],
    topPathsLast7Days,
  ] = await Promise.all([
    db.select({ count: count() }).from(users),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, sevenDaysAgo)),
    db.select({ count: count() }).from(users).where(gte(users.createdAt, thirtyDaysAgo)),
    db.select({ count: count() }).from(schools),
    db.select({ count: count() }).from(events),
    db.select({ count: count() }).from(fanFollows),
    db.select({ count: count() }).from(teamFollows),
    db.select({ count: count() }).from(leagueFollows),
    db.select({ count: count() }).from(specialVenueFollows),
    db.select({ count: count() }).from(gameFollows),
    db
      .select({ name: schools.name, count: count() })
      .from(fanFollows)
      .innerJoin(schools, sql`${schools.id} = ${fanFollows.schoolId}`)
      .groupBy(schools.name)
      .orderBy(desc(count()))
      .limit(10),
    db
      .select({ league: leagueFollows.league, count: count() })
      .from(leagueFollows)
      .groupBy(leagueFollows.league)
      .orderBy(desc(count()))
      .limit(10),
    db.select({ channel: fanAlertLog.channel, count: count() }).from(fanAlertLog).groupBy(fanAlertLog.channel),
    db
      .select({ action: consentEvents.action, count: count() })
      .from(consentEvents)
      .groupBy(consentEvents.action)
      .orderBy(desc(count())),
    db.select({ count: count() }).from(pageViews).where(gte(pageViews.createdAt, sevenDaysAgo)),
    db
      .select({ path: pageViews.path, count: count() })
      .from(pageViews)
      .where(gte(pageViews.createdAt, sevenDaysAgo))
      .groupBy(pageViews.path)
      .orderBy(desc(count()))
      .limit(15),
  ]);

  return {
    totalUsers,
    newUsersLast7Days,
    newUsersLast30Days,
    totalSchools,
    totalEvents,
    followCounts: {
      school: schoolFollowCount,
      team: teamFollowCount,
      league: leagueFollowCount,
      venue: venueFollowCount,
      game: gameFollowCount,
    },
    mostFollowedSchools,
    mostFollowedLeagues,
    digestsSentByChannel,
    consentActionCounts,
    pageViewsLast7Days,
    topPathsLast7Days,
  };
}
