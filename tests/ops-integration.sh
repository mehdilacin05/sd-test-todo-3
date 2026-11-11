#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="todo-ops-test-$$"
compose=(docker compose -p "$project" -f tests/compose.testdb.yml)
tmp=$(mktemp -d)
cleanup() {
  "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$tmp"
}
trap cleanup EXIT
chmod 700 "$tmp"
printf '%s\n' 'test-only-encryption-password' > "$tmp/key"
chmod 600 "$tmp/key"
export OPS_PROJECT="$project" OPS_COMPOSE_FILE=tests/compose.testdb.yml OPS_BACKUP_DIR="$tmp/backups" OPS_KEY_FILE="$tmp/key" OPS_DB_USER=postgres OPS_DB_NAME=postgres
"${compose[@]}" up -d --wait db
"${compose[@]}" exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE TABLE backup_probe (value text); INSERT INTO backup_probe VALUES ('restore verified');"
bash ops/backup.sh
backup=$(printf '%s\n' "$tmp"/backups/*.enc)
[[ -f "$backup" ]]
if grep -aq 'restore verified' "$backup"; then echo 'backup is not encrypted' >&2; exit 1; fi
cp "$backup" "$tmp/damaged.enc"
truncate -s 32 "$tmp/damaged.enc"
if bash ops/restore.sh "$tmp/damaged.enc" damaged_probe; then echo 'damaged backup must fail' >&2; exit 1; fi
[[ $("${compose[@]}" exec -T db psql -U postgres -d postgres -Atqc "SELECT count(*) FROM pg_database WHERE datname = 'damaged_probe'") == 0 ]]
bash ops/restore.sh "$backup" restore_probe
result=$("${compose[@]}" exec -T db psql -U postgres -d restore_probe -Atqc 'SELECT value FROM backup_probe')
[[ "$result" == 'restore verified' ]]
if bash ops/restore.sh "$backup" postgres; then echo 'restore to source must fail' >&2; exit 1; fi
if bash ops/restore.sh "$backup" restore_probe; then echo 'restore to existing DB must fail' >&2; exit 1; fi
printf '%s\n' 'Encrypted backup and isolated restore passed.'
