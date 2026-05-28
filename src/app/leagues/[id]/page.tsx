import Link from "next/link";
import { getLeagueById, getLeagueEvents } from "@/lib/db/queries";

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [league, events] = await Promise.all([getLeagueById(id), getLeagueEvents(id)]);
  if (!league) return <div>League not found.</div>;

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">{league.name}</h1>
      <p>{league.description ?? "No description"}</p>
      <ul className="space-y-2">
        {events.map((e) => (
          <li key={e.id} className="rounded border bg-white p-3">
            <Link href={`/events/${e.id}`}>{e.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
