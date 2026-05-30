import "server-only";
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/lib/db/client";
import {
  course,
  hole,
  league,
  leagueEvent,
  miniGameWin,
  player,
  playerHole,
  playerLeague,
  playerRatingSnapshot,
} from "@/lib/db/schema";
import { withDbRetry } from "@/lib/db/resilient";
import { buildMiniGameWinsByCell } from "@/lib/mini-games";
import { compareEventScores, isRoundComplete, withRoundCompletion } from "@/lib/round-completion";
import { PLAYER_RATINGS_ENABLED } from "@/lib/ratings/enabled";

export const PLAYERS_PAGE_SIZE = 15;
export const HOME_EVENTS_PAGE_SIZE = 5;
export const PLAYER_RECENT_EVENTS_PAGE_SIZE = 15;
export const LEAGUE_EVENTS_PAGE_SIZE = 10;
export const LEAGUE_PLAYERS_PAGE_SIZE = 10;

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

export const getLeagues = unstable_cache(
  async () =>
    withDbRetry(() =>
      db
        .select()
        .from(league)
        .orderBy(sql`${league.startDate} desc nulls last`, asc(league.name))
    ),
  ["get-leagues-v2"],
  { revalidate: 60 }
);

export const getLeagueEvents = async (leagueId: string) =>
  db.query.leagueEvent.findMany({
    where: eq(leagueEvent.leagueId, leagueId),
    orderBy: asc(leagueEvent.eventDate),
  });

const expectedEventHoleCountSubquery = (
  eventId: string | typeof playerHole.leagueEventId | typeof leagueEvent.id
) =>
  sql<number>`(
    select count(distinct ph2.hole_id)::int
    from ${playerHole} ph2
    where ph2.league_event_id = ${eventId}
  )`;

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
          expectedHoleCount: expectedEventHoleCountSubquery(eventId),
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .where(eq(playerHole.leagueEventId, eventId))
        .groupBy(player.id, player.displayName)
    ),
  ["event-scores-v3"],
  { revalidate: 10 }
);

export const getEventScores = async (eventId: string) =>
  getEventScoresCached(eventId)
    .then((rows) => rows.map(withRoundCompletion))
    .then((rows) => [...rows].sort(compareEventScores));

type RoundForBestPick = {
  leagueEventId: string;
  eventDate: string | null;
  roundDiff: number;
};

/** Lowest diff wins; on a tie, the oldest event date wins (single best round). */
export const pickBestRound = <T extends RoundForBestPick>(rounds: T[]): T | null => {
  if (rounds.length === 0) return null;
  return rounds.reduce((best, row) => {
    const rowDiff = Number(row.roundDiff);
    const bestDiff = Number(best.roundDiff);
    if (rowDiff < bestDiff) return row;
    if (rowDiff > bestDiff) return best;
    const rowDate = row.eventDate ?? "9999-12-31";
    const bestDate = best.eventDate ?? "9999-12-31";
    if (rowDate !== bestDate) return rowDate < bestDate ? row : best;
    return row.leagueEventId.localeCompare(best.leagueEventId) < 0 ? row : best;
  });
};

export const getBestRoundEventIdForPlayers = async (playerIds: string[]) => {
  if (playerIds.length === 0) return new Map<string, string>();

  const roundTotals = await withDbRetry(() =>
    db
      .select({
        playerId: playerHole.playerId,
        leagueEventId: playerHole.leagueEventId,
        eventDate: leagueEvent.eventDate,
        roundDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)::int`,
        holesPlayed: sql<number>`count(distinct ${playerHole.holeId})::int`,
        expectedHoleCount: expectedEventHoleCountSubquery(playerHole.leagueEventId),
      })
      .from(playerHole)
      .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
      .where(inArray(playerHole.playerId, playerIds))
      .groupBy(playerHole.playerId, playerHole.leagueEventId, leagueEvent.eventDate)
  );

  const roundsByPlayer = new Map<string, RoundForBestPick[]>();
  for (const row of roundTotals) {
    if (!isRoundComplete(Number(row.holesPlayed), Number(row.expectedHoleCount))) continue;
    const rounds = roundsByPlayer.get(row.playerId) ?? [];
    rounds.push({
      leagueEventId: row.leagueEventId,
      eventDate: row.eventDate,
      roundDiff: Number(row.roundDiff),
    });
    roundsByPlayer.set(row.playerId, rounds);
  }

  const bestEventByPlayer = new Map<string, string>();
  for (const [playerId, rounds] of roundsByPlayer) {
    const best = pickBestRound(rounds);
    if (best) bestEventByPlayer.set(playerId, best.leagueEventId);
  }
  return bestEventByPlayer;
};

export const isPlayerBestRound = (leagueEventId: string, bestRoundEventId: string | undefined) =>
  bestRoundEventId !== undefined && leagueEventId === bestRoundEventId;

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

const getEventMiniGameWinsCached = unstable_cache(
  async (eventId: string) =>
    withDbRetry(() =>
      db
        .select({
          id: miniGameWin.id,
          playerId: miniGameWin.playerId,
          displayName: player.displayName,
          holeId: miniGameWin.holeId,
          holeNumber: hole.holeNumber,
          kind: miniGameWin.kind,
          prize: miniGameWin.prize,
        })
        .from(miniGameWin)
        .innerJoin(player, eq(player.id, miniGameWin.playerId))
        .innerJoin(hole, eq(hole.id, miniGameWin.holeId))
        .where(eq(miniGameWin.leagueEventId, eventId))
        .orderBy(asc(hole.holeNumber), asc(miniGameWin.kind), asc(player.displayName))
    ),
  ["event-mini-game-wins"],
  { revalidate: 10 }
);

export const getEventMiniGameWins = async (eventId: string) => getEventMiniGameWinsCached(eventId);

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


export type PlayerRecentEventsPageResult = {
  events: ReturnType<typeof withRoundCompletion>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const getPlayerRecentEventsPaginated = async (
  playerId: string,
  options: { page?: number; pageSize?: number } = {}
) => {
  const pageSize = options.pageSize ?? PLAYER_RECENT_EVENTS_PAGE_SIZE;
  const page = Math.max(1, options.page ?? 1);
  const playerFilter = eq(playerHole.playerId, playerId);

  const [countRow, rows] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${leagueEvent.id})::int` })
      .from(playerHole)
      .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
      .where(playerFilter),
    db
      .select({
        leagueEventId: leagueEvent.id,
        eventName: leagueEvent.name,
        eventDate: leagueEvent.eventDate,
        courseName: course.name,
        totalScore: sql<number>`coalesce(sum(${playerHole.score}), 0)`,
        totalDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
        holesPlayed: sql<number>`count(distinct ${playerHole.holeId})`,
        expectedHoleCount: expectedEventHoleCountSubquery(leagueEvent.id),
      })
      .from(playerHole)
      .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
      .innerJoin(course, eq(course.id, leagueEvent.courseId))
      .where(playerFilter)
      .groupBy(leagueEvent.id, leagueEvent.name, leagueEvent.eventDate, course.name)
      .orderBy(sql`${leagueEvent.eventDate} desc nulls last`, asc(leagueEvent.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const totalCount = Number(countRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  return {
    events: rows.map(withRoundCompletion),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
};

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
    courseName: string;
  })[];
  eventLinks: { leagueEventId: string; eventName: string; courseName: string }[];
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

const compareFirstReached = (
  a: {
    eventDate: string | null;
    leagueEventId: string;
    holeNumber?: number;
    playerName: string;
  },
  b: {
    eventDate: string | null;
    leagueEventId: string;
    holeNumber?: number;
    playerName: string;
  }
) => {
  const dateA = a.eventDate ?? "9999-12-31";
  const dateB = b.eventDate ?? "9999-12-31";
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  if (a.leagueEventId !== b.leagueEventId) return a.leagueEventId.localeCompare(b.leagueEventId);
  const holeA = a.holeNumber ?? 0;
  const holeB = b.holeNumber ?? 0;
  if (holeA !== holeB) return holeA - holeB;
  return a.playerName.localeCompare(b.playerName);
};

const pickFirstToExtremeValue = <
  T extends {
    value: number;
    eventDate: string | null;
    leagueEventId: string;
    playerName: string;
    holeNumber?: number;
  },
>(
  rows: T[],
  mode: "min" | "max"
): T | null => {
  if (rows.length === 0) return null;
  const target =
    mode === "min"
      ? Math.min(...rows.map((row) => Number(row.value)))
      : Math.max(...rows.map((row) => Number(row.value)));
  const tied = rows.filter((row) => Number(row.value) === target);
  return [...tied].sort(compareFirstReached)[0] ?? null;
};

type StatTimelineRow = {
  playerId: string;
  playerName: string;
  eventDate: string | null;
  leagueEventId: string;
  holeNumber: number;
};

const pickFirstToReachMaxCount = (timeline: StatTimelineRow[]) => {
  const totals = new Map<string, { playerId: string; playerName: string; value: number }>();
  for (const row of timeline) {
    const current = totals.get(row.playerId);
    if (current) {
      current.value += 1;
    } else {
      totals.set(row.playerId, { playerId: row.playerId, playerName: row.playerName, value: 1 });
    }
  }

  const leaders = [...totals.values()];
  if (leaders.length === 0) return null;

  const maxValue = Math.max(...leaders.map((row) => row.value));
  if (maxValue === 0) return null;

  const leaderIds = new Set(leaders.filter((row) => row.value === maxValue).map((row) => row.playerId));
  const counts = new Map<string, number>();
  const milestones = new Map<string, StatTimelineRow>();

  for (const row of timeline) {
    if (!leaderIds.has(row.playerId)) continue;
    const next = (counts.get(row.playerId) ?? 0) + 1;
    counts.set(row.playerId, next);
    if (next === maxValue && !milestones.has(row.playerId)) {
      milestones.set(row.playerId, row);
    }
  }

  const winnerMilestone = [...milestones.values()].sort(compareFirstReached)[0];
  if (!winnerMilestone) return null;

  return {
    playerId: winnerMilestone.playerId,
    playerName: winnerMilestone.playerName,
    value: maxValue,
  };
};

const statTimelineOrder = [
  asc(leagueEvent.eventDate),
  asc(leagueEvent.name),
  asc(hole.holeNumber),
  asc(player.displayName),
] as const;

const todayIsoDate = () => new Date().toISOString().slice(0, 10);

export type LeagueEventListItem = {
  id: string;
  name: string;
  eventDate: string | null;
  courseName: string;
};

export type PastEventPreview = LeagueEventListItem & {
  holeNumbers: number[];
  miniGamesByCell: Map<string, { kind: string; prize: string | null }[]>;
  topThree: {
    playerId: string;
    displayName: string;
    totalScore: number;
    totalDiff: number;
    isDnf: boolean;
    isBestRound: boolean;
    holeScores: { holeNumber: number; score: number; par: number }[];
  }[];
};

const leagueEventListSelect = {
  id: leagueEvent.id,
  name: leagueEvent.name,
  eventDate: leagueEvent.eventDate,
  courseName: course.name,
};

export type LeagueEventsGroupedResult = {
  future: LeagueEventListItem[];
  past: LeagueEventListItem[];
  futureTotal: number;
  pastTotal: number;
};

export const getLeagueEventsGrouped = async (
  leagueId: string,
  options?: { futureLimit?: number; pastLimit?: number }
): Promise<LeagueEventsGroupedResult> => {
  const today = todayIsoDate();
  const futureFilter = and(
    eq(leagueEvent.leagueId, leagueId),
    or(isNull(leagueEvent.eventDate), gte(leagueEvent.eventDate, today))
  );
  const pastFilter = and(eq(leagueEvent.leagueId, leagueId), lt(leagueEvent.eventDate, today));

  const futureBase = db
    .select(leagueEventListSelect)
    .from(leagueEvent)
    .innerJoin(course, eq(course.id, leagueEvent.courseId))
    .where(futureFilter)
    .orderBy(asc(leagueEvent.eventDate), asc(leagueEvent.name));

  const pastBase = db
    .select(leagueEventListSelect)
    .from(leagueEvent)
    .innerJoin(course, eq(course.id, leagueEvent.courseId))
    .where(pastFilter)
    .orderBy(desc(leagueEvent.eventDate), asc(leagueEvent.name));

  const [futureRows, pastRows, futureCountRow, pastCountRow] = await Promise.all([
    options?.futureLimit !== undefined ? futureBase.limit(options.futureLimit) : futureBase,
    options?.pastLimit !== undefined ? pastBase.limit(options.pastLimit) : pastBase,
    db.select({ count: sql<number>`count(*)::int` }).from(leagueEvent).where(futureFilter),
    db.select({ count: sql<number>`count(*)::int` }).from(leagueEvent).where(pastFilter),
  ]);

  return {
    future: futureRows,
    past: pastRows,
    futureTotal: Number(futureCountRow[0]?.count ?? 0),
    pastTotal: Number(pastCountRow[0]?.count ?? 0),
  };
};

export type LeagueRecentEventsPageResult = {
  events: LeagueEventListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const getLeagueRecentEventsPaginated = async (
  leagueId: string,
  options: { page?: number } = {}
): Promise<LeagueRecentEventsPageResult> => {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = LEAGUE_EVENTS_PAGE_SIZE;
  const leagueFilter = eq(leagueEvent.leagueId, leagueId);

  const [countRow, events] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(leagueEvent).where(leagueFilter),
    db
      .select(leagueEventListSelect)
      .from(leagueEvent)
      .innerJoin(course, eq(course.id, leagueEvent.courseId))
      .where(leagueFilter)
      .orderBy(desc(leagueEvent.eventDate), asc(leagueEvent.name))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const totalCount = Number(countRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  return { events, totalCount, page: safePage, pageSize, totalPages };
};

export type LeaguePlayerWithRounds = {
  playerId: string;
  displayName: string;
  eventsPlayed: number;
};

export type LeaguePlayersPageResult = {
  players: LeaguePlayerWithRounds[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export const getLeaguePlayersWithRoundsPaginated = async (
  leagueId: string,
  options: { page?: number } = {}
): Promise<LeaguePlayersPageResult> => {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = LEAGUE_PLAYERS_PAGE_SIZE;
  const leagueEventJoin = sql`${leagueEvent.id} = ${playerHole.leagueEventId} and ${leagueEvent.leagueId} = ${leagueId}::uuid`;

  const [countRow, players] = await Promise.all([
    db
      .select({ count: sql<number>`count(distinct ${playerHole.playerId})::int` })
      .from(playerHole)
      .innerJoin(leagueEvent, leagueEventJoin),
    db
      .select({
        playerId: player.id,
        displayName: player.displayName,
        eventsPlayed: sql<number>`count(distinct ${leagueEvent.id})::int`,
      })
      .from(playerHole)
      .innerJoin(player, eq(player.id, playerHole.playerId))
      .innerJoin(leagueEvent, leagueEventJoin)
      .groupBy(player.id, player.displayName)
      .orderBy(asc(player.displayName))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const totalCount = Number(countRow[0]?.count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);

  return {
    players: players.map((row) => ({
      playerId: row.playerId,
      displayName: row.displayName,
      eventsPlayed: Number(row.eventsPlayed),
    })),
    totalCount,
    page: safePage,
    pageSize,
    totalPages,
  };
};

const buildPastEventPreview = async (event: LeagueEventListItem): Promise<PastEventPreview> => {
  const [scores, breakdown, miniGameWins] = await Promise.all([
    getEventScores(event.id),
    getEventHoleBreakdown(event.id),
    getEventMiniGameWins(event.id),
  ]);
  const topThree = scores.slice(0, 3);
  const topPlayerIds = new Set(topThree.map((row) => row.playerId));
  const holeNumbers = Array.from(new Set(breakdown.map((row) => row.holeNumber))).sort((a, b) => a - b);
  const miniGamesByCell = buildMiniGameWinsByCell(miniGameWins);
  const bestRoundEventIds = await getBestRoundEventIdForPlayers(topThree.map((row) => row.playerId));

  return {
    ...event,
    holeNumbers,
    miniGamesByCell,
    topThree: topThree.map((row) => ({
      playerId: row.playerId,
      displayName: row.displayName,
      totalScore: Number(row.totalScore),
      totalDiff: Number(row.totalDiff),
      isDnf: row.isDnf,
      isBestRound: !row.isDnf && isPlayerBestRound(event.id, bestRoundEventIds.get(row.playerId)),
      holeScores: breakdown
        .filter((entry) => entry.playerId === row.playerId && topPlayerIds.has(entry.playerId))
        .map((entry) => ({ holeNumber: entry.holeNumber, score: entry.score, par: entry.par })),
    })),
  };
};

export const getPastEventPreviews = async (pastEvents: LeagueEventListItem[]) =>
  Promise.all(pastEvents.map((event) => buildPastEventPreview(event)));

const getHomeHighlightsForLeague = async (leagueId: string): Promise<HomeHighlights> => {
  const leagueFilter = eq(leagueEvent.leagueId, leagueId);

  const [roundRows, birdieTimeline, aceTimeline] = await Promise.all([
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          leagueEventId: playerHole.leagueEventId,
          eventName: leagueEvent.name,
          courseName: course.name,
          eventDate: leagueEvent.eventDate,
          value: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
          holesPlayed: sql<number>`count(distinct ${playerHole.holeId})::int`,
          expectedHoleCount: expectedEventHoleCountSubquery(playerHole.leagueEventId),
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .innerJoin(course, eq(course.id, leagueEvent.courseId))
        .where(leagueFilter)
        .groupBy(
          player.id,
          player.displayName,
          playerHole.leagueEventId,
          leagueEvent.name,
          leagueEvent.eventDate,
          course.name
        )
    ),
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          eventDate: leagueEvent.eventDate,
          leagueEventId: leagueEvent.id,
          holeNumber: hole.holeNumber,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(hole, eq(hole.id, playerHole.holeId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .where(and(leagueFilter, sql`${playerHole.score} < ${hole.par}`))
        .orderBy(...statTimelineOrder)
    ),
    withDbRetry(() =>
      db
        .select({
          playerId: player.id,
          playerName: player.displayName,
          eventDate: leagueEvent.eventDate,
          leagueEventId: leagueEvent.id,
          holeNumber: hole.holeNumber,
        })
        .from(playerHole)
        .innerJoin(player, eq(player.id, playerHole.playerId))
        .innerJoin(hole, eq(hole.id, playerHole.holeId))
        .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
        .where(and(leagueFilter, eq(playerHole.score, 1)))
        .orderBy(...statTimelineOrder)
    ),
  ]);

  const completeRoundRows = roundRows.filter((row) =>
    isRoundComplete(Number(row.holesPlayed), Number(row.expectedHoleCount))
  );
  const bestRoundWinner = pickFirstToExtremeValue(
    completeRoundRows.map((row) => ({
      ...row,
      leagueEventId: row.leagueEventId,
    })),
    "min"
  );
  const birdieLeader = pickFirstToReachMaxCount(birdieTimeline);
  const aceLeader = pickFirstToReachMaxCount(aceTimeline);

  return {
    bestRound: bestRoundWinner
      ? {
          roundDiff: Number(bestRoundWinner.value),
          players: [
            {
              playerId: bestRoundWinner.playerId,
              playerName: bestRoundWinner.playerName,
              leagueEventId: bestRoundWinner.leagueEventId,
              eventName: bestRoundWinner.eventName,
              courseName: bestRoundWinner.courseName,
            },
          ],
          eventLinks: [
            {
              leagueEventId: bestRoundWinner.leagueEventId,
              eventName: bestRoundWinner.eventName,
              courseName: bestRoundWinner.courseName,
            },
          ],
        }
      : null,
    mostBirdies: birdieLeader
      ? {
          value: birdieLeader.value,
          players: [{ playerId: birdieLeader.playerId, playerName: birdieLeader.playerName }],
        }
      : null,
    mostAces: aceLeader
      ? {
          value: aceLeader.value,
          players: [{ playerId: aceLeader.playerId, playerName: aceLeader.playerName }],
        }
      : null,
  };
};

export const getHomeHighlights = async (leagueId: string) =>
  unstable_cache(() => getHomeHighlightsForLeague(leagueId), ["home-highlights-v7", leagueId], {
    revalidate: 30,
  })();

export type PlayerStats = {
  bestHole: { holeNumber: number; courseId: string; courseName: string; avgDiff: number } | null;
  bestRound: {
    leagueEventId: string;
    eventName: string;
    courseName: string;
    roundDiff: number;
  } | null;
  birdieCount: number;
  aceCount: number;
  ctpCount: number;
  longestPuttCount: number;
  shortestDriveCount: number;
};

const miniGameCountForKind = (
  rows: { kind: string; count: number }[],
  kind: "closest_to_pin" | "longest_putt" | "shortest_drive"
) => Number(rows.find((row) => row.kind === kind)?.count ?? 0);

export const getPlayerStats = async (playerId: string): Promise<PlayerStats> => {
  const [bestHoleRows, roundRows, countsRow, miniGameRows] = await Promise.all([
    db
      .select({
        holeNumber: hole.holeNumber,
        courseId: course.id,
        courseName: course.name,
        avgDiff: sql<number>`avg(${playerHole.diff})`,
      })
      .from(playerHole)
      .innerJoin(hole, eq(hole.id, playerHole.holeId))
      .innerJoin(course, eq(course.id, hole.courseId))
      .where(eq(playerHole.playerId, playerId))
      .groupBy(hole.id, hole.holeNumber, course.id, course.name)
      .orderBy(sql`avg(${playerHole.diff}) asc`, asc(hole.holeNumber))
      .limit(1),
    db
      .select({
        leagueEventId: leagueEvent.id,
        eventName: leagueEvent.name,
        eventDate: leagueEvent.eventDate,
        courseName: course.name,
        roundDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
        holesPlayed: sql<number>`count(distinct ${playerHole.holeId})::int`,
        expectedHoleCount: expectedEventHoleCountSubquery(leagueEvent.id),
      })
      .from(playerHole)
      .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
      .innerJoin(course, eq(course.id, leagueEvent.courseId))
      .where(eq(playerHole.playerId, playerId))
      .groupBy(leagueEvent.id, leagueEvent.name, leagueEvent.eventDate, course.name),
    db
      .select({
        birdieCount: sql<number>`count(*) filter (where ${playerHole.score} < ${hole.par})::int`,
        aceCount: sql<number>`count(*) filter (where ${playerHole.score} = 1)::int`,
      })
      .from(playerHole)
      .innerJoin(hole, eq(hole.id, playerHole.holeId))
      .where(eq(playerHole.playerId, playerId)),
    db
      .select({
        kind: miniGameWin.kind,
        count: sql<number>`count(*)::int`,
      })
      .from(miniGameWin)
      .where(eq(miniGameWin.playerId, playerId))
      .groupBy(miniGameWin.kind),
  ]);

  const bestRound = pickBestRound(
    roundRows
      .filter((row) => isRoundComplete(Number(row.holesPlayed), Number(row.expectedHoleCount)))
      .map((row) => ({
        leagueEventId: row.leagueEventId,
        eventDate: row.eventDate,
        roundDiff: Number(row.roundDiff),
      }))
  );

  const bestRoundRow = bestRound
    ? roundRows.find((row) => row.leagueEventId === bestRound.leagueEventId) ?? null
    : null;

  return {
    bestHole: bestHoleRows[0]
      ? {
          holeNumber: bestHoleRows[0].holeNumber,
          courseId: bestHoleRows[0].courseId,
          courseName: bestHoleRows[0].courseName,
          avgDiff: Number(bestHoleRows[0].avgDiff),
        }
      : null,
    bestRound: bestRoundRow
      ? {
          leagueEventId: bestRoundRow.leagueEventId,
          eventName: bestRoundRow.eventName,
          courseName: bestRoundRow.courseName,
          roundDiff: Number(bestRoundRow.roundDiff),
        }
      : null,
    birdieCount: Number(countsRow[0]?.birdieCount ?? 0),
    aceCount: Number(countsRow[0]?.aceCount ?? 0),
    ctpCount: miniGameCountForKind(miniGameRows, "closest_to_pin"),
    longestPuttCount: miniGameCountForKind(miniGameRows, "longest_putt"),
    shortestDriveCount: miniGameCountForKind(miniGameRows, "shortest_drive"),
  };
};

export const getPlayerPageData = async (
  playerId: string,
  options?: { leagueId?: string; eventsPage?: number }
) =>
  withDbRetry(async () => {
    const playerRecord = await db.query.player.findFirst({
      where: eq(player.id, playerId),
    });
    if (!playerRecord) return null;

    const [recentEventsPage, ratingHistory, leagues, stats] = await Promise.all([
      getPlayerRecentEventsPaginated(playerId, { page: options?.eventsPage }),
      PLAYER_RATINGS_ENABLED ? getPlayerRatingHistory(playerId, options?.leagueId) : Promise.resolve([]),
      getLeagues(),
      getPlayerStats(playerId),
    ]);

    return {
      player: playerRecord,
      recentEvents: recentEventsPage.events,
      recentEventsPagination: recentEventsPage,
      ratingHistory,
      leagues,
      stats,
    };
  });

export type PlayerRatingHistoryPoint = {
  snapshotDate: string | null;
  rating: number;
  ratingDelta: number;
  roundDiff: number;
  leagueEventId: string;
  eventName: string;
  leagueName: string;
};

export const getPlayerRatingHistory = async (playerId: string, leagueId?: string) => {
  const rows = await db
    .select({
      snapshotDate: playerRatingSnapshot.snapshotDate,
      rating: playerRatingSnapshot.rating,
      ratingDelta: playerRatingSnapshot.ratingDelta,
      roundDiff: playerRatingSnapshot.roundDiff,
      leagueEventId: playerRatingSnapshot.leagueEventId,
      eventName: leagueEvent.name,
      leagueName: league.name,
      leagueId: playerRatingSnapshot.leagueId,
    })
    .from(playerRatingSnapshot)
    .innerJoin(leagueEvent, eq(leagueEvent.id, playerRatingSnapshot.leagueEventId))
    .innerJoin(league, eq(league.id, playerRatingSnapshot.leagueId))
    .where(
      leagueId
        ? and(eq(playerRatingSnapshot.playerId, playerId), eq(playerRatingSnapshot.leagueId, leagueId))
        : eq(playerRatingSnapshot.playerId, playerId)
    )
    .orderBy(asc(playerRatingSnapshot.snapshotDate), asc(playerRatingSnapshot.createdDate));

  return rows.map((row) => ({
    snapshotDate: row.snapshotDate,
    rating: row.rating,
    ratingDelta: row.ratingDelta,
    roundDiff: row.roundDiff,
    leagueEventId: row.leagueEventId,
    eventName: row.eventName,
    leagueName: row.leagueName,
  })) satisfies PlayerRatingHistoryPoint[];
};
