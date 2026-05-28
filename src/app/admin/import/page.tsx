import { asc } from "drizzle-orm";
import { EventImportForm } from "@/components/event-import-form";
import { db } from "@/lib/db/client";
import { course, league, leagueEvent } from "@/lib/db/schema";

type AdminImportPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminImportPage({ searchParams }: AdminImportPageProps) {
  const { error } = await searchParams;
  const [events, leagues, courses] = await Promise.all([
    db.query.leagueEvent.findMany({
      orderBy: asc(leagueEvent.eventDate),
      columns: { id: true, name: true, eventDate: true },
    }),
    db.query.league.findMany({ orderBy: asc(league.name), columns: { id: true, name: true } }),
    db.query.course.findMany({ orderBy: asc(course.name), columns: { id: true, name: true } }),
  ]);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Event Import</h1>
      <p className="text-sm text-slate-600">
        Upload an Excel file and map it to an event. Players are matched by `username` column to player `key`.
      </p>
      <EventImportForm events={events} leagues={leagues} courses={courses} error={error} />
    </section>
  );
}
