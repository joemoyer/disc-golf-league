import Link from "next/link";
import { eq } from "drizzle-orm";
import { PlayerLink } from "@/components/player-link";
import { createPlayerHoleScore } from "@/lib/actions";
import { db } from "@/lib/db/client";
import { RoundDiffCellContent } from "@/components/round-diff-cell";
import { RoundScoreCell } from "@/components/round-score-cell";
import { getEventScores } from "@/lib/db/queries";
import { hole, leagueEvent, player, playerLeague } from "@/lib/db/schema";

export default async function AdminEventScoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const event = await db.query.leagueEvent.findFirst({ where: eq(leagueEvent.id, id) });
  if (!event) return <div>Event not found.</div>;

  const [holes, playerAssignments, results] = await Promise.all([
    db.query.hole.findMany({ where: eq(hole.courseId, event.courseId) }),
    db
      .select({ id: player.id, displayName: player.displayName })
      .from(playerLeague)
      .innerJoin(player, eq(player.id, playerLeague.playerId))
      .where(eq(playerLeague.leagueId, event.leagueId)),
    getEventScores(id),
  ]);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Event Scores</h1>
        <Link
          href={`/admin/events/${id}/mini-games`}
          className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
        >
          Mini games →
        </Link>
      </div>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}
      <form action={createPlayerHoleScore} className="grid grid-cols-5 gap-2 rounded border bg-white p-3">
        <input type="hidden" name="leagueEventId" value={id} />
        <select className="rounded border p-2" name="playerId">{playerAssignments.map((p) => <option key={p.id} value={p.id}>{p.displayName}</option>)}</select>
        <select className="rounded border p-2" name="holeId">{holes.map((h) => <option key={h.id} value={h.id}>Hole {h.holeNumber}</option>)}</select>
        <input className="rounded border p-2" type="number" name="score" placeholder="score" required />
        <input className="rounded border p-2" type="number" name="diff" placeholder="diff (optional)" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white">Add Score</button>
      </form>
      <table className="w-full border bg-white text-sm">
        <thead><tr><th className="p-2 text-left">Player</th><th className="p-2 text-left">Strokes</th><th className="p-2 text-left">Diff</th><th className="p-2 text-left">Holes</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.playerId} className="border-t">
              <td className="p-2">
                <PlayerLink playerId={r.playerId} displayName={r.displayName} />
              </td>
              <td className="p-2">
                <RoundScoreCell score={Number(r.totalScore)} isDnf={r.isDnf} />
              </td>
              <td className="p-2">
                <RoundDiffCellContent diff={Number(r.totalDiff)} isDnf={r.isDnf} />
              </td>
              <td className="p-2">
                {r.holesPlayed}/{r.expectedHoleCount}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
