import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import { course, hole, league, leagueEvent, player, playerHole, playerLeague } from "@/lib/db/schema";
import { withDbRetry } from "@/lib/db/resilient";

export const getPlayers = async () => db.query.player.findMany({ orderBy: asc(player.displayName) });

export const getCourses = async () => db.query.course.findMany({ orderBy: asc(course.name) });

export const getCoursesWithStats = unstable_cache(
  async () =>
    withDbRetry(() =>
      db
        .select({
          id: course.id,
          key: course.key,
          name: course.name,
          location: course.location,
          rating: course.rating,
          slope: course.slope,
          isActive: course.isActive,
          holeCount: sql<number>`count(${hole.id})`,
          totalPar: sql<number>`coalesce(sum(${hole.par}), 0)`,
          totalDistanceFeet: sql<number>`coalesce(sum(${hole.distanceFeet}), 0)`,
        })
        .from(course)
        .leftJoin(hole, eq(hole.courseId, course.id))
        .groupBy(course.id)
        .orderBy(asc(course.name))
    ),
  ["get-courses-with-stats"],
  { revalidate: 15 }
);

export const getCourseHoles = async (courseId: string) =>
  db.query.hole.findMany({ where: eq(hole.courseId, courseId), orderBy: asc(hole.holeNumber) });

export const getLeagues = async () => db.query.league.findMany({ orderBy: asc(league.name) });

export const getLeagueEvents = async (leagueId: string) =>
  db.query.leagueEvent.findMany({
    where: eq(leagueEvent.leagueId, leagueId),
    orderBy: asc(leagueEvent.eventDate),
  });

const getEventScoresCached = unstable_cache(
  async (eventId: string) =>
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          displayName: player.displayName,
          totalScore: sql<number>`coalesce(sum(${playerHole.score}), 0)`,
          totalDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
          holesPlayed: sql<number>`count(distinct ${playerHole.holeId})`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .where(eq(playerHole.leagueEventId, eventId))
        .groupBy(player.id, player.displayName)
        .orderBy(sql`coalesce(sum(${playerHole.score}), 0) asc`)
    ),
  ["event-scores"],
  { revalidate: 10 }
);

export const getEventScores = async (eventId: string) => getEventScoresCached(eventId);

const getEventHoleBreakdownCached = unstable_cache(
  async (eventId: string) =>
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          displayName: player.displayName,
          holeNumber: hole.holeNumber,
          par: hole.par,
          score: playerHole.score,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(hole, eq(hole.id, playerHole.holeId))
        .where(eq(playerHole.leagueEventId, eventId))
        .orderBy(asc(player.displayName), asc(hole.holeNumber))
    ),
  ["event-hole-breakdown"],
  { revalidate: 10 }
);

export const getEventHoleBreakdown = async (eventId: string) => getEventHoleBreakdownCached(eventId);

const getLeagueStandingsCached = unstable_cache(
  async (leagueId: string) =>
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          displayName: player.displayName,
          totalDiff: sql<number>`coalesce(sum(case when ${leagueEvent.id} is not null then ${playerHole.diff} else 0 end), 0)`,
          eventsPlayed: sql<number>`count(distinct case when ${leagueEvent.id} is not null then ${playerHole.leagueEventId} end)`,
          totalStrokes: sql<number>`coalesce(sum(case when ${leagueEvent.id} is not null then ${playerHole.score} else 0 end), 0)`,
        })
        .from(playerLeague)
        .innerJoin(player, eq(player.id, playerLeague.playerId))
        .leftJoin(playerHole, eq(playerHole.playerId, player.id))
        .leftJoin(
          leagueEvent,
          sql`${leagueEvent.id} = ${playerHole.leagueEventId} and ${leagueEvent.leagueId} = ${leagueId}::uuid`
        )
        .where(eq(playerLeague.leagueId, leagueId))
        .groupBy(player.id, player.displayName)
        .orderBy(
          sql`coalesce(sum(case when ${leagueEvent.id} is not null then ${playerHole.diff} else 0 end), 0) asc`
        )
    ),
  ["league-standings"],
  { revalidate: 10 }
);

export const getLeagueStandings = async (leagueId: string) => getLeagueStandingsCached(leagueId);

const getPublicLeagueEventCached = unstable_cache(
  async (eventId: string) =>
    withDbRetry(() =>
      db.query.leagueEvent.findFirst({
        where: eq(leagueEvent.id, eventId),
        with: { league: true, course: true },
      })
    ),
  ["public-league-event"],
  { revalidate: 10 }
);

export const getPublicLeagueEvent = async (eventId: string) => getPublicLeagueEventCached(eventId);

export const getPlayerById = async (id: string) =>
  db.query.player.findFirst({
    where: eq(player.id, id),
  });

export const getPlayerRecentEvents = async (playerId: string) =>
  db
    .select({
      leagueEventId: leagueEvent.id,
      eventName: leagueEvent.name,
      eventDate: leagueEvent.eventDate,
      courseName: course.name,
      totalScore: sql<number>`coalesce(sum(${playerHole.score}), 0)`,
      totalDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
      holesPlayed: sql<number>`count(distinct ${playerHole.holeId})`,
    })
    .from(playerHole)
    .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
    .innerJoin(course, eq(course.id, leagueEvent.courseId))
    .where(eq(playerHole.playerId, playerId))
    .groupBy(leagueEvent.id, leagueEvent.name, leagueEvent.eventDate, course.name)
    .orderBy(sql`${leagueEvent.eventDate} desc nulls last`, asc(leagueEvent.name));

export const getCourseById = async (courseId: string) =>
  withDbRetry(() =>
    db.query.course.findFirst({
      where: eq(course.id, courseId),
    })
  );

export const getLeagueById = async (id: string) =>
  db.query.league.findFirst({
    where: eq(league.id, id),
  });

const getHomeHighlightsCached = unstable_cache(
  async () => {
    const [lowestRound] = await withDbRetry(() =>
      db
        .select({
          playerName: player.displayName,
          value: sql<number>`coalesce(sum(${playerHole.score}), 0)`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .groupBy(player.id, player.displayName, playerHole.leagueEventId)
        .orderBy(sql`coalesce(sum(${playerHole.score}), 0) asc`)
        .limit(1)
    );

    const [mostBirdies] = await withDbRetry(() =>
      db
        .select({
          playerName: player.displayName,
          value: sql<number>`count(*)::int`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(hole, eq(hole.id, playerHole.holeId))
        .where(sql`${playerHole.score} < ${hole.par}`)
        .groupBy(player.id, player.displayName)
        .orderBy(sql`count(*) desc`)
        .limit(1)
    );

    const [mostAces] = await withDbRetry(() =>
      db
        .select({
          playerName: player.displayName,
          value: sql<number>`count(*)::int`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .where(eq(playerHole.score, 1))
        .groupBy(player.id, player.displayName)
        .orderBy(sql`count(*) desc`)
        .limit(1)
    );

    return {
      lowestRound: lowestRound ?? null,
      mostBirdies: mostBirdies ?? null,
      mostAces: mostAces ?? null,
    };
  },
  ["home-highlights"],
  { revalidate: 30 }
);

export const getHomeHighlights = async () => getHomeHighlightsCached();
