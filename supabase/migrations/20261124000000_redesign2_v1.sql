-- ReDesign2 · V1 (build spec, slices V1.1–V1.6). Additive only: today's app keeps working.

-- V1.1 Settings: defaults with each user's choices on top.
CREATE TABLE IF NOT EXISTS public.settings_defaults (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.settings_defaults (id, prefs) VALUES (true, '{
  "page": "night", "font": "amiri", "textSize": 3, "vowelMarks": true, "under": "english", "voice": "Zephyr",
  "feelings": [], "learnFromKeeps": true, "classicalModern": 0.3, "difficulty": "any", "length": "any", "tapWord": true
}'::jsonb) ON CONFLICT (id) DO NOTHING;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS prefs jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.settings_defaults ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "settings_defaults readable" ON public.settings_defaults FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.settings_defaults TO anon, authenticated;

-- V1.2 AI text: one home for explanations, glosses and (V3) doors. Read-or-generate.
CREATE TABLE IF NOT EXISTS public.poem_ai_text (
  poem_id integer NOT NULL REFERENCES public.poems(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('explanation', 'gloss', 'doors')),
  key text NOT NULL DEFAULT '',
  payload jsonb NOT NULL,
  model text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poem_id, kind, key)
);
ALTER TABLE public.poem_ai_text ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "poem_ai_text readable" ON public.poem_ai_text FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.poem_ai_text TO anon, authenticated;

-- V1.5 Explore: poet of the week, era details, which moods show as feelings.
CREATE TABLE IF NOT EXISTS public.featured_poets (
  week_start date PRIMARY KEY,
  poet_id integer NOT NULL REFERENCES public.poets(id) ON DELETE CASCADE,
  note text NOT NULL DEFAULT ''
);
ALTER TABLE public.featured_poets ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "featured_poets readable" ON public.featured_poets FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
GRANT SELECT ON public.featured_poets TO anon, authenticated;

ALTER TABLE public.eras ADD COLUMN IF NOT EXISTS name_en text;
ALTER TABLE public.eras ADD COLUMN IF NOT EXISTS years text;
ALTER TABLE public.eras ADD COLUMN IF NOT EXISTS place text;
ALTER TABLE public.eras ADD COLUMN IF NOT EXISTS line text;
ALTER TABLE public.eras ADD COLUMN IF NOT EXISTS colour text;
UPDATE public.eras e SET name_en = v.name_en, years = v.years, place = v.place, line = v.line, colour = v.colour
FROM (VALUES
  ('pre-islamic', 'Pre-Islamic', 'c. 500–622', 'Arabia', 'Desert odes of honour, raids and abandoned campsites.', '#4A1620'),
  ('islamic', 'Early Islamic', '622–661', 'Medina', 'Poets of the new faith, praise and elegy.', '#5C4C2A'),
  ('umayyad', 'Umayyad', '661–750', 'Damascus', 'Chaste love, court satire and great lovers.', '#2F6B5A'),
  ('abbasid', 'Abbasid', '750–1258', 'Baghdad', 'Wine, wit and the proudest poets of the court.', '#22406E'),
  ('andalusian', 'Andalusian', '756–1492', 'Córdoba', 'Gardens, muwashshahat and the cities that were lost.', '#1E4A3E'),
  ('ayyubid', 'Ayyubid', '1171–1260', 'Cairo', 'Crusade, devotion and the Sufi turn.', '#5C4C2A'),
  ('mamluk', 'Mamluk', '1250–1517', 'Cairo, Damascus', 'Praise of the Prophet and the craft of ornament.', '#4A1620'),
  ('ottoman', 'Ottoman', '1517–1798', 'Istanbul, Cairo', 'Courtly forms and quiet centuries.', '#2F6B5A'),
  ('modern', 'Modern', '1850–today', 'Cairo, Beirut, Baghdad', 'Free verse, exile and the nation.', '#22406E')
) AS v(slug, name_en, years, place, line, colour)
WHERE e.slug = v.slug AND e.name_en IS NULL;

ALTER TABLE public.category_values ADD COLUMN IF NOT EXISTS show_in_explore boolean NOT NULL DEFAULT false;
ALTER TABLE public.category_values ADD COLUMN IF NOT EXISTS explore_line text;
UPDATE public.category_values v SET show_in_explore = true, explore_line = x.line
FROM category_dimensions d, (VALUES
  ('nostalgia', 'Absence, distance, the empty house. The oldest feeling in Arabic poetry.'),
  ('grief', 'Elegies for the dead, from Al-Khansa on.'),
  ('pride', 'The self, the tribe, the sword and the pen.'),
  ('amorous', 'Desire, devotion and the beloved’s cruelty.'),
  ('contemplation', 'Time, the stars and what lasts.'),
  ('yearning', 'Longing for someone, or somewhere, out of reach.'),
  ('defiance', 'Standing up to fate, kings and exile.'),
  ('reverence', 'Mystic love and the search for God.'),
  ('satire', 'Satire, mockery and the sharp tongue.')
) AS x(key, line)
WHERE d.id = v.dimension_id AND d.key = 'mood' AND v.key = x.key;

-- V1.6 Poet pages: region picks the hero pattern; gender is kept for future collections.
ALTER TABLE public.poets ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.poets ADD COLUMN IF NOT EXISTS gender text CHECK (gender IN ('f', 'm'));
