import { HoleScoreCellContent } from "@/components/hole-score-cell";
import { PlayerLink } from "@/components/player-link";
import { RoundDiffCellContent } from "@/components/round-diff-cell";
import {
  getBestRoundEventIdForPlayers,
  getCourseHoles,
  getEventHoleBreakdown,
  getEventMiniGameWins,
  getEventScores,
  getPublicLeagueEvent,
  isPlayerBestRound,
} from "@/lib/db/queries";
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
  const bestRoundEventIds = await getBestRoundEventIdForPlayers(results.map((row) => row.playerId));
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
  const diffByPlayer = new Map(results.map((r) => [r.playerId, Number(r.totalDiff)]));
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
              <td className="p-2">
                <RoundDiffCellContent
                  diff={Number(r.totalDiff)}
                  isBestRound={isPlayerBestRound(id, bestRoundEventIds.get(r.playerId))}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="text-lg font-semibold">Event Scorecard</h2>
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
            {Array.from(byPlayer.entries()).map(([playerId, playerData]) => {
              const totalDiff = diffByPlayer.get(playerId) ?? 0;
              const isBestRound = isPlayerBestRound(id, bestRoundEventIds.get(playerId));

              return (
              <tr key={playerId} className="border-t">
                <td className="p-2">
                  <PlayerLink playerId={playerId} displayName={playerData.displayName} />
                </td>
                {holeNumbers.map((holeNumber) => {
                  const entry = playerData.holeScores.get(holeNumber);
                  const cellWins = miniGamesByCell.get(miniGameCellKey(playerId, holeNumber)) ?? [];
                  return (
                    <td key={holeNumber} className="p-2 text-center">
                      {entry ? (
                        <HoleScoreCellContent
                          score={entry.score}
                          par={entry.par}
                          miniGameWins={cellWins}
                        />
                      ) : (
                        "-"
                      )}
                    </td>
                  );
                })}
                <td className="p-2 text-center font-medium">
                  {Array.from(playerData.holeScores.values()).reduce((sum, entry) => sum + entry.score, 0)}
                </td>
                <td className="p-2 text-center font-medium">
                  <RoundDiffCellContent diff={totalDiff} isBestRound={isBestRound} />
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
