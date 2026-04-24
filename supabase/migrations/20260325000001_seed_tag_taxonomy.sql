-- =============================================================
-- Migration: seed_tag_taxonomy
-- Inserts 50+ foundational bilingual tags across 7 types.
-- Sets parent_tag_id relationships for hierarchical browsing.
-- Idempotent: ON CONFLICT (slug) DO NOTHING.
--
-- Rollback:
--   DELETE FROM public.tags
--     WHERE slug IN (
--       'love','longing','grief','nature','praise','elegy','satire',
--       'wisdom','mysticism','homeland','freedom','war','wine','exile',
--       'friendship','beauty','religion','death','youth','separation',
--       'qasida','ghazal','muwashshah','haiku-arabi','prose-poem',
--       'masnavi','rubai','epigram',
--       'pre-islamic','early-islamic','umayyad','abbasid','andalusian',
--       'ottoman','modern','contemporary',
--       'joy','melancholy','loneliness','hope','despair','nostalgia','passion',
--       'metaphor','imagery','philosophical','lyrical',
--       'levantine','gulf','maghrebi','egyptian'
--     );
-- =============================================================

-- ── THEMES ────────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('love',       'الحب',        'Love',           'theme', '#e8647a', 10),
  ('longing',    'الشوق',       'Longing',        'theme', '#c084fc', 20),
  ('grief',      'الحزن',       'Grief',          'theme', '#94a3b8', 30),
  ('nature',     'الطبيعة',     'Nature',         'theme', '#4ade80', 40),
  ('praise',     'المديح',      'Praise',         'theme', '#c5a059', 50),
  ('elegy',      'الرثاء',      'Elegy',          'theme', '#64748b', 60),
  ('satire',     'الهجاء',      'Satire',         'theme', '#f97316', 70),
  ('wisdom',     'الحكمة',      'Wisdom',         'theme', '#38bdf8', 80),
  ('mysticism',  'التصوف',      'Mysticism',      'theme', '#818cf8', 90),
  ('homeland',   'الوطن',       'Homeland',       'theme', '#22c55e', 100),
  ('freedom',    'الحرية',      'Freedom',        'theme', '#f59e0b', 110),
  ('war',        'الحرب',       'War',            'theme', '#ef4444', 120),
  ('wine',       'الخمر',       'Wine & Revelry', 'theme', '#a16207', 130),
  ('exile',      'الغربة',      'Exile',          'theme', '#78716c', 140),
  ('friendship', 'الصداقة',     'Friendship',     'theme', '#84cc16', 150),
  ('beauty',     'الجمال',      'Beauty',         'theme', '#f43f5e', 160),
  ('religion',   'الدين',       'Religion',       'theme', '#0ea5e9', 170),
  ('death',      'الموت',       'Death',          'theme', '#374151', 180),
  ('youth',      'الشباب',      'Youth',          'theme', '#fbbf24', 190),
  ('separation', 'الفراق',      'Separation',     'theme', '#a78bfa', 200),
  ('panegyric',  'القصيدة المديحية', 'Panegyric', 'theme', '#d4a017', 210),
  ('ascetic',    'الزهد',       'Asceticism',     'theme', '#6b7280', 220),
  ('boasting',   'الفخر',       'Boasting',       'theme', '#b45309', 230),
  ('hunting',    'الصيد والطرد', 'Hunting',       'theme', '#15803d', 240),
  ('romance',    'الغزل العذري', 'Chaste Romance','theme', '#db2777', 250)
ON CONFLICT (slug) DO NOTHING;

-- ── FORMS ─────────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('qasida',      'القصيدة',     'Qasida',      'form', '#0284c7', 10),
  ('ghazal',      'الغزل',       'Ghazal',      'form', '#db2777', 20),
  ('muwashshah',  'الموشح',      'Muwashshah',  'form', '#7c3aed', 30),
  ('haiku-arabi', 'هايكو عربي',  'Arabic Haiku','form', '#059669', 40),
  ('prose-poem',  'قصيدة النثر', 'Prose Poem',  'form', '#d97706', 50),
  ('masnavi',     'المثنوي',     'Masnavi',     'form', '#0891b2', 60),
  ('rubai',       'الرباعية',    'Ruba''i',     'form', '#65a30d', 70),
  ('epigram',     'القطعة',      'Epigram',     'form', '#b45309', 80),
  ('muqatta',     'المقطعة',     'Muqatta',     'form', '#6d28d9', 90),
  ('mu-arrada',   'المعارضة',    'Mu''arrada',  'form', '#be185d', 100)
ON CONFLICT (slug) DO NOTHING;

-- ── PERIODS ───────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('pre-islamic',  'الجاهلية',      'Pre-Islamic',  'period', '#92400e', 10),
  ('early-islamic','صدر الإسلام',   'Early Islamic','period', '#166534', 20),
  ('umayyad',      'الأموي',        'Umayyad',      'period', '#1e3a5f', 30),
  ('abbasid',      'العباسي',       'Abbasid',      'period', '#4a044e', 40),
  ('andalusian',   'الأندلسي',      'Andalusian',   'period', '#713f12', 50),
  ('ottoman',      'العثماني',      'Ottoman',      'period', '#134e4a', 60),
  ('modern',       'الحديث',        'Modern',       'period', '#1e293b', 70),
  ('contemporary', 'المعاصر',       'Contemporary', 'period', '#0f172a', 80)
ON CONFLICT (slug) DO NOTHING;

-- ── EMOTIONS ──────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('joy',         'الفرح',    'Joy',        'emotion', '#facc15', 10),
  ('melancholy',  'الكآبة',   'Melancholy', 'emotion', '#a1a1aa', 20),
  ('loneliness',  'الوحدة',   'Loneliness', 'emotion', '#6b7280', 30),
  ('hope',        'الأمل',    'Hope',       'emotion', '#4ade80', 40),
  ('despair',     'اليأس',    'Despair',    'emotion', '#6b21a8', 50),
  ('nostalgia',   'الحنين',   'Nostalgia',  'emotion', '#b45309', 60),
  ('passion',     'العشق',    'Passion',    'emotion', '#dc2626', 70),
  ('anger',       'الغضب',    'Anger',      'emotion', '#b91c1c', 80),
  ('wonder',      'الدهشة',   'Wonder',     'emotion', '#0369a1', 90)
ON CONFLICT (slug) DO NOTHING;

-- ── STYLES ────────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('metaphor',      'المجاز',        'Metaphor',      'style', '#0369a1', 10),
  ('imagery',       'الصور الشعرية', 'Imagery',       'style', '#0d9488', 20),
  ('philosophical', 'الفلسفي',       'Philosophical', 'style', '#4338ca', 30),
  ('lyrical',       'الغنائي',       'Lyrical',       'style', '#be185d', 40),
  ('narrative',     'السردي',        'Narrative',     'style', '#ca8a04', 50),
  ('satirical',     'الساخر',        'Satirical',     'style', '#c2410c', 60)
ON CONFLICT (slug) DO NOTHING;

-- ── REGIONS ───────────────────────────────────────────────────
INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color, display_order) VALUES
  ('levantine', 'شامي',   'Levantine', 'region', '#166534', 10),
  ('gulf',      'خليجي',  'Gulf',      'region', '#0369a1', 20),
  ('maghrebi',  'مغاربي', 'Maghrebi',  'region', '#7c2d12', 30),
  ('egyptian',  'مصري',   'Egyptian',  'region', '#92400e', 40),
  ('iraqi',     'عراقي',  'Iraqi',     'region', '#1e3a5f', 50),
  ('peninsular','نجدي',   'Peninsular','region', '#713f12', 60)
ON CONFLICT (slug) DO NOTHING;

-- ── Hierarchy: parent relationships ──────────────────────────
-- Emotional sub-tags under 'love'
UPDATE public.tags
SET parent_tag_id = (SELECT id FROM public.tags WHERE slug = 'love')
WHERE slug IN ('longing', 'separation', 'passion', 'romance')
  AND parent_tag_id IS NULL;

-- Grief cluster
UPDATE public.tags
SET parent_tag_id = (SELECT id FROM public.tags WHERE slug = 'grief')
WHERE slug IN ('elegy', 'melancholy', 'despair')
  AND parent_tag_id IS NULL;

-- Exile under homeland (conceptual complement)
UPDATE public.tags
SET parent_tag_id = (SELECT id FROM public.tags WHERE slug = 'homeland')
WHERE slug IN ('exile')
  AND parent_tag_id IS NULL;

-- Ascetic / Religion cluster
UPDATE public.tags
SET parent_tag_id = (SELECT id FROM public.tags WHERE slug = 'religion')
WHERE slug IN ('mysticism', 'ascetic')
  AND parent_tag_id IS NULL;
