import { MiniGameIconBadge } from "@/components/mini-game-icon";
import { PlayerLink } from "@/components/player-link";
import {
  getCourseHoles,
  getEventHoleBreakdown,
  getEventMiniGameWins,
  getEventScores,
  getPublicLeagueEvent,
} from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";
import { buildMiniGameWinsByCell, miniGameCellKey } from "@/lib/mini-games";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, results, holeBreakdown, miniGameWins] = await Promise.all([
    getPublicLeagueEvent(id),
    getEventScores(id),
    getEventHoleBreakdown(id),
    getEventMiniGameWins(id),
  ]);
  const miniGamesByCell = buildMiniGameWinsByCell(miniGameWins);
  if (!event) return <div>Event not found.</div>;
  const courseHoles = await getCourseHoles(event.courseId);
  const holeInfoByNumber = new Map(courseHoles.map((h) => [h.holeNumber, { par: h.par, distanceFeet: h.distanceFeet }]));

  const holeNumbers = Array.from(new Set(holeBreakdown.map((r) => r.holeNumber))).sort((a, b) => a - b);
  const byPlayer = new Map<
    string,
    { displayName: string; holeScores: Map<number, { score: number; par: number }> }
  >();
  for (const row of holeBreakdown) {
    if (!byPlayer.has(row.playerId)) {
      byPlayer.set(row.playerId, { displayName: row.displayName, holeScores: new Map() });
    }
    byPlayer.get(row.playerId)!.holeScores.set(row.holeNumber, { score: row.score, par: row.par });
  }
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">{event.name}</h1>
      <p>{event.league?.name} at {event.course?.name}</p>
      <table className="w-full border bg-white text-sm">
        <thead><tr><th className="p-2 text-left">Player</th><th className="p-2 text-left">Score</th><th className="p-2 text-left">Diff</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.playerId} className="border-t">
              <td className="p-2">
                <PlayerLink playerId={r.playerId} displayName={r.displayName} />
              </td>
              <td className="p-2">{r.totalScore}</td>
              <td className="p-2">{formatDiff(r.totalDiff)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold">Hole-by-hole breakdown</h2>
      <div className="overflow-x-auto">
        <table className="w-full border bg-white text-sm">
          <thead>
            <tr>
              <th className="p-2 text-left">Player</th>
              {holeNumbers.map((holeNumber) => (
                <th key={holeNumber} className="p-2 text-center">
                  <div>{holeNumber}</div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Par {holeInfoByNumber.get(holeNumber)?.par ?? "-"} • {holeInfoByNumber
                      .get(holeNumber)
                      ?.distanceFeet?.toLocaleString() ?? "-"}ft
                  </div>
                </th>
              ))}
              <th className="p-2 text-center">Score</th>
              <th className="p-2 text-center">Diff</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(byPlayer.entries()).map(([playerId, playerData]) => (
              <tr key={playerId} className="border-t">
                <td className="p-2">
                  <PlayerLink playerId={playerId} displayName={playerData.displayName} />
                </td>
                {holeNumbers.map((holeNumber) => {
                  const entry = playerData.holeScores.get(holeNumber);
                  if (!entry) return <td key={holeNumber} className="p-2 text-center">-</td>;
                  const isBirdie = entry.score < entry.par;
                  const isEagleOrBetter = entry.score <= entry.par - 2;
                  const isBogey = entry.score > entry.par;
                  const bogeyAmount = entry.score - entry.par;
                  const isAce = entry.score === 1;
                  const cellWins = miniGamesByCell.get(miniGameCellKey(playerId, holeNumber)) ?? [];
                  return (
                    <td key={holeNumber} className="p-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                      {isAce ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-yellow-700 bg-yellow-200 text-yellow-900">
                          {entry.score}
                        </span>
                      ) : isEagleOrBetter ? (
                        <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-full border border-blue-800 bg-blue-200 text-blue-900">
                          <span className="absolute inset-[2px] rounded-full border border-blue-800" />
                          <span className="relative z-10">{entry.score}</span>
                        </span>
                      ) : isBirdie ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-sky-700 bg-sky-100 text-sky-900">
                          {entry.score}
                        </span>
                      ) : isBogey && bogeyAmount >= 2 ? (
                        <span className="relative inline-flex h-8 w-8 items-center justify-center border border-red-800 bg-red-200 text-red-950">
                          <span className="absolute inset-[2px] border border-red-800" />
                          <span className="relative z-10">{entry.score}</span>
                        </span>
                      ) : isBogey ? (
                        <span className="inline-flex h-7 w-7 items-center justify-center border border-red-700 bg-red-100 text-red-900">
                          {entry.score}
                        </span>
                      ) : (
                        <span>{entry.score}</span>
                      )}
                      {cellWins.length > 0 ? (
                        <span className="flex flex-wrap justify-center gap-0.5">
                          {cellWins.map((win, index) => (
                            <MiniGameIconBadge
                              key={`${win.kind}-${index}`}
                              kind={win.kind}
                              prize={win.prize}
                            />
                          ))}
                        </span>
                      ) : null}
                      </div>
                    </td>
                  );
                })}
                <td className="p-2 text-center font-medium">
                  {Array.from(playerData.holeScores.values()).reduce((sum, entry) => sum + entry.score, 0)}
                </td>
                <td className="p-2 text-center font-medium">
                  {(() => {
                    const totalDiff = Array.from(playerData.holeScores.values()).reduce(
                      (sum, entry) => sum + (entry.score - entry.par),
                      0
                    );
                    return formatDiff(totalDiff);
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
