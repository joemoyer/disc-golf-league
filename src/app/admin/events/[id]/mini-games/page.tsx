import Link from "next/link";
import { eq } from "drizzle-orm";
import { MiniGameIcon } from "@/components/mini-game-icon";
import { PlayerLink } from "@/components/player-link";
import { createMiniGameWin, deleteMiniGameWin } from "@/lib/actions";
import { db } from "@/lib/db/client";
import { getEventMiniGameWins, getEventScores } from "@/lib/db/queries";
import { hole, leagueEvent } from "@/lib/db/schema";
import { getMiniGameLabel, MINI_GAME_KINDS } from "@/lib/mini-games";

export default async function AdminEventMiniGamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;

  const event = await db.query.leagueEvent.findFirst({
    where: eq(leagueEvent.id, id),
    with: { league: true, course: true },
  });
  if (!event) return <div>Event not found.</div>;

  const [holes, eventPlayers, wins] = await Promise.all([
    db.query.hole.findMany({
      where: eq(hole.courseId, event.courseId),
      orderBy: (h, { asc }) => [asc(h.holeNumber)],
    }),
    getEventScores(id),
    getEventMiniGameWins(id),
  ]);

  const winsByHole = new Map<number, typeof wins>();
  for (const win of wins) {
    const group = winsByHole.get(win.holeNumber) ?? [];
    group.push(win);
    winsByHole.set(win.holeNumber, group);
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-600">
            <Link href={`/admin/leagues/${event.leagueId}/events`} className="underline">
              {event.league?.name}
            </Link>
            {" · "}
            <Link href={`/admin/events/${id}/scores`} className="underline">
              Scores
            </Link>
          </p>
          <h1 className="text-xl font-semibold">Mini Games — {event.name}</h1>
          <p className="text-sm text-slate-600">{event.course?.name}</p>
        </div>
        <Link
          href={`/events/${id}`}
          className="rounded border bg-white px-3 py-2 text-sm hover:bg-slate-50"
          target="_blank"
          rel="noreferrer"
        >
          View public event →
        </Link>
      </div>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded border bg-white p-4">
        <h2 className="mb-2 font-semibold">Icon legend</h2>
        <ul className="flex flex-wrap gap-4 text-sm text-slate-700">
          {MINI_GAME_KINDS.map((entry) => (
            <li key={entry.kind} className="flex items-center gap-2">
              <span className="rounded bg-slate-100 p-1">
                <MiniGameIcon kind={entry.kind} className="h-4 w-4" />
              </span>
              {entry.label}
            </li>
          ))}
        </ul>
      </div>

      <form action={createMiniGameWin} className="space-y-3 rounded border bg-white p-4">
        <h2 className="font-semibold">Record a winner</h2>
        <input type="hidden" name="leagueEventId" value={id} />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Mini game</span>
            <select className="w-full rounded border p-2" name="kind" required>
              {MINI_GAME_KINDS.map((entry) => (
                <option key={entry.kind} value={entry.kind}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Hole</span>
            <select className="w-full rounded border p-2" name="holeId" required>
              {holes.map((h) => (
                <option key={h.id} value={h.id}>
                  Hole {h.holeNumber} (par {h.par})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Winner</span>
            <select
              className="w-full rounded border p-2"
              name="playerId"
              required
              disabled={eventPlayers.length === 0}
            >
              {eventPlayers.length === 0 ? (
                <option value="">No scored players for this event</option>
              ) : (
                eventPlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId}>
                    {p.displayName}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Prize (optional)</span>
            <input
              className="w-full rounded border p-2"
              name="prize"
              placeholder='e.g. "$5", beer, CTP pot'
            />
          </label>
        </div>
        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-50"
          type="submit"
          disabled={eventPlayers.length === 0}
        >
          Add winner
        </button>
        <p className="text-xs text-slate-500">
          Ties are supported — add another row with the same hole and game type for a co-winner.
        </p>
      </form>

      <div className="rounded border bg-white">
        <h2 className="border-b px-4 py-3 font-semibold">
          Recorded wins ({wins.length})
        </h2>
        {wins.length === 0 ? (
          <p className="px-4 py-6 text-sm text-slate-500">No mini game winners yet for this event.</p>
        ) : (
          <div className="divide-y">
            {Array.from(winsByHole.entries())
              .sort(([a], [b]) => a - b)
              .map(([holeNumber, holeWins]) => (
                <div key={holeNumber} className="px-4 py-3">
                  <h3 className="mb-2 text-sm font-medium text-slate-700">Hole {holeNumber}</h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500">
                        <th className="pb-1 pr-2">Game</th>
                        <th className="pb-1 pr-2">Winner</th>
                        <th className="pb-1 pr-2">Prize</th>
                        <th className="pb-1" />
                      </tr>
                    </thead>
                    <tbody>
                      {holeWins.map((win) => (
                        <tr key={win.id} className="border-t border-slate-100">
                          <td className="py-2 pr-2">
                            <span className="inline-flex items-center gap-2">
                              <MiniGameIcon kind={win.kind} className="h-4 w-4" />
                              {getMiniGameLabel(win.kind)}
                            </span>
                          </td>
                          <td className="py-2 pr-2">
                            <PlayerLink playerId={win.playerId} displayName={win.displayName} />
                          </td>
                          <td className="py-2 pr-2 text-slate-600">{win.prize ?? "—"}</td>
                          <td className="py-2 text-right">
                            <form action={deleteMiniGameWin}>
                              <input type="hidden" name="winId" value={win.id} />
                              <input type="hidden" name="leagueEventId" value={id} />
                              <button
                                type="submit"
                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
          </div>
        )}
      </div>
    </section>
  );
}
