-- Poem categorization layer: multi-label, reader-facing facets for
-- filtering, discovery, and recommendations (mood / topic / motif) plus
-- scalar fields (emotional intensity, accessibility, century).
--
-- Populated by the reusable Claude classifier:
--   poetry_quality_and_curation/categorization/classify_poems.py
--   poetry_quality_and_curation/categorization/import_categories.py
--
-- Design notes
-- ------------
-- The existing `themes` table holds the single, scholarly غرض (one per poem,
-- and largely 'غير مصنف'). That stays as-is. This layer is ADDITIVE and
-- multi-label: a poem can be melancholic AND nostalgic AND about exile.
--
-- Mirrors existing conventions:
--   * normalized vocab tables (like themes/meters)
--   * a JSONB provenance column (like quality_subscores)
--   * scored_at/scoring_model twins -> categorized_at/categorization_model
--   * RLS enabled with no public policies (the API uses the pooler role).

-- ============================================================
-- 1. Controlled-vocabulary tables
-- ============================================================
CREATE TABLE IF NOT EXISTS category_dimensions (
  id          SERIAL PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,              -- 'mood' | 'topic' | 'motif'
  label_ar    TEXT NOT NULL,
  label_en    TEXT NOT NULL,
  cardinality TEXT NOT NULL DEFAULT 'multi' CHECK (cardinality IN ('single', 'multi')),
  sort_order  SMALLINT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS category_values (
  id           SERIAL PRIMARY KEY,
  dimension_id INTEGER NOT NULL REFERENCES category_dimensions(id) ON DELETE CASCADE,
  key          TEXT NOT NULL,                    -- stable ASCII slug, e.g. 'melancholy'
  label_ar     TEXT NOT NULL,
  label_en     TEXT NOT NULL,
  sort_order   SMALLINT NOT NULL DEFAULT 0,
  UNIQUE (dimension_id, key)
);

-- ============================================================
-- 2. Poem <-> category join (many-to-many, with confidence)
-- ============================================================
CREATE TABLE IF NOT EXISTS poem_categories (
  poem_id    INTEGER NOT NULL REFERENCES poems(id) ON DELETE CASCADE,
  value_id   INTEGER NOT NULL REFERENCES category_values(id) ON DELETE CASCADE,
  confidence SMALLINT,                           -- 0-100, optional
  model      VARCHAR(40),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poem_id, value_id)
);

CREATE INDEX IF NOT EXISTS idx_poem_categories_value ON poem_categories (value_id);
CREATE INDEX IF NOT EXISTS idx_poem_categories_poem  ON poem_categories (poem_id);

-- ============================================================
-- 3. Scalar facet columns on poems (cheap filter / sort)
-- ============================================================
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS mood_primary        TEXT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS emotional_intensity SMALLINT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS accessibility_level SMALLINT;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS century             SMALLINT;
-- Raw AI output kept for provenance / flexible querying:
--   {"moods":[...], "topics":[...], "motifs":[...], "confidences":{...}}
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS categories          JSONB;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS categorized_at      TIMESTAMPTZ;
ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS categorization_model VARCHAR(40);

CREATE INDEX IF NOT EXISTS idx_poems_mood_primary ON public.poems (mood_primary);
CREATE INDEX IF NOT EXISTS idx_poems_century      ON public.poems (century);
CREATE INDEX IF NOT EXISTS idx_poems_categories_gin ON public.poems USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_poems_categorized
  ON public.poems (id) WHERE categorized_at IS NOT NULL;

-- ============================================================
-- 4. Row-Level Security (match existing posture: enabled, no public policies)
-- ============================================================
ALTER TABLE category_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_values     ENABLE ROW LEVEL SECURITY;
ALTER TABLE poem_categories     ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Seed controlled vocabularies
--    AUTO-GENERATED from categorization/config.py — regenerate with:
--      python -m poetry_quality_and_curation.categorization.config --print-seed
-- ============================================================
INSERT INTO category_dimensions (key, label_ar, label_en, cardinality, sort_order) VALUES ('mood', 'المزاج', 'Mood', 'multi', 1) ON CONFLICT (key) DO NOTHING;
INSERT INTO category_dimensions (key, label_ar, label_en, cardinality, sort_order) VALUES ('topic', 'الموضوع', 'Topic', 'multi', 2) ON CONFLICT (key) DO NOTHING;
INSERT INTO category_dimensions (key, label_ar, label_en, cardinality, sort_order) VALUES ('motif', 'الصورة', 'Motif', 'multi', 3) ON CONFLICT (key) DO NOTHING;

INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'melancholy', 'حزن', 'Melancholy', 0 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'nostalgia', 'حنين', 'Nostalgia', 1 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'joy', 'فرح', 'Joy', 2 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'amorous', 'غزل', 'Amorous', 3 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'passion', 'وجد', 'Passion', 4 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'contemplation', 'تأمّل', 'Contemplation', 5 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'serenity', 'سكينة', 'Serenity', 6 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'defiance', 'تحدٍّ', 'Defiance', 7 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'pride', 'اعتزاز', 'Pride', 8 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'grief', 'أسى', 'Grief', 9 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'hope', 'أمل', 'Hope', 10 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'despair', 'يأس', 'Despair', 11 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'satire', 'سخرية', 'Satire', 12 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'reverence', 'خشوع', 'Reverence', 13 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'bittersweet', 'حلوٌ مرّ', 'Bittersweet', 14 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'yearning', 'شوق', 'Yearning', 15 FROM category_dimensions WHERE key = 'mood' ON CONFLICT (dimension_id, key) DO NOTHING;

INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'love', 'الحب', 'Love', 0 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'loss-death', 'الفقد والموت', 'Loss & Death', 1 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'exile-longing', 'الغربة والحنين', 'Exile & Longing', 2 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'homeland', 'الوطن', 'Homeland', 3 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'nature', 'الطبيعة', 'Nature', 4 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'war-conflict', 'الحرب والصراع', 'War & Conflict', 5 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'faith-spirit', 'الإيمان والروحانية', 'Faith & Spirituality', 6 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'wine-pleasure', 'الخمر واللذّة', 'Wine & Pleasure', 7 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'friendship', 'الصداقة والوفاء', 'Friendship & Loyalty', 8 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'time-mortality', 'الزمن والفناء', 'Time & Mortality', 9 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'wisdom-ethics', 'الحكمة والأخلاق', 'Wisdom & Ethics', 10 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'justice-oppression', 'العدل والظلم', 'Justice & Oppression', 11 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'freedom', 'الحرية', 'Freedom', 12 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'beauty', 'الجمال', 'Beauty', 13 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'honor-pride', 'الفخر والشرف', 'Honor & Pride', 14 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'women-feminine', 'المرأة والأنوثة', 'Women & the Feminine', 15 FROM category_dimensions WHERE key = 'topic' ON CONFLICT (dimension_id, key) DO NOTHING;

INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'night', 'الليل', 'Night', 0 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'desert-ruins', 'الصحراء والطلل', 'Desert & Ruins', 1 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'moon-stars', 'القمر والنجوم', 'Moon & Stars', 2 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'sea-water', 'البحر والماء', 'Sea & Water', 3 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'garden-flowers', 'الروض والزهر', 'Garden & Flowers', 4 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'wine-cup', 'الكأس والخمر', 'The Wine Cup', 5 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'sword-battle', 'السيف والمعركة', 'Sword & Battle', 6 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'birds', 'الطير', 'Birds', 7 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'fire-light', 'النار والضوء', 'Fire & Light', 8 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'tears', 'الدموع', 'Tears', 9 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'journey', 'الرحلة والراحلة', 'Journey & Mount', 10 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
INSERT INTO category_values (dimension_id, key, label_ar, label_en, sort_order) SELECT id, 'dawn', 'الفجر والصبح', 'Dawn', 11 FROM category_dimensions WHERE key = 'motif' ON CONFLICT (dimension_id, key) DO NOTHING;
