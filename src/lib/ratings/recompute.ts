import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { leagueEvent, player, playerHole, playerRatingSnapshot } from "@/lib/db/schema";
import { RATING_CONFIG } from "@/lib/ratings/config";
import {
  applyEventCompetitiveUpdates,
  computeHandicap,
  createInitialState,
  type PlayerRatingState,
  type RoundSummary,
} from "@/lib/ratings/compute";
import { combineRatingSignals } from "@/lib/ratings/player-rating";

type EventWithRounds = {
  id: string;
  leagueId: string;
  eventDate: string | null;
  createdDate: Date;
  rounds: RoundSummary[];
};

type SnapshotRow = {
  playerId: string;
  leagueId: string;
  leagueEventId: string;
  snapshotDate: string | null;
  rating: number;
  ratingDelta: number;
  roundDiff: number;
  roundScore: number;
  placement: number;
  fieldSize: number;
  holesPlayed: number;
};

const SNAPSHOT_BATCH_SIZE = 50;

const compareEvents = (a: EventWithRounds, b: EventWithRounds) => {
  const dateA = a.eventDate ?? "";
  const dateB = b.eventDate ?? "";
  if (dateA !== dateB) return dateA.localeCompare(dateB);
  return a.createdDate.getTime() - b.createdDate.getTime();
};

const loadRoundSummaries = async () => {
  const rows = await db
    .select({
      playerId: playerHole.playerId,
      leagueEventId: playerHole.leagueEventId,
      leagueId: leagueEvent.leagueId,
      eventDate: leagueEvent.eventDate,
      eventCreatedDate: leagueEvent.createdDate,
      roundDiff: sql<number>`coalesce(sum(${playerHole.diff}), 0)`,
      roundScore: sql<number>`coalesce(sum(${playerHole.score}), 0)`,
      holesPlayed: sql<number>`count(distinct ${playerHole.holeId})::int`,
    })
    .from(playerHole)
    .innerJoin(leagueEvent, eq(leagueEvent.id, playerHole.leagueEventId))
    .groupBy(
      playerHole.playerId,
      playerHole.leagueEventId,
      leagueEvent.leagueId,
      leagueEvent.eventDate,
      leagueEvent.createdDate
    );

  const eventsMap = new Map<string, EventWithRounds>();

  for (const row of rows) {
    if (!eventsMap.has(row.leagueEventId)) {
      eventsMap.set(row.leagueEventId, {
        id: row.leagueEventId,
        leagueId: row.leagueId,
        eventDate: row.eventDate,
        createdDate: row.eventCreatedDate,
        rounds: [],
      });
    }
    eventsMap.get(row.leagueEventId)!.rounds.push({
      playerId: row.playerId,
      leagueEventId: row.leagueEventId,
      leagueId: row.leagueId,
      snapshotDate: row.eventDate,
      roundDiff: Number(row.roundDiff),
      roundScore: Number(row.roundScore),
      holesPlayed: Number(row.holesPlayed),
    });
  }

  return Array.from(eventsMap.values()).sort(compareEvents);
};

const collectPlayerIds = (events: EventWithRounds[]) =>
  [...new Set(events.flatMap((event) => event.rounds.map((round) => round.playerId)))];

/** Replay earlier events in memory so rating state is correct before a partial rewrite. */
const bootstrapStates = (events: EventWithRounds[], startIndex: number, playerIds: string[]) => {
  const states = createInitialState(playerIds);

  for (let i = 0; i < startIndex; i += 1) {
    const event = events[i];
    const { eligible } = applyEventCompetitiveUpdates(event.rounds, states);

    for (const summary of event.rounds) {
      const state = states.get(summary.playerId);
      if (!state) continue;

      if (summary.holesPlayed >= RATING_CONFIG.minHoles) {
        state.roundDiffs.push(summary.roundDiff);
        state.formHandicap = computeHandicap(state.roundDiffs);
      }
    }
  }

  return states;
};

const ratingMapFromStates = (states: Map<string, PlayerRatingState>) => {
  const lastRating = new Map<string, number>();
  for (const [playerId, state] of states) {
    lastRating.set(playerId, combineRatingSignals(state.competitiveRating, state.formHandicap));
  }
  return lastRating;
};

const flushSnapshotBatch = async (batch: SnapshotRow[]) => {
  if (batch.length === 0) return;
  await db.insert(playerRatingSnapshot).values(batch);
};

const writeEventsFrom = async (
  events: EventWithRounds[],
  states: Map<string, PlayerRatingState>,
  startIndex: number,
  lastRating: Map<string, number>
) => {
  const batch: SnapshotRow[] = [];
  const affectedPlayerIds = new Set<string>();
  let snapshotsWritten = 0;

  for (let i = startIndex; i < events.length; i += 1) {
    const event = events[i];
    const { eligible, placements } = applyEventCompetitiveUpdates(event.rounds, states);

    for (const summary of event.rounds) {
      const state = states.get(summary.playerId);
      if (!state) continue;

      if (summary.holesPlayed >= RATING_CONFIG.minHoles) {
        state.roundDiffs.push(summary.roundDiff);
        state.formHandicap = computeHandicap(state.roundDiffs);
      }

      if (!eligible.some((entry) => entry.playerId === summary.playerId)) {
        continue;
      }

      const placement = placements.get(summary.playerId) ?? eligible.length;
      const rating = combineRatingSignals(state.competitiveRating, state.formHandicap);
      const previousRating = lastRating.get(summary.playerId) ?? RATING_CONFIG.initialRating;
      const ratingDelta = rating - previousRating;
      lastRating.set(summary.playerId, rating);

      batch.push({
        playerId: summary.playerId,
        leagueId: summary.leagueId,
        leagueEventId: summary.leagueEventId,
        snapshotDate: summary.snapshotDate,
        rating,
        ratingDelta,
        roundDiff: summary.roundDiff,
        roundScore: summary.roundScore,
        placement,
        fieldSize: eligible.length,
        holesPlayed: summary.holesPlayed,
      });
      affectedPlayerIds.add(summary.playerId);
      snapshotsWritten += 1;

      if (batch.length >= SNAPSHOT_BATCH_SIZE) {
        await flushSnapshotBatch(batch);
        batch.length = 0;
      }
    }
  }

  await flushSnapshotBatch(batch);

  return { snapshotsWritten, affectedPlayerIds };
};

const updatePlayerRatings = async (playerIds: Iterable<string>, states: Map<string, PlayerRatingState>) => {
  const now = new Date();
  let playersUpdated = 0;

  for (const playerId of playerIds) {
    const state = states.get(playerId);
    if (!state) continue;

    await db
      .update(player)
      .set({
        rating: combineRatingSignals(state.competitiveRating, state.formHandicap),
        ratingUpdatedAt: now,
        updatedDate: now,
      })
      .where(eq(player.id, playerId));
    playersUpdated += 1;
  }

  return playersUpdated;
};

const recomputeFromIndex = async (startIndex: number, clearSnapshots: "all" | "fromIndex") => {
  const events = await loadRoundSummaries();
  if (events.length === 0) {
    return { playersUpdated: 0, snapshotsWritten: 0, eventsProcessed: 0 };
  }

  const safeStart = Math.min(Math.max(startIndex, 0), events.length);
  const playerIds = collectPlayerIds(events);
  const states = bootstrapStates(events, safeStart, playerIds);

  if (clearSnapshots === "all") {
    await db.delete(playerRatingSnapshot);
  } else if (safeStart < events.length) {
    const eventIds = events.slice(safeStart).map((event) => event.id);
    await db.delete(playerRatingSnapshot).where(inArray(playerRatingSnapshot.leagueEventId, eventIds));
  }

  const lastRating = ratingMapFromStates(states);
  const { snapshotsWritten, affectedPlayerIds } = await writeEventsFrom(
    events,
    states,
    safeStart,
    lastRating
  );

  const playersUpdated = await updatePlayerRatings(affectedPlayerIds, states);

  return {
    playersUpdated,
    snapshotsWritten,
    eventsProcessed: events.length - safeStart,
  };
};

/** Full rebuild — use for admin maintenance only. */
export const recomputeAllRatings = async () => recomputeFromIndex(0, "all");

/**
 * Incremental rebuild from one event forward (import / score edits).
 * Replays earlier events in memory only; rewrites snapshots from that event on.
 */
export const recomputeRatingsAfterEvent = async (leagueEventId: string) => {
  const events = await loadRoundSummaries();
  const startIndex = events.findIndex((event) => event.id === leagueEventId);
  if (startIndex === -1) {
    return { playersUpdated: 0, snapshotsWritten: 0, eventsProcessed: 0 };
  }

  return recomputeFromIndex(startIndex, "fromIndex");
};
