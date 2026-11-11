FROM postgres:17.6
COPY ops/database/init.sh /docker-entrypoint-initdb.d/001-init.sh
COPY supabase/migrations/20261111000000_create_todos.sql /opt/todo-migration.sql
COPY ops/database/migrate.sh /opt/migrate.sh
