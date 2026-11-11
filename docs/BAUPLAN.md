# Bauplan: Todo-Web-App

Grundlage: `docs/ARCHITEKTUR.md`, Entwurf; Freigabe erfolgt durch Merge des Design-PR. Ein Schritt = eine Karte = ein PR. Fertig nur mit `make check` Exit 0, gültigem Rollenbericht und Nachweis. Migrationen sind rückwärtskompatibel, Rechte- und Funktionstests mit echten Nutzeridentitäten auszuführen. Die Nachweisziele bauen Wegwerfressourcen auf und räumen sie auf.

| # | Typ | Was | Nachweis | Fertig, wenn |
|---|---|---|---|---|
| 1 | geruest | Repo-Gerüst, Make-Ziele, CI-Vorschlag ohne Workflow-Änderungen, ARM64-Dockerfile und `/health` mit DB-Prüfung und Revision | `make check`, `make image`, `make health-test` | Alle Ziele Exit 0; Health liefert SHA und bei fehlender DB 503. |
| 2 | bauen | Versionierte Todo-Migration mit Constraint, Spaltenrechten, Eigentümer-RLS und Index | `make check`, `make testdb` | Echte Auth-Rollen: A sieht oder ändert B nicht; anonym leer; Eigentümer-Zuweisung und Kurztext werden abgewiesen, Kontolöschung löscht Todos. |
| 3 | bauen | Geschützter Magic-Link-Login, Studio-Betriebsweg und Mailpit-Test | `make check`, `make auth-test` | Angelegtes Konto erhält Link und meldet sich an/ab; Unbekanntes erzeugt auch direkt kein Konto; Link läuft ab und ist einmalig. |
| 4 | bauen | Todo-Oberfläche und serverseitige Aktionen | `make check`, `make todo-test` | Mobiler Ablauf: gültig anlegen, Kurztext ablehnen, Status wechseln, Löschen mit Dialog, älteste zuerst und alle Seiten erreichbar; fremde ID erfolglos. |
| 5 | bauen | Getrennte ARM-Test- und Live-Compose-Konfiguration, Health, lokale tägliche Sicherung und Restore | `make check`, `make ops-test` | Zwei isolierte Stacks, Mailpit nur im Test, Restore aus Testbackup erfolgreich; keine Secrets im Repo, Voraussetzungen für Live dokumentiert. |
| 6 | bauen | Automatisierte Sicherheitsprüfungen und dokumentierter Testlauf | `make check`, `make security` | Tests für A/B-Zugriff, anonym, XSS, vergessene Pfade, Header, Ports und Secrets bestehen; Ergebnis datiert in Architektur. Über der Grenze, weil unabhängige Sicherheitstests vor Live einen eigenen überprüfbaren PR brauchen. |

Die Live-Voraussetzungen (externer Backup-Speicher, SMTP, Standort, externer Check und Zielserver-Ressourcen) sind in `docs/FREIGABE.md` erfasst; der Testbetrieb darf kein Livegang sein. Der Mensch installiert Workflow-Dateien beim Gerüst-PR; der Bauagent ändert sie nicht.
