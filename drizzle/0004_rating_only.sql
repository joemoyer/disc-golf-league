-- player_rating_snapshot: store rating only
ALTER TABLE "player_rating_snapshot" ADD COLUMN IF NOT EXISTS "rating" integer;
ALTER TABLE "player_rating_snapshot" ADD COLUMN IF NOT EXISTS "rating_delta" integer DEFAULT 0;

UPDATE "player_rating_snapshot"
SET
  "rating" = COALESCE("elo", 900),
  "rating_delta" = COALESCE("elo_delta", 0)
WHERE "rating" IS NULL;

ALTER TABLE "player_rating_snapshot" ALTER COLUMN "rating" SET NOT NULL;
ALTER TABLE "player_rating_snapshot" ALTER COLUMN "rating_delta" SET NOT NULL;

ALTER TABLE "player_rating_snapshot" DROP COLUMN IF EXISTS "elo";
ALTER TABLE "player_rating_snapshot" DROP COLUMN IF EXISTS "elo_delta";
ALTER TABLE "player_rating_snapshot" DROP COLUMN IF EXISTS "handicap";

-- player: single rating column
UPDATE "player" SET "rating" = COALESCE("rating", "elo", 900) WHERE "rating" IS NULL;

ALTER TABLE "player" DROP COLUMN IF EXISTS "elo";
ALTER TABLE "player" DROP COLUMN IF EXISTS "handicap";

ALTER TABLE "player" ALTER COLUMN "rating" SET DEFAULT 900;
UPDATE "player" SET "rating" = 900 WHERE "rating" IS NULL;
ALTER TABLE "player" ALTER COLUMN "rating" SET NOT NULL;
