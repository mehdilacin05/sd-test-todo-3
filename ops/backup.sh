#!/usr/bin/env bash
# Encrypted, atomic PostgreSQL dump; environment supplied by the operator.
set -euo pipefail
: "${OPS_PROJECT:?}" "${OPS_COMPOSE_FILE:?}" "${OPS_BACKUP_DIR:?}" "${OPS_KEY_FILE:?}" "${OPS_DB_USER:?}" "${OPS_DB_NAME:?}"
[[ "$OPS_PROJECT" =~ ^[a-z0-9][a-z0-9_-]*$ ]] || { echo 'Invalid project name' >&2; exit 1; }
[[ -s "$OPS_KEY_FILE" ]] || { echo 'Missing encryption key file' >&2; exit 1; }
umask 077
mkdir -p "$OPS_BACKUP_DIR"
work=$(mktemp -d "$OPS_BACKUP_DIR/.backup.XXXXXXXX")
trap 'rm -rf "$work"' EXIT
compose=(docker compose -p "$OPS_PROJECT" -f "$OPS_COMPOSE_FILE")
"${compose[@]}" exec -T db pg_dump -U "$OPS_DB_USER" -d "$OPS_DB_NAME" -Fc | \
  gpg --no-options --homedir "$work" --batch --yes --pinentry-mode loopback --passphrase-file "$OPS_KEY_FILE" --symmetric --cipher-algo AES256 --output "$work/dump.enc"
name="${OPS_PROJECT}-$(date -u +%Y%m%dT%H%M%SZ)-$$.dump.enc"
mv "$work/dump.enc" "$OPS_BACKUP_DIR/$name"
# Only completed files from this project are subject to the 30-day retention.
find "$OPS_BACKUP_DIR" -maxdepth 1 -type f -name "${OPS_PROJECT}-*.dump.enc" -mtime +29 -delete
printf 'Backup complete: %s\n' "$OPS_BACKUP_DIR/$name"
