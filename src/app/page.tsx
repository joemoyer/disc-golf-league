import { getHomeHighlights } from "@/lib/db/queries";

const getCardValue = (value: number | null | undefined, suffix = "") =>
  value === null || value === undefined ? "-" : `${value}${suffix}`;

export default async function HomePage() {
  const highlights = await getHomeHighlights();

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Disc Golf League</h1>
      <p>Starting point for admin data entry and public read-only league pages.</p>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Lowest Round</h2>
          <p className="mt-1 text-lg font-semibold">{highlights.lowestRound?.playerName ?? "-"}</p>
          <p className="text-sm text-slate-600">Score: {getCardValue(highlights.lowestRound?.value)}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Most Birdies</h2>
          <p className="mt-1 text-lg font-semibold">{highlights.mostBirdies?.playerName ?? "-"}</p>
          <p className="text-sm text-slate-600">Birdies: {getCardValue(highlights.mostBirdies?.value)}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Most Hole in Ones</h2>
          <p className="mt-1 text-lg font-semibold">{highlights.mostAces?.playerName ?? "-"}</p>
          <p className="text-sm text-slate-600">Aces: {getCardValue(highlights.mostAces?.value)}</p>
        </article>
      </div>
    </section>
  );
}
