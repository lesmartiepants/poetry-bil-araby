-- V7 recitation: the audio lives in the public Storage bucket `recitations` (poem/voice.wav, immutable);
-- this table keeps the small facts the player needs. Additive and idempotent.
-- No policies and no grants: only the server (owner role) reads it, never the Data API.
CREATE TABLE IF NOT EXISTS public.poem_audio (
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  voice text NOT NULL,
  path text NOT NULL,              -- object path in the recitations bucket
  line_starts jsonb NOT NULL,      -- seconds at which each verse line begins
  duration numeric NOT NULL,       -- seconds
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poem_id, voice)
);
ALTER TABLE public.poem_audio ENABLE ROW LEVEL SECURITY;

-- The bucket exists only where Supabase Storage does (not in the plain Postgres used by CI).
DO $$ BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('recitations', 'recitations', true) ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
