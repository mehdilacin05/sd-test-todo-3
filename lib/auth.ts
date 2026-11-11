import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function authClient() {
  const store = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies: {
        getAll: () => store.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              store.set(name, value, options),
            );
          } catch {
            // Server Components cannot write cookies; route handlers can.
          }
        },
      },
    },
  );
}

export function siteUrl() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin;
}

export function validOrigin(request: Request) {
  return request.headers.get("origin") === siteUrl();
}
