# Betrieb der getrennten Test- und Live-Umgebungen

**Kein Livegang durch diese Dateien.** Test nur mit Testdaten. Die Freigabe
zum Ausliefern und alle Voraussetzungen in `FREIGABE.md` bleiben erforderlich.
Compose startet zusammengehörige Container; ein Compose-Projekt hat eigene
Netze und Datenträger (Volumes). `ops/compose.test.yml` heißt `todo-test`,
`ops/compose.live.yml` heißt `todo-live`. Das gemeinsame Grundgerüst ist
`ops/compose.yml`. Keine Projektüberschreibung durch `-p` im regulären Betrieb.
Test und Live müssen getrennte Domains, Ports, Daten, Schlüssel und
Konfigurationsdateien besitzen. Nie Live-Daten oder Live-Schlüssel im Test.

## Vorbereitung je Umgebung

Voraussetzung: ARM64-Linux, Docker Engine und Compose, GnuPG, ausreichend Platz,
HTTPS-Reverse-Proxy und ein von Test unabhängiges Geheimnisverzeichnis, jeweils
nur für berechtigte Betreiber lesbar. Der vorhandene Server, seine Ressourcen und
Standort sind noch nicht nachgewiesen. Diese Anleitung führt keine Installation
und keinen Start auf dem Server aus. Images sind versioniert; ihre ARM64-Eignung
muss bei jedem Versionswechsel geprüft werden. `APP_IMAGE` bezeichnet für beide
Umgebungen denselben unveränderlichen Image-Digest, gebaut mit der Git-Revision;
niemals einen Schlüssel als Build-Argument übergeben. `make image` ist nur ein
lokaler Testbuild und erzeugt keinen veröffentlichten Digest.

Je Umgebung eine eigene Compose-Umgebungsdatei **außerhalb des Repos** mit
Dateimodus 0600 erstellen und folgende Variablen setzen (keine Schlüssel in
Git, Images, Ausgaben oder Chat):

- `POSTGRES_PASSWORD`, `AUTH_DB_PASSWORD`, `REST_DB_PASSWORD`,
  `HEALTH_DB_PASSWORD`: vier unterschiedliche zufällige starke Passwörter nur
  aus ASCII-Buchstaben und Ziffern, damit die Datenbank-URLs gültig bleiben.
- `JWT_SECRET` (mindestens 32 zufällige Zeichen), `ANON_KEY` und `SERVICE_KEY`:
  zu diesem Secret passende Supabase-HS256-JWTs für `anon` bzw. `service_role`
  mit geeigneter Laufzeit. Den Service-Schlüssel nie an App oder Browser geben.
  Siehe die offizielle Self-Hosting-Schlüsseldokumentation von Supabase.
- `META_CRYPTO_KEY`: separater zufälliger Schlüssel (mindestens 32 Zeichen).
- `SITE_URL`: öffentliche kanonische HTTPS-Origin ohne abschließenden Schrägstrich,
  `APP_IMAGE`: Image-Digest; `GATEWAY_PORT`, `STUDIO_PORT`: verschiedene freie
  Loopback-Ports pro Umgebung. Für Test zusätzlich `MAILPIT_PORT`.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` sind auch für die Compose-Auswertung
  erforderlich; im Test werden Host und Port durch Mailpit überschrieben.
  Für Live zusätzlich `SMTP_USER` und `SMTP_PASSWORD` setzen.

Test-Aufruf (Pfad zur Datei anpassen):

```sh
docker compose --env-file /etc/todo-test/stack.env -f ops/compose.yml -f ops/compose.test.yml up -d --build --wait
```

Live-Konfiguration **erst nach Erfüllung aller Voraussetzungen und ausdrücklicher
Promote-Freigabe** entsprechend mit `/etc/todo-live/stack.env` und
`ops/compose.live.yml`. Der Teststack enthält Mailpit, der Livestack nicht.
Beide binden Gateway und Studio ausschließlich an `127.0.0.1`; Mailpit ebenfalls
nur an Loopback. Die Datenbank und die interne Admin-API haben keine Host-Ports.
Nur den Gateway-Port über einen gehärteten HTTPS-Proxy routen; kein Routing zu
Studio, Mailpit, DB oder internem Gateway. Studio/Mailpit ausschließlich per
SSH-Schlüsseltunnel und nur für berechtigte Betreiber verwenden. Nutzer auf dem
Server können Loopback-Ports ebenfalls erreichen. Studio benutzt den privaten
Gateway, während der öffentliche Gateway Auth-Admin-Endpunkte sperrt.
Vor Betrieb muss dieser Schutz sowie das tatsächliche Verhalten von Studio und
Logfilterung mit der Zielkonfiguration geprüft werden. SSH härten; keine Tokens,
Mailadressen, Todo-Texte oder Query-Strings in Logs; Rotation auf 30 Tage.

Die Datenbank wird beim ersten Start eingerichtet; der einmalige Migrationslauf
hat eine Markierung und bricht bei einer kollidierenden Tabelle ab. Vor weiteren
Migrationen Backup erstellen, Rückwärtskompatibilität prüfen, zunächst im Test
anwenden. Niemals `down -v` für einen dauerhaften Stack ausführen: das löscht
Daten. `/health` prüft die Datenbankverbindung und liefert die Build-Revision;
bei DB-Ausfall 503. Der externe Health-Check und Alarmierung müssen noch vom
Betreiber eingerichtet werden.

## Test-Backup und Rücksicherung

`ops/backup.sh` erstellt mit `pg_dump` einen konsistenten Dump der Datenbank,
verschlüsselt ihn mit GnuPG und legt ihn atomar im lokalen Verzeichnis ab;
nur erfolgreiche Sicherungen werden aufbewahrt, ältere nach 30 Tagen gelöscht.
Backup und Schlüssel müssen getrennt und zugriffsgeschützt liegen. Ein lokales
Backup überlebt **keinen Serververlust**. Fehler müssen täglich kontrolliert und
alarmiert werden; `Persistent=true` holt eine verpasste Ausführung beim Start
nach, ersetzt aber keine Überwachung.

Vorlagen `ops/systemd/todo-test-backup.{service,timer}` sichern täglich um
02:00 Asia/Tokyo. Der Betreiber prüft und installiert sie auf dem Server, passt
bei Bedarf `/opt/todo-app` an und aktiviert den Timer; diese Karte aktiviert
keinen Dienst. `/etc/todo-test/backup.env` (0600, nur Betreiber) enthält die
oben genannten Compose-Variablen sowie:

```text
OPS_PROJECT=todo-test
OPS_COMPOSE_FILE=/opt/todo-app/ops/compose.yml
OPS_BACKUP_DIR=/sicherer/lokaler/backup-ordner
OPS_KEY_FILE=/sicherer/getrennter/schluessel
OPS_DB_USER=postgres
OPS_DB_NAME=postgres
```

Die Schlüsseldatei enthält eine starke zufällige Passphrase und ist mindestens
0600 geschützt; sie liegt nicht im Backup-Verzeichnis und nicht im Repo. Den
Timer und den letzten Lauf mit `systemctl list-timers todo-test-backup.timer`
und `systemctl status todo-test-backup.service` prüfen. Ein manueller Lauf mit
denselben geschützten Umgebungsvariablen ist `bash ops/backup.sh`.

`bash ops/restore.sh <verschluesselte-datei> <neue_datenbank>` entschlüsselt
und prüft den Dump und erstellt ausschließlich eine **neue**, noch nicht
existierende Datenbank im gewählten Projekt; Quelldatenbank und bestehende
Datenbanken werden nicht überschrieben. Bis zum Ende der Rücksicherung liegt ein
unverschlüsselter temporärer Dump im Backup-Verzeichnis (Modus 0700); Speicher
und Zugriffe entsprechend absichern. Ein abgebrochener Prozess kann temporäre
Dateien hinterlassen; der Betreiber muss sie nach Prüfung sicher entfernen. Ein
fehlgeschlagener Restore kann eine unvollständige neue DB hinterlassen; diese
nicht verwenden. Daten und Login in der neuen DB prüfen, Zeit messen und erst
dann einen gesonderten, abgestimmten Cutover planen. Der Dump umfasst keine
clusterweiten Rollen oder Passwörter: bei Serververlust sind die Rollen und
Geheimnisse gesondert wiederherzustellen. Ein Restore auf demselben Server ist
kein Nachweis für eine externe Sicherung. Monatlich wiederholen und dokumentieren.

## Vor Live weiterhin offen

Externe verschlüsselte Backup-Kopie, separater Restore-Test samt Zeitmessung,
SMTP mit SPF/DKIM/DMARC und Zustelltest, EU-Standort und Verträge, Kapazität,
DNS/TLS, externer Health-/Backup-/Platten-/Zertifikatsalarm, SSH-Härtung,
Last- und Sicherheitsnachweis. Fehlt externe Speicherung oder ihr Budget, kein
Livegang. Testbetrieb und erfolgreiche lokale Tests sind keine Promote-Freigabe.
