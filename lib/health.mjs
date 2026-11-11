export async function health(revision, query) {
  try {
    await query("SELECT 1");
    return { status: 200, body: { status: "ok", revision } };
  } catch {
    return { status: 503, body: { status: "unavailable", revision } };
  }
}
