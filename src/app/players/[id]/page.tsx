import Link from "next/link";
import { getPlayerById, getPlayerRecentEvents } from "@/lib/db/queries";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, recentEvents] = await Promise.all([getPlayerById(id), getPlayerRecentEvents(id)]);
  if (!player) return <div>Player not found.</div>;
  const formatDiff = (value: number | string) => {
    const n = Number(value);
    if (n === 0) return "E";
    return n > 0 ? `+${n}` : `${n}`;
  };
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{player.displayName}</h1>
      <p>{player.firstName} {player.lastName}</p>
      <p>{player.email ?? "No email"}</p>
      <p>Rating: {player.rating ?? "-"}</p>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent Events</h2>
        <table className="w-full border bg-white text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Event</th>
              <th className="p-2 text-left">Course</th>
              <th className="p-2 text-left">Score</th>
              <th className="p-2 text-left">Diff</th>
              <th className="p-2 text-left">Holes</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map((event) => (
              <tr key={event.leagueEventId} className="border-t">
                <td className="p-2">{event.eventDate ?? "-"}</td>
                <td className="p-2">
                  <Link href={`/events/${event.leagueEventId}`}>{event.eventName}</Link>
                </td>
                <td className="p-2">{event.courseName}</td>
                <td className="p-2">{event.totalScore}</td>
                <td className="p-2">{formatDiff(event.totalDiff)}</td>
                <td className="p-2">{event.holesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
