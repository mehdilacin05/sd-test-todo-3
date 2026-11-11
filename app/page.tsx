import { redirect } from "next/navigation";
import { authClient } from "../lib/auth";

export default async function Home() {
  const supabase = await authClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");
  return (
    <main>
      <h1>Todo</h1>
      <p>Die Anwendung wird eingerichtet.</p>
      <form action="/auth/logout" method="post">
        <button type="submit">Abmelden</button>
      </form>
    </main>
  );
}
