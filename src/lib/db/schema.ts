import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

const auditColumns = {
  createdDate: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  updatedDate: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
};

export const player = pgTable("player", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  firstName: varchar("first_name", { length: 120 }).notNull(),
  lastName: varchar("last_name", { length: 120 }).notNull(),
  email: varchar("email", { length: 255 }),
  rating: integer("rating").notNull().default(900),
  ratingUpdatedAt: timestamp("rating_updated_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns,
});

export const course = pgTable("course", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  location: varchar("location", { length: 255 }),
  rating: integer("rating"),
  slope: integer("slope"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns,
});

export const hole = pgTable("hole", {
  id: uuid("id").defaultRandom().primaryKey(),
  courseId: uuid("course_id")
    .notNull()
    .references(() => course.id, { onDelete: "cascade" }),
  holeNumber: integer("hole_number").notNull(),
  par: integer("par").notNull(),
  distanceFeet: integer("distance_feet"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns,
});

export const league = pgTable("league", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  description: text("description"),
  startDate: date("start_date"),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns,
});

export const leagueEvent = pgTable("league_event", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueId: uuid("league_id")
    .notNull()
    .references(() => league.id, { onDelete: "cascade" }),
  courseId: uuid("course_id")
    .notNull()
    .references(() => course.id, { onDelete: "restrict" }),
  key: varchar("key", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  eventDate: date("event_date"),
  isActive: boolean("is_active").notNull().default(true),
  ...auditColumns,
});

export const playerLeague = pgTable(
  "player_league",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    joinedDate: date("joined_date"),
    isActive: boolean("is_active").notNull().default(true),
    ...auditColumns,
  },
  (table) => [unique().on(table.playerId, table.leagueId)]
);

export const playerHole = pgTable(
  "player_hole",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    holeId: uuid("hole_id")
      .notNull()
      .references(() => hole.id, { onDelete: "cascade" }),
    leagueEventId: uuid("league_event_id")
      .notNull()
      .references(() => leagueEvent.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    diff: integer("diff").notNull().default(0),
    createdDate: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
    updatedDate: timestamp("updated_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.playerId, table.holeId, table.leagueEventId)]
);

export const miniGameWin = pgTable("mini_game_win", {
  id: uuid("id").defaultRandom().primaryKey(),
  leagueEventId: uuid("league_event_id")
    .notNull()
    .references(() => leagueEvent.id, { onDelete: "cascade" }),
  holeId: uuid("hole_id")
    .notNull()
    .references(() => hole.id, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => player.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 64 }).notNull(),
  prize: varchar("prize", { length: 255 }),
  ...auditColumns,
});

export const playerRatingSnapshot = pgTable(
  "player_rating_snapshot",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => player.id, { onDelete: "cascade" }),
    leagueId: uuid("league_id")
      .notNull()
      .references(() => league.id, { onDelete: "cascade" }),
    leagueEventId: uuid("league_event_id")
      .notNull()
      .references(() => leagueEvent.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date"),
    rating: integer("rating").notNull(),
    ratingDelta: integer("rating_delta").notNull().default(0),
    roundDiff: integer("round_diff").notNull(),
    roundScore: integer("round_score").notNull(),
    placement: integer("placement").notNull(),
    fieldSize: integer("field_size").notNull(),
    holesPlayed: integer("holes_played").notNull(),
    createdDate: timestamp("created_date", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique().on(table.playerId, table.leagueEventId)]
);

export const playerRelations = relations(player, ({ many }) => ({
  playerLeagues: many(playerLeague),
  playerHoles: many(playerHole),
  miniGameWins: many(miniGameWin),
  ratingSnapshots: many(playerRatingSnapshot),
}));

export const courseRelations = relations(course, ({ many }) => ({
  holes: many(hole),
  leagueEvents: many(leagueEvent),
}));

export const holeRelations = relations(hole, ({ one, many }) => ({
  course: one(course, { fields: [hole.courseId], references: [course.id] }),
  playerHoles: many(playerHole),
  miniGameWins: many(miniGameWin),
}));

export const leagueRelations = relations(league, ({ many }) => ({
  leagueEvents: many(leagueEvent),
  playerLeagues: many(playerLeague),
}));

export const leagueEventRelations = relations(leagueEvent, ({ one, many }) => ({
  league: one(league, { fields: [leagueEvent.leagueId], references: [league.id] }),
  course: one(course, { fields: [leagueEvent.courseId], references: [course.id] }),
  playerHoles: many(playerHole),
  miniGameWins: many(miniGameWin),
  ratingSnapshots: many(playerRatingSnapshot),
}));

export const miniGameWinRelations = relations(miniGameWin, ({ one }) => ({
  player: one(player, { fields: [miniGameWin.playerId], references: [player.id] }),
  hole: one(hole, { fields: [miniGameWin.holeId], references: [hole.id] }),
  leagueEvent: one(leagueEvent, {
    fields: [miniGameWin.leagueEventId],
    references: [leagueEvent.id],
  }),
}));

export const playerRatingSnapshotRelations = relations(playerRatingSnapshot, ({ one }) => ({
  player: one(player, { fields: [playerRatingSnapshot.playerId], references: [player.id] }),
  league: one(league, { fields: [playerRatingSnapshot.leagueId], references: [league.id] }),
  leagueEvent: one(leagueEvent, {
    fields: [playerRatingSnapshot.leagueEventId],
    references: [leagueEvent.id],
  }),
}));

export const playerLeagueRelations = relations(playerLeague, ({ one }) => ({
  player: one(player, { fields: [playerLeague.playerId], references: [player.id] }),
  league: one(league, { fields: [playerLeague.leagueId], references: [league.id] }),
}));

export const playerHoleRelations = relations(playerHole, ({ one }) => ({
  player: one(player, { fields: [playerHole.playerId], references: [player.id] }),
  hole: one(hole, { fields: [playerHole.holeId], references: [hole.id] }),
  leagueEvent: one(leagueEvent, {
    fields: [playerHole.leagueEventId],
    references: [leagueEvent.id],
  }),
}));
