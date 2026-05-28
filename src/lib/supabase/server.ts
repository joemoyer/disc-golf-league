import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const getSupabaseEnv = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (url.includes("pooler.supabase.com")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be your project URL (https://<ref>.supabase.co), not the database pooler host."
    );
  }
  return { url, anonKey };
};

const createCookieClient = (canSetCookies: boolean) => {
  const { url, anonKey } = getSupabaseEnv();
  return async () => {
    const cookieStore = await cookies();
    return createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          if (!canSetCookies) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Server Components cannot mutate cookies.
            }
            return;
          }
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
  };
};

/** Read-only / layout usage; cookie writes may be ignored in Server Components. */
export const createSupabaseServerClient = createCookieClient(false);

/** Server Actions (login, etc.) — must persist auth cookies. */
export const createSupabaseActionClient = createCookieClient(true);
