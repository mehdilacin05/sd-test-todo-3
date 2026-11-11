import { redirect } from "next/navigation";
import Link from "next/link";
import { authClient } from "../lib/auth";
import { parsePage } from "../lib/todo";
import "./style.css";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await authClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) redirect("/login");
  const page = parsePage((await searchParams).page);
  if (page === null)
    return (
      <main>
        <h1>Ungültige Seite</h1>
        <Link href="/">Zur ersten Seite</Link>
      </main>
    );
  const {
    data: todos,
    count,
    error,
  } = await supabase
    .from("todos")
    .select("id,text,completed,created_at", { count: "exact" })
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .range((page - 1) * 100, page * 100 - 1);
  return (
    <main>
      <header>
        <h1>Meine Todos</h1>
        <form action="/auth/logout" method="post">
          <button type="submit">Abmelden</button>
        </form>
      </header>
      <form action="/todos" method="post" className="create">
        <label htmlFor="text">Neues Todo</label>
        <textarea id="text" name="text" required maxLength={2000} rows={3} />
        <input type="hidden" name="action" value="create" />
        <button type="submit">Anlegen</button>
      </form>
      {error ? (
        <p role="alert">
          Todos konnten nicht geladen werden. Bitte erneut versuchen.
        </p>
      ) : (
        <>
          {todos.length === 0 && <p>Keine Todos auf dieser Seite.</p>}
          <ul className="todos">
            {todos.map((todo) => (
              <li key={todo.id}>
                <span className={todo.completed ? "completed" : undefined}>
                  {todo.text}
                </span>
                <div className="actions">
                  <form action="/todos" method="post">
                    <input type="hidden" name="action" value="status" />
                    <input type="hidden" name="id" value={todo.id} />
                    <input
                      type="hidden"
                      name="completed"
                      value={String(!todo.completed)}
                    />
                    <input type="hidden" name="page" value={String(page)} />
                    <button type="submit">
                      {todo.completed ? "Wieder öffnen" : "Erledigen"}
                    </button>
                  </form>
                  <form action="/todos" method="post">
                    <input type="hidden" name="id" value={todo.id} />
                    <input type="hidden" name="page" value={String(page)} />
                    <button type="submit" name="action" value="confirm">
                      Löschen
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <nav aria-label="Seiten">
            {page > 1 && <a href={`/?page=${page - 1}`}>Vorherige Seite</a>}
            <span>Seite {page}</span>
            {count !== null && page * 100 < count && (
              <a href={`/?page=${page + 1}`}>Nächste Seite</a>
            )}
          </nav>
        </>
      )}
    </main>
  );
}
