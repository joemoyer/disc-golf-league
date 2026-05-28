type LeagueOption = { id: string; name: string };

type LeagueFilterFormProps = {
  leagues: LeagueOption[];
  selectedLeagueId?: string;
  action?: string;
};

export function LeagueFilterForm({ leagues, selectedLeagueId, action = "/" }: LeagueFilterFormProps) {
  if (leagues.length === 0) return null;

  return (
    <form className="max-w-sm space-y-2" action={action} method="get">
      <label className="block text-sm font-medium">League</label>
      <select className="w-full rounded border bg-white p-2" name="leagueId" defaultValue={selectedLeagueId ?? leagues[0]?.id}>
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
  );
}
