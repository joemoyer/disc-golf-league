import Link from "next/link";
import { getPlayerById, getPlayerRecentEvents, getPlayerStats } from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, recentEvents, stats] = await Promise.all([
    getPlayerById(id),
    getPlayerRecentEvents(id),
    getPlayerStats(id),
  ]);
  if (!player) return <div>Player not found.</div>;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{player.displayName}</h1>
      <p>
        {player.firstName} {player.lastName}
      </p>
      <p>{player.key ? "Udisc Account: @" + player.key : "No Udisc Account"}</p>
      <p>Rating: {player.rating ?? "N/A"}</p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Best Hole</h2>
          <p className="mt-1 text-lg font-semibold">
            {stats.bestHole ? `Hole ${stats.bestHole.holeNumber}` : "-"}
          </p>
          <p className="text-sm text-slate-600">
            Avg diff:{" "}
            {stats.bestHole ? formatDiff(Math.round(stats.bestHole.avgDiff * 10) / 10) : "-"}
          </p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Best Round</h2>
          <p className="mt-1 text-lg font-semibold">
            {stats.bestRound ? formatDiff(stats.bestRound.roundDiff) : "-"}
          </p>
          {stats.bestRound ? (
            <p className="text-sm">
              <Link href={`/events/${stats.bestRound.leagueEventId}`} className="text-sky-700 hover:underline">
                {stats.bestRound.eventName}
              </Link>
            </p>
          ) : (
            <p className="text-sm text-slate-600">No rounds yet</p>
          )}
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Birdies</h2>
          <p className="mt-1 text-lg font-semibold">{stats.birdieCount}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Aces</h2>
          <p className="mt-1 text-lg font-semibold">{stats.aceCount}</p>
        </article>
      </div>

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
