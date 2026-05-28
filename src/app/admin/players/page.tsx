import { createPlayer } from "@/lib/actions";
import { getPlayers } from "@/lib/db/queries";
import { PLAYER_RATINGS_ENABLED } from "@/lib/ratings/enabled";

export default async function AdminPlayersPage() {
  const players = await getPlayers();

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Players</h1>
      <form action={createPlayer} className="grid grid-cols-2 gap-2 rounded border bg-white p-3">
        <input className="rounded border p-2" name="key" placeholder="key" required />
        <input className="rounded border p-2" name="displayName" placeholder="display name" required />
        <input className="rounded border p-2" name="firstName" placeholder="first name" required />
        <input className="rounded border p-2" name="lastName" placeholder="last name" required />
        <input className="rounded border p-2" name="email" placeholder="email" />
        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white">Add Player</button>
      </form>
      <table className="w-full border bg-white text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left">Name</th>
            <th className="p-2 text-left">Email</th>
            {PLAYER_RATINGS_ENABLED ? <th className="p-2 text-left">Rating</th> : null}
          </tr>
        </thead>
        <tbody>
          {players.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-2">{p.displayName}</td>
              <td className="p-2">{p.email ?? "-"}</td>
              {PLAYER_RATINGS_ENABLED ? <td className="p-2">{p.rating}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
