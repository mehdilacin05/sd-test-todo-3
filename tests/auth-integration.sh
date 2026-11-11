#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="todo-auth-test-$$"
compose=(docker compose -p "$project" -f tests/compose.auth.yml -f supabase/compose.auth-policy.yml)
cleanup() {
  status=$?
  if [[ "$status" != 0 ]]; then printf '%s\n' 'Auth integration failed; isolated test services will be removed.' >&2; fi
  "${compose[@]}" down -v --remove-orphans >/dev/null
}
trap cleanup EXIT
"${compose[@]}" up -d --wait db mail runner
"${compose[@]}" exec -T db psql -U postgres -c 'CREATE SCHEMA auth;'
"${compose[@]}" up -d auth
# Copy rather than bind-mount: the Docker daemon may be remote from this shell.
tar --exclude=.git --exclude=node_modules --exclude=.next --exclude=.cache --exclude=.npm-cache --exclude=.ae --exclude='.env*' --exclude='*.log' -cf - . | "${compose[@]}" exec -T runner tar -xf - -C /work
"${compose[@]}" exec -T runner bash -eu -o pipefail -c '
  npm ci --no-audit --no-fund
  export NEXT_PUBLIC_SUPABASE_URL=http://runner:3001
  node tests/auth-proxy.mjs >/tmp/proxy.log 2>&1 &
  export NEXT_PUBLIC_SUPABASE_ANON_KEY="$(node tests/auth-jwt.mjs anon)"
  export TEST_SERVICE_KEY="$(node tests/auth-jwt.mjs service_role)"
  export NEXT_PUBLIC_SITE_URL=http://runner:3000
  for _ in {1..60}; do if curl -fsS http://auth:9999/health >/dev/null 2>&1; then break; fi; sleep 1; done
  curl -fsS http://auth:9999/health >/dev/null
  npx --no-install next dev --hostname 0.0.0.0 --port 3000 > /tmp/app.log 2>&1 &
  app_pid=$!
  trap "kill $app_pid 2>/dev/null || true" EXIT
  for _ in {1..60}; do if curl -fsS http://runner:3000/login >/dev/null 2>&1; then break; fi; sleep 1; done
  node tests/auth-integration.mjs
'
