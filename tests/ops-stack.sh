#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
project="todo-stacks-$$"
export DOCKER_CONFIG="$PWD/.docker-config"
mkdir -p "$DOCKER_CONFIG"
export POSTGRES_PASSWORD=testonlypassword JWT_SECRET=test-only-jwt-secret-at-least-32-characters-long
export AUTH_DB_PASSWORD=testonlyauth REST_DB_PASSWORD=testonlyrest HEALTH_DB_PASSWORD=testonlyhealth
export ANON_KEY="$(node tests/auth-jwt.mjs anon)" SERVICE_KEY="$(node tests/auth-jwt.mjs service_role)" APP_IMAGE=todo-health-test:local
export META_CRYPTO_KEY=test-only-meta-key-at-least-32-chars STUDIO_PORT=0
export SITE_URL=http://example.invalid SMTP_HOST=mailpit SMTP_PORT=1025 SMTP_FROM=test@example.invalid
export SMTP_USER=testonly SMTP_PASSWORD=testonly GATEWAY_PORT=0 MAILPIT_PORT=0
c_test=(docker compose -p "${project}-test" -f ops/compose.yml -f ops/compose.test.yml)
c_live=(docker compose -p "${project}-live" -f ops/compose.yml -f ops/compose.live.yml)
cleanup() {
  status=$?
  if [[ "$status" != 0 ]]; then
    "${c_test[@]}" ps -a || true
    "${c_live[@]}" ps -a || true
    echo 'Stack test failed.' >&2
  fi
  "${c_test[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  "${c_live[@]}" down -v --remove-orphans >/dev/null 2>&1 || true
  if [[ -n "${backup_dir:-}" ]]; then rm -rf "$backup_dir"; fi
}
trap cleanup EXIT
[[ $("${c_test[@]}" config --services | grep -cx mailpit) == 1 ]]
! "${c_live[@]}" config --services | grep -qx mailpit
"${c_test[@]}" up -d --build --wait
"${c_live[@]}" up -d --wait
"${c_test[@]}" exec -T -e TEST_SERVICE_KEY="$SERVICE_KEY" gateway node - < tests/ops-auth.mjs
"${c_test[@]}" exec -T db psql -U postgres -c 'CREATE TABLE public.isolation_probe (value text); INSERT INTO public.isolation_probe VALUES ($$backup probe$$);'
backup_dir=$(mktemp -d)
printf '%s\n' 'test-only-encryption-password' > "$backup_dir/key"
chmod 600 "$backup_dir/key"
export OPS_PROJECT="${project}-test" OPS_COMPOSE_FILE=ops/compose.yml OPS_BACKUP_DIR="$backup_dir/data" OPS_KEY_FILE="$backup_dir/key" OPS_DB_USER=postgres OPS_DB_NAME=postgres
bash ops/backup.sh
backup=$(printf '%s\n' "$backup_dir"/data/*.enc)
bash ops/restore.sh "$backup" restore_probe
[[ $("${c_test[@]}" exec -T db psql -U postgres -d restore_probe -Atqc 'SELECT value FROM public.isolation_probe') == 'backup probe' ]]
[[ $("${c_test[@]}" exec -T db psql -U postgres -d restore_probe -Atqc "SELECT count(*) FROM auth.users WHERE email = 'ops-person@example.invalid'") == 1 ]]
[[ $("${c_test[@]}" exec -T db psql -U postgres -d restore_probe -Atqc "SELECT count(*) FROM public.todos WHERE text = 'Persisted operations probe'") == 1 ]]
[[ $("${c_live[@]}" exec -T db psql -U postgres -Atqc "SELECT to_regclass('public.isolation_probe') IS NULL") == t ]]
for kind in test live; do
  if [[ "$kind" == test ]]; then compose=("${c_test[@]}"); else compose=("${c_live[@]}"); fi
  "${compose[@]}" exec -T -e EXPECTED_SHA="$(git rev-parse HEAD)" gateway node -e "fetch('http://gateway:3001/health').then(async r => {const j=await r.json(); if(!r.ok || j.revision!==process.env.EXPECTED_SHA)process.exit(1)}).catch(()=>process.exit(1))"
done
"${c_test[@]}" stop db
"${c_test[@]}" exec -T gateway node -e "fetch('http://gateway:3001/health').then(r=>process.exit(r.status===503?0:1)).catch(()=>process.exit(1))"
printf '%s\n' 'Test and live stacks have separate databases and healthy apps; DB outage reports 503.'
