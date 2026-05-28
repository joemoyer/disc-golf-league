import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { course, hole, league, leagueEvent, player, playerHole, playerLeague } from "@/lib/db/schema";

const main = async () => {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  const [existingLeague] = await db.select().from(league).where(eq(league.key, "summer-2026")).limit(1);
  if (existingLeague) {
    await client.end();
    return;
  }

  const [seedLeague] = await db
    .insert(league)
    .values({
      key: "summer-2026",
      name: "Summer 2026 League",
      description: "Local weekly singles league",
      startDate: "2026-05-01",
      endDate: "2026-08-31",
    })
    .returning();

  const [seedCourse] = await db
    .insert(course)
    .values({ key: "maple-hill-short", name: "Maple Hill Short Layout", location: "Leicester, MA" })
    .returning();

  const holeRows = await db
    .insert(hole)
    .values(
      Array.from({ length: 18 }, (_, i) => ({
        courseId: seedCourse.id,
        holeNumber: i + 1,
        par: 3,
        distanceFeet: 220 + i * 10,
      }))
    )
    .returning();

  const players = await db
    .insert(player)
    .values([
      { key: "joe-moyer", displayName: "Joe Moyer", firstName: "Joe", lastName: "Moyer", email: "joe@example.com" },
      { key: "alex-rivera", displayName: "Alex Rivera", firstName: "Alex", lastName: "Rivera", email: "alex@example.com" },
      { key: "sam-nguyen", displayName: "Sam Nguyen", firstName: "Sam", lastName: "Nguyen", email: "sam@example.com" },
      { key: "taylor-brooks", displayName: "Taylor Brooks", firstName: "Taylor", lastName: "Brooks", email: "taylor@example.com" },
    ])
    .returning();

  await db.insert(playerLeague).values(
    players.map((p) => ({
      playerId: p.id,
      leagueId: seedLeague.id,
      joinedDate: "2026-05-01",
    }))
  );

  const [event] = await db
    .insert(leagueEvent)
    .values({
      leagueId: seedLeague.id,
      courseId: seedCourse.id,
      key: "summer-2026-week-1",
      name: "Week 1",
      eventDate: "2026-05-07",
    })
    .returning();

  const scoreRows = players.flatMap((p, playerIndex) =>
    holeRows.map((h, holeIndex) => {
      const score = h.par + ((playerIndex + holeIndex) % 2);
      return {
        playerId: p.id,
        holeId: h.id,
        leagueEventId: event.id,
        score,
        diff: score - h.par,
      };
    })
  );

  await db.insert(playerHole).values(scoreRows);
  await client.end();
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
