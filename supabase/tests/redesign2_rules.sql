-- Rules for keeps and lists (build spec V2.1, V2.3). Runs against a local database:
--   psql "$LOCAL_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/redesign2_rules.sql
--   local Supabase: psql postgresql://supabase_admin:postgres@127.0.0.1:54322/postgres -f …
-- Everything happens in one transaction that is rolled back.
BEGIN;
-- The signed-in user comes from the JWT claims, as on Supabase. On plain Postgres
-- (scripts/db-setup.sh stubs auth.uid() to NULL) install a stand-in that reads them.
DO $do$ BEGIN
  IF position('NULL::uuid' in pg_get_functiondef('auth.uid'::regproc)) > 0 THEN
    EXECUTE $f$CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $b$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $b$$f$;
  END IF;
END $do$;
INSERT INTO auth.users (id) VALUES ('11111111-1111-1111-1111-111111111111'), ('22222222-2222-2222-2222-222222222222');
SET LOCAL request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
SET LOCAL request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

DO $$
DECLARE me uuid := '11111111-1111-1111-1111-111111111111'; other uuid := '22222222-2222-2222-2222-222222222222';
        fav uuid; mine uuid; theirs uuid; ids uuid[]; n int;
BEGIN
  -- The first keep creates Favorites and puts the poem in it.
  INSERT INTO saved_poems (user_id, poem_id) VALUES (me, 1);
  SELECT id INTO fav FROM user_lists WHERE user_id = me AND is_default;
  ASSERT fav IS NOT NULL, 'Favorites is created with the first keep';
  SELECT list_ids INTO ids FROM saved_poems WHERE user_id = me AND poem_id = 1;
  ASSERT ids = ARRAY[fav], 'a keep goes to Favorites';

  -- A second keep reuses the same Favorites.
  INSERT INTO saved_poems (user_id, poem_id) VALUES (me, 2);
  SELECT count(*) INTO n FROM user_lists WHERE user_id = me AND is_default;
  ASSERT n = 1, 'only one Favorites per user';

  -- A poem in two lists; deleting one list keeps it kept and in the other.
  INSERT INTO user_lists (user_id, name) VALUES (me, 'Longing for home') RETURNING id INTO mine;
  UPDATE saved_poems SET list_ids = list_ids || mine WHERE user_id = me AND poem_id = 1;
  DELETE FROM user_lists WHERE id = mine;
  SELECT list_ids INTO ids FROM saved_poems WHERE user_id = me AND poem_id = 1;
  ASSERT ids = ARRAY[fav], 'deleting a list removes only its id; the poem stays kept and in Favorites';

  -- Taking a poem out of Favorites never un-keeps it.
  UPDATE saved_poems SET list_ids = array_remove(list_ids, fav) WHERE user_id = me AND poem_id = 2;
  SELECT count(*) INTO n FROM saved_poems WHERE user_id = me AND poem_id = 2;
  ASSERT n = 1, 'out of Favorites, still kept';

  -- Favorites can't be renamed or deleted, but its colour can change.
  UPDATE user_lists SET colour = '#22406E' WHERE id = fav;
  BEGIN UPDATE user_lists SET name = 'Best' WHERE id = fav; RAISE EXCEPTION 'rename allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;
  BEGIN DELETE FROM user_lists WHERE id = fav; RAISE EXCEPTION 'delete allowed';
  EXCEPTION WHEN check_violation THEN NULL; END;

  -- A poem can't be put in someone else's list.
  INSERT INTO user_lists (user_id, name) VALUES (other, 'Theirs') RETURNING id INTO theirs;
  BEGIN UPDATE saved_poems SET list_ids = list_ids || theirs WHERE user_id = me AND poem_id = 1; RAISE EXCEPTION 'foreign list allowed';
  EXCEPTION WHEN foreign_key_violation THEN NULL; END;

  -- Reads: one row per person and poem, counted.
  PERFORM mark_read(1); PERFORM mark_read(1);
  SELECT read_count INTO n FROM poem_reads WHERE user_id = me AND poem_id = 1;
  ASSERT n = 2, 'mark_read counts rereads';
  RAISE NOTICE 'redesign2 rules: all assertions passed';
END $$;
ROLLBACK;
