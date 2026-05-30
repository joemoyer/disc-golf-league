"use client";

import Link from "next/link";
import { useState } from "react";
import { ImportSubmitButton } from "@/components/import-submit-button";
import { importEventSpreadsheet } from "@/lib/actions";

type Option = { id: string; name: string; eventDate?: string | null };
type SimpleOption = { id: string; name: string };

type EventImportFormProps = {
  events: Option[];
  leagues: SimpleOption[];
  courses: SimpleOption[];
  error?: string;
  imported?: string;
  eventId?: string;
  players?: string;
  scores?: string;
};

export function EventImportForm({
  events,
  leagues,
  courses,
  error,
  imported,
  eventId,
  players,
  scores,
}: EventImportFormProps) {
  const [createNewEvent, setCreateNewEvent] = useState(false);

  return (
    <form action={importEventSpreadsheet} className="space-y-4 rounded border bg-white p-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium">Excel File (.xlsx)</label>
        <input className="w-full rounded border p-2" type="file" name="file" accept=".xlsx" required />
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {imported === "1" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Import complete — {players ?? "0"} players, {scores ?? "0"} hole scores saved.
          {eventId ? (
            <>
              {" "}
              <Link href={`/admin/events/${eventId}/scores`} className="font-medium underline">
                View event scores
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          name="createNewEvent"
          checked={createNewEvent}
          onChange={(event) => setCreateNewEvent(event.target.checked)}
        />
        Create new event instead
      </label>

      {!createNewEvent ? (
        <div className="space-y-1">
          <label className="block text-sm font-medium">Use Existing Event</label>
          <select className="w-full rounded border p-2" name="leagueEventId" defaultValue="">
            <option value="">-- Select event --</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} {event.eventDate ? `(${event.eventDate})` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="rounded border border-slate-200 p-3">
          <div className="mt-1 grid grid-cols-2 gap-2">
            <input className="rounded border p-2" name="newEventName" placeholder="New event name" />
            <input className="rounded border p-2" name="newEventKey" placeholder="New event key (optional)" />
            <input className="rounded border p-2" name="newEventDate" type="date" />
            <div />
            <select className="rounded border p-2" name="newLeagueId" defaultValue="">
              <option value="">-- Select league --</option>
              {leagues.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select className="rounded border p-2" name="newCourseId" defaultValue="">
              <option value="">-- Select course --</option>
              {courses.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <ImportSubmitButton />
    </form>
  );
}
