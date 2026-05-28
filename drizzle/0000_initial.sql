CREATE TABLE "player" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(64) NOT NULL UNIQUE,
  "display_name" varchar(120) NOT NULL,
  "first_name" varchar(120) NOT NULL,
  "last_name" varchar(120) NOT NULL,
  "email" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "course" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "location" varchar(255),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "hole" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "course_id" uuid NOT NULL REFERENCES "course"("id") ON DELETE CASCADE,
  "hole_number" integer NOT NULL,
  "par" integer NOT NULL,
  "distance_feet" integer,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "league" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "key" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "description" text,
  "start_date" date,
  "end_date" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "league_event" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "league_id" uuid NOT NULL REFERENCES "league"("id") ON DELETE CASCADE,
  "course_id" uuid NOT NULL REFERENCES "course"("id") ON DELETE RESTRICT,
  "key" varchar(64) NOT NULL UNIQUE,
  "name" varchar(120) NOT NULL,
  "event_date" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE "player_league" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL REFERENCES "player"("id") ON DELETE CASCADE,
  "league_id" uuid NOT NULL REFERENCES "league"("id") ON DELETE CASCADE,
  "joined_date" date,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("player_id", "league_id")
);

CREATE TABLE "player_hole" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "player_id" uuid NOT NULL REFERENCES "player"("id") ON DELETE CASCADE,
  "hole_id" uuid NOT NULL REFERENCES "hole"("id") ON DELETE CASCADE,
  "league_event_id" uuid NOT NULL REFERENCES "league_event"("id") ON DELETE CASCADE,
  "score" integer NOT NULL,
  "points" integer NOT NULL DEFAULT 0,
  "created_date" timestamptz NOT NULL DEFAULT now(),
  "updated_date" timestamptz NOT NULL DEFAULT now(),
  UNIQUE("player_id", "hole_id", "league_event_id")
);
