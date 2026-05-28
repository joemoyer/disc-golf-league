import Link from "next/link";
import { getCoursesWithStats } from "@/lib/db/queries";

export default async function CoursesPage() {
  const courses = await getCoursesWithStats();
  return (
    <section className="space-y-3">
      <h1 className="text-xl font-semibold">Courses</h1>
      <ul className="space-y-2">
        {courses.map((c) => (
          <li key={c.id} className="rounded border bg-white p-3">
            <Link href={`/courses/${c.id}`} className="font-medium">{c.name}</Link>
            <div>{c.location ?? "No location"}</div>
            <div className="text-xs text-slate-600">
              Par {c.totalPar} • {c.holeCount} holes • {c.totalDistanceFeet.toLocaleString()} ft • Rating {c.rating ?? "-"} • Slope {c.slope ?? "-"}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
