import Link from "next/link";
import { createLeague, toggleLeagueActive } from "@/lib/actions";
import { getLeagues } from "@/lib/db/queries";

export default async function AdminLeaguesPage() {
  const leagues = await getLeagues();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Leagues</h1>
      <form action={createLeague} className="grid grid-cols-2 gap-2 rounded border bg-white p-3">
        <input className="rounded border p-2" name="key" placeholder="key" required />
        <input className="rounded border p-2" name="name" placeholder="name" required />
        <input className="col-span-2 rounded border p-2" name="description" placeholder="description" />
        <input className="rounded border p-2" name="startDate" type="date" />
        <input className="rounded border p-2" name="endDate" type="date" />
        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white">Add League</button>
      </form>
      <ul className="space-y-2">
        {leagues.map((l) => (
          <li key={l.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/leagues/${l.id}/events`} className="font-medium">{l.name}</Link>
              <form action={toggleLeagueActive}>
                <input type="hidden" name="leagueId" value={l.id} />
                <button className="rounded border px-2 py-1 text-xs" type="submit">
                  {l.isActive ? "Disable" : "Enable"}
                </button>
              </form>
            </div>
            <div className="text-xs text-slate-600">{l.isActive ? "Active" : "Inactive"}</div>
          </li>
        ))}
      </ul>
    </section>
  );
}
