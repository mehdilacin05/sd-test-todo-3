#!/usr/bin/env bash
# Restore into a NEW database only. Never replaces the live/source database.
set -euo pipefail
: "${OPS_PROJECT:?}" "${OPS_COMPOSE_FILE:?}" "${OPS_BACKUP_DIR:?}" "${OPS_KEY_FILE:?}" "${OPS_DB_USER:?}" "${OPS_DB_NAME:?}"
[[ $# == 2 ]] || { echo 'Usage: restore.sh BACKUP NEW_DATABASE' >&2; exit 2; }
backup=$1 target=$2
[[ "$target" =~ ^[a-z][a-z0-9_]{0,62}$ && "$target" != "$OPS_DB_NAME" ]] || { echo 'Invalid or source database target' >&2; exit 1; }
[[ -f "$backup" && -s "$OPS_KEY_FILE" ]] || { echo 'Missing backup or encryption key' >&2; exit 1; }
umask 077
mkdir -p "$OPS_BACKUP_DIR"
work=$(mktemp -d "$OPS_BACKUP_DIR/.restore.XXXXXXXX")
trap 'rm -rf "$work"' EXIT
# Authenticate the entire encrypted dump before making any database changes.
gpg --no-options --homedir "$work" --batch --yes --pinentry-mode loopback --passphrase-file "$OPS_KEY_FILE" --output "$work/dump" --decrypt "$backup"
compose=(docker compose -p "$OPS_PROJECT" -f "$OPS_COMPOSE_FILE")
"${compose[@]}" exec -T db pg_restore --list < "$work/dump" >/dev/null
# createdb fails rather than replacing an existing database.
"${compose[@]}" exec -T db createdb -U "$OPS_DB_USER" "$target"
if ! "${compose[@]}" exec -T db pg_restore -U "$OPS_DB_USER" --exit-on-error -d "$target" < "$work/dump"; then
  echo "Restore failed; incomplete new database $target must be inspected and removed by the operator." >&2
  exit 1
fi
printf 'Restore complete to new database: %s\n' "$target"
