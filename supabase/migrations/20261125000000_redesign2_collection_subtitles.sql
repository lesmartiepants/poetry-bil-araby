-- Editorial subtitle: one short line under a journey or collection title.
-- Replaces the subtitle the API used to derive from the first and last poet.
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS subtitle_en text,
  ADD COLUMN IF NOT EXISTS subtitle_ar text;
