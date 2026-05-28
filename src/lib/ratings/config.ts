/** Tuning knobs for player skill ratings — see `enabled.ts` to show/hide in the app */
export const RATING_CONFIG = {
  initialRating: 600,
  minHoles: 9,
  handicapWindow: 10,
  handicapBestCount: 4,
  kFactorBase: 24,
  competitiveScale: 400,
  /** Weight for field-placement (Elo-style) vs form (rolling diff) when merging into rating */
  competitiveWeight: 0.65,
} as const;
