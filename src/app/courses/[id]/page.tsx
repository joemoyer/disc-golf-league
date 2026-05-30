import { getCourseById, getCourseHoles } from "@/lib/db/queries";

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [course, holes] = await Promise.all([getCourseById(id), getCourseHoles(id)]);
  if (!course) return <div>Course not found.</div>;

  const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
  const totalDistanceFeet = holes.reduce((sum, hole) => sum + (hole.distanceFeet ?? 0), 0);

  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">{course.name}</h1>
      <p>{course.location ?? "No location"}</p>
      <p className="text-sm text-slate-600">
        Par {totalPar} · {totalDistanceFeet > 0 ? `${totalDistanceFeet.toLocaleString()} ft` : "Distance TBD"}
      </p>
      <table className="w-full border bg-white text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left">Hole</th>
            <th className="p-2 text-left">Par</th>
            <th className="p-2 text-left">Distance (ft)</th>
          </tr>
        </thead>
        <tbody>
          {holes.map((h) => (
            <tr key={h.id} className="border-t">
              <td className="p-2">{h.holeNumber}</td>
              <td className="p-2">{h.par}</td>
              <td className="p-2">{h.distanceFeet ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
