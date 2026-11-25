-- An excerpt is a readable poem record. Its source stays available by ID.
ALTER TABLE public.poems
  ADD COLUMN IF NOT EXISTS full_poem_id integer
    REFERENCES public.poems(id) ON DELETE RESTRICT
    CHECK (full_poem_id <> id);

CREATE INDEX IF NOT EXISTS poems_full_poem_id_idx
  ON public.poems (full_poem_id) WHERE full_poem_id IS NOT NULL;
