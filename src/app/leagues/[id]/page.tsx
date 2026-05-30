import Link from "next/link";
import { Pagination } from "@/components/pagination";
import {
  getLeagueById,
  getLeaguePlayersWithRoundsPaginated,
  getLeagueRecentEventsPaginated,
} from "@/lib/db/queries";

type LeagueDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ eventsPage?: string; playersPage?: string }>;
};

export default async function LeagueDetailPage({ params, searchParams }: LeagueDetailPageProps) {
  const { id } = await params;
  const { eventsPage: eventsPageParam, playersPage: playersPageParam } = await searchParams;
  const eventsPage = Math.max(1, Number(eventsPageParam) || 1);
  const playersPage = Math.max(1, Number(playersPageParam) || 1);

  const [league, eventsResult, playersResult] = await Promise.all([
    getLeagueById(id),
    getLeagueRecentEventsPaginated(id, { page: eventsPage }),
    getLeaguePlayersWithRoundsPaginated(id, { page: playersPage }),
  ]);

  if (!league) return <div>League not found.</div>;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{league.name}</h1>
        <p className="text-slate-600">{league.description ?? "No description"}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Recent Events</h2>
        {eventsResult.totalCount === 0 ? (
          <p className="text-sm text-slate-600">No events yet.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {eventsResult.events.map((event) => (
                <li key={event.id} className="rounded border bg-white p-3">
                  <Link href={`/events/${event.id}`} className="font-medium text-sky-700 hover:underline">
                    {event.name}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {event.eventDate ?? "Date TBD"} · {event.courseName}
                  </p>
                </li>
              ))}
            </ul>
            <Pagination
              page={eventsResult.page}
              totalPages={eventsResult.totalPages}
              basePath={`/leagues/${id}`}
              pageParam="eventsPage"
              searchParams={{ playersPage: playersPageParam }}
            />
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Players</h2>
        {playersResult.totalCount === 0 ? (
          <p className="text-sm text-slate-600">No players with rounds yet.</p>
        ) : (
          <>
            <ul className="space-y-2">
              {playersResult.players.map((player) => (
                <li key={player.playerId} className="rounded border bg-white p-3">
                  <Link href={`/players/${player.playerId}`} className="font-medium text-sky-700 hover:underline">
                    {player.displayName}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {player.eventsPlayed} event{player.eventsPlayed === 1 ? "" : "s"} played
                  </p>
                </li>
              ))}
            </ul>
            <Pagination
              page={playersResult.page}
              totalPages={playersResult.totalPages}
              basePath={`/leagues/${id}`}
              pageParam="playersPage"
              searchParams={{ eventsPage: eventsPageParam }}
            />
          </>
        )}
      </section>
    </section>
  );
}
