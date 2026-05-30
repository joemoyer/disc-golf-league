import Link from "next/link";
// import { RatingHistoryChart } from "@/components/rating-history-chart";
import { Pagination } from "@/components/pagination";
import { RoundDiffCellContent } from "@/components/round-diff-cell";
import { RoundScoreCell } from "@/components/round-score-cell";
import { StatCardTitle } from "@/components/stat-icon";
import { MiniGameIcon } from "@/components/mini-game-icon";
import { getPlayerPageData, isPlayerBestRound } from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";
import { PLAYER_RATINGS_ENABLED } from "@/lib/ratings/enabled";

type PlayerDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ leagueId?: string; page?: string }>;
};

export default async function PlayerDetailPage({ params, searchParams }: PlayerDetailPageProps) {
  const { id } = await params;
  const { leagueId, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const data = await getPlayerPageData(id, { leagueId, eventsPage: page });
  if (!data) return <div>Player not found.</div>;

  const { player, recentEvents, recentEventsPagination, stats } = data;

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{player.displayName}</h1>
      <p>
        {player.firstName} {player.lastName}
      </p>
      <p>{player.key ? `Udisc Account: @${player.key}` : "No Udisc Account"}</p>
      {PLAYER_RATINGS_ENABLED ? (
        <p className="text-lg">
          <span className="font-medium text-slate-600">Rating:</span> {player.rating}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded border bg-white p-4">
          <StatCardTitle kind="best_hole">Best Hole</StatCardTitle>
          <p className="mt-1 text-lg font-semibold">
            {stats.bestHole ? `Hole ${stats.bestHole.holeNumber}` : "-"}
          </p>
          {stats.bestHole ? (
            <p className="text-sm">
              <Link href={`/courses/${stats.bestHole.courseId}`} className="text-sky-700 hover:underline">
                {stats.bestHole.courseName}
              </Link>
            </p>
          ) : null}
          <p className="text-sm text-slate-600">
            Avg diff:{" "}
            {stats.bestHole ? formatDiff(Math.round(stats.bestHole.avgDiff * 10) / 10) : "-"}
          </p>
        </article>
        <article className="rounded border bg-white p-4">
          <StatCardTitle kind="best_round">Best Round</StatCardTitle>
          <p className="mt-1 text-lg font-semibold">
            {stats.bestRound ? formatDiff(stats.bestRound.roundDiff) : "-"}
          </p>
          {stats.bestRound ? (
            <>
              <p className="text-sm">
                <Link href={`/events/${stats.bestRound.leagueEventId}`} className="text-sky-700 hover:underline">
                  {stats.bestRound.eventName}
                </Link>
              </p>
              <p className="text-sm text-slate-600">{stats.bestRound.courseName}</p>
            </>
          ) : (
            <p className="text-sm text-slate-600">No rounds yet</p>
          )}
        </article>
        <article className="rounded border bg-white p-4">
          <StatCardTitle kind="birdie">Birdies</StatCardTitle>
          <p className="mt-1 text-lg font-semibold">{stats.birdieCount}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <StatCardTitle kind="ace">Aces</StatCardTitle>
          <p className="mt-1 text-lg font-semibold">{stats.aceCount}</p>
        </article>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <MiniGameIcon kind="closest_to_pin" className="h-4 w-4" />
            CTPs
          </h2>
          <p className="mt-1 text-lg font-semibold">{stats.ctpCount}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <MiniGameIcon kind="longest_putt" className="h-4 w-4" />
            Longest Putts
          </h2>
          <p className="mt-1 text-lg font-semibold">{stats.longestPuttCount}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-600">
            <MiniGameIcon kind="shortest_drive" className="h-4 w-4" />
            Shortest Drives
          </h2>
          <p className="mt-1 text-lg font-semibold">{stats.shortestDriveCount}</p>
        </article>
      </div>

      <div>
        <h2 className="mb-2 text-lg font-semibold">Recent Events</h2>
        {recentEventsPagination.totalCount === 0 ? (
          <p className="text-sm text-slate-600">No events yet.</p>
        ) : (
          <>
            <p className="mb-2 text-sm text-slate-600">
              Showing {recentEvents.length} of {recentEventsPagination.totalCount} events
            </p>
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
                    <td className="p-2">
                      <RoundScoreCell score={event.totalScore} isDnf={event.isDnf} />
                    </td>
                    <td className="p-2">
                      <RoundDiffCellContent
                        diff={event.totalDiff}
                        isDnf={event.isDnf}
                        isBestRound={
                          !event.isDnf && isPlayerBestRound(event.leagueEventId, stats.bestRound?.leagueEventId)
                        }
                      />
                    </td>
                    <td className="p-2">{event.holesPlayed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination
              page={recentEventsPagination.page}
              totalPages={recentEventsPagination.totalPages}
              basePath={`/players/${id}`}
              searchParams={{ leagueId }}
            />
          </>
        )}
      </div>
    </section>
  );
}
