import { NextResponse } from "next/server";
import { z } from "zod";
import { authClient, siteUrl, validOrigin } from "../../../lib/auth";

const emailSchema = z.string().max(254).email();

export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (
    contentType !== "application/x-www-form-urlencoded" &&
    contentType !== "multipart/form-data"
  ) {
    return new Response(null, { status: 415 });
  }
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = emailSchema.safeParse(form.get("email"));
  if (parsed.success) {
    const email = parsed.data;
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
