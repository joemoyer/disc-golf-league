import Link from "next/link";
import { getPlayers } from "@/lib/db/queries";

export default async function PlayersPage() {
  const players = await getPlayers();
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Players</h1>
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id} className="rounded border bg-white p-3">
            <Link href={`/players/${p.id}`}>{p.displayName}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
