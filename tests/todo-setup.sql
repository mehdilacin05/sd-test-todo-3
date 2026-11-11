-- The test uses real JWT roles and the same migration as production.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD 'test-only-password';
GRANT anon, authenticated TO authenticator;
GRANT USAGE ON SCHEMA public, auth TO anon, authenticated;
-- GoTrue installs auth.uid(); grant it to the PostgREST JWT roles.
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated;
