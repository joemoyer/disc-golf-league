import Link from "next/link";
import { HighlightPlayerList } from "@/components/highlight-player-list";
import { LeagueFilterForm } from "@/components/league-filter-form";
import { PastEventPreviewCard } from "@/components/past-event-preview";
import {
  getHomeHighlights,
  getLeagueEventsGrouped,
  getLeagues,
  getPastEventPreviews,
} from "@/lib/db/queries";
import { formatDiff } from "@/lib/format-diff";

type HomePageProps = {
  searchParams: Promise<{ leagueId?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const { leagueId } = await searchParams;
  const leagues = await getLeagues();
  const league = leagues.find((item) => item.id === leagueId) ?? leagues[0];

  if (!league) {
    return (
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Disc Golf League Stats</h1>
        <p className="text-slate-600">No leagues found.</p>
      </section>
    );
  }

  const [{ future, past }, highlights] = await Promise.all([
    getLeagueEventsGrouped(league.id),
    getHomeHighlights(league.id),
  ]);
  const pastPreviews = await getPastEventPreviews(past);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold">Disc Golf League Stats</h1>
        <LeagueFilterForm leagues={leagues} selectedLeagueId={league.id} />
      </div>
      <p className="text-sm text-slate-600">Stats for {league.name}</p>

      <div className="grid gap-3 md:grid-cols-3">
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Best Round</h2>
          <HighlightPlayerList players={highlights.bestRound?.players ?? []} />
          <p className="text-sm text-slate-600">
            Diff: {highlights.bestRound ? formatDiff(highlights.bestRound.roundDiff) : "-"}
          </p>
          {highlights.bestRound && highlights.bestRound.eventLinks.length > 0 ? (
            <div className="mt-2 space-y-1 text-sm">
              {highlights.bestRound.eventLinks.map((event) => (
                <p key={event.leagueEventId}>
                  <Link href={`/events/${event.leagueEventId}`} className="text-sky-700 hover:underline">
                    {event.eventName}
                  </Link>
                </p>
              ))}
            </div>
          ) : null}
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Most Birdies</h2>
          <HighlightPlayerList players={highlights.mostBirdies?.players ?? []} />
          <p className="text-sm text-slate-600">Birdies: {highlights.mostBirdies?.value ?? "-"}</p>
        </article>
        <article className="rounded border bg-white p-4">
          <h2 className="text-sm font-semibold text-slate-600">Most Hole in Ones</h2>
          <HighlightPlayerList players={highlights.mostAces?.players ?? []} />
          <p className="text-sm text-slate-600">Aces: {highlights.mostAces?.value ?? "-"}</p>
        </article>
      </div>

      <section className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming Events</h2>
          {future.length === 0 ? (
            <p className="text-sm text-slate-600">No upcoming events.</p>
          ) : (
            <ul className="space-y-2">
              {future.map((event) => (
                <li key={event.id} className="rounded border bg-white p-3">
                  <Link href={`/events/${event.id}`} className="font-medium text-sky-700 hover:underline">
                    {event.name}
                  </Link>
                  <p className="text-sm text-slate-600">
                    {event.eventDate ?? "Date TBD"} · {event.courseName}
                  </p>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="space-y-3">
          <h2 className="text-lg font-semibold">Past Events</h2>
          {past.length === 0 ? (
            <p className="text-sm text-slate-600">No past events.</p>
          ) : (
            <div className="space-y-4">
              {pastPreviews.map((preview) => (
                <PastEventPreviewCard key={preview.id} preview={preview} />
              ))}
            </div>
          )}
      </section>
    </section>
  );
}
