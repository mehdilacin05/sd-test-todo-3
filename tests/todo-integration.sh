#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="todo-ui-test-$$"
compose=(docker compose -p "$project" -f tests/compose.auth.yml -f supabase/compose.auth-policy.yml -f tests/compose.todo.yml)
cleanup() {
  status=$?
  if [[ "$status" != 0 ]]; then printf '%s\n' 'Todo integration failed; isolated test services will be removed.' >&2; fi
  "${compose[@]}" down -v --remove-orphans >/dev/null
}
trap cleanup EXIT
"${compose[@]}" up -d --wait db mail runner
"${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -U postgres -c 'CREATE SCHEMA auth;'
"${compose[@]}" up -d auth
for _ in {1..60}; do
  if "${compose[@]}" exec -T runner node -e 'fetch("http://auth:9999/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))' >/dev/null 2>&1; then break; fi
  sleep 1
done
"${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -U postgres < tests/todo-setup.sql
"${compose[@]}" exec -T db psql -v ON_ERROR_STOP=1 -U postgres < supabase/migrations/20261111000000_create_todos.sql
"${compose[@]}" up -d rest
# The Docker daemon may be remote, so copy instead of mounting the worktree.
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude=.npm-cache --exclude=.ae --exclude='.env*' --exclude='*.log' -cf - . | "${compose[@]}" exec -T runner tar -xf - -C /work
"${compose[@]}" exec -T runner bash -eu -o pipefail -c '
  npm ci --no-audit --no-fund
  npx --no-install playwright install --with-deps --only-shell chromium
  export NEXT_PUBLIC_SUPABASE_URL=http://runner:3001
  node tests/auth-proxy.mjs >/tmp/proxy.log 2>&1 &
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(node tests/auth-jwt.mjs anon)"
  export TEST_SERVICE_KEY="$(node tests/auth-jwt.mjs service_role)"
  export NEXT_PUBLIC_SITE_URL=http://runner:3000
  npx --no-install next dev --hostname 0.0.0.0 --port 3000 >/tmp/app.log 2>&1 &
  app_pid=$!
  trap "kill $app_pid 2>/dev/null || true" EXIT
  for _ in {1..90}; do if curl -fsS http://runner:3000/login >/dev/null 2>&1; then break; fi; sleep 1; done
  node tests/todo-integration.mjs || { cat /tmp/app.log; exit 1; }
'
