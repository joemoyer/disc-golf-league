import Link from "next/link";
import { assignPlayerToLeague, createLeagueEvent } from "@/lib/actions";
import { getCourses, getLeagueEvents, getPlayers } from "@/lib/db/queries";

export default async function AdminLeagueEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [events, courses, players] = await Promise.all([getLeagueEvents(id), getCourses(), getPlayers()]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">League Events</h1>
      <form action={createLeagueEvent} className="grid grid-cols-2 gap-2 rounded border bg-white p-3">
        <input type="hidden" name="leagueId" value={id} />
        <input className="rounded border p-2" name="key" placeholder="event key" required />
        <input className="rounded border p-2" name="name" placeholder="event name" required />
        <select className="rounded border p-2" name="courseId" required>
          {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="rounded border p-2" name="eventDate" type="date" />
        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white">Add Event</button>
      </form>

      <form action={assignPlayerToLeague} className="grid grid-cols-3 gap-2 rounded border bg-white p-3">
        <input type="hidden" name="leagueId" value={id} />
        <select className="rounded border p-2" name="playerId" required>
          {players.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}
        </select>
        <input className="rounded border p-2" name="joinedDate" type="date" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white">Assign Player</button>
      </form>

      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded border bg-white p-3">
            <Link href={`/admin/events/${e.id}/scores`} className="font-medium">{e.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
