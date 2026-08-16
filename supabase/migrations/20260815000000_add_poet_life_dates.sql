-- Poet life dates: give `century` a per-poet source of truth.
--
-- Before this migration `poems.century` was a pure function of the poet's era
-- (poetry_quality_and_curation/categorization/config.py ERA_CENTURY stamped one
-- century per era_id), so every Abbasid poem read as 9th century whether the
-- poet died in 814 (Abu Nuwas), 965 (al-Mutanabbi) or 1057 (al-Ma'arri). The
-- column therefore carried zero per-poet information, and two of the stamps
-- were outright wrong: مخضرم (era 6) inherited 13 from a stale era numbering in
-- which id 6 meant أيوبي, and أندلسي (era 7) was pinned to 11 even though
-- Andalusian poetry runs 8th-15th c. and "Andalusian" is a place, not a period.
--
-- The fix is to date the POET and derive the century from that. This migration
-- only adds the columns; the data lands in a follow-up migration, and
-- `poems.century` stays as a derived cache so every existing server.js query
-- path (century, centuryFrom/centuryTo, undated, includeUndated) keeps working
-- untouched.
--
-- date_confidence has exactly two values:
--   'exact'  — the year is attested and sources agree
--   'approx' — reconstructed, disputed by a few years, or a floruit estimate
-- NULL means the poet has no dates at all. There is deliberately no third
-- value; "unknown" is the absence of a row value, not a label.

ALTER TABLE public.poets ADD COLUMN IF NOT EXISTS death_year smallint;
ALTER TABLE public.poets ADD COLUMN IF NOT EXISTS birth_year smallint;
ALTER TABLE public.poets ADD COLUMN IF NOT EXISTS active_year smallint;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'poet_date_confidence') THEN
    CREATE TYPE public.poet_date_confidence AS ENUM ('exact', 'approx');
  END IF;
END
$$;

ALTER TABLE public.poets
  ADD COLUMN IF NOT EXISTS date_confidence public.poet_date_confidence;

COMMENT ON COLUMN public.poets.death_year IS
  'Year of death (CE, negative = BCE). Primary signal for the derived century.';
COMMENT ON COLUMN public.poets.birth_year IS
  'Year of birth (CE, negative = BCE). Lowest-priority century signal: a poet born 1899 and dead 1960 is not a 19th-century poet.';
COMMENT ON COLUMN public.poets.active_year IS
  'Floruit — a year the poet was demonstrably writing. Used when the death year is unknown, because it is what a reader picking an era is actually choosing.';
COMMENT ON COLUMN public.poets.date_confidence IS
  'exact = attested and undisputed; approx = reconstructed, disputed, or a floruit estimate. NULL = no dates known.';

-- Century is derived, never entered by hand:
--   ceil( coalesce(death_year, active_year, birth_year) / 100.0 )
-- Death first, then floruit, then birth. Poets with no dates keep a NULL
-- century, which the API already handles (undated=1 / includeUndated=1).
CREATE OR REPLACE FUNCTION public.poet_century(
  p_death smallint,
  p_active smallint,
  p_birth smallint
) RETURNS smallint
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN COALESCE(p_death, p_active, p_birth) IS NULL THEN NULL
    ELSE CEIL(COALESCE(p_death, p_active, p_birth)::numeric / 100)::smallint
  END
$$;

COMMENT ON FUNCTION public.poet_century(smallint, smallint, smallint) IS
  'Derived century for a poet: ceil(coalesce(death_year, active_year, birth_year) / 100). One definition, shared by the backfill and any later re-derivation, so poets.century and poems.century can never drift apart.';

-- Dates are only useful if you can filter on them.
CREATE INDEX IF NOT EXISTS idx_poets_death_year ON public.poets (death_year);
