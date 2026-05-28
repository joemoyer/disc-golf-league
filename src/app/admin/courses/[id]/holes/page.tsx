import { createHole, deleteHole, updateHole } from "@/lib/actions";
import { getCourseHoles } from "@/lib/db/queries";

export default async function AdminCourseHolesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const holes = await getCourseHoles(id);
  const assigned = new Set(holes.map((h) => h.holeNumber));
  let suggestedHoleNumber = 1;
  while (assigned.has(suggestedHoleNumber)) suggestedHoleNumber += 1;
  const totalPar = holes.reduce((sum, h) => sum + h.par, 0);
  const totalDistanceFeet = holes.reduce((sum, h) => sum + (h.distanceFeet ?? 0), 0);

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Course Holes</h1>
      <p className="text-sm text-slate-600">
        {holes.length} holes, par {totalPar}, {totalDistanceFeet.toLocaleString()} ft total
      </p>
      <form action={createHole} className="grid grid-cols-4 gap-2 rounded border bg-white p-3">
        <input type="hidden" name="courseId" value={id} />
        <input
          className="rounded border p-2"
          name="holeNumber"
          type="number"
          min={1}
          defaultValue={suggestedHoleNumber}
          placeholder="hole #"
          autoFocus
          required
        />
        <input className="rounded border p-2" name="par" type="number" placeholder="par" required />
        <input className="rounded border p-2" name="distanceFeet" type="number" placeholder="distance feet" />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">Add Hole</button>
      </form>
      <table className="w-full border bg-white text-sm">
        <thead><tr><th className="p-2 text-left">Hole</th><th className="p-2 text-left">Par</th><th className="p-2 text-left">Feet</th><th className="p-2 text-left">Actions</th></tr></thead>
        <tbody>
          {holes.map((h) => (
            <tr key={h.id} className="border-t align-top">
              <td className="p-2">{h.holeNumber}</td>
              <td className="p-2">{h.par}</td>
              <td className="p-2">{h.distanceFeet ?? "-"}</td>
              <td className="p-2">
                <div className="flex flex-wrap gap-2">
                  <form action={updateHole} className="flex items-center gap-2">
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="holeId" value={h.id} />
                    <input className="w-16 rounded border p-1" name="holeNumber" type="number" defaultValue={h.holeNumber} required />
                    <input className="w-16 rounded border p-1" name="par" type="number" defaultValue={h.par} required />
                    <input className="w-24 rounded border p-1" name="distanceFeet" type="number" defaultValue={h.distanceFeet ?? ""} />
                    <button className="rounded border px-2 py-1" type="submit">Save</button>
                  </form>
                  <form action={deleteHole}>
                    <input type="hidden" name="courseId" value={id} />
                    <input type="hidden" name="holeId" value={h.id} />
                    <button className="rounded border border-red-300 px-2 py-1 text-red-700" type="submit">Delete</button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
