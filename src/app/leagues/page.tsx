import Link from "next/link";
import { getLeagues } from "@/lib/db/queries";

export default async function LeaguesPage() {
  const leagues = await getLeagues();
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Leagues</h1>
      <ul className="space-y-2">
        {leagues.map((l) => (
          <li key={l.id} className="rounded border bg-white p-3">
            <Link href={`/leagues/${l.id}`}>{l.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
