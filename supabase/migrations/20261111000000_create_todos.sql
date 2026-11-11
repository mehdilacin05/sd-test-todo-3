-- The auth schema and roles are provided by Supabase.
CREATE TABLE public.todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Trim Unicode White_Space (U+0009..000D, 0020, 0085, 00A0, 1680,
  -- 2000..200A, 2028, 2029, 202F, 205F, 3000); interior characters count.
  text text NOT NULL CHECK (
    char_length(btrim(text, U&'\0009\000A\000B\000C\000D\0020\0085\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000')) >= 4
    AND char_length(text) <= 1000
  ),
  completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX todos_user_created_id_idx ON public.todos (user_id, created_at, id);
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.todos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.todos TO anon, authenticated;
GRANT INSERT (text) ON public.todos TO authenticated;
GRANT UPDATE (completed) ON public.todos TO authenticated;
GRANT DELETE ON public.todos TO authenticated;

CREATE POLICY todos_select ON public.todos FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);
CREATE POLICY todos_insert ON public.todos FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY todos_update ON public.todos FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY todos_delete ON public.todos FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = user_id);
