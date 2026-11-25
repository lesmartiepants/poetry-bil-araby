-- Writes the editorial subtitles from editorial/*/*.md onto existing collections.
-- Idempotent; run after supabase/migrations/20261125000000_redesign2_collection_subtitles.sql.
UPDATE public.collections c
SET subtitle_en = v.subtitle_en, subtitle_ar = v.subtitle_ar
FROM (VALUES
  ('your-first-seven', 'From a plea to stop and weep to a poet between two homes', 'من نداء الوقوف والبكاء إلى شاعر بين وطنين'),
  ('twelve-poems-centuries-of-arabic-verse', 'Twelve questions about grief, desire, and home', 'اثنا عشر سؤالًا عن الفقد والرغبة والوطن'),
  ('women-who-wrote-the-canon', 'How women made grief, desire, and memory speak in Arabic', 'كيف أنطقت النساءُ الفقدَ والرغبة والذاكرة بالعربية'),
  ('at-the-ruins-we-begin', 'Where classical Arabic poetry begins: a stop at the ruins', 'حيث يبدأ الشعر العربي القديم: وقفة عند الأطلال'),
  ('the-canon-that-exists-through-music', 'Poems that live on in song and in everyday speech', 'قصائد حيّة في الغناء وفي كلام الناس'),
  ('the-foundational-voices', 'The first voices, where a place can remember', 'الأصوات الأولى، حيث يمكن للمكان أن يتذكر')
) AS v(slug, subtitle_en, subtitle_ar)
WHERE c.slug = v.slug;
