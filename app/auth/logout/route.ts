import { NextResponse } from "next/server";
import { authClient, siteUrl, validOrigin } from "../../../lib/auth";

export async function POST(request: Request) {
  if (!validOrigin(request)) return new Response(null, { status: 403 });
  const supabase = await authClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(`${siteUrl()}/login`, 303);
}
