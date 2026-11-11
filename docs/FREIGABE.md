# Freigabe Design: Todo-Web-App

Stand: 2026-11-11 · Klasse: S · Heikel: nein

App-Typ: internes Werkzeug. Teammitglieder verwalten nach Magic-Link-Login ausschließlich ihre eigenen Todos.

Architektur:
1. Mobil nutzbare Next.js-App; kein Offline-Betrieb.
2. Supabase Auth und Postgres selbst betrieben; Studio nur geschützt. Keine öffentliche Registrierung.
3. Datenbankregeln schützen persönliche Todos auch bei direktem Datenzugriff.
4. Getrennte Test- und Live-Stacks auf dem bestehenden ARM-Server; Testmails in Mailpit.
5. Lokales tägliches Backup im Test; vor Live externe Kopie, Restore-Test und SMTP.

Bauplan: 1 Gerüst und Prüftor; 2 Daten und Zugriffsrechte; 3 Login; 4 Todo-Ablauf; 5 Betrieb und Restore; 6 Sicherheitsnachweis. Details und messbare Kriterien: `docs/BAUPLAN.md`.

Kosten: 0 zusätzliche laufende Kosten zugesagt; bestehende Server-, Domain- und Mailkosten unbekannt. Externer Backup-Speicher fehlt: Ohne kostenfreie Lösung oder neue Budgetentscheidung kein Livegang. Ziel 99,5 % Verfügbarkeit, keine vertragliche Garantie.

Annahmen und Risiken: Serverseitige Ressourcen, EU-Standort, ARM64-Unterstützung aller eingesetzten Images, externer Check und DNS müssen vor Live nachgewiesen werden. Ein Serverausfall kann Testdaten und lokale Backups vernichten. Betreiber sieht werktags nach, Zeitzone Asia/Tokyo. Kein fester Termin.

Entscheidungen für dieses Design: Text nach Rand-Leerzeichen mindestens vier, höchstens 1.000 Zeichen; Seiten zu maximal 100; lokale Backups 30 Tage; Links höchstens 30 Minuten; Sicherungsziel täglich. Erster Testbetrieb nur mit Testdaten. Diese technischen Standardwerte können im PR kommentiert werden.

Vor Livegang: vorhandenes SMTP einrichten und Versand prüfen; externes Backup einrichten und Rücksicherung nachweisen; Standort, Monitoring, Last- und Sicherheitstests nachweisen. Diese Punkte sind keine zusätzliche Designfreigabe und erlauben keinen Livegang ohne spätere ausdrückliche Promote-Freigabe.

Freigabe: Merge des PR „Design: Todo-Web-App“ durch den Auftraggeber. Kein Bau vor diesem Merge.
