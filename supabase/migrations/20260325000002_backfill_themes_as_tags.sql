-- =============================================================
-- Migration: backfill_themes_as_tags
-- Ensures every theme in public.themes has a corresponding tag,
-- then populates public.poem_tags from existing poems.theme_id.
--
-- Strategy:
--   1. For themes whose Arabic name maps to a known taxonomy slug,
--      use the canonical slug (explicit mapping table).
--   2. For unmapped themes, auto-generate a slug from the Arabic name
--      via a temporary transliteration mapping and insert as new tags.
--   3. Backfill poem_tags with confidence=1.0, source='manual'
--      (these were human-curated during original data import).
--
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE.
--
-- Rollback:
--   -- Remove backfilled poem_tags (source='manual' from this migration
--   --   will remove ALL manual tags, so scope by created_at if needed)
--   DELETE FROM public.poem_tags
--     WHERE source = 'manual'
--       AND created_at >= '2026-03-25 00:00:00+00';
--   -- Remove auto-created theme tags (those not in the taxonomy seed)
--   DELETE FROM public.tags
--     WHERE slug IN (SELECT slug FROM public.tags
--                    WHERE tag_type = 'theme'
--                      AND created_at >= '2026-03-25 00:00:00+00'
--                      AND slug NOT IN (
--                        'love','longing','grief','nature','praise','elegy',
--                        'satire','wisdom','mysticism','homeland','freedom',
--                        'war','wine','exile','friendship','beauty','religion',
--                        'death','youth','separation','panegyric','ascetic',
--                        'boasting','hunting','romance'
--                      ));
-- =============================================================

-- ── Step 1: Explicit Arabic-name → slug mapping ───────────────
-- Maps Arabic theme names known to exist in the Diwan dataset
-- to their canonical taxonomy slugs inserted in migration 000001.
-- Any theme not listed here falls through to Step 2.

CREATE TEMP TABLE theme_slug_map (
  name_ar TEXT PRIMARY KEY,
  slug    VARCHAR(100) NOT NULL
) ON COMMIT DROP;

INSERT INTO theme_slug_map (name_ar, slug) VALUES
  -- Direct matches to taxonomy
  ('الحب',             'love'),
  ('الغزل',            'ghazal'),       -- form 'ghazal' doubles as theme label in source data
  ('الشوق',            'longing'),
  ('الحزن',            'grief'),
  ('الطبيعة',          'nature'),
  ('المديح',           'praise'),
  ('الرثاء',           'elegy'),
  ('رثاء',             'elegy'),        -- variant without article
  ('الهجاء',           'satire'),
  ('الحكمة',           'wisdom'),
  ('التصوف',           'mysticism'),
  ('الوطن',            'homeland'),
  ('الحرية',           'freedom'),
  ('الحرب',            'war'),
  ('الخمر',            'wine'),
  ('الغربة',           'exile'),
  ('الصداقة',          'friendship'),
  ('الجمال',           'beauty'),
  ('الدين',            'religion'),
  ('دينية',            'religion'),     -- variant form seen in seed-poems.json
  ('الموت',            'death'),
  ('الشباب',           'youth'),
  ('الفراق',           'separation'),
  ('الفخر',            'boasting'),
  ('الزهد',            'ascetic'),
  ('الفرح',            'joy'),
  ('الكآبة',           'melancholy'),
  ('الوحدة',           'loneliness'),
  ('الأمل',            'hope'),
  ('اليأس',            'despair'),
  ('الحنين',           'nostalgia'),
  ('العشق',            'passion'),
  ('الغضب',            'anger'),
  ('الدهشة',           'wonder'),
  ('المجاز',           'metaphor'),
  ('الصور الشعرية',    'imagery'),
  ('الفلسفي',          'philosophical'),
  ('الغنائي',          'lyrical'),
  ('القصيدة',          'qasida'),
  ('الموشح',           'muwashshah'),
  ('المثنوي',          'masnavi'),
  ('الرباعية',         'rubai'),
  ('القطعة',           'epigram'),
  ('الجاهلية',         'pre-islamic'),
  ('صدر الإسلام',      'early-islamic'),
  ('الأموي',           'umayyad'),
  ('العباسي',          'abbasid'),
  ('الأندلسي',         'andalusian'),
  ('العثماني',         'ottoman'),
  ('الحديث',           'modern'),
  ('المعاصر',          'contemporary'),
  -- Common short-form theme names from the Diwan dataset
  ('عامة',             'wisdom'),       -- 'general' poems → wisdom as closest match
  ('قصيرة',           'epigram'),      -- 'short poems' → epigram form
  ('مدح',              'praise'),
  ('هجاء',             'satire'),
  ('فخر',              'boasting'),
  ('زهد',              'ascetic'),
  ('خمر',              'wine'),
  ('وصف',              'nature'),       -- 'description' poems mostly describe nature
  ('حكمة',             'wisdom'),
  ('غزل',              'ghazal'),
  ('رثاء',             'elegy'),
  ('حماسة',            'war'),          -- 'hamasa' = martial poetry
  ('شكوى',             'grief'),        -- 'complaint' poems
  ('اعتذار',           'friendship'),   -- 'apology' poems
  ('تهنئة',            'praise'),       -- 'congratulation' poems
  ('مراثي',            'elegy'),        -- plural of elegy
  ('نسيب',             'romance')       -- romantic prelude in classical qasida
ON CONFLICT (name_ar) DO NOTHING;

-- ── Step 2: Auto-create tags for unmapped themes ──────────────
-- Any themes.name not in theme_slug_map gets a new tag.
-- We use the Arabic name as name_ar, and a sanitized version
-- (strip non-ASCII chars) as the slug + name_en fallback.
-- These can be manually renamed/merged later by an admin.

INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order)
SELECT
  -- Build a slug: use Arabic name stripped of non-alphanumeric-ASCII chars.
  -- For Arabic-only strings this produces an empty or near-empty string, so
  -- we fall back to 'theme-' || themes.id to guarantee uniqueness.
  COALESCE(
    NULLIF(lower(regexp_replace(trim(t.name), '[^a-z0-9\-]', '', 'g')), ''),
    'theme-' || t.id::TEXT
  )                            AS slug,
  t.name                       AS name_ar,
  -- name_en: we have no translation here, use the Arabic name as placeholder
  t.name                       AS name_en,
  'theme'                      AS tag_type,
  '#c5a059'                    AS color,
  500 + t.id                   AS display_order   -- place after taxonomy tags
FROM public.themes t
WHERE t.name IS NOT NULL
  AND trim(t.name) <> ''
  -- Not already handled by explicit mapping
  AND t.name NOT IN (SELECT name_ar FROM theme_slug_map)
  -- Not already in tags (idempotency)
  AND COALESCE(
        NULLIF(lower(regexp_replace(trim(t.name), '[^a-z0-9\-]', '', 'g')), ''),
        'theme-' || t.id::TEXT
      ) NOT IN (SELECT slug FROM public.tags)
ON CONFLICT (slug) DO NOTHING;

-- ── Step 3: Backfill poem_tags from poems.theme_id ────────────
-- Every poem that has a theme_id gets exactly one poem_tags row.
-- source='manual' (human-curated during original import).
-- confidence=1.0 (definitive assignment, not AI-predicted).

INSERT INTO public.poem_tags (poem_id, tag_id, confidence_score, source)
SELECT
  p.id           AS poem_id,
  tg.id          AS tag_id,
  1.0            AS confidence_score,
  'manual'       AS source
FROM public.poems  p
JOIN public.themes th ON th.id = p.theme_id
-- Prefer the explicit mapping slug; fall back to auto-generated slug
LEFT JOIN theme_slug_map tsm ON tsm.name_ar = th.name
JOIN public.tags tg ON tg.slug = COALESCE(
  tsm.slug,
  COALESCE(
    NULLIF(lower(regexp_replace(trim(th.name), '[^a-z0-9\-]', '', 'g')), ''),
    'theme-' || th.id::TEXT
  )
)
WHERE p.theme_id IS NOT NULL
ON CONFLICT (poem_id, tag_id) DO NOTHING;

-- ── Verification query (informational, not enforced) ──────────
-- Uncomment to check backfill coverage after running:
-- SELECT
--   COUNT(*)                                    AS total_poems_with_theme,
--   COUNT(pt.poem_id)                           AS poems_with_tag,
--   COUNT(*) - COUNT(pt.poem_id)               AS poems_missing_tag
-- FROM public.poems p
-- LEFT JOIN public.poem_tags pt ON pt.poem_id = p.id AND pt.source = 'manual'
-- WHERE p.theme_id IS NOT NULL;
