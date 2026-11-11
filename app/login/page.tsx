export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  return (
    <main>
      <h1>Anmelden</h1>
      {status === "sent" && (
        <p>Falls das Konto existiert, wurde ein Link gesendet.</p>
      )}
      {status === "error" && (
        <p>Der Link ist ungültig oder abgelaufen. Bitte erneut anfordern.</p>
      )}
      <form action="/auth/request" method="post">
        <label htmlFor="email">E-Mail</label>
        <input id="email" name="email" type="email" required maxLength={254} />
        <button type="submit">Anmeldelink anfordern</button>
      </form>
    </main>
  );
}
