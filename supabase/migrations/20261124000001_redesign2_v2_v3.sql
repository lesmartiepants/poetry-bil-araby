-- ReDesign2 · V2 (keep, lists, share, Library) and V3 (journeys, collections, Tonight).
-- Additive only. The rules for keeps and lists live here, not in the app.

-- ── V2.1 Lists ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  colour text NOT NULL DEFAULT '#1B2F52',
  icon_letter text NOT NULL DEFAULT '',          -- '' = automatic from the name
  is_default boolean NOT NULL DEFAULT false,     -- Favorites
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS user_lists_one_default ON public.user_lists (user_id) WHERE is_default;
CREATE INDEX IF NOT EXISTS user_lists_user ON public.user_lists (user_id, updated_at DESC);

ALTER TABLE public.saved_poems ADD COLUMN IF NOT EXISTS list_ids uuid[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS saved_poems_list_ids ON public.saved_poems USING gin (list_ids);

-- Favorites can't be renamed or deleted; its colour can change.
CREATE OR REPLACE FUNCTION public.guard_default_list() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_default THEN
    RAISE EXCEPTION 'Favorites can''t be deleted' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.is_default AND (NEW.name <> OLD.name OR NOT NEW.is_default) THEN
    RAISE EXCEPTION 'Favorites can''t be renamed' USING ERRCODE = 'check_violation';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS user_lists_guard ON public.user_lists;
CREATE TRIGGER user_lists_guard BEFORE UPDATE OR DELETE ON public.user_lists
  FOR EACH ROW EXECUTE FUNCTION public.guard_default_list();

-- Deleting a list never un-keeps a poem: its id just leaves list_ids.
CREATE OR REPLACE FUNCTION public.forget_deleted_list() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.saved_poems SET list_ids = array_remove(list_ids, OLD.id) WHERE user_id = OLD.user_id AND OLD.id = ANY(list_ids);
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS user_lists_forget ON public.user_lists;
CREATE TRIGGER user_lists_forget AFTER DELETE ON public.user_lists
  FOR EACH ROW EXECUTE FUNCTION public.forget_deleted_list();

-- Every keep goes to Favorites, created with the first keep.
CREATE OR REPLACE FUNCTION public.keep_in_favorites() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE fav uuid;
BEGIN
  SELECT id INTO fav FROM public.user_lists WHERE user_id = NEW.user_id AND is_default;
  IF fav IS NULL THEN
    INSERT INTO public.user_lists (user_id, name, colour, is_default) VALUES (NEW.user_id, 'Favorites', '#4A1620', true) RETURNING id INTO fav;
  END IF;
  IF NOT fav = ANY(NEW.list_ids) THEN NEW.list_ids := array_prepend(fav, NEW.list_ids); END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS saved_poems_favorites ON public.saved_poems;
CREATE TRIGGER saved_poems_favorites BEFORE INSERT ON public.saved_poems
  FOR EACH ROW EXECUTE FUNCTION public.keep_in_favorites();

-- A poem's lists may only name the owner's own lists.
CREATE OR REPLACE FUNCTION public.check_own_lists() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM unnest(NEW.list_ids) l WHERE NOT EXISTS (SELECT 1 FROM public.user_lists u WHERE u.id = l AND u.user_id = NEW.user_id)) THEN
    RAISE EXCEPTION 'Unknown list' USING ERRCODE = 'foreign_key_violation';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS saved_poems_own_lists ON public.saved_poems;
CREATE TRIGGER saved_poems_own_lists BEFORE UPDATE OF list_ids ON public.saved_poems
  FOR EACH ROW EXECUTE FUNCTION public.check_own_lists();

DO $$ BEGIN
  CREATE POLICY "Users can update own saved poems" ON public.saved_poems FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── V2.2 Short links ────────────────────────────────────────────────────────
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS share_slug text;
CREATE UNIQUE INDEX IF NOT EXISTS poems_share_slug ON public.poems (share_slug) WHERE share_slug IS NOT NULL;

-- ── V2.3 Library: follows and reads ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.poet_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poet_id integer NOT NULL REFERENCES public.poets(id) ON DELETE CASCADE,
  followed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, poet_id)
);
CREATE TABLE IF NOT EXISTS public.poem_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  first_read_at timestamptz NOT NULL DEFAULT now(),
  last_read_at timestamptz NOT NULL DEFAULT now(),
  read_count integer NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, poem_id)
);
-- One row per person and poem, updated when the reader passes the last line.
CREATE OR REPLACE FUNCTION public.mark_read(p_poem_id integer) RETURNS void LANGUAGE sql SECURITY INVOKER AS $$
  INSERT INTO public.poem_reads (user_id, poem_id) VALUES (auth.uid(), p_poem_id)
  ON CONFLICT (user_id, poem_id) DO UPDATE SET last_read_at = now(), read_count = poem_reads.read_count + 1;
$$;

-- ── V3 Journeys, collections, Tonight ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.collections (
  id serial PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('collection', 'journey')),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  intro text NOT NULL DEFAULT '',
  step_label_en text NOT NULL DEFAULT 'Poem',
  step_label_ar text NOT NULL DEFAULT 'قصيدة',
  colour text NOT NULL DEFAULT '#22406E',
  pattern_key text,
  published boolean NOT NULL DEFAULT false
);
CREATE TABLE IF NOT EXISTS public.collection_poems (
  collection_id integer NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  position integer NOT NULL,
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  theme text,
  PRIMARY KEY (collection_id, position)
);
CREATE TABLE IF NOT EXISTS public.progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  collection_id integer NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  saved boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  PRIMARY KEY (user_id, collection_id)
);
CREATE TABLE IF NOT EXISTS public.featured_poems (
  date date PRIMARY KEY,
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT ''
);
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS display_name text;

-- ── Row-level security ──────────────────────────────────────────────────────
ALTER TABLE public.user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poet_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poem_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_poems ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "own lists" ON public.user_lists FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "own follows" ON public.poet_follows FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "own reads" ON public.poem_reads FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "own progress" ON public.progress FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  CREATE POLICY "published collections" ON public.collections FOR SELECT USING (published);
  CREATE POLICY "published collection poems" ON public.collection_poems FOR SELECT USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.published));
  CREATE POLICY "featured poems readable" ON public.featured_poems FOR SELECT USING (date <= CURRENT_DATE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_lists, public.poet_follows, public.poem_reads, public.progress TO authenticated;
GRANT SELECT ON public.collections, public.collection_poems, public.featured_poems TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_read(integer) TO authenticated;
