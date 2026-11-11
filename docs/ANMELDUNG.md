# Anmeldung und geschützter Betriebsweg

Die Anwendung verwendet Supabase Auth über den normalen Supabase-Gateway-Pfad
`/auth/v1`; ein Service-Role-Schlüssel gehört niemals in die Anwendung. Der
Betreiber stellt serverseitig `NEXT_PUBLIC_SUPABASE_URL` (Gateway-Ursprung),
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (öffentlicher anon-Schlüssel) und
`NEXT_PUBLIC_SITE_URL` (kanonischer App-Ursprung) bereit. Nur HTTPS im Betrieb;
der Ursprung muss exakt zum Browser-Ursprung passen. Der Rücksprung ist fest
`<App-Ursprung>/auth/callback`. Auths Site-URL und erlaubte Redirect-URLs müssen
diesen Ursprung bzw. Rücksprung enthalten. Für den PKCE-Ablauf muss derselbe
Browser den Link öffnen, der ihn angefordert hat. HTTPS-Cookies sind HttpOnly,
SameSite=Lax und Secure. Der Reverse-Proxy darf Anmeldecodes und Query-Strings
nicht protokollieren; Auth-/Proxy-/App-Logs müssen vor Betrieb auf E-Mails und
Tokens überprüft und entsprechend gefiltert werden.

## Auth-Vorgaben (verbindlich für Test und Live)

Beim späteren Einrichten des Supabase-Stacks die versionierte Datei
`supabase/compose.auth-policy.yml` **als letzte** Compose-Datei einbinden, z. B.
`docker compose -f <supabase-compose.yml> -f supabase/compose.auth-policy.yml config`.
Sie deaktiviert Registrierung serverseitig und begrenzt Mail-Links auf 1800
Sekunden. Auch die App fordert Links mit `shouldCreateUser=false` an. Es dürfen
keine weiteren Auth-Provider oder anonyme Anmeldung aktiviert sein. Nur ein
Administrator darf Konten anlegen. Vor Inbetriebnahme mit dem tatsächlichen
Stack prüfen, dass unbekannte Konten über direkte `/signup`- und `/otp`-Aufrufe
nicht angelegt werden; vor jeder Änderung der Auth-Konfiguration wiederholen.
`make auth-test` prüft dieselbe Policy mit GoTrue, Postgres und Mailpit isoliert;
dies ersetzt nicht die Prüfung der jeweiligen Umgebung. Der Test enthält nur
Wegwerf-Zugangsdaten, keine produktiven Schlüssel.

## Studio: Konten durch den Betreiber

Studio und die zugehörigen administrativen APIs bleiben im privaten Netz; es
gibt keine öffentliche Studio-Route. Der Betreiber verbindet sich mit SSH und
Schlüssel zum Server und nutzt eine lokale Portweiterleitung zu einem nur auf
Server-Loopback gebundenen oder anderweitig privat erreichbaren Studio-Port,
z. B. `ssh -L 127.0.0.1:54323:127.0.0.1:54323 <operator>@<server>`.
Die tatsächlichen Ports und das geschützte Binding sind bei Schritt 5 zu
konfigurieren und vor Verwendung zu prüfen; ein privater Container-Port ist
nicht automatisch vom Server-Loopback erreichbar. Kein `0.0.0.0`-Binding, keine
öffentliche Freigabe von Studio oder DB. Betriebssystem- und Studio-Zugang nur
für berechtigte Betreiber; Schlüssel und Server-Zugangsdaten nicht ins Repo.
Im geschützten Studio unter Authentication → Users ein Konto mit bestätigter
E-Mail anlegen; keine öffentliche Einladung oder Registrierung einschalten.
Adresse anderweitig verifizieren. Danach fordert die Person auf `/login` ihren
Link selbst an. Löschen des Kontos löscht die zugehörigen Todos über den
Datenbank-Fremdschlüssel. Zugänge entziehen und Tunnel schließen nach Gebrauch.

Mailpit ist ausschließlich für isolierte Testdaten und darf nicht öffentlich
zugänglich sein. Für Live sind SMTP, sichere Zustellung und die weiteren Punkte
in `FREIGABE.md` vorab nachzuweisen. Diese Datei richtet keinen Stack ein und
ist keine Live- oder Promote-Freigabe.
