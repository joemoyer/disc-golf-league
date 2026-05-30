/** A complete round means the player scored every hole that was part of this event. */
export const isRoundComplete = (holesPlayed: number, expectedHoleCount: number) =>
  expectedHoleCount > 0 && holesPlayed >= expectedHoleCount;

export const isRoundDnf = (holesPlayed: number, expectedHoleCount: number) =>
  !isRoundComplete(holesPlayed, expectedHoleCount);

export type WithRoundCompletion = {
  holesPlayed: number;
  expectedHoleCount: number;
  isDnf: boolean;
};

export const withRoundCompletion = <T extends { holesPlayed: number; expectedHoleCount: number }>(
  row: T
): T & WithRoundCompletion => ({
  ...row,
  isDnf: isRoundDnf(Number(row.holesPlayed), Number(row.expectedHoleCount)),
});

export const compareEventScores = (
  a: { totalScore: number; isDnf: boolean },
  b: { totalScore: number; isDnf: boolean }
) => {
  if (a.isDnf !== b.isDnf) return a.isDnf ? 1 : -1;
  return a.totalScore - b.totalScore;
};
