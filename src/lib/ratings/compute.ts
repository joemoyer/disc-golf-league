import { RATING_CONFIG } from "@/lib/ratings/config";

export type RoundSummary = {
  playerId: string;
  leagueEventId: string;
  leagueId: string;
  snapshotDate: string | null;
  roundDiff: number;
  roundScore: number;
  holesPlayed: number;
};

export type PlayerRatingState = {
  /** Elo-style competitive rating (in-memory only) */
  competitiveRating: number;
  /** Rolling strokes-vs-par index (in-memory only) */
  formHandicap: number | null;
  roundDiffs: number[];
};

const expectedScore = (playerRating: number, opponentRating: number) =>
  1 / (1 + 10 ** ((opponentRating - playerRating) / RATING_CONFIG.competitiveScale));

export const kFactorForField = (fieldSize: number) =>
  Math.max(12, Math.round(RATING_CONFIG.kFactorBase / Math.sqrt(Math.max(fieldSize, 2))));

export const computeHandicap = (roundDiffs: number[]): number | null => {
  if (roundDiffs.length === 0) return null;
  const window = roundDiffs.slice(-RATING_CONFIG.handicapWindow);
  const sorted = [...window].sort((a, b) => a - b);
  const take = Math.max(1, Math.min(RATING_CONFIG.handicapBestCount, sorted.length));
  const best = sorted.slice(0, take);
  const avg = best.reduce((sum, value) => sum + value, 0) / best.length;
  return Math.round(avg);
};

export const computeCompetitiveDelta = (
  playerCompetitiveRating: number,
  playerId: string,
  placement: number,
  field: { playerId: string; competitiveRating: number }[]
) => {
  const fieldSize = field.length;
  if (fieldSize <= 1) return 0;

  const actual = (fieldSize - placement) / (fieldSize - 1);
  const opponents = field.filter((entry) => entry.playerId !== playerId);
  if (opponents.length === 0) return 0;

  let expected = 0;
  for (const opponent of opponents) {
    expected += expectedScore(playerCompetitiveRating, opponent.competitiveRating);
  }
  expected /= opponents.length;

  const k = kFactorForField(fieldSize);
  return Math.round(k * (actual - expected));
};

export const rankRoundSummaries = (summaries: RoundSummary[]) => {
  const sorted = [...summaries].sort((a, b) => {
    if (a.roundDiff !== b.roundDiff) return a.roundDiff - b.roundDiff;
    if (a.roundScore !== b.roundScore) return a.roundScore - b.roundScore;
    return a.playerId.localeCompare(b.playerId);
  });

  const placementByPlayer = new Map<string, number>();
  let placement = 0;
  for (let i = 0; i < sorted.length; i += 1) {
    if (i > 0 && sorted[i].roundDiff === sorted[i - 1].roundDiff && sorted[i].roundScore === sorted[i - 1].roundScore) {
      placementByPlayer.set(sorted[i].playerId, placement);
    } else {
      placement = i + 1;
      placementByPlayer.set(sorted[i].playerId, placement);
    }
  }
  return placementByPlayer;
};

export const applyEventCompetitiveUpdates = (
  summaries: RoundSummary[],
  states: Map<string, PlayerRatingState>
) => {
  const eligible = summaries.filter((s) => s.holesPlayed >= RATING_CONFIG.minHoles);
  const placements = rankRoundSummaries(eligible);
  const field = eligible.map((s) => ({
    playerId: s.playerId,
    competitiveRating: states.get(s.playerId)?.competitiveRating ?? RATING_CONFIG.initialRating,
  }));

  const competitiveDeltas = new Map<string, number>();

  for (const summary of eligible) {
    const state = states.get(summary.playerId)!;
    const placement = placements.get(summary.playerId) ?? eligible.length;
    const delta = computeCompetitiveDelta(
      state.competitiveRating,
      summary.playerId,
      placement,
      field
    );
    competitiveDeltas.set(summary.playerId, delta);
    state.competitiveRating += delta;
  }

  return { eligible, placements, competitiveDeltas };
};

export const createInitialState = (playerIds: string[]) => {
  const states = new Map<string, PlayerRatingState>();
  for (const playerId of playerIds) {
    states.set(playerId, {
      competitiveRating: RATING_CONFIG.initialRating,
      formHandicap: null,
      roundDiffs: [],
    });
  }
  return states;
};
