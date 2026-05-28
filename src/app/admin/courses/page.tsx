import Link from "next/link";
import { createCourse, toggleCourseActive } from "@/lib/actions";
import { getCoursesWithStats } from "@/lib/db/queries";

export default async function AdminCoursesPage() {
  const courses = await getCoursesWithStats();
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">Courses</h1>
      <form action={createCourse} className="grid grid-cols-2 gap-2 rounded border bg-white p-3">
        <input className="rounded border p-2" name="key" placeholder="key" required />
        <input className="rounded border p-2" name="name" placeholder="name" required />
        <input className="rounded border p-2" name="location" placeholder="location" />
        <input className="rounded border p-2" name="rating" type="number" placeholder="course rating" />
        <input className="col-span-2 rounded border p-2" name="slope" type="number" placeholder="slope" />
        <button className="col-span-2 rounded bg-slate-900 px-3 py-2 text-white">Add Course</button>
      </form>
      <ul className="space-y-2">
        {courses.map((c) => (
          <li key={c.id} className="rounded border bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/admin/courses/${c.id}/holes`} className="font-medium">{c.name}</Link>
              <form action={toggleCourseActive}>
                <input type="hidden" name="courseId" value={c.id} />
                <button className="rounded border px-2 py-1 text-xs" type="submit">
                  {c.isActive ? "Disable" : "Enable"}
                </button>
              </form>
            </div>
            <div className="text-xs text-slate-600">{c.location ?? "No location set"}</div>
            <div className="text-xs text-slate-600">
              Par {c.totalPar} • {c.holeCount} holes • {c.totalDistanceFeet.toLocaleString()} ft • Rating {c.rating ?? "-"} • Slope {c.slope ?? "-"} • {c.isActive ? "Active" : "Inactive"}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
