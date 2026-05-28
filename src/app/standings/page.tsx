import { getLeagues, getLeagueStandings } from "@/lib/db/queries";

type StandingsPageProps = {
  searchParams: Promise<{ leagueId?: string }>;
};

export default async function StandingsPage({ searchParams }: StandingsPageProps) {
  const { leagueId } = await searchParams;
  const leagues = await getLeagues();
  const league = leagues.find((l) => l.id === leagueId) ?? leagues[0];
  const standings = league ? await getLeagueStandings(league.id) : [];
  const formatDiff = (value: number | string) => {
    const n = Number(value);
    if (n === 0) return "E";
    return n > 0 ? `+${n}` : `${n}`;
  };

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Standings</h1>
      {!league ? <p>No leagues found.</p> : <p>Showing standings for {league.name}</p>}
      {leagues.length > 0 ? (
        <form className="max-w-sm space-y-2">
          <label className="mb-1 block text-sm font-medium">League</label>
          <select className="w-full rounded border bg-white p-2" name="leagueId" defaultValue={league?.id}>
            {leagues.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <button className="rounded border px-3 py-1 text-sm" type="submit">
            Show
          </button>
        </form>
      ) : null}
      <table className="w-full border bg-white text-sm">
        <thead><tr><th className="p-2 text-left">Player</th><th className="p-2 text-left">Diff</th><th className="p-2 text-left">Events</th><th className="p-2 text-left">Strokes</th></tr></thead>
        <tbody>
          {standings.map((s) => (
            <tr key={s.playerId} className="border-t"><td className="p-2">{s.displayName}</td><td className="p-2">{formatDiff(s.totalDiff)}</td><td className="p-2">{s.eventsPlayed}</td><td className="p-2">{s.totalStrokes}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
