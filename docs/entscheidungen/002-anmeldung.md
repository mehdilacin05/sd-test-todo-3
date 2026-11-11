# 002 · Magic Link ohne öffentliche Registrierung

Datum: 2026-11-11 · Status: vorgeschlagen

## Lage und Optionen
Nur angelegte Teamkonten sehen persönliche Daten.
| Option | Vorteil | Nachteil / Preis |
|---|---|---|
| Supabase Magic Link, Studio-Verwaltung | keine eigenen Passwörter; Vorgabe erfüllt | E-Mail-Zustellung und geschütztes Studio nötig |
| Passwort-Login | ohne Linkzustellung beim täglichen Login | zusätzliche Passwort- und Reset-Risiken, nicht gewünscht |
| Öffentliche Registrierung | weniger Verwaltungsaufwand | widerspricht Nutzerkreis und Sicherheitsvorgabe |

## Entscheidung
Studio verwaltet Konten; Registrierung serverseitig deaktivieren, bei Linkabruf Kontoerstellung ausschließen. Besitz per RLS, keine Administratorschlüssel in App/Browser. Test: Mailpit; Live: SMTP.

## Folgen
Login hängt von Mailzustellung ab; Tests müssen Login bestehender und Ablehnung unbekannter Konten belegen. Quellen: https://supabase.com/docs/guides/auth/auth-email-passwordless und https://supabase.com/docs/guides/self-hosting/docker (2026-11-11).
