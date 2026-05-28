import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;

  async function signIn(formData: FormData) {
    "use server";
    const supabase = await createSupabaseServerClient();
    const email = String(formData.get("email") || "");
    const password = String(formData.get("password") || "");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      redirect("/admin");
    }
    redirect("/admin/login?error=invalid_credentials");
  }

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Admin Login</h1>
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Login failed. Check your email/password and try again.
        </p>
      ) : null}
      <form action={signIn} className="space-y-3 rounded border bg-white p-4">
        <input className="w-full rounded border p-2" name="email" type="email" placeholder="Email" required />
        <input
          className="w-full rounded border p-2"
          name="password"
          type="password"
          placeholder="Password"
          required
        />
        <button className="rounded bg-slate-900 px-3 py-2 text-white" type="submit">
          Sign in
        </button>
      </form>
    </section>
  );
}
