# sd-test-todo-3
Messlauf 3 software-projekt (Testprojekt, wird archiviert)

## Datenbankprüfung

`make testdb` benötigt Docker Compose und startet eine isolierte, temporäre
Postgres-17-Datenbank. Die versionierten SQL-Dateien unter `supabase/migrations/`
werden in Dateinamen-Reihenfolge eingespielt; die Testdatenbank wird auch bei
Fehlern entfernt. Die Tests verwenden echte Postgres-Rollen `anon` und
`authenticated` und zwei verschiedene Identitäten. `auth.users` und
`auth.uid()` sind dabei ein minimales Supabase-kompatibles Test-Fixture;
Anmeldung, JWT-Prüfung und die vollständige Supabase-Installation werden
hier nicht getestet. Die Migration setzt Supabases vorhandenes `auth`-Schema
und die Rollen voraus.
