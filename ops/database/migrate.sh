#!/usr/bin/env bash
set -euo pipefail
export PGPASSWORD="$POSTGRES_PASSWORD"
for _ in $(seq 1 120); do
  if [[ "$(psql -h db -U postgres -d postgres -Atqc "SELECT to_regprocedure('auth.uid()') IS NOT NULL AND to_regclass('auth.users') IS NOT NULL" 2>/dev/null || true)" == t ]]; then break; fi
  sleep 1
done
[[ "$(psql -h db -U postgres -d postgres -Atqc "SELECT to_regprocedure('auth.uid()') IS NOT NULL AND to_regclass('auth.users') IS NOT NULL")" == t ]]
psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
CREATE SCHEMA IF NOT EXISTS todo_ops;
REVOKE ALL ON SCHEMA todo_ops FROM PUBLIC;
CREATE TABLE IF NOT EXISTS todo_ops.migrations (name text PRIMARY KEY);
SQL
applied=$(psql -h db -U postgres -d postgres -Atqc "SELECT EXISTS(SELECT FROM todo_ops.migrations WHERE name = '20261111000000_create_todos')")
if [[ "$applied" == f ]]; then
  # A conflicting manually-created table fails the migration; never mark it applied.
  { printf 'BEGIN;\n'; cat /opt/todo-migration.sql; printf "\nINSERT INTO todo_ops.migrations VALUES ('20261111000000_create_todos');\nCOMMIT;\n"; } |
    psql -h db -U postgres -d postgres -v ON_ERROR_STOP=1
fi
