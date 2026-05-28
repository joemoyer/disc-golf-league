CREATE TABLE IF NOT EXISTS "mini_game_win" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "league_event_id" uuid NOT NULL,
  "hole_id" uuid NOT NULL,
  "player_id" uuid NOT NULL,
  "kind" varchar(64) NOT NULL,
  "prize" varchar(255),
  "created_date" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_date" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "mini_game_win" ADD CONSTRAINT "mini_game_win_league_event_id_league_event_id_fk"
  FOREIGN KEY ("league_event_id") REFERENCES "public"."league_event"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "mini_game_win" ADD CONSTRAINT "mini_game_win_hole_id_hole_id_fk"
  FOREIGN KEY ("hole_id") REFERENCES "public"."hole"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "mini_game_win" ADD CONSTRAINT "mini_game_win_player_id_player_id_fk"
  FOREIGN KEY ("player_id") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "mini_game_win_league_event_id_idx" ON "mini_game_win" ("league_event_id");
