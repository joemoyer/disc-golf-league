import Link from "next/link";
import { Pagination } from "@/components/pagination";
import { getPlayersPaginated } from "@/lib/db/queries";

type PlayersPageProps = {
  searchParams: Promise<{ page?: string; q?: string }>;
};

export default async function PlayersPage({ searchParams }: PlayersPageProps) {
  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const { players, totalCount, totalPages } = await getPlayersPaginated({ page, q });

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Players</h1>

      <form className="flex flex-wrap items-end gap-2" method="get">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-sm font-medium" htmlFor="player-search">
            Search
          </label>
          <input
            id="player-search"
            className="w-full rounded border bg-white p-2"
            type="search"
            name="q"
            placeholder="Name or email"
            defaultValue={q ?? ""}
          />
        </div>
        <button className="rounded border bg-white px-3 py-2 text-sm" type="submit">
          Filter
        </button>
        {q ? (
          <Link className="rounded border px-3 py-2 text-sm text-slate-600" href="/players">
            Clear
          </Link>
        ) : null}
      </form>

      <p className="text-sm text-slate-600">
        {totalCount === 0 ? "No players found." : `Showing ${players.length} of ${totalCount} players`}
      </p>

      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.id} className="rounded border bg-white p-3">
            <Link href={`/players/${p.id}`} className="font-medium text-sky-700 hover:underline">
              {p.displayName}
            </Link>
            {p.email ? <p className="text-sm text-slate-600">{p.email}</p> : null}
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        totalPages={totalPages}
        basePath="/players"
        searchParams={{ q: q?.trim() || undefined }}
      />
    </section>
  );
}
