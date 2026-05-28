import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMenu } from "@/components/admin-menu";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disc Golf League",
  description: "Lightweight disc golf league tracker",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 p-4 text-sm">
            <Link href="/">Home</Link>
            <Link href="/standings">Standings</Link>
            <Link href="/players">Players</Link>
            <Link href="/courses">Courses</Link>
            <Link href="/leagues">Leagues</Link>
            <Link href="/admin">Admin</Link>
            {user ? (
              <AdminMenu email={user.email ?? "unknown"} />
            ) : (
              <span className="ml-auto rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">Admin logged out</span>
            )}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
