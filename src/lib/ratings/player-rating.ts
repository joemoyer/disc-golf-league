import { RATING_CONFIG } from "@/lib/ratings/config";

/** Merge competitive (Elo-style) and form (strokes-vs-par) signals into one rating. */
export const combineRatingSignals = (
  competitiveRating: number,
  formHandicap: number | null
) => {
  if (formHandicap === null) return competitiveRating;
  const formSkill = RATING_CONFIG.initialRating - formHandicap * 12;
  return Math.round(
    RATING_CONFIG.competitiveWeight * competitiveRating +
      (1 - RATING_CONFIG.competitiveWeight) * formSkill
  );
};
