# 003 · Ein ARM-Server, getrennte Test- und Live-Stacks

Datum: 2026-11-11 · Status: vorgeschlagen

## Lage und Optionen
Vorhandener Server, keine zusätzlichen laufenden Kosten.
| Option | Vorteil | Nachteil / Preis |
|---|---|---|
| Zwei Compose-Stacks auf vorhandenem ARM-Server | entspricht Vorgabe; getrennte Daten | gemeinsamer Server als Ausfallpunkt, Ressourcenbedarf |
| Mehrere Server oder Cloud | bessere Trennung | zusätzliche Kosten und Betrieb |

## Entscheidung
Ein Server, getrennte Stacks; Test täglich lokal sichern, externe Kopie im Test ausdrücklich ausgenommen. Vor Live externe Kopie, Restore-Test und SMTP.

## Folgen
Serververlust vernichtet ggf. Testdaten und Backups. Standort, Kapazität und externe Sicherung ungeprüft; kein kostenfreier Speicher vorhanden. Ohne Klärung kein Livegang.
