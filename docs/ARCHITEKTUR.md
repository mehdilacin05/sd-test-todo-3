# Architektur: Todo-Web-App

Auftraggeber: Team · Stand: 2026-11-10 · Klasse: S (vorläufig) · Heikel: nein (keine öffentliche Registrierung oder besonderen Daten)
Status: Interview

## 1. Kurzfassung
Interne Web-App für persönliche Todos; der Architekturentwurf steht noch aus.

## 2. Anforderungen (aus dem Interview)

| # | Frage | Antwort |
|---|---|---|
| 1 | Zweck | Persönliche Todos anlegen, abhaken, wieder öffnen, löschen; Ablauf ab Tag 1. Abmeldung. |
| 2 | Nutzer und Zugang | Nur Teammitglieder, eine Rolle, eigene App; keine öffentliche Registrierung. Betreiber legt Konten an. |
| 3 | Nutzung und Geschwindigkeit | Heute 8, in 12 Monaten 15 Nutzer; unter 100 gleichzeitig, DACH, überwiegend Lesen. Ziel 20 Anfragen/s, 95 % unter 500 ms. |
| 4 | Daten und Aufbewahrung | E-Mail, Todo-Text, Erstellungszeit und Status; ca. 2.000 Todos/Jahr; keine Gesundheits-, Finanz- oder Kinderdaten. Löschung bei Todo- bzw. Kontolöschung. |
| 5 | Firmen | Ein Team bzw. eine Firma; keine getrennten Firmenbereiche. |
| 6 | Geräte | Mobil angepasste Web-App, nur online. |
| 7 | Anbindungen | Supabase selbst betrieben; E-Mail-Anmeldung per Magic Link; Mailpit fängt Testmails ab, echter Versand erst zum Livegang. |
| 8 | Betrieb | Eigener ARM-Server, Docker Compose, getrennte Test- und Liveumgebung; Live nur nach Freigabe des Auftraggebers. Ziel 99,5 % Verfügbarkeit. Betreiber prüft werktags, Asia/Tokyo. Tägliche Sicherung in Volume; keine zusätzlichen Kosten. |
| 9 | Rechte | Konten in Supabase Studio anlegen, sperren und löschen; keine eigene Verwaltung. Jeder sieht und bearbeitet nur eigene Todos. |
| 10 | Mail live | SMTP-Zugang wird vor Livegang bereitgestellt; echter Versand ist bis dahin nicht Teil von Version 1. |
| 11 | Sicherung | Risiko des Serververlusts bei rein lokalem Backup dokumentieren. |
| 12 | Todo-Regeln | Älteste zuerst; mindestens vier Zeichen nach Entfernen äußerer Leerzeichen; Wiederöffnen möglich; endgültiges Löschen nach Bestätigung. |
| 13 | Budget und Zeit | Keine zusätzlichen laufenden Kosten, kein fester Termin. |
| 14 | Umfang | Zusammenfassung des Umfangs vom Auftraggeber bestätigt. |
| 15 | Backup-Ausnahme | Nur im Testbetrieb tägliche Sicherung im lokalen Volume; Risiko des vollständigen Datenverlusts bei Serververlust akzeptiert. Externe Kopie vor dem Livegang erforderlich; derzeit kein externer Speicher vorhanden. |

### Annahmen (noch zu klären)
- Tatsächlicher Serverstandort, verfügbare Serverressourcen und Erreichbarkeit sind noch nicht belegt.
- Ein Backup im lokalen Volume schützt nicht gegen den Verlust des Servers.
- Externer Speicher und dessen Kosten sind vor dem Livegang zu klären; ohne externe Kopie kein Livegang nach Betriebsstandard.

## 3. Systemübersicht
Ausstehend.

## 4. Daten
Ausstehend.

## 5. Abläufe
Ausstehend.

## 6. Skalierung: was bricht zuerst?
Ausstehend.

## 7. Sicherheit
Ausstehend.

## 8. Betrieb
Ausstehend.

## 9. Bauplan
Ausstehend.

## 10. Nicht in Version 1
Öffentliche Registrierung, eigene Kontenverwaltung, separate Handy-App, Offline-Nutzung, Integrationen außer Anmeldung.

## 11. Über der Klasse
Keine Abweichung festgestellt.

## 12. Entscheidungen
Ausstehend.

## 13. Glossar
Ausstehend.
