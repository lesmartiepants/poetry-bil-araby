-- ============================================================================
-- FABRICATED TEST FIXTURES — NOT POETRY, NOT CORPUS DATA
-- ============================================================================
--
-- Every poet and every poem below is INVENTED for testing. The poets do not
-- exist. The verses are not poetry: they are Arabic sentences that announce, in
-- Arabic, that they are test data. Nothing here was copied, sampled, or derived
-- from the production corpus or from any third-party dataset, so none of the
-- licensing questions that keep the real corpus out of this repo apply.
--
-- Three independent markers make a fixture row unmistakable:
--   1. every poet is named شاعر/شاعرة الاختبار ("Test Poet N")
--   2. every poem title begins قصيدة اختبار ("Test Poem N")
--   3. every poem row carries source_dataset = 'fixture'
--
-- The last one is machine-checkable:
--     SELECT count(*) FROM poems WHERE source_dataset = 'fixture';
--
-- The lookup tables (eras, meters, rhymes, themes) ARE seeded with real values.
-- Those are factual scholarly taxonomy — the names of the classical Arabic
-- metres, the rhyme letters, the conventional أغراض, the historical periods —
-- not authored content, so there is no attribution question. They are seeded
-- because fixtures referencing era 7 / metre 3 by bare integer would be
-- unreadable, and because /api/poems/by-category resolves `era` through
-- eras.name. Counts here are smaller than production's (10/44/47/35); this is a
-- coherent subset, not a reproduction.
--
-- Apply with:  npm run db:seed        (see scripts/db-seed.sh for the guards)
--
-- Shape, chosen to exercise the schema rather than to look like a library:
--   * 8 poets across 7 eras
--   * 26 poems: 20 categorized, 4 deliberately uncategorized, 2 deliberately
--     excluded by the serving filters (one below minQualityScore, one over
--     maxVerseLines) so those filters are provably load-bearing
--   * 6 of 26 poems have NULL century (~23%) — the late/modern case that is
--     ~25% of production and the one most likely to break a range filter
--   * accessibility_score spread across 1.0-9.5, emotional_intensity 10-95
--   * poem_categories rows across mood, topic AND motif, honouring the v3
--     contract from 20260727000000 (mood >=1, topic >=1, motif optional, max 2)
--   * every one of the 7 category_families has >= 2 matching poems, so
--     /api/poems/by-category?family=... returns something for each
--   * one fully vocalized poem (tashkeel) in diacritized_content, because
--     COALESCE(diacritized_content, content) is a real code path
--
-- Re-running is safe: fixture rows are deleted and rebuilt in one transaction.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Refuse to touch a database that holds real poems.
-- ----------------------------------------------------------------------------
-- This file assigns low, explicit primary keys. On a database that already
-- holds the corpus that would collide with real rows, and the lookup inserts
-- would trip the UNIQUE constraints on eras.name / meters.name / themes.name.
-- A fixture database is the only supported target.
DO $$
DECLARE real_poems bigint;
BEGIN
  SELECT count(*) INTO real_poems
    FROM poems WHERE source_dataset IS DISTINCT FROM 'fixture';
  IF real_poems > 0 THEN
    RAISE EXCEPTION
      'Refusing to seed: this database already holds % non-fixture poem(s). '
      'The fixtures are for an empty local or CI database only.', real_poems;
  END IF;
END $$;

-- Remove any previous fixture run. poem_categories has ON DELETE CASCADE from
-- poems, so the join rows go with them.
DELETE FROM poems WHERE source_dataset = 'fixture';
DELETE FROM poets WHERE slug LIKE 'test-poet-%';

-- ----------------------------------------------------------------------------
-- 1. Lookup taxonomy (factual, see header)
-- ----------------------------------------------------------------------------
INSERT INTO eras (id, name, slug) VALUES
  (1,  'العصر الجاهلي',   'pre-islamic'),
  (2,  'العصر الإسلامي',  'islamic'),
  (3,  'العصر الأموي',    'umayyad'),
  (4,  'العصر العباسي',   'abbasid'),
  (5,  'العصر الأندلسي',  'andalusian'),
  (6,  'العصر الأيوبي',   'ayyubid'),
  (7,  'العصر المملوكي',  'mamluk'),
  (8,  'العصر العثماني',  'ottoman'),
  (9,  'العصر الحديث',    'modern'),
  (10, 'غير محدد',        'unspecified')
ON CONFLICT (id) DO NOTHING;

INSERT INTO meters (id, name, slug) VALUES
  (1, 'الطويل',   'tawil'),
  (2, 'البسيط',   'basit'),
  (3, 'الكامل',   'kamil'),
  (4, 'الوافر',   'wafir'),
  (5, 'الخفيف',   'khafif'),
  (6, 'الرمل',    'ramal'),
  (7, 'المتقارب', 'mutaqarib'),
  (8, 'السريع',   'sari')
ON CONFLICT (id) DO NOTHING;

INSERT INTO rhymes (id, pattern, slug) VALUES
  (1, 'الباء', '00000000-0000-4000-8000-0000000a0001'),
  (2, 'الدال', '00000000-0000-4000-8000-0000000a0002'),
  (3, 'الراء', '00000000-0000-4000-8000-0000000a0003'),
  (4, 'اللام', '00000000-0000-4000-8000-0000000a0004'),
  (5, 'الميم', '00000000-0000-4000-8000-0000000a0005'),
  (6, 'النون', '00000000-0000-4000-8000-0000000a0006')
ON CONFLICT (id) DO NOTHING;

INSERT INTO themes (id, name, slug) VALUES
  (1, 'مدح',        '00000000-0000-4000-8000-0000000b0001'),
  (2, 'رثاء',       '00000000-0000-4000-8000-0000000b0002'),
  (3, 'غزل',        '00000000-0000-4000-8000-0000000b0003'),
  (4, 'وصف',        '00000000-0000-4000-8000-0000000b0004'),
  (5, 'حكمة',       '00000000-0000-4000-8000-0000000b0005'),
  (6, 'فخر',        '00000000-0000-4000-8000-0000000b0006'),
  (7, 'زهد',        '00000000-0000-4000-8000-0000000b0007'),
  (8, 'غير مصنف',   '00000000-0000-4000-8000-0000000b0008')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 2. Poets — all fabricated
-- ----------------------------------------------------------------------------
INSERT INTO poets (id, name, slug, era_id, bio, name_en) VALUES
  (1, 'شاعر الاختبار الأول',    'test-poet-one',   1,
      'بيانات اختبار مختلقة. لا وجود لهذا الشاعر ولا تُنسب هذه النصوص إلى أحد. Fabricated fixture data; this poet does not exist.', 'Test Poet One'),
  (2, 'شاعرة الاختبار الثانية', 'test-poet-two',   3,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Two'),
  (3, 'شاعر الاختبار الثالث',   'test-poet-three', 4,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Three'),
  (4, 'شاعر الاختبار الرابع',   'test-poet-four',  5,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Four'),
  (5, 'شاعرة الاختبار الخامسة', 'test-poet-five',  4,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Five'),
  (6, 'شاعر الاختبار السادس',   'test-poet-six',   9,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Six'),
  (7, 'شاعر الاختبار السابع',   'test-poet-seven', 2,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Seven'),
  (8, 'شاعرة الاختبار الثامنة', 'test-poet-eight', 7,
      'بيانات اختبار مختلقة. Fabricated fixture data; this poet does not exist.', 'Test Poet Eight')
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Poems
-- ----------------------------------------------------------------------------
-- `content` is Arabic prose stating that it is test material. Verses are
-- separated by '*', which is what the serving filter counts. search_vector is a
-- GENERATED column over normalize_arabic_text() and must not be supplied.
INSERT INTO poems (
  id, title, title_en, poet_id, meter_id, theme_id, rhyme_id, slug,
  century, quality_score, emotional_intensity, accessibility_score,
  source_dataset, content
) VALUES
  (1, 'قصيدة اختبار ١ — الحزن', 'Test Poem 1 — Grief', 1, 1, 2, 5,
   '00000000-0000-4000-8000-000000000001', 6, 90, 70, 8.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الحزن والدمع * وسطر ثان لا ينسب إلى شاعر حقيقي * وسطر ثالث يذكر الفقد والرحيل * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (2, 'قصيدة اختبار ٢ — الفخر', 'Test Poem 2 — Pride', 1, 3, 6, 5,
   '00000000-0000-4000-8000-000000000002', 6, 88, 85, 9.0, 'fixture',
   'هذا نص اختبار مختلق يذكر السيف والمعركة * وسطر ثان يذكر الشرف والاعتزاز * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (3, 'قصيدة اختبار ٣ — الغزل', 'Test Poem 3 — Love', 2, 4, 3, 3,
   '00000000-0000-4000-8000-000000000003', 7, 82, 60, 6.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الحب والروض والزهر * وسطر ثان في الغزل المصنوع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (4, 'قصيدة اختبار ٤ — الجمال', 'Test Poem 4 — Beauty', 2, 5, 3, 4,
   '00000000-0000-4000-8000-000000000004', 7, 79, 45, 5.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الجمال والشوق * وسطر ثان صنع لاختبار قاعدة البيانات * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (5, 'قصيدة اختبار ٥ — الحكمة', 'Test Poem 5 — Wisdom', 3, 1, 5, 5,
   '00000000-0000-4000-8000-000000000005', 9, 95, 30, 3.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الحكمة والتأمل * وسطر ثان لا يحمل معنى شعريا * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (6, 'قصيدة اختبار ٦ — الإيمان', 'Test Poem 6 — Faith', 3, 6, 7, 6,
   '00000000-0000-4000-8000-000000000006', 9, 85, 40, 4.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الفجر والخشوع * وسطر ثان صنع للتجربة وحدها * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (7, 'قصيدة اختبار ٧ — الليل', 'Test Poem 7 — Night', 4, 2, 4, 1,
   '00000000-0000-4000-8000-000000000007', 11, 80, 55, 2.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الليل والقمر والنجوم * وسطر ثان في وصف الطبيعة المصنوع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (8, 'قصيدة اختبار ٨ — البحر', 'Test Poem 8 — The Sea', 4, 7, 4, 3,
   '00000000-0000-4000-8000-000000000008', 11, 77, 35, 3.5, 'fixture',
   'هذا نص اختبار مختلق يذكر البحر والطير * وسطر ثان صنع لاختبار الوصف * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (9, 'قصيدة اختبار ٩ — الغربة', 'Test Poem 9 — Exile', 5, 1, 8, 5,
   '00000000-0000-4000-8000-000000000009', 10, 92, 90, 7.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الغربة والحنين والرحلة * وسطر ثان لا ينسب إلى أحد * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (10, 'قصيدة اختبار ١٠ — الوطن', 'Test Poem 10 — Homeland', 5, 3, 8, 6,
   '00000000-0000-4000-8000-000000000010', 10, 86, 75, 6.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الوطن والحنين * وسطر ثان مصنوع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (11, 'قصيدة اختبار ١١ — الفرح', 'Test Poem 11 — Joy', 6, 5, 4, 2,
   '00000000-0000-4000-8000-000000000011', NULL, 84, 50, 1.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الفرح والصحبة والكأس * وسطر ثان بلا قافية حقيقية * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (12, 'قصيدة اختبار ١٢ — الصحبة', 'Test Poem 12 — Company', 6, 8, 4, 4,
   '00000000-0000-4000-8000-000000000012', NULL, 81, 25, 2.0, 'fixture',
   'هذا نص اختبار مختلق يذكر اللذة والصداقة * وسطر ثان صنع للتجربة وحدها * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (13, 'قصيدة اختبار ١٣ — الرثاء', 'Test Poem 13 — Elegy', 7, 1, 2, 3,
   '00000000-0000-4000-8000-000000000013', 7, 78, 65, 5.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الطلل والأسى * وسطر ثان لا ينسب إلى شاعر حقيقي * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (14, 'قصيدة اختبار ١٤ — الحرية', 'Test Poem 14 — Freedom', 8, 4, 6, 5,
   '00000000-0000-4000-8000-000000000014', 14, 83, 80, 4.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الحرية والعدل والتحدي * وسطر ثان مصنوع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (15, 'قصيدة اختبار ١٥ — الوجد', 'Test Poem 15 — Passion', 8, 6, 3, 6,
   '00000000-0000-4000-8000-000000000015', 14, 76, 20, 8.0, 'fixture',
   'هذا نص اختبار مختلق يذكر الوجد * وسطر ثان صنع لاختبار التصنيف * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (16, 'قصيدة اختبار ١٦ — اليأس', 'Test Poem 16 — Despair', 6, 2, 2, 1,
   '00000000-0000-4000-8000-000000000016', NULL, 89, 95, 1.0, 'fixture',
   'هذا نص اختبار مختلق يذكر اليأس والدموع * وسطر ثان بلا نسبة إلى أحد * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (17, 'قصيدة اختبار ١٧ — الزمن', 'Test Poem 17 — Time', 7, 7, 7, 5,
   '00000000-0000-4000-8000-000000000017', 8, 91, 10, 9.5, 'fixture',
   'هذا نص اختبار مختلق يذكر الزمن والفناء والسكينة * وسطر ثان هو أصعب نصوص التجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (18, 'قصيدة اختبار ١٨ — النار', 'Test Poem 18 — Fire', 1, 2, 4, 3,
   '00000000-0000-4000-8000-000000000018', 6, 87, 88, 7.5, 'fixture',
   'هذا نص اختبار مختلق يذكر النار والضوء والطبيعة * وسطر ثان مصنوع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (19, 'قصيدة اختبار ١٩ — السخرية', 'Test Poem 19 — Satire', 3, 8, 8, 4,
   '00000000-0000-4000-8000-000000000019', 9, 94, 42, 3.2, 'fixture',
   'هذا نص اختبار مختلق يجمع الحنين والسخرية * وسطر ثان يخدم اختبار الأسر المتعددة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (20, 'قصيدة اختبار ٢٠ — الأمل', 'Test Poem 20 — Hope', 4, 3, 5, 6,
   '00000000-0000-4000-8000-000000000020', 12, 75, 58, 6.2, 'fixture',
   'هذا نص اختبار مختلق يذكر الأمل والفرح * وسطر ثان عند حد الجودة الأدنى * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  -- Deliberately uncategorized: no poem_categories rows, no facet scalars.
  -- /api/poems/random and /api/poems/search must still serve these.
  (21, 'قصيدة اختبار ٢١ — بلا تصنيف', 'Test Poem 21 — Uncategorized', 2, 1, 1, 5,
   '00000000-0000-4000-8000-000000000021', 7, 90, NULL, NULL, 'fixture',
   'هذا نص اختبار مختلق بلا تصنيف * وسطر ثان يثبت أن القصائد غير المصنفة تُقدَّم * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (22, 'قصيدة اختبار ٢٢ — بلا تصنيف', 'Test Poem 22 — Uncategorized', 5, 4, 1, 3,
   '00000000-0000-4000-8000-000000000022', NULL, 85, NULL, NULL, 'fixture',
   'هذا نص اختبار مختلق بلا تصنيف ولا قرن * وسطر ثان صنع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (23, 'قصيدة اختبار ٢٣ — بلا تصنيف', 'Test Poem 23 — Uncategorized', 6, 5, 1, 1,
   '00000000-0000-4000-8000-000000000023', NULL, 88, NULL, NULL, 'fixture',
   'هذا نص اختبار مختلق بلا تصنيف * وسطر ثان من العصر الحديث * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  (24, 'قصيدة اختبار ٢٤ — بلا تصنيف', 'Test Poem 24 — Uncategorized', 8, 6, 1, 6,
   '00000000-0000-4000-8000-000000000024', 14, 80, NULL, NULL, 'fixture',
   'هذا نص اختبار مختلق بلا تصنيف * وسطر ثان صنع للتجربة * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية'),

  -- Deliberately unservable #1: quality_score below SERVING.minQualityScore
  -- (75). Categorized, so if the quality filter ever stopped applying this row
  -- would show up in by-category results and the test would catch it.
  --
  -- DO NOT "fix" this score. Poem 25 is the only poem that is tagged and
  -- unservable, which is what makes the gap between a facet's advertised count
  -- and what selecting it returns observable at all. Raise it above 75 (or
  -- raise minQualityScore past 90) and server.db.test.js's /api/categories
  -- bounds collapse onto one number and quietly stop testing anything. That
  -- test asserts this precondition and will fail loudly rather than rot, but
  -- the fix is to pick another facet straddling the filter, not to relax it.
  (25, 'قصيدة اختبار ٢٥ — دون حد الجودة', 'Test Poem 25 — Below Quality Floor', 1, 1, 4, 5,
   '00000000-0000-4000-8000-000000000025', NULL, 60, 50, 5.0, 'fixture',
   'هذا نص اختبار مختلق دون حد الجودة * وسطر ثان يجب ألا يظهر في النتائج * وخاتمة تعلن أن هذه القصيدة بيانات تجريبية');

-- Deliberately unservable #2: over SERVING.maxVerseLines (24). Built by
-- repetition so the '*' count is unambiguous rather than eyeballed.
INSERT INTO poems (
  id, title, title_en, poet_id, meter_id, theme_id, rhyme_id, slug,
  century, quality_score, emotional_intensity, accessibility_score,
  source_dataset, content
)
SELECT 26, 'قصيدة اختبار ٢٦ — طويلة جدا', 'Test Poem 26 — Too Many Verses',
       3, 1, 4, 5, '00000000-0000-4000-8000-000000000026',
       9, 95, 40, 4.0, 'fixture',
       string_agg('هذا سطر اختبار مختلق رقم ' || g::text, ' * ' ORDER BY g)
  FROM generate_series(1, 30) AS g;

-- The single fully vocalized fixture. COALESCE(diacritized_content, content)
-- means this is what /api/poems/random actually serves for poem 1, so the
-- tashkeel path is exercised rather than merely present.
UPDATE poems SET diacritized_content =
  'هَذَا نَصُّ اخْتِبَارٍ مُخْتَلَقٌ يَذْكُرُ الْحُزْنَ وَالدَّمْعَ * وَسَطْرٌ ثَانٍ لَا يُنْسَبُ إِلَى شَاعِرٍ حَقِيقِيٍّ * وَسَطْرٌ ثَالِثٌ يَذْكُرُ الْفَقْدَ وَالرَّحِيلَ * وَخَاتِمَةٌ تُعْلِنُ أَنَّ هَذِهِ الْقَصِيدَةَ بَيَانَاتٌ تَجْرِيبِيَّةٌ'
WHERE id = 1;

-- Cached translation/explanation path (served by /api/poems/random when the
-- columns exist).
UPDATE poems SET
  cached_translation = 'Fabricated fixture text. It states in Arabic that it is test data and is not attributed to any poet.',
  cached_explanation = 'Fixture explanation. Not a real commentary.',
  cached_author_bio  = 'Fixture biography. This poet does not exist.',
  translated_at      = now()
WHERE id IN (1, 9);

-- accessibility_factors: the 5 sub-scores the v4 scorer emits.
UPDATE poems SET accessibility_factors =
  '{"lexical":4,"syntax":4,"imagery_abstraction":5,"allusion":4,"narrativity":3}'::jsonb
WHERE id IN (1, 17);

-- ----------------------------------------------------------------------------
-- 4. Category assignments
-- ----------------------------------------------------------------------------
-- Values are resolved by (dimension key, value key) against the vocabulary that
-- migration 20260722000000 seeds, so a renamed key fails loudly here instead of
-- silently producing an empty join. Honours the v3 contract from
-- 20260727000000: every categorized poem has >=1 mood and >=1 topic, motif is
-- optional, and no dimension exceeds 2 labels.
INSERT INTO poem_categories (poem_id, value_id, confidence, model)
SELECT a.poem_id, cv.id, a.confidence, 'fixture-v1'
  FROM (VALUES
    -- poem, dimension, value, confidence
    (1,  'mood',  'melancholy',    92),
    (1,  'topic', 'loss-death',    88),
    (1,  'motif', 'tears',         81),
    (2,  'mood',  'pride',         90),
    (2,  'topic', 'honor-pride',   86),
    (2,  'motif', 'sword-battle',  84),
    (3,  'mood',  'amorous',       93),
    (3,  'topic', 'love',          91),
    (3,  'motif', 'garden-flowers',77),
    (4,  'mood',  'yearning',      80),
    (4,  'topic', 'beauty',        79),
    (5,  'mood',  'contemplation', 95),
    (5,  'topic', 'wisdom-ethics', 90),
    (6,  'mood',  'reverence',     88),
    (6,  'topic', 'faith-spirit',  92),
    (6,  'motif', 'dawn',          70),
    (7,  'mood',  'serenity',      85),
    (7,  'topic', 'nature',        89),
    (7,  'motif', 'night',         87),
    (7,  'motif', 'moon-stars',    83),
    (8,  'mood',  'serenity',      78),
    (8,  'topic', 'nature',        82),
    (8,  'motif', 'sea-water',     86),
    (8,  'motif', 'birds',         74),
    (9,  'mood',  'nostalgia',     94),
    (9,  'topic', 'exile-longing', 93),
    (9,  'motif', 'journey',       85),
    (10, 'mood',  'bittersweet',   82),
    (10, 'topic', 'homeland',      90),
    (11, 'mood',  'joy',           91),
    (11, 'topic', 'friendship',    84),
    (11, 'motif', 'wine-cup',      79),
    (12, 'mood',  'joy',           76),
    (12, 'topic', 'wine-pleasure', 88),
    (13, 'mood',  'grief',         89),
    (13, 'topic', 'loss-death',    87),
    (13, 'motif', 'desert-ruins',  80),
    (14, 'mood',  'defiance',      92),
    (14, 'topic', 'freedom',       88),
    (14, 'topic', 'justice-oppression', 85),
    (15, 'mood',  'passion',       83),
    (15, 'topic', 'women-feminine',78),
    -- 16: mood-heavy, no motif — the "motif is optional" case
    (16, 'mood',  'despair',       96),
    (16, 'topic', 'loss-death',    72),
    (16, 'motif', 'tears',         88),
    (17, 'mood',  'serenity',      90),
    (17, 'topic', 'time-mortality',94),
    (18, 'topic', 'nature',        81),
    (18, 'mood',  'contemplation', 75),
    (18, 'motif', 'fire-light',    89),
    -- 19 and 20 straddle two families each, so a family filter cannot be
    -- satisfied by a naive one-family-per-poem assumption.
    (19, 'mood',  'nostalgia',     84),
    (19, 'mood',  'satire',        79),
    (19, 'topic', 'exile-longing', 82),
    (20, 'mood',  'hope',          86),
    (20, 'mood',  'joy',           71),
    (20, 'topic', 'friendship',    77),
    -- 25 is categorized but below the quality floor: it must never be served.
    -- It also shares the `melancholy` mood with poem 1, which is what makes
    -- "categorized but unservable" observable in a facet count.
    (25, 'mood',  'melancholy',    70),
    (25, 'topic', 'loss-death',    70)
    -- Note: no fixture poem is tagged topic `war-conflict`. That gap is
    -- deliberate — server.db.test.js asserts an untagged facet is still listed
    -- and reads zero rather than being dropped from the response.
  ) AS a(poem_id, dim, val, confidence)
  JOIN category_dimensions cd ON cd.key = a.dim
  JOIN category_values cv ON cv.dimension_id = cd.id AND cv.key = a.val;

-- Fail loudly rather than silently under-seeding if the vocabulary drifted.
DO $$
DECLARE got bigint;
BEGIN
  SELECT count(*) INTO got FROM poem_categories
   WHERE poem_id IN (SELECT id FROM poems WHERE source_dataset = 'fixture');
  IF got <> 58 THEN
    RAISE EXCEPTION
      'Expected 58 fixture category assignments, got %. A category_values key '
      'in this file no longer exists in the seeded vocabulary.', got;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. Derive the denormalized facets from the join
-- ----------------------------------------------------------------------------
-- poems.categories (raw provenance JSONB) and poems.mood_primary duplicate what
-- poem_categories already says. Deriving them here rather than hand-writing 20
-- JSONB blobs guarantees the two representations agree — which is exactly the
-- invariant the API relies on when it reads mood_primary off poems but filters
-- through poem_categories.
UPDATE poems p SET
  categories = agg.payload,
  mood_primary = agg.mood_primary,
  categorized_at = now(),
  categorization_model = 'fixture-v1',
  categorization_prompt_version = 'fixture-v1'
FROM (
  SELECT pc.poem_id,
         jsonb_build_object(
           'moods',  COALESCE(jsonb_agg(cv.key ORDER BY cv.sort_order)
                              FILTER (WHERE cd.key = 'mood'),  '[]'::jsonb),
           'topics', COALESCE(jsonb_agg(cv.key ORDER BY cv.sort_order)
                              FILTER (WHERE cd.key = 'topic'), '[]'::jsonb),
           'motifs', COALESCE(jsonb_agg(cv.key ORDER BY cv.sort_order)
                              FILTER (WHERE cd.key = 'motif'), '[]'::jsonb),
           'confidences', jsonb_object_agg(cv.key, pc.confidence)
         ) AS payload,
         (ARRAY_AGG(cv.key ORDER BY pc.confidence DESC)
            FILTER (WHERE cd.key = 'mood'))[1] AS mood_primary
    FROM poem_categories pc
    JOIN category_values cv ON cv.id = pc.value_id
    JOIN category_dimensions cd ON cd.id = cv.dimension_id
   GROUP BY pc.poem_id
) AS agg
WHERE p.id = agg.poem_id;

-- ----------------------------------------------------------------------------
-- 6. Keep the sequences ahead of the explicit ids
-- ----------------------------------------------------------------------------
-- PERFORM rather than SELECT so a quiet psql run stays quiet.
DO $$
BEGIN
  PERFORM setval('poems_id_seq',  (SELECT max(id) FROM poems),  true);
  PERFORM setval('poets_id_seq',  (SELECT max(id) FROM poets),  true);
  PERFORM setval('eras_id_seq',   (SELECT max(id) FROM eras),   true);
  PERFORM setval('meters_id_seq', (SELECT max(id) FROM meters), true);
  PERFORM setval('rhymes_id_seq', (SELECT max(id) FROM rhymes), true);
  PERFORM setval('themes_id_seq', (SELECT max(id) FROM themes), true);
END $$;

COMMIT;

ANALYZE poems;
ANALYZE poem_categories;
