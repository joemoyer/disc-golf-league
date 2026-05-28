ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "elo" integer DEFAULT 900 NOT NULL;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "handicap" integer;
ALTER TABLE "player" ADD COLUMN IF NOT EXISTS "rating_updated_at" timestamp with time zone;

UPDATE "player" SET "elo" = 900 WHERE "elo" IS NULL;

CREATE TABLE IF NOT EXISTS "player_rating_snapshot" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "player_id" uuid NOT NULL REFERENCES "player"("id") ON DELETE CASCADE,
  "league_id" uuid NOT NULL REFERENCES "league"("id") ON DELETE CASCADE,
  "league_event_id" uuid NOT NULL REFERENCES "league_event"("id") ON DELETE CASCADE,
  "snapshot_date" date,
  "elo" integer NOT NULL,
  "elo_delta" integer DEFAULT 0 NOT NULL,
  "handicap" integer,
  "round_diff" integer NOT NULL,
  "round_score" integer NOT NULL,
  "placement" integer NOT NULL,
  "field_size" integer NOT NULL,
  "holes_played" integer NOT NULL,
  "created_date" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "player_rating_snapshot_player_event_unique" UNIQUE("player_id", "league_event_id")
);

CREATE INDEX IF NOT EXISTS "player_rating_snapshot_player_date_idx"
  ON "player_rating_snapshot" ("player_id", "snapshot_date");
