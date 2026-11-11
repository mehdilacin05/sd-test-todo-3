#!/usr/bin/env bash
set -euo pipefail
project="todo-db-${USER:-test}-$$"
compose=(docker compose -p "$project" -f tests/compose.testdb.yml)
trap '"${compose[@]}" down --volumes --remove-orphans' EXIT
"${compose[@]}" up -d --wait
psql_cmd=("${compose[@]}" exec -T db psql -X -v ON_ERROR_STOP=1 -U postgres)
"${psql_cmd[@]}" < tests/testdb-setup.sql
for migration in supabase/migrations/*.sql; do
  "${psql_cmd[@]}" < "$migration"
done
"${psql_cmd[@]}" < tests/testdb.sql
