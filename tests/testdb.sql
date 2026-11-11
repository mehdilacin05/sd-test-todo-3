CREATE FUNCTION pg_temp.assert_true(ok boolean, message text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed: %', message; END IF;
END $$;
CREATE FUNCTION pg_temp.must_fail(query text, expected_state text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  BEGIN
    EXECUTE query;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected_state THEN RETURN; END IF;
    RAISE;
  END;
  RAISE EXCEPTION 'unexpected success: %', query;
END $$;

SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
INSERT INTO public.todos (text) VALUES ('A todo');
INSERT INTO public.todos (text) VALUES ('  äöüß  '), (repeat('x', 1000));
DELETE FROM public.todos WHERE text <> 'A todo';
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES (E'\t abc \n')$q$, '23514');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES ('   ')$q$, '23514');
-- Unicode White_Space property: all edge characters must be trimmed, not counted.
DO $$
DECLARE cp integer; ws text;
BEGIN
  FOREACH cp IN ARRAY ARRAY[9,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288] LOOP
    ws := chr(cp);
    PERFORM pg_temp.must_fail(format('INSERT INTO public.todos (text) VALUES (%L)', ws || 'abc' || ws), '23514');
    INSERT INTO public.todos (text) VALUES (ws || 'abcd' || ws);
    INSERT INTO public.todos (text) VALUES ('ab' || ws || 'c');
  END LOOP;
END $$;
DELETE FROM public.todos WHERE text <> 'A todo';
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text, id) VALUES ('forged', gen_random_uuid())$q$, '42501');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES ('  abc  ')$q$, '23514');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES (repeat('x', 1001))$q$, '23514');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text, user_id) VALUES ('forged', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$q$, '42501');
SELECT pg_temp.must_fail($q$UPDATE public.todos SET user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'$q$, '42501');
SELECT pg_temp.must_fail($q$UPDATE public.todos SET text = 'changed'$q$, '42501');
SELECT pg_temp.must_fail($q$UPDATE public.todos SET created_at = now()$q$, '42501');
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
INSERT INTO public.todos (text) VALUES ('B todo');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.todos), 'B sees only its own todo');
UPDATE public.todos SET completed = true WHERE text = 'A todo';
DELETE FROM public.todos WHERE text = 'A todo';
SELECT set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', false);
SELECT pg_temp.assert_true((SELECT count(*) = 1 AND bool_and(NOT completed) FROM public.todos), 'B cannot modify or delete A');
UPDATE public.todos SET completed = true WHERE text = 'A todo';
SELECT pg_temp.assert_true((SELECT bool_and(completed) FROM public.todos), 'owner can update');
UPDATE public.todos SET completed = true WHERE text = 'B todo';
DELETE FROM public.todos WHERE text = 'B todo';
SELECT set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', false);
SELECT pg_temp.assert_true((SELECT count(*) = 1 AND bool_and(NOT completed) FROM public.todos), 'A cannot modify or delete B');
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.todos), 'authenticated without subject sees nothing');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES ('no subject')$q$, '42501');
SET ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', false);
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.todos), 'anonymous sees nothing');
SELECT pg_temp.must_fail($q$INSERT INTO public.todos (text) VALUES ('anon todo')$q$, '42501');
RESET ROLE;
DELETE FROM auth.users WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SELECT pg_temp.assert_true((SELECT count(*) = 0 FROM public.todos WHERE user_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'account deletion cascades');
SELECT pg_temp.assert_true((SELECT count(*) = 1 FROM public.todos WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'other account unaffected');
