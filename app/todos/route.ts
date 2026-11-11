import { failure, confirmation } from "./failure";
import { NextResponse } from "next/server";
import { authClient, siteUrl, validOrigin } from "../../lib/auth";
import { parseId, parsePage, parseStatus, parseTodoText } from "../../lib/todo";

export async function POST(request: Request) {
  if (!validOrigin(request)) return failure(403, "Anfrage abgelehnt.");
  const supabase = await authClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return failure(401, "Bitte anmelden.");
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return failure(400, "Ungültige Anfrage.");
  }
  const action = form.get("action");
  const rawPage = form.get("page");
  const page = parsePage(rawPage === null ? undefined : rawPage);
  if (page === null) return failure(400, "Ungültige Seite.");
  if (action === "create") {
    const raw = form.get("text");
    const text = parseTodoText(raw);
    if (text === null)
      return failure(
        400,
        "Bitte 4 bis 1.000 Zeichen eingeben.",
        typeof raw === "string" ? raw : "",
      );
    const { error } = await supabase.from("todos").insert({ text });
    if (error)
      return failure(
        500,
        "Todo konnte nicht angelegt werden. Bitte erneut versuchen.",
        raw as string,
      );
  } else if (action === "confirm") {
    const id = parseId(form.get("id"));
    if (!id) return failure(400, "Ungültige Anfrage.");
    const { data: found, error } = await supabase
      .from("todos")
      .select("id")
      .eq("id", id)
      .eq("user_id", data.user.id);
    if (error)
      return failure(500, "Aktion fehlgeschlagen. Bitte erneut versuchen.");
    if (!found?.length) return failure(404, "Todo nicht gefunden.");
    return confirmation(id, page);
  } else if (action === "status" || action === "delete") {
    const id = parseId(form.get("id"));
    const completed =
      action === "status" ? parseStatus(form.get("completed")) : null;
    if (!id || (action === "status" && completed === null))
      return failure(400, "Ungültige Anfrage.");
    const query =
      action === "status"
        ? supabase.from("todos").update({ completed })
        : supabase.from("todos").delete();
    const { data: changed, error } = await query
      .eq("id", id)
      .eq("user_id", data.user.id)
      .select("id");
    if (error)
      return failure(500, "Aktion fehlgeschlagen. Bitte erneut versuchen.");
    if (!changed?.length) return failure(404, "Todo nicht gefunden.");
  } else return failure(400, "Ungültige Anfrage.");
  return NextResponse.redirect(new URL(`/?page=${page}`, siteUrl()), 303);
}
