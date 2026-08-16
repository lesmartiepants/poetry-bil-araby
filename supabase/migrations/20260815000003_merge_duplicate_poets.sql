-- Merge duplicate poet rows.
--
-- Phase 5 of #721. 49 rows are spelling or naming variants of a poet who
-- already exists under a different row, holding 253 served poems between them.
-- Each variant's poems are repointed at the canonical row and the empty variant
-- row is deleted.
--
-- ONE TRAP, called out because it looks like a merge and is not:
--   قيس لبنى is the byname of قيس بن ذريح, NOT of قيس بن الملوح (Majnun Layla).
--   They are two different Umayyad udhri poets who happen to share a death year
--   of c.688. The two Qays clusters must never be merged into each other.
--
-- The full list is in docs/data/poet-duplicates.csv. Nothing here is silent:
-- every merge is one named pair below.
--
-- poems.poet_id is the ONLY foreign key into poets (poems_poet_id_fkey), so
-- once a variant's poems are repointed the variant row has no dependents and
-- deleting it is safe.
--
-- Explicit transaction. Without it these 49 pairs are 98 independent
-- statements, and an abort at pair 30 leaves 1-29 merged and 31-49 not, with no
-- clean way back. Do not rely on the migration runner to wrap it.

BEGIN;

-- Preflight: resolve every name BEFORE touching a row.
--
-- Each merge reads its target as a scalar subquery. If a name is absent — or
-- differs by so much as a trailing space, which this corpus genuinely does
-- (see 'قيس بن الملوح (مجنون ليلى )') — that subquery yields NULL. poems.poet_id
-- is NOT NULL so the UPDATE aborts rather than orphaning poems, which is the
-- right outcome but arrives as a bare constraint violation naming none of the
-- 49 pairs. This block fails first and says which name.
DO $preflight$
DECLARE
  pair record;
BEGIN
  FOR pair IN
    SELECT * FROM (VALUES
      ('قيس بن الملوح (مجنون ليلى )', 'قيس بن الملوح'),
      ('ابن عبد ربه الاندلسي', 'ابن عبد ربه'),
      ('الامام علي بن ابي طالب', 'علي بن أبي طالب'),
      ('قيس بن الملوح (مجنون ليلى)', 'قيس بن الملوح'),
      ('ابو حيان النحوي الاندلسي', 'أبو حيان الأندلسي'),
      ('محي الدين بن عربي', 'محيي الدين بن عربي'),
      ('امية الداني ( الحكم بن ابي الصلت )', 'الحكم بن ابي الصلت'),
      ('الشافعي', 'الإمام الشافعي'),
      ('الصنوبري', 'ابو بكر الصنوبري'),
      ('ابن معصوم الحسني الحسيني', 'ابن معصوم المدني'),
      ('ابو الفضل بن الاحنف', 'العباس بن الأحنف'),
      ('عبد الجبار بن حمديس', 'ابن حمديس'),
      ('عمر ابن ابي ربيعة', 'عمر بن أبي ربيعة'),
      ('جميل بن معمر', 'جميل بثينة'),
      ('ابن معصوم', 'ابن معصوم المدني'),
      ('قيس لبنى', 'قيس بن ذريح'),
      ('ابن رشيق القيرواني الازدي', 'ابن رشيق القيرواني'),
      ('مجنون ليلى', 'قيس بن الملوح'),
      ('ابن دريد', 'ابن دريد الأزدي'),
      ('عماد الدين الاصفهاني', 'العماد الأصبهاني'),
      ('حيدر بن سليمان الحلي', 'حيدر الحلي'),
      ('علي بن محمد التهامي', 'التهامي'),
      ('لبيد بن ربيعة العامري', 'لبيد بن ربيعة'),
      ('ابراهيم بن هلال بن زهرون', 'ابو اسحاق الصابي'),
      ('ابو منصور الثعالبي', 'الثعالبي'),
      ('عمرو بن معدي كرب', 'عمرو بن معد يكرب'),
      ('ليلى الاخيلية', 'ليلى الأخليلية'),
      ('امية بن عبد العزيز الداني', 'الحكم بن ابي الصلت'),
      ('ابن سارة الاندلسي', 'ابن سارة ( صارة ) الشنتريني'),
      ('لسان الدين الخطيب', 'لسان الدين بن الخطيب'),
      ('عماد الدين الاصبهاني', 'العماد الأصبهاني'),
      ('مرسي شاكر الطنطاوي', 'مرسي شاكر طنطاوي'),
      ('أبو الحسين النوري', 'ابو الحسن النوري'),
      ('أبو بكر الخالدي', 'ابو بكر الخالدي ( الخالديان )'),
      ('ابن الابار القضاعي البنلسي', 'ابن الابار الاشبيلي'),
      ('ابن الزقاق', 'ابن الزقاق البلنسي'),
      ('ابن باجه', 'ابن باجة الاندلسي'),
      ('ابن حديدة', 'ابن حديدة اللخمي القيرواني'),
      ('ابن هذيل', 'ابن هذيل القرطبي'),
      ('ابن وهيب الحميري', 'محمد بن وهيب الحميري'),
      ('ابو الشيص محمد', 'أبو الشيص الخزاعي'),
      ('الحسين بن علي', 'الحسين بن علي بن ابي طالب'),
      ('الكميت بن زيد', 'الكميت بن زيد الاسدي'),
      ('الميكالي', 'ابو الفضل الميكالي'),
      ('شرف الدين البوصيري', 'البوصيري'),
      ('شهاب الدين الالوسي', 'ابوالثناء شهاب الدين محمود الالوسي'),
      ('عبد المحسن الصوري بن غلبون', 'عبد المحسن الصوري'),
      ('عرقلة الكلبي الدمشقي', 'عرقلة الدمشقي'),
      ('تماضر بنت الشريد', 'الخنساء')
    ) AS t(variant, canonical)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.poets WHERE name = pair.canonical) THEN
      RAISE EXCEPTION 'merge preflight: canonical % not found (variant %)',
        pair.canonical, pair.variant;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.poets WHERE name = pair.variant) THEN
      RAISE EXCEPTION 'merge preflight: variant % not found (canonical %)',
        pair.variant, pair.canonical;
    END IF;
    IF (SELECT count(*) FROM public.poets WHERE name = pair.canonical) > 1 THEN
      RAISE EXCEPTION 'merge preflight: canonical % is ambiguous, % rows share that name',
        pair.canonical, (SELECT count(*) FROM public.poets WHERE name = pair.canonical);
    END IF;
  END LOOP;
END
$preflight$;

-- قيس بن الملوح (مجنون ليلى ) -> قيس بن الملوح  (48 served poems; Duplicate spelling (trailing space) of Qays ibn al-Mulawwah)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن الملوح')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن الملوح (مجنون ليلى )');
DELETE FROM public.poets WHERE name = 'قيس بن الملوح (مجنون ليلى )';

-- ابن عبد ربه الاندلسي -> ابن عبد ربه  (29 served poems; Duplicate of Ibn Abd Rabbih)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن عبد ربه')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن عبد ربه الاندلسي');
DELETE FROM public.poets WHERE name = 'ابن عبد ربه الاندلسي';

-- الامام علي بن ابي طالب -> علي بن أبي طالب  (24 served poems; Duplicate spelling of Ali ibn Abi Talib)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'علي بن أبي طالب')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الامام علي بن ابي طالب');
DELETE FROM public.poets WHERE name = 'الامام علي بن ابي طالب';

-- قيس بن الملوح (مجنون ليلى) -> قيس بن الملوح  (18 served poems; Duplicate spelling of Qays ibn al-Mulawwah)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن الملوح')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن الملوح (مجنون ليلى)');
DELETE FROM public.poets WHERE name = 'قيس بن الملوح (مجنون ليلى)';

-- ابو حيان النحوي الاندلسي -> أبو حيان الأندلسي  (11 served poems; Duplicate of Abu Hayyan al-Andalusi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'أبو حيان الأندلسي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابو حيان النحوي الاندلسي');
DELETE FROM public.poets WHERE name = 'ابو حيان النحوي الاندلسي';

-- محي الدين بن عربي -> محيي الدين بن عربي  (10 served poems; Duplicate spelling of Muhyi al-Din ibn Arabi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'محيي الدين بن عربي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'محي الدين بن عربي');
DELETE FROM public.poets WHERE name = 'محي الدين بن عربي';

-- امية الداني ( الحكم بن ابي الصلت ) -> الحكم بن ابي الصلت  (9 served poems; Duplicate of Umayya ibn Abd al-Aziz al-Dani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الحكم بن ابي الصلت')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'امية الداني ( الحكم بن ابي الصلت )');
DELETE FROM public.poets WHERE name = 'امية الداني ( الحكم بن ابي الصلت )';

-- الشافعي -> الإمام الشافعي  (8 served poems; Duplicate of Imam al-Shafi'i)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الإمام الشافعي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الشافعي');
DELETE FROM public.poets WHERE name = 'الشافعي';

-- الصنوبري -> ابو بكر الصنوبري  (8 served poems; Duplicate of Abu Bakr al-Sanawbari)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابو بكر الصنوبري')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الصنوبري');
DELETE FROM public.poets WHERE name = 'الصنوبري';

-- ابن معصوم الحسني الحسيني -> ابن معصوم المدني  (7 served poems; Duplicate of Ibn Ma'sum al-Madani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن معصوم المدني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن معصوم الحسني الحسيني');
DELETE FROM public.poets WHERE name = 'ابن معصوم الحسني الحسيني';

-- ابو الفضل بن الاحنف -> العباس بن الأحنف  (7 served poems; Duplicate (kunya) of al-Abbas ibn al-Ahnaf)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'العباس بن الأحنف')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابو الفضل بن الاحنف');
DELETE FROM public.poets WHERE name = 'ابو الفضل بن الاحنف';

-- عبد الجبار بن حمديس -> ابن حمديس  (6 served poems; Duplicate (full name) of Ibn Hamdis)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن حمديس')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عبد الجبار بن حمديس');
DELETE FROM public.poets WHERE name = 'عبد الجبار بن حمديس';

-- عمر ابن ابي ربيعة -> عمر بن أبي ربيعة  (6 served poems; Duplicate spelling of Umar ibn Abi Rabi'a)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'عمر بن أبي ربيعة')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عمر ابن ابي ربيعة');
DELETE FROM public.poets WHERE name = 'عمر ابن ابي ربيعة';

-- جميل بن معمر -> جميل بثينة  (5 served poems; Duplicate (full name) of Jamil Buthayna)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'جميل بثينة')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'جميل بن معمر');
DELETE FROM public.poets WHERE name = 'جميل بن معمر';

-- ابن معصوم -> ابن معصوم المدني  (4 served poems; Duplicate of Ibn Ma'sum al-Madani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن معصوم المدني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن معصوم');
DELETE FROM public.poets WHERE name = 'ابن معصوم';

-- قيس لبنى -> قيس بن ذريح  (4 served poems; Duplicate byname of Qays ibn Dhurayh)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن ذريح')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'قيس لبنى');
DELETE FROM public.poets WHERE name = 'قيس لبنى';

-- ابن رشيق القيرواني الازدي -> ابن رشيق القيرواني  (4 served poems; Duplicate of Ibn Rashiq al-Qayrawani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن رشيق القيرواني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن رشيق القيرواني الازدي');
DELETE FROM public.poets WHERE name = 'ابن رشيق القيرواني الازدي';

-- مجنون ليلى -> قيس بن الملوح  (3 served poems; Duplicate of Qays ibn al-Mulawwah)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'قيس بن الملوح')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'مجنون ليلى');
DELETE FROM public.poets WHERE name = 'مجنون ليلى';

-- ابن دريد -> ابن دريد الأزدي  (3 served poems; Duplicate of Ibn Durayd al-Azdi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن دريد الأزدي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن دريد');
DELETE FROM public.poets WHERE name = 'ابن دريد';

-- عماد الدين الاصفهاني -> العماد الأصبهاني  (3 served poems; Duplicate of al-Imad al-Isbahani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'العماد الأصبهاني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عماد الدين الاصفهاني');
DELETE FROM public.poets WHERE name = 'عماد الدين الاصفهاني';

-- حيدر بن سليمان الحلي -> حيدر الحلي  (2 served poems; Duplicate (full name) of Haydar al-Hilli)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'حيدر الحلي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'حيدر بن سليمان الحلي');
DELETE FROM public.poets WHERE name = 'حيدر بن سليمان الحلي';

-- علي بن محمد التهامي -> التهامي  (2 served poems; Duplicate of al-Tihami)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'التهامي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'علي بن محمد التهامي');
DELETE FROM public.poets WHERE name = 'علي بن محمد التهامي';

-- لبيد بن ربيعة العامري -> لبيد بن ربيعة  (2 served poems; Duplicate (full name) of Labid ibn Rabi'a)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'لبيد بن ربيعة')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'لبيد بن ربيعة العامري');
DELETE FROM public.poets WHERE name = 'لبيد بن ربيعة العامري';

-- ابراهيم بن هلال بن زهرون -> ابو اسحاق الصابي  (2 served poems; Duplicate of Abu Ishaq al-Sabi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابو اسحاق الصابي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابراهيم بن هلال بن زهرون');
DELETE FROM public.poets WHERE name = 'ابراهيم بن هلال بن زهرون';

-- ابو منصور الثعالبي -> الثعالبي  (2 served poems; Duplicate of al-Tha'alibi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الثعالبي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابو منصور الثعالبي');
DELETE FROM public.poets WHERE name = 'ابو منصور الثعالبي';

-- عمرو بن معدي كرب -> عمرو بن معد يكرب  (2 served poems; Duplicate spelling of Amr ibn Ma'di Karib)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'عمرو بن معد يكرب')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عمرو بن معدي كرب');
DELETE FROM public.poets WHERE name = 'عمرو بن معدي كرب';

-- ليلى الاخيلية -> ليلى الأخليلية  (2 served poems; Duplicate spelling of Layla al-Akhyaliyya)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ليلى الأخليلية')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ليلى الاخيلية');
DELETE FROM public.poets WHERE name = 'ليلى الاخيلية';

-- امية بن عبد العزيز الداني -> الحكم بن ابي الصلت  (1 served poems; Duplicate of Umayya ibn Abd al-Aziz al-Dani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الحكم بن ابي الصلت')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'امية بن عبد العزيز الداني');
DELETE FROM public.poets WHERE name = 'امية بن عبد العزيز الداني';

-- ابن سارة الاندلسي -> ابن سارة ( صارة ) الشنتريني  (1 served poems; Duplicate of Ibn Sarah al-Shantarini)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن سارة ( صارة ) الشنتريني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن سارة الاندلسي');
DELETE FROM public.poets WHERE name = 'ابن سارة الاندلسي';

-- لسان الدين الخطيب -> لسان الدين بن الخطيب  (1 served poems; Duplicate spelling of Lisan al-Din ibn al-Khatib)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'لسان الدين بن الخطيب')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'لسان الدين الخطيب');
DELETE FROM public.poets WHERE name = 'لسان الدين الخطيب';

-- عماد الدين الاصبهاني -> العماد الأصبهاني  (1 served poems; Duplicate spelling of al-Imad al-Isbahani)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'العماد الأصبهاني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عماد الدين الاصبهاني');
DELETE FROM public.poets WHERE name = 'عماد الدين الاصبهاني';

-- مرسي شاكر الطنطاوي -> مرسي شاكر طنطاوي  (1 served poems; Duplicate spelling of Mursi Shakir Tantawi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'مرسي شاكر طنطاوي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'مرسي شاكر الطنطاوي');
DELETE FROM public.poets WHERE name = 'مرسي شاكر الطنطاوي';

-- أبو الحسين النوري -> ابو الحسن النوري  (1 served poems; Duplicate of Abu al-Hasan al-Nuri, Baghdad Sufi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابو الحسن النوري')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'أبو الحسين النوري');
DELETE FROM public.poets WHERE name = 'أبو الحسين النوري';

-- أبو بكر الخالدي -> ابو بكر الخالدي ( الخالديان )  (1 served poems; Duplicate of Abu Bakr al-Khalidi (al-Khalidiyan))
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابو بكر الخالدي ( الخالديان )')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'أبو بكر الخالدي');
DELETE FROM public.poets WHERE name = 'أبو بكر الخالدي';

-- ابن الابار القضاعي البنلسي -> ابن الابار الاشبيلي  (1 served poems; Duplicate spelling of Ibn al-Abbar)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن الابار الاشبيلي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن الابار القضاعي البنلسي');
DELETE FROM public.poets WHERE name = 'ابن الابار القضاعي البنلسي';

-- ابن الزقاق -> ابن الزقاق البلنسي  (1 served poems; Duplicate of Ibn al-Zuqaq al-Balansi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن الزقاق البلنسي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن الزقاق');
DELETE FROM public.poets WHERE name = 'ابن الزقاق';

-- ابن باجه -> ابن باجة الاندلسي  (1 served poems; Duplicate spelling of Ibn Bajja (Avempace))
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن باجة الاندلسي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن باجه');
DELETE FROM public.poets WHERE name = 'ابن باجه';

-- ابن حديدة -> ابن حديدة اللخمي القيرواني  (1 served poems; Duplicate/short form of Ibn Hadida al-Lakhmi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن حديدة اللخمي القيرواني')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن حديدة');
DELETE FROM public.poets WHERE name = 'ابن حديدة';

-- ابن هذيل -> ابن هذيل القرطبي  (1 served poems; Duplicate/short form of Ibn Hudhayl al-Qurtubi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابن هذيل القرطبي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن هذيل');
DELETE FROM public.poets WHERE name = 'ابن هذيل';

-- ابن وهيب الحميري -> محمد بن وهيب الحميري  (1 served poems; Duplicate of Muhammad ibn Wuhayb al-Himyari)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'محمد بن وهيب الحميري')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابن وهيب الحميري');
DELETE FROM public.poets WHERE name = 'ابن وهيب الحميري';

-- ابو الشيص محمد -> أبو الشيص الخزاعي  (1 served poems; Duplicate of Abu al-Shis al-Khuza'i)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'أبو الشيص الخزاعي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'ابو الشيص محمد');
DELETE FROM public.poets WHERE name = 'ابو الشيص محمد';

-- الحسين بن علي -> الحسين بن علي بن ابي طالب  (1 served poems; Duplicate of al-Husayn ibn Ali ibn Abi Talib)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الحسين بن علي بن ابي طالب')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الحسين بن علي');
DELETE FROM public.poets WHERE name = 'الحسين بن علي';

-- الكميت بن زيد -> الكميت بن زيد الاسدي  (1 served poems; Duplicate of al-Kumayt ibn Zayd al-Asadi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الكميت بن زيد الاسدي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الكميت بن زيد');
DELETE FROM public.poets WHERE name = 'الكميت بن زيد';

-- الميكالي -> ابو الفضل الميكالي  (1 served poems; Duplicate of Abu al-Fadl al-Mikali)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابو الفضل الميكالي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'الميكالي');
DELETE FROM public.poets WHERE name = 'الميكالي';

-- شرف الدين البوصيري -> البوصيري  (1 served poems; Duplicate (full name) of al-Busiri)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'البوصيري')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'شرف الدين البوصيري');
DELETE FROM public.poets WHERE name = 'شرف الدين البوصيري';

-- شهاب الدين الالوسي -> ابوالثناء شهاب الدين محمود الالوسي  (1 served poems; Duplicate of Mahmud al-Alusi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'ابوالثناء شهاب الدين محمود الالوسي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'شهاب الدين الالوسي');
DELETE FROM public.poets WHERE name = 'شهاب الدين الالوسي';

-- عبد المحسن الصوري بن غلبون -> عبد المحسن الصوري  (1 served poems; Duplicate (full name) of Abd al-Muhsin al-Suri)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'عبد المحسن الصوري')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عبد المحسن الصوري بن غلبون');
DELETE FROM public.poets WHERE name = 'عبد المحسن الصوري بن غلبون';

-- عرقلة الكلبي الدمشقي -> عرقلة الدمشقي  (1 served poems; Duplicate (full name) of Urqula al-Dimashqi)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'عرقلة الدمشقي')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'عرقلة الكلبي الدمشقي');
DELETE FROM public.poets WHERE name = 'عرقلة الكلبي الدمشقي';

-- تماضر بنت الشريد -> الخنساء  (1 served poems; Given name of al-Khansa)
UPDATE public.poems SET poet_id = (SELECT id FROM public.poets WHERE name = 'الخنساء')
  WHERE poet_id = (SELECT id FROM public.poets WHERE name = 'تماضر بنت الشريد');
DELETE FROM public.poets WHERE name = 'تماضر بنت الشريد';

COMMIT;
