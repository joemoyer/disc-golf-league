"use server";

import { revalidatePath } from "next/cache";
import { asc, eq, sql } from "drizzle-orm";
import * as XLSX from "xlsx";
import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { course, hole, league, leagueEvent, player, playerHole, playerLeague } from "@/lib/db/schema";

const required = (value: FormDataEntryValue | null) => (value ? String(value) : "");

export async function createPlayer(formData: FormData) {
  await db.insert(player).values({
    key: required(formData.get("key")),
    displayName: required(formData.get("displayName")),
    firstName: required(formData.get("firstName")),
    lastName: required(formData.get("lastName")),
    email: String(formData.get("email") || "") || null,
    rating: Number(formData.get("rating") || 0) || null,
  });
  revalidatePath("/admin/players");
}

export async function createCourse(formData: FormData) {
  await db.insert(course).values({
    key: required(formData.get("key")),
    name: required(formData.get("name")),
    location: String(formData.get("location") || "") || null,
    rating: Number(formData.get("rating") || 0) || null,
    slope: Number(formData.get("slope") || 0) || null,
  });
  revalidatePath("/admin/courses");
}

export async function toggleCourseActive(formData: FormData) {
  const courseId = required(formData.get("courseId"));
  const courseRecord = await db.query.course.findFirst({
    where: eq(course.id, courseId),
    columns: { id: true, isActive: true },
  });
  if (!courseRecord) return;
  await db.update(course).set({ isActive: !courseRecord.isActive, updatedDate: new Date() }).where(eq(course.id, courseId));
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

export async function createHole(formData: FormData) {
  const courseId = required(formData.get("courseId"));
  await db.insert(hole).values({
    courseId,
    holeNumber: Number(required(formData.get("holeNumber"))),
    par: Number(required(formData.get("par"))),
    distanceFeet: Number(formData.get("distanceFeet") || 0) || null,
  });
  revalidatePath(`/admin/courses/${courseId}/holes`);
  redirect(`/admin/courses/${courseId}/holes`);
}

export async function updateHole(formData: FormData) {
  const courseId = required(formData.get("courseId"));
  const holeId = required(formData.get("holeId"));
  await db
    .update(hole)
    .set({
      holeNumber: Number(required(formData.get("holeNumber"))),
      par: Number(required(formData.get("par"))),
      distanceFeet: Number(formData.get("distanceFeet") || 0) || null,
      updatedDate: new Date(),
    })
    .where(eq(hole.id, holeId));
  revalidatePath(`/admin/courses/${courseId}/holes`);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

export async function deleteHole(formData: FormData) {
  const courseId = required(formData.get("courseId"));
  const holeId = required(formData.get("holeId"));
  await db.delete(hole).where(eq(hole.id, holeId));
  revalidatePath(`/admin/courses/${courseId}/holes`);
  revalidatePath("/admin/courses");
  revalidatePath("/courses");
}

export async function createLeague(formData: FormData) {
  await db.insert(league).values({
    key: required(formData.get("key")),
    name: required(formData.get("name")),
    description: String(formData.get("description") || "") || null,
    startDate: String(formData.get("startDate") || "") || null,
    endDate: String(formData.get("endDate") || "") || null,
  });
  revalidatePath("/admin/leagues");
}

export async function toggleLeagueActive(formData: FormData) {
  const leagueId = required(formData.get("leagueId"));
  const leagueRecord = await db.query.league.findFirst({
    where: eq(league.id, leagueId),
    columns: { id: true, isActive: true },
  });
  if (!leagueRecord) return;
  await db.update(league).set({ isActive: !leagueRecord.isActive, updatedDate: new Date() }).where(eq(league.id, leagueId));
  revalidatePath("/admin/leagues");
  revalidatePath("/leagues");
  revalidatePath("/standings");
}

export async function createLeagueEvent(formData: FormData) {
  const leagueId = required(formData.get("leagueId"));
  await db.insert(leagueEvent).values({
    leagueId,
    courseId: required(formData.get("courseId")),
    key: required(formData.get("key")),
    name: required(formData.get("name")),
    eventDate: String(formData.get("eventDate") || "") || null,
  });
  revalidatePath(`/admin/leagues/${leagueId}/events`);
}

export async function assignPlayerToLeague(formData: FormData) {
  const leagueId = required(formData.get("leagueId"));
  await db
    .insert(playerLeague)
    .values({
      playerId: required(formData.get("playerId")),
      leagueId,
      joinedDate: String(formData.get("joinedDate") || "") || null,
    })
    .onConflictDoNothing();
  revalidatePath(`/admin/leagues/${leagueId}/events`);
}

export async function createPlayerHoleScore(formData: FormData) {
  const eventId = required(formData.get("leagueEventId"));
  const playerId = required(formData.get("playerId"));
  const holeId = required(formData.get("holeId"));
  const score = Number(required(formData.get("score")));
  const providedDiff = String(formData.get("diff") || "").trim();
  const event = await db.query.leagueEvent.findFirst({
    where: eq(leagueEvent.id, eventId),
    columns: { id: true, leagueId: true, courseId: true },
  });
  if (!event) {
    redirect("/admin/login?error=event_not_found");
  }
  const holeRecord = await db.query.hole.findFirst({
    where: eq(hole.id, holeId),
    columns: { id: true, courseId: true, par: true },
  });
  if (!holeRecord || holeRecord.courseId !== event.courseId) {
    redirect(`/admin/events/${eventId}/scores?error=${encodeURIComponent("Hole does not belong to this event course.")}`);
  }
  const diff = providedDiff === "" ? score - holeRecord.par : Number(providedDiff);
  await db
    .insert(playerHole)
    .values({
      playerId,
      holeId,
      leagueEventId: eventId,
      score,
      diff,
    })
    .onConflictDoUpdate({
      target: [playerHole.playerId, playerHole.holeId, playerHole.leagueEventId],
      set: { score, diff, updatedDate: new Date() },
    });
  await db
    .insert(playerLeague)
    .values({ playerId, leagueId: event.leagueId })
    .onConflictDoNothing();
  revalidatePath(`/admin/events/${eventId}/scores`);
}

type SpreadsheetRow = {
  name?: string;
  username?: string;
  [key: `hole_${number}`]: number | string | undefined;
};

const toKey = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
const redirectImportError = (message: string): never =>
  redirect(`/admin/import?error=${encodeURIComponent(message)}`);

export async function importEventSpreadsheet(formData: FormData) {
  const selectedEventId = String(formData.get("leagueEventId") || "").trim();
  const explicitCreateNewEvent = String(formData.get("createNewEvent") || "") === "on";
  const file = formData.get("file");

  const importFile =
    file instanceof File && file.size > 0
      ? file
      : redirectImportError("Please select an .xlsx file to import.");

  let targetEventId = selectedEventId;
  const hasNewEventFields =
    String(formData.get("newEventName") || "").trim().length > 0 ||
    String(formData.get("newLeagueId") || "").trim().length > 0 ||
    String(formData.get("newCourseId") || "").trim().length > 0;
  const createNewEvent = explicitCreateNewEvent || (!targetEventId && hasNewEventFields);

  if (!targetEventId && !createNewEvent) {
    redirectImportError("Select an existing event or choose create new event.");
  }

  if (!targetEventId && createNewEvent) {
    const leagueId = required(formData.get("newLeagueId"));
    const courseId = required(formData.get("newCourseId"));
    const eventName = required(formData.get("newEventName"));
    const eventDate = String(formData.get("newEventDate") || "") || null;
    const eventKeyInput = String(formData.get("newEventKey") || "").trim();
    const eventKey = eventKeyInput || `${toKey(eventName)}-${eventDate ?? "undated"}`;

    if (!leagueId || !courseId || !eventName) {
      redirectImportError("New event requires league, course, and event name.");
    }

    const [createdEvent] = await db
      .insert(leagueEvent)
      .values({
        leagueId,
        courseId,
        key: eventKey,
        name: eventName,
        eventDate,
      })
      .returning({ id: leagueEvent.id });
    targetEventId = createdEvent.id;
  }

  const event = await db.query.leagueEvent.findFirst({
    where: eq(leagueEvent.id, targetEventId),
    columns: { id: true, leagueId: true, courseId: true },
  });

  const ensuredEvent = event ?? redirectImportError("Selected event could not be found.");

  const courseHoles = await db.query.hole.findMany({
    where: eq(hole.courseId, ensuredEvent.courseId),
    columns: { id: true, holeNumber: true, par: true },
    orderBy: asc(hole.holeNumber),
  });

  const holeByNumber = new Map(courseHoles.map((h) => [h.holeNumber, h]));
  if (holeByNumber.size === 0) {
    redirectImportError("Selected event's course has no holes. Add holes before importing.");
  }

  const buffer = Buffer.from(await importFile.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    redirectImportError("Spreadsheet has no sheets.");
  }

  const worksheet = workbook.Sheets[firstSheet];
  const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(worksheet, { defval: "" });
  if (rows.length === 0) {
    redirectImportError("Spreadsheet has no data rows.");
  }

  for (const row of rows) {
    const username = String(row.username || "").trim();
    const fullName = String(row.name || "").trim();
    if (!username) continue;

    let existingPlayer = await db.query.player.findFirst({
      where: eq(player.key, username),
      columns: { id: true },
    });

    if (!existingPlayer) {
      const nameParts = fullName.split(" ").filter(Boolean);
      const firstName = nameParts[0] ?? username;
      const lastName = nameParts.slice(1).join(" ") || username;
      const [createdPlayer] = await db
        .insert(player)
        .values({
          key: username,
          displayName: fullName || username,
          firstName,
          lastName,
        })
        .returning({ id: player.id });
      existingPlayer = createdPlayer;
    }

    await db
      .insert(playerLeague)
      .values({
        playerId: existingPlayer.id,
        leagueId: ensuredEvent.leagueId,
      })
      .onConflictDoNothing();

    for (let holeNumber = 1; holeNumber <= 18; holeNumber += 1) {
      const scoreRaw = row[`hole_${holeNumber}`];
      if (scoreRaw === "" || scoreRaw === undefined || scoreRaw === null) continue;
      const mappedHole = holeByNumber.get(holeNumber);
      if (!mappedHole) continue;

      const score = Number(scoreRaw);
      if (!Number.isFinite(score)) continue;

      await db
        .insert(playerHole)
        .values({
          playerId: existingPlayer.id,
          holeId: mappedHole.id,
          leagueEventId: ensuredEvent.id,
          score,
          diff: score - mappedHole.par,
        })
        .onConflictDoUpdate({
          target: [playerHole.playerId, playerHole.holeId, playerHole.leagueEventId],
          set: {
            score,
            diff: score - mappedHole.par,
            updatedDate: new Date(),
          },
        });
    }
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/events/${ensuredEvent.id}/scores`);
  revalidatePath(`/events/${ensuredEvent.id}`);
  revalidatePath("/standings");
}

export async function recomputeAllDiffs() {
  const result = await db.execute(sql<{ corrected: number }>`
    with updated as (
      update ${playerHole} ph
      set diff = ph.score - h.par,
          updated_date = now()
      from ${hole} h
      where h.id = ph.hole_id
        and ph.diff is distinct from (ph.score - h.par)
      returning 1
    )
    select count(*)::int as corrected from updated
  `);
  const corrected = result[0]?.corrected ?? 0;

  revalidatePath("/standings");
  revalidatePath("/admin");
  redirect(`/admin?maintenance=diff_recomputed&corrected=${corrected}`);
}
