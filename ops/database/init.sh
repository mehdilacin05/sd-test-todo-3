#!/usr/bin/env bash
set -eu
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v authpass="$AUTH_DB_PASSWORD" -v restpass="$REST_DB_PASSWORD" -v healthpass="$HEALTH_DB_PASSWORD" <<'SQL'
CREATE ROLE auth_admin LOGIN PASSWORD :'authpass';
CREATE SCHEMA auth AUTHORIZATION auth_admin;
GRANT CREATE ON DATABASE postgres TO auth_admin;
CREATE ROLE todo_health LOGIN PASSWORD :'healthpass';
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD :'restpass';
GRANT anon, authenticated, service_role TO authenticator;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
SQL
