# 001 · Next.js und selbst betriebenes Supabase mit Postgres

Datum: 2026-11-11 · Status: vorgeschlagen

## Lage und Optionen
Das Werkzeug braucht dauerhafte Daten und eine mobile Oberfläche.
| Option | Vorteil | Nachteil / Preis |
|---|---|---|
| Next.js + selbst betriebenes Supabase/Postgres | gewünschtes Vorbild, fertige Identität und Zeilenrechte | mehrere Container und Updates betreiben |
| Eigenes Backend und eigener Login | frei gestaltbar | höheres Sicherheits- und Wartungsrisiko |
| Supabase Cloud | weniger Serverpflege | widerspricht Vorgabe und kann zusätzliche Kosten verursachen |

## Entscheidung
Next.js und selbst betriebenes Supabase/Postgres, weil der Auftraggeber dies vorgibt; nur ein Fachmodul und eine Fachtabelle.

## Folgen
Versionen und ARM64-Images anhand der Originalquellen prüfen. Bei fehlender Kapazität neu bewerten; kein eigener Login.
