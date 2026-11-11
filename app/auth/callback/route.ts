import { NextResponse } from "next/server";
import { authClient, siteUrl } from "../../../lib/auth";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (code) {
    const supabase = await authClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${siteUrl()}/`, 303);
  }
  return NextResponse.redirect(`${siteUrl()}/login?status=error`, 303);
}
