import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { recomputeAllDiffs /* , recomputeAllPlayerRatings */ } from "@/lib/actions";
import { PLAYER_RATINGS_ENABLED } from "@/lib/ratings/enabled";

type AdminHomePageProps = {
  searchParams: Promise<{ maintenance?: string; corrected?: string }>;
};

export default async function AdminHomePage({ searchParams }: AdminHomePageProps) {
  const { maintenance, corrected } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-semibold">Admin</h1>
      {maintenance === "diff_recomputed" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Diff check complete. Corrected {corrected ?? "0"} rows.
        </p>
      ) : null}
      {PLAYER_RATINGS_ENABLED && maintenance === "ratings_recomputed" ? (
        <p className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Ratings recomputed for all players.
        </p>
      ) : null}
      <ul className="list-inside list-disc">
        <li><Link href="/admin/players">Players</Link></li>
        <li><Link href="/admin/courses">Courses</Link></li>
        <li><Link href="/admin/leagues">Leagues</Link></li>
        <li><Link href="/admin/import">Event Import</Link></li>
      </ul>
      <div className="max-w-xl rounded border bg-white p-3">
        <h2 className="font-semibold">Maintenance</h2>
        <p className="mb-3 text-sm text-slate-600">
          Recompute all `player_hole.diff` values using formula: score - hole par.
        </p>
        <form action={recomputeAllDiffs} className="mb-2">
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
            Recompute Diff Values
          </button>
        </form>
        {/* Player ratings maintenance — enable via PLAYER_RATINGS_ENABLED in src/lib/ratings/enabled.ts
        <p className="mb-3 text-sm text-slate-600">
          Rebuild player ratings and history snapshots from all scored events.
        </p>
        <form action={recomputeAllPlayerRatings}>
          <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
            Recompute All Ratings
          </button>
        </form>
        */}
      </div>
    </section>
  );
}
