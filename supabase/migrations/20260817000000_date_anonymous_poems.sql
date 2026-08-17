-- Give the anonymous poet rows a century. Follow-up to #721.
--
-- `مجهول` (113 poems) and `شعراء مجهولون` (3) were left undated by the poet-dates
-- backfill because there is no poet to date. They were the largest remaining
-- block of NULL centuries, so they never surface in any era band and are only
-- reachable through the undated absorb rule.
--
-- WHY 14th CENTURY, AND WHAT THIS CLAIM IS WORTH
--
-- The first instinct was 6th century, on the reasonable intuition that anonymous
-- Arabic verse is usually pre-Islamic. A read of 12 of these poems refuted it:
-- they are 2-4 line muqattaʿa rather than qasida, with no atlal opening; the
-- diction is mannered badiʿ; the ghazal mode is the post-Abbasid ظبي/عذار type
-- with حناء, كافور, زمردة الشنف; one cites سورة الفتح; one uses fanaʾ/baqaʾ Sufi
-- technical vocabulary. Accessibility scores cluster 1.5-3.8, where genuine
-- Jahili verse scores far harder. This is late-medieval material, and stamping
-- it 6th century would file it under "Pre-Islamic to Umayyad" in onboarding.
--
-- 14th century (Mamluk, 1250-1517) is where that evidence points. It is a
-- CONVENTION, not a finding: 12 poems were read, 116 are being stamped, and the
-- poems are anonymous precisely because nobody knows. Hence `approx`, and hence
-- active_year rather than death_year — there is no death to record.
--
-- Reversal is a one-liner: set century, active_year and date_confidence back to
-- NULL and era_id back to 3 for these two rows.

BEGIN;

UPDATE public.poets
   SET active_year     = 1350,          -- mid-Mamluk, the centre of the range
       date_confidence = 'approx',
       era_id          = 8              -- مملوكي; era 3 (متأخر) now means 19th-21st
 WHERE name IN ('مجهول', 'شعراء مجهولون');

-- Recompute through the shared function rather than writing 14 by hand, so this
-- can never disagree with how every other poem got its century.
UPDATE public.poems p
   SET century = public.poet_century(po.death_year, po.active_year, po.birth_year)
  FROM public.poets po
 WHERE po.id = p.poet_id
   AND po.name IN ('مجهول', 'شعراء مجهولون');

DO $$
DECLARE n_undated int; n_c14 int;
BEGIN
  SELECT count(*) FILTER (WHERE p.century IS NULL),
         count(*) FILTER (WHERE p.century = 14)
    INTO n_undated, n_c14
    FROM public.poems p JOIN public.poets po ON po.id = p.poet_id
   WHERE po.name IN ('مجهول', 'شعراء مجهولون');
  IF n_undated > 0 THEN
    RAISE EXCEPTION 'anonymous poems still undated: %', n_undated;
  END IF;
  RAISE NOTICE 'anonymous poems dated to c14: %', n_c14;
END $$;

COMMIT;
