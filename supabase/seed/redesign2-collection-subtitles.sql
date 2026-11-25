-- Writes the editorial subtitles from editorial/*/*.md onto existing collections.
-- Idempotent; run after supabase/migrations/20261125000000_redesign2_collection_subtitles.sql.
UPDATE public.collections c
SET subtitle_en = v.subtitle_en, subtitle_ar = v.subtitle_ar
FROM (VALUES
  ('your-first-seven', 'Weep at the ruins, end in exile. Welcome.', 'ابكِ على الأطلال، وانتهِ في المنفى. أهلًا بك.'),
  ('twelve-poems-centuries-of-arabic-verse', 'Twelve poems, twelve centuries, no quiz after', 'اثنتا عشرة قصيدة، اثنا عشر قرنًا، بلا امتحان'),
  ('women-who-wrote-the-canon', 'The canon, as written by the women in it', 'الديوان كما كتبته نساؤه'),
  ('at-the-ruins-we-begin', 'Every great poem starts by stopping the camel', 'كل قصيدة عظيمة تبدأ بإيقاف الناقة'),
  ('the-canon-that-exists-through-music', 'Poems your grandmother can probably sing', 'قصائد قد تغنّيها جدّتك'),
  ('the-foundational-voices', 'The originals. Everyone else is a cover band.', 'الأصوات الأولى، والباقون صدى')
) AS v(slug, subtitle_en, subtitle_ar)
WHERE c.slug = v.slug;
