import "server-only";
import { and, asc, eq, ilike, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import { course, hole, league, leagueEvent, player, playerHole, playerLeague } from "@/lib/db/schema";
import { withDbRetry } from "@/lib/db/resilient";

export const PLAYERS_PAGE_SIZE = 15;

export const getPlayers = async () => db.query.player.findMany({ orderBy: asc(player.displayName) });

export type PlayersPageResult = {
  players: Awaited<ReturnType<typeof getPlayers>>;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const getPlayersPaginated = async (options: {
  page?: number;
  q?: string;
}): Promise<PlayersPageResult> => {
  const page = Math.max(1, options.page ?? 1);
  const q = options.q?.trim() ?? "";
  const searchFilter = q
    ? or(
        ilike(player.displayName, `%${q}%`),
        ilike(player.firstName, `%${q}%`),
        ilike(player.lastName, `%${q}%`),
        ilike(player.email, `%${q}%`)
      )
    : undefined;

  const countRow = await db.select({ count: sql<number>`count(*)::int` }).from(player).where(searchFilter);
  const totalCount = Number(countRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PLAYERS_PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const players = await db.query.player.findMany({
    where: searchFilter,
    orderBy: asc(player.displayName),
    limit: PLAYERS_PAGE_SIZE,
    offset: (safePage - 1) * PLAYERS_PAGE_SIZE,
  });

  return {
    players,
    totalCount,
    page: safePage,
    pageSize: PLAYERS_PAGE_SIZE,
    totalPages,
  };
};

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

export type HomeHighlightPlayer = {
  playerId: string;
  playerName: string;
};

export type HomeBestRoundHighlight = {
  roundDiff: number;
  players: (HomeHighlightPlayer & {
    leagueEventId: string;
    eventName: string;
  })[];
  eventLinks: { leagueEventId: string; eventName: string }[];
};

export type HomeCountHighlight = {
  value: number;
  players: HomeHighlightPlayer[];
};

export type HomeHighlights = {
  bestRound: HomeBestRoundHighlight | null;
  mostBirdies: HomeCountHighlight | null;
  mostAces: HomeCountHighlight | null;
};

const tiesAtExtreme = <T extends { value: number }>(rows: T[], mode: "min" | "max") => {
  if (rows.length === 0) return [];
  const target = mode === "min" ? Math.min(...rows.map((r) => Number(r.value))) : Math.max(...rows.map((r) => Number(r.value)));
  return rows.filter((r) => Number(r.value) === target);
};

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export type LeagueEventListItem = {
  id: string;
  name: string;
  eventDate: string | null;
  courseName: string;
};

export type PastEventPreview = LeagueEventListItem & {
  holeNumbers: number[];
  topThree: {
    playerId: string;
    displayName: string;
    totalScore: number;
    totalDiff: number;
    holeScores: { holeNumber: number; score: number }[];
  }[];
};

export const getLeagueEventsGrouped = async (leagueId: string) => {
  const events = await db
    .select({
      id: leagueEvent.id,
      name: leagueEvent.name,
      eventDate: leagueEvent.eventDate,
      courseName: course.name,
    })
    .from(leagueEvent)
    .innerJoin(course, eq(course.id, leagueEvent.courseId))
    .where(eq(leagueEvent.leagueId, leagueId))
    .orderBy(asc(leagueEvent.eventDate), asc(leagueEvent.name));

  const today = todayIsoDate();
  const future: LeagueEventListItem[] = [];
  const past: LeagueEventListItem[] = [];

  for (const event of events) {
    const item = {
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      courseName: event.courseName,
    };
    if (!event.eventDate || event.eventDate >= today) {
      future.push(item);
    } else {
      past.push(item);
    }
  }

  past.reverse();
  return { future, past };
};

const buildPastEventPreview = async (event: LeagueEventListItem): Promise<PastEventPreview> => {
  const [scores, breakdown] = await Promise.all([getEventScores(event.id), getEventHoleBreakdown(event.id)]);
  const topThree = scores.slice(0, 3);
  const topPlayerIds = new Set(topThree.map((row) => row.playerId));
  const holeNumbers = Array.from(new Set(breakdown.map((row) => row.holeNumber))).sort((a, b) => a - b);

  return {
    ...event,
    holeNumbers,
    topThree: topThree.map((row) => ({
      playerId: row.playerId,
      displayName: row.displayName,
      totalScore: Number(row.totalScore),
      totalDiff: Number(row.totalDiff),
      holeScores: breakdown
        .filter((entry) => entry.playerId === row.playerId && topPlayerIds.has(entry.playerId))
        .map((entry) => ({ holeNumber: entry.holeNumber, score: entry.score })),
    })),
  };
};

export const getPastEventPreviews = async (pastEvents: LeagueEventListItem[]) =>
  Promise.all(pastEvents.map((event) => buildPastEventPreview(event)));

const getHomeHighlightsForLeague = async (leagueId: string): Promise<HomeHighlights> => {
  const leagueFilter = eq(leagueEvent.leagueId, leagueId);

  const [roundRows, birdieRows, aceRows] = await Promise.all([
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          leagueEventId: playerHole.leagueEventId,
          eventName: leagueEvent.name,
          value: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .where(leagueFilter)
        .groupBy(player.id, player.displayName, playerHole.leagueEventId, leagueEvent.name)
    ),
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          value: sql<number>`count(*)::int`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(hole, eq(hole.id, playerHole.holeId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .where(and(leagueFilter, sql`${playerHole.score} < ${hole.par}`))
        .groupBy(player.id, player.displayName)
    ),
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          value: sql<number>`count(*)::int`,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .where(and(leagueFilter, eq(playerHole.score, 1)))
        .groupBy(player.id, player.displayName)
    ),
  ]);

    const bestRoundRows = tiesAtExtreme(roundRows, "min");
    const bestRoundEventLinks = Array.from(
      new Map(
        bestRoundRows.map((row) => [row.leagueEventId, { leagueEventId: row.leagueEventId, eventName: row.eventName }])
      ).values()
    );

    const birdieLeaders = tiesAtExtreme(birdieRows, "max");
    const aceLeaders = tiesAtExtreme(aceRows, "max");

    return {
      bestRound:
        bestRoundRows.length > 0
          ? {
              roundDiff: Number(bestRoundRows[0].value),
              players: bestRoundRows.map((row) => ({
                playerId: row.playerId,
                playerName: row.playerName,
                leagueEventId: row.leagueEventId,
                eventName: row.eventName,
              })),
              eventLinks: bestRoundEventLinks,
            }
          : null,
      mostBirdies:
        birdieLeaders.length > 0
          ? {
              value: Number(birdieLeaders[0].value),
              players: birdieLeaders.map((row) => ({
                playerId: row.playerId,
                playerName: row.playerName,
              })),
            }
          : null,
      mostAces:
        aceLeaders.length > 0
          ? {
              value: Number(aceLeaders[0].value),
              players: aceLeaders.map((row) => ({
                playerId: row.playerId,
                playerName: row.playerName,
              })),
            }
          : null,
    };
};

export const getHomeHighlights = async (leagueId: string) =>
  unstable_cache(() => getHomeHighlightsForLeague(leagueId), ["home-highlights-v3", leagueId], {
    revalidate: 30,
  })();

export type PlayerStats = {
  bestHole: { holeNumber: number; avgDiff: number } | null;
  bestRound: {
    leagueEventId: string;
    eventName: string;
    roundDiff: number;
  } | null;
  birdieCount: number;
  aceCount: number;
};

export const getPlayerStats = async (playerId: string): Promise<PlayerStats> => {
  const [bestHoleRows, roundRows, birdieResult, aceResult] = await Promise.all([
    db
      .select({
        holeNumber: hole.holeNumber,
        avgDiff: sql<number>`avg(${playerHole.diff})`,
      })
      .from(playerHole)
      .innerJoin(hole, eq(hole.id, playerHole.holeId))
      .where(eq(playerHole.playerId, playerId))
      .groupBy(hole.holeNumber)
      .orderBy(sql`avg(${playerHole.diff}) asc`, asc(hole.holeNumber))
      .limit(1),
    db
      .select({
        leagueEventId: leagueEvent.id,
        eventName: leagueEvent.name,
        eventDate: leagueEvent.eventDate,
        roundDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
      })
      .from(playerHole)
      .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
      .where(eq(playerHole.playerId, playerId))
      .groupBy(leagueEvent.id, leagueEvent.name, leagueEvent.eventDate),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerHole)
      .innerJoin(hole, eq(hole.id, playerHole.holeId))
      .where(and(eq(playerHole.playerId, playerId), sql`${playerHole.score} < ${hole.par}`)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(playerHole)
      .where(and(eq(playerHole.playerId, playerId), eq(playerHole.score, 1))),
  ]);

  const bestRound =
    roundRows.length > 0
      ? roundRows.reduce((best, row) => {
          const rowDiff = Number(row.roundDiff);
          const bestDiff = Number(best.roundDiff);
          if (rowDiff < bestDiff) return row;
          if (rowDiff > bestDiff) return best;
          const rowDate = row.eventDate ?? "";
          const bestDate = best.eventDate ?? "";
          return rowDate > bestDate ? row : best;
        })
      : null;

  return {
    bestHole: bestHoleRows[0]
      ? {
          holeNumber: bestHoleRows[0].holeNumber,
          avgDiff: Number(bestHoleRows[0].avgDiff),
        }
      : null,
    bestRound: bestRound
      ? {
          leagueEventId: bestRound.leagueEventId,
          eventName: bestRound.eventName,
          roundDiff: Number(bestRound.roundDiff),
        }
      : null,
    birdieCount: Number(birdieResult[0]?.count ?? 0),
    aceCount: Number(aceResult[0]?.count ?? 0),
  };
};
