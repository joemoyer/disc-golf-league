import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AdminMenu } from "@/components/admin-menu";
import "./globals.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disc Golf League",
  description: "Lightweight disc golf league tracker",
  icons: {
    icon: "/favicon.ico",
  },
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
            {user ? <AdminMenu email={user.email ?? "unknown"} /> : null}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">{children}</main>
      </body>
    </html>
  );
}
