"use server";

import { redirect } from "next/navigation";
import { createSupabaseActionClient } from "@/lib/supabase/server";

export async function signInAdmin(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    redirect("/admin/login?error=missing_credentials");
  }

  const supabase = await createSupabaseActionClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const code = error.message.includes("Not Found")
      ? "misconfigured_supabase_url"
      : (error.code ?? "sign_in_failed");
    redirect(`/admin/login?error=${encodeURIComponent(code)}`);
  }

  redirect("/admin");
}
