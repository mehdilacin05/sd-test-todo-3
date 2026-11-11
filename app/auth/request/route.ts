import { NextResponse } from "next/server";
import { authClient, siteUrl, validOrigin } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const form = await request.formData();
  const email = form.get("email");
  if (typeof email === "string" && email.length <= 254 && email.includes("@")) {
    const supabase = await authClient();
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${siteUrl()}/auth/callback`,
      },
    });
  }
  return NextResponse.redirect(`${siteUrl()}/login?status=sent`, 303);
}
