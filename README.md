# sd-test-todo-3
Messlauf 3 software-projekt (Testprojekt, wird archiviert)

## Datenbankprüfung

`make check` enthält `make testdb`; beide benötigen Docker Compose. Der Test startet eine isolierte, temporäre
Postgres-17-Datenbank. Die versionierten SQL-Dateien unter `supabase/migrations/`
werden in Dateinamen-Reihenfolge eingespielt; die Testdatenbank wird auch bei
Fehlern entfernt. Die Tests verwenden echte Postgres-Rollen `anon` und
`authenticated` und zwei verschiedene Identitäten. `auth.users` und
`auth.uid()` sind dabei ein minimales Supabase-kompatibles Test-Fixture;
Anmeldung, JWT-Prüfung und die vollständige Supabase-Installation werden
hier nicht getestet. Die Migration setzt Supabases vorhandenes `auth`-Schema
und die Rollen voraus.

Für die Mindestlänge entfernt die Datenbank ausschließlich am Rand die Unicode-
`White_Space`-Zeichen: U+0009–000D, U+0020, U+0085, U+00A0, U+1680,
U+2000–200A, U+2028–2029, U+202F, U+205F und U+3000. Im Textinneren zählen
sie als Zeichen; gespeichert wird der Originaltext. Künftige serverseitige
Validierung muss dieselbe Menge verwenden.
