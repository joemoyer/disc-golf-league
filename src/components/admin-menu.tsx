"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type AdminMenuProps = {
  email: string;
};

export function AdminMenu({ email }: AdminMenuProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event.target instanceof Node && !details.contains(event.target)) {
        details.open = false;
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  return (
    <div className="ml-auto flex items-center gap-2">
      <span className="rounded bg-emerald-100 px-2 py-1 text-xs text-emerald-800">Admin logged in: {email}</span>
      <details className="relative" ref={detailsRef}>
        <summary className="cursor-pointer rounded border bg-white px-2 py-1">Admin Menu</summary>
        <div className="absolute right-0 z-10 mt-2 w-52 rounded border bg-white p-2 shadow">
          <Link className="block rounded px-2 py-1 hover:bg-slate-100" href="/admin">
            Admin Home
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-slate-100" href="/admin/players">
            Players
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-slate-100" href="/admin/courses">
            Courses
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-slate-100" href="/admin/leagues">
            Leagues
          </Link>
          <Link className="block rounded px-2 py-1 hover:bg-slate-100" href="/admin/import">
            Event Import
          </Link>
        </div>
      </details>
    </div>
  );
}
