import { signInAdmin } from "@/app/admin/login/actions";

type AdminLoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errorMessages: Record<string, string> = {
  missing_credentials: "Enter both email and password.",
  invalid_credentials: "Email or password is incorrect.",
  email_not_confirmed: "Confirm your email in Supabase before signing in.",
  misconfigured_supabase_url:
    "Supabase URL is misconfigured. Use https://<project-ref>.supabase.co in NEXT_PUBLIC_SUPABASE_URL (not the database pooler host).",
  sign_in_failed: "Sign in failed. Try again or reset your password in Supabase.",
};

export default async function AdminLoginPage({ searchParams }: AdminLoginPageProps) {
  const { error } = await searchParams;
  const message = error ? (errorMessages[error] ?? errorMessages.sign_in_failed) : null;

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-xl font-semibold">Admin Login</h1>
      {message ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
      ) : null}
      <form action={signInAdmin} className="space-y-3 rounded border bg-white p-4">
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
