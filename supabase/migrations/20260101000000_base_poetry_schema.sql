-- =============================================================================
-- Base poetry schema (structure only -- no poem data)
-- =============================================================================
--
-- WHY THIS FILE EXISTS
--
-- Every other migration in this directory assumes `poems` and `poets` already
-- exist: they only ever ALTER them. Those two tables (and the lookup tables,
-- functions and views they depend on) originally arrived with the one-off 84k
-- poem import, whose SQL is gitignored (`*_import_poetry.sql`). The result was
-- that a fresh Postgres could never be brought up from this repo -- `supabase
-- db push` died on the first `ALTER TABLE poems`.
--
-- This file closes that gap. It is a schema-only `pg_dump` of production,
-- filtered down to the objects that no other migration creates, then rewritten
-- to be safely re-runnable. It contains NO poem rows. Reference data for the
-- lookup tables (eras, meters, rhymes, themes, patterns) is not included
-- either -- see `supabase/migrations/README.md`.
--
-- This is NOT the data import. `*_import_poetry.sql` stays gitignored on
-- purpose; do not confuse the two.
--
-- WHAT'S IN HERE
--
--   enum         tag_type
--   tables       poems, poets
--                eras, meters, patterns, rhymes, themes  (FK targets)
--                tags, poem_tags, tagging_jobs           (tagging subsystem)
--                users                                    (legacy, pre-Supabase-auth)
--                design_review_history                    (design tooling)
--   functions    normalize_arabic_text (required by the poems.search_vector
--                generated column), plus the search/lookup helpers
--   views        the per-facet *_poems / *_stats views and poem_full_data
--   triggers     poem_tags -> poems.primary_tag_id sync, tags.updated_at
--   RLS          enabled to match production (base tables carry no policies,
--                so PostgREST anon cannot read them; the Express API reads
--                through a privileged connection)
--
-- Column sets here reflect production as of the dump, so later migrations that
-- `ADD COLUMN IF NOT EXISTS` on poems/poets are no-ops on a fresh database and
-- still apply correctly to an older one. Every statement is guarded (IF NOT
-- EXISTS / OR REPLACE / DO-block on constraints and types), so this file is
-- idempotent.
--
-- Regenerate with `npm run db:dump-schema` (see supabase/migrations/README.md).
-- =============================================================================

-- Objects below are emitted in pg_dump order, which puts functions ahead of the
-- tables they query. Deferring body validation (exactly what pg_dump itself
-- does) keeps that order valid; it is reset at the bottom of this file.
SET check_function_bodies = false;

--
--

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';

--
-- Name: tag_type; Type: TYPE; Schema: public; Owner: -
--

DO $guard$ BEGIN
    CREATE TYPE public.tag_type AS ENUM (
        'theme',
        'form',
        'period',
        'emotion',
        'style',
        'region',
        'other'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $guard$;
--
-- Name: assign_poem_tag(integer, integer, real, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.assign_poem_tag(p_poem_id integer, p_tag_id integer, p_confidence real DEFAULT 1.0, p_source text DEFAULT 'manual'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO public.poem_tags (poem_id, tag_id, confidence_score, source)
  VALUES (p_poem_id, p_tag_id, p_confidence, p_source)
  ON CONFLICT (poem_id, tag_id) DO UPDATE
    SET confidence_score = GREATEST(poem_tags.confidence_score, EXCLUDED.confidence_score),
        source = CASE
                   WHEN EXCLUDED.source = 'manual' THEN 'manual'
                   ELSE poem_tags.source
                 END;
END;
$$;

--
-- Name: get_or_create_tag(character varying, character varying, character varying, public.tag_type, character varying); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_or_create_tag(p_slug character varying, p_name_ar character varying, p_name_en character varying, p_type public.tag_type DEFAULT 'theme'::public.tag_type, p_color character varying DEFAULT '#c5a059'::character varying) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_id INTEGER;
BEGIN
  SELECT id INTO v_id FROM public.tags WHERE slug = p_slug;
  IF NOT FOUND THEN
    INSERT INTO public.tags (slug, name_ar, name_en, tag_type, color)
    VALUES (p_slug, p_name_ar, p_name_en, p_type, p_color)
    RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END;
$$;

--
-- Name: get_poem_details(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_poem_details(poem_id_param integer) RETURNS json
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
    poem_data JSON;
BEGIN
    -- Get poem details with poet name
    SELECT json_build_object(
        'poem_id', p.id,
        'poet_name', pt.name,
        'content', p.content
    ) INTO poem_data
    FROM public.poems p
    JOIN public.poets pt ON pt.id = p.poet_id
    WHERE p.id = poem_id_param;

    -- Check if no rows were found
    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Poem not found');
    END IF;
    
    RETURN poem_data;
END;
$$;

--
-- Name: get_poem_slug(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_poem_slug(poem_id_param integer) RETURNS json
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
    poem_slug JSON;
BEGIN
    SELECT json_build_object(
        'slug', p.slug
    ) INTO poem_slug
    FROM public.poems p
    WHERE p.id = poem_id_param;

    IF NOT FOUND THEN
        RETURN json_build_object('error', 'Poem not found');
    END IF;

    RETURN poem_slug;
END;
$$;

--
-- Name: get_poem_with_related(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_poem_with_related(p_slug text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    uuid_slug UUID;
    poem_data JSONB;
    related_poems JSONB;
BEGIN
    -- Try to cast the input to UUID - exact same as original
    BEGIN
        uuid_slug := p_slug::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        RETURN jsonb_build_object(
            'error', 'Invalid UUID format',
            'message', 'The provided slug is not a valid UUID: ' || p_slug
        );
    END;

    -- Get poem data - exact same as original
    SELECT 
        to_jsonb(pfd) INTO poem_data
    FROM 
        public.poem_full_data pfd
    WHERE 
        slug = uuid_slug;
    
    -- If poem not found - exact same as original
    IF poem_data IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Not Found',
            'message', 'No poem found with slug: ' || p_slug
        );
    END IF;
    
    -- KEEP ORIGINAL: Use the working get_related_poems function
    BEGIN
        SELECT public.get_related_poems(p_slug) INTO related_poems;
    EXCEPTION WHEN OTHERS THEN
        -- Gracefully handle errors - exact same as original
        related_poems := '[]'::jsonb;
        RAISE WARNING 'Error getting related poems: %', SQLERRM;
    END;
    
    -- Build and return final result - exact same as original
    RETURN jsonb_build_object(
        'poem', poem_data,
        'related_poems', COALESCE(related_poems, '[]'::jsonb)
    );
END;
$$;

--
-- Name: get_random_eligible_poem(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_random_eligible_poem() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    poet_id INT;
    poem_id INT;
BEGIN
    -- Step 1: Get a random eligible poet - FIXED: Added public. prefix
    poet_id := public.get_random_eligible_poet();
    
    -- If no eligible poet found, return an error
    IF poet_id IS NULL THEN
        RETURN json_build_object('error', 'No eligible poet found');
    END IF;
    
    -- Step 2: Get a random poem from that poet - FIXED: Added public. prefix
    poem_id := public.get_random_poem_by_poet(poet_id);
    
    -- If no poem found for the poet, return an error
    IF poem_id IS NULL THEN
        RETURN json_build_object('error', 'No poem found for the selected poet');
    END IF;
    
    -- Step 3: Get the poem details - FIXED: Added public. prefix
    RETURN public.get_poem_details(poem_id);
EXCEPTION
    WHEN OTHERS THEN
        -- Return the error message in a JSON object
        RETURN json_build_object('error', 'An error occurred: ' || SQLERRM);
END;
$$;

--
-- Name: get_random_eligible_poem_slug(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_random_eligible_poem_slug() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
    poet_id INT;
    poem_id INT;
BEGIN
    -- Step 1: Get a random eligible poet - FIXED: Added public. prefix
    poet_id := public.get_random_eligible_poet();
    
    IF poet_id IS NULL THEN
        RETURN json_build_object('error', 'No eligible poet found');
    END IF;
    
    -- Step 2: Get a random poem by that poet - FIXED: Added public. prefix
    poem_id := public.get_random_poem_by_poet(poet_id);
    
    IF poem_id IS NULL THEN
        RETURN json_build_object('error', 'No poem found for selected poet');
    END IF;
    
    -- Step 3: Return the slug for that poem - FIXED: Added public. prefix
    RETURN public.get_poem_slug(poem_id);
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object('error', 'An error occurred: ' || SQLERRM);
END;
$$;

--
-- Name: get_random_eligible_poet(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_random_eligible_poet() RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
    random_poet_id INT;
BEGIN
    -- Use NOT IN instead of != ALL
    SELECT pt.id INTO random_poet_id
    FROM public.poets pt
    WHERE pt.era_id NOT IN (3, 9)
    ORDER BY random()
    LIMIT 1;
    
    IF random_poet_id IS NULL THEN
        RAISE EXCEPTION 'No eligible poets found.';
    END IF;
    
    RETURN random_poet_id;
END;
$$;

--
-- Name: get_random_poem_by_poet(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_random_poem_by_poet(poet_id_param integer) RETURNS integer
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
DECLARE
    random_poem_id INT;
BEGIN
    -- Try selecting a random poem id
    SELECT p.id INTO random_poem_id
    FROM public.poems p
    WHERE p.poet_id = poet_id_param
    ORDER BY random()
    LIMIT 1;

    -- If no poem was found, raise an exception
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No poems found for the specified poet (ID: %).', poet_id_param;
    END IF;
    
    RETURN random_poem_id;
END;
$$;

--
-- Name: get_related_poems(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.get_related_poems(p_slug text) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$DECLARE
    poem_poet_slug TEXT;
    poem_era_slug TEXT;
    uuid_slug UUID;
    result JSONB;
BEGIN
    -- Try to cast the input to UUID
    BEGIN
        uuid_slug := p_slug::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
        RAISE EXCEPTION 'Invalid UUID format: %', p_slug;
    END;

    -- Get only the poet and era for the input poem - FIXED: Added public. prefixes
    SELECT 
        po.slug, 
        e.slug
    INTO 
        poem_poet_slug, 
        poem_era_slug
    FROM 
        public.poems p
        JOIN public.poets po ON p.poet_id = po.id
        JOIN public.eras e ON po.era_id = e.id
    WHERE 
        p.slug = uuid_slug;

    -- If poem not found, return null
    IF poem_poet_slug IS NULL THEN
        RETURN NULL;
    END IF;

    -- Use a direct approach with simplified criteria - FIXED: Added public. prefixes
    SELECT 
        jsonb_agg(
            jsonb_build_object(
                'poet_name', related.poet_name,
                'poem_title', related.poem_title,
                'poem_slug', related.poem_slug,
                'meter_name', related.meter_name
            )
        ) INTO result
    FROM (
        -- Set a seed based on the input slug for consistent randomness
        SELECT setseed(('x' || substr(md5(p_slug), 1, 8))::bit(32)::int / 2147483647.0)
    ) AS seed
    CROSS JOIN LATERAL (
        -- This LATERAL join with simplified criteria
        SELECT
            po.name AS poet_name,
            p.title AS poem_title,
            p.slug::TEXT AS poem_slug,
            m.name AS meter_name
        FROM 
            public.poems p
            JOIN public.poets po ON p.poet_id = po.id
            JOIN public.meters m ON p.meter_id = m.id
            JOIN public.eras e ON po.era_id = e.id
        WHERE 
            p.slug <> uuid_slug
            AND (
                -- Only consider poet or era
                (po.slug = poem_poet_slug) OR
                (e.slug = poem_era_slug)
            )
        ORDER BY
            -- Simplified priority: poet then era
            CASE
                WHEN po.slug = poem_poet_slug THEN 1
                WHEN e.slug = poem_era_slug THEN 2
                ELSE 3
            END,
            random()
        LIMIT 10
    ) AS related;
    
    -- Return empty array instead of null if no related poems found
    RETURN COALESCE(result, '[]'::jsonb);
END;$$;

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;

--
-- Name: normalize_arabic_text(text, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.normalize_arabic_text(input_text text, keep_asterisk boolean) RETURNS text
    LANGUAGE plpgsql IMMUTABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$DECLARE
  pattern TEXT;
  cleaned TEXT;
BEGIN
  -- strip Arabic diacritics & tatweel  
  cleaned := regexp_replace(
    input_text,
    '[\u064B-\u0652\u0670\u06D6\u06DC\u06DF\u06E0\u06E1\u06E2\u06E3\u06E4\u06E5\u06E6\u06E7\u06E8\u06E9\u06EA\u06EB\u06EC\u06ED\u06EE\u06EF\u06F0-\u06FF]',
    '',
    'g'
  );

  -- build the filtering regex  
  IF keep_asterisk THEN
    pattern := '[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFء *]';
  ELSE
    pattern := '[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFء ]';
  END IF;

  -- filter out non-Arabic (plus optional asterisk)  
  RETURN regexp_replace(cleaned, pattern, '', 'g');
END;$$;

--
-- Name: normalize_slug(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.normalize_slug(input text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT lower(regexp_replace(trim(input), '[^a-z0-9\-]', '', 'g'));
$$;

--
-- Name: normalize_tag_name(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.normalize_tag_name(input text) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
  SELECT lower(trim(regexp_replace(input, '\s+', ' ', 'g')));
$$;

--
-- Name: poems_by_tag(character varying, integer, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.poems_by_tag(p_slug character varying, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0) RETURNS TABLE(poem_id integer, confidence_score real, source character varying)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    pt.poem_id,
    pt.confidence_score,
    pt.source
  FROM public.poem_tags pt
  JOIN public.tags t ON t.id = pt.tag_id
  WHERE t.slug = p_slug
  ORDER BY pt.confidence_score DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

--
-- Name: search_poems(text, integer, text, integer[], integer[], integer[], integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.search_poems(query_text text, page_number integer, match_type text, meter_ids integer[] DEFAULT NULL::integer[], era_ids integer[] DEFAULT NULL::integer[], theme_ids integer[] DEFAULT NULL::integer[], rhyme_ids integer[] DEFAULT NULL::integer[]) RETURNS TABLE(poet_name text, poet_era text, poet_slug text, poem_title text, poem_snippet text, poem_meter text, poem_slug uuid, relevance real, total_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  processed_query TEXT;
  tsquery_obj tsquery;
  results_per_page INTEGER := 5;
  total_results BIGINT;
BEGIN
  -- FIXED: Added public. schema prefix to function call
  processed_query := public.normalize_arabic_text(query_text, FALSE);

  IF match_type = 'exact' THEN
    tsquery_obj := phraseto_tsquery('simple', processed_query);
  ELSIF match_type = 'all' THEN
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' & ', 'g'));
  ELSIF match_type = 'any' THEN
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' | ', 'g'));
  ELSE
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' & ', 'g'));
  END IF;

  -- FIXED: Added public. schema prefixes to all table references
  SELECT COUNT(*) INTO total_results
  FROM public.poems p
  JOIN public.poets pt ON p.poet_id = pt.id
  JOIN public.meters m ON p.meter_id = m.id
  JOIN public.eras e ON pt.era_id = e.id
  WHERE p.search_vector @@ tsquery_obj
  AND (meter_ids IS NULL OR p.meter_id = ANY(meter_ids))
  AND (era_ids IS NULL OR pt.era_id = ANY(era_ids))
  AND (theme_ids IS NULL OR p.theme_id = ANY(theme_ids))
  AND (rhyme_ids IS NULL OR p.rhyme_id = ANY(rhyme_ids));

  RETURN QUERY
  SELECT
    pt.name,
    e.name,
    pt.slug,
    p.title,
    -- FIXED: Added public. schema prefix to function call in ts_headline
    ts_headline('simple', public.normalize_arabic_text(p.content, TRUE), tsquery_obj,
      'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=30'),
    m.name,
    p.slug,
    ts_rank(p.search_vector, tsquery_obj),
    total_results
  -- FIXED: Added public. schema prefixes to all table references
  FROM public.poems p
  JOIN public.poets pt ON p.poet_id = pt.id
  JOIN public.meters m ON p.meter_id = m.id
  JOIN public.eras e ON pt.era_id = e.id
  WHERE p.search_vector @@ tsquery_obj
  AND (meter_ids IS NULL OR p.meter_id = ANY(meter_ids))
  AND (era_ids IS NULL OR pt.era_id = ANY(era_ids))
  AND (theme_ids IS NULL OR p.theme_id = ANY(theme_ids))
  AND (rhyme_ids IS NULL OR p.rhyme_id = ANY(rhyme_ids))
  ORDER BY relevance DESC
  LIMIT results_per_page
  OFFSET (page_number - 1) * results_per_page;
END;
$$;

--
-- Name: search_poets(text, integer, text, integer[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.search_poets(query_text text, page_number integer, match_type text, era_ids integer[] DEFAULT NULL::integer[]) RETURNS TABLE(poet_name text, poet_era text, poet_slug text, poet_bio text, relevance double precision, total_count bigint)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  processed_query TEXT;
  tsquery_obj tsquery;
  results_per_page INTEGER := 10;
  total_results BIGINT;
  weight_config REAL[] := ARRAY[0.1, 0.2, 0.4, 1.0];
BEGIN
  -- Process the query text - FIXED: Added public. prefix
  processed_query := public.normalize_arabic_text(query_text, FALSE);

  -- Determine the tsquery based on the match type
  IF match_type = 'exact' THEN
    tsquery_obj := phraseto_tsquery('simple', processed_query);
  ELSIF match_type = 'all' THEN
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' & ', 'g'));
  ELSIF match_type = 'any' THEN
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' | ', 'g'));
  ELSE
    tsquery_obj := to_tsquery('simple', regexp_replace(processed_query, '\s+', ' & ', 'g'));
  END IF;

  -- Count the total number of results - FIXED: Added public. prefixes
  SELECT COUNT(*) INTO total_results
  FROM public.poets p
  JOIN public.eras e ON p.era_id = e.id
  WHERE p.search_vector @@ tsquery_obj
    AND (era_ids IS NULL OR p.era_id = ANY(era_ids));

  -- Return the query results - FIXED: Added public. prefixes
  RETURN QUERY
  SELECT
    p.name,
    e.name,
    p.slug,
    ts_headline('simple', public.normalize_arabic_text(p.bio, FALSE), tsquery_obj,
                'StartSel=<mark>, StopSel=</mark>, MaxFragments=1, MaxWords=50'),
    CASE
      WHEN public.normalize_arabic_text(p.name, FALSE) = processed_query THEN 10.0
      WHEN public.normalize_arabic_text(p.name, FALSE) ILIKE '%' || processed_query || '%' THEN
        5.0 + ts_rank_cd(weight_config, p.search_vector, tsquery_obj)
      ELSE
        ts_rank_cd(weight_config, p.search_vector, tsquery_obj)
    END,
    total_results
  FROM public.poets p
  JOIN public.eras e ON p.era_id = e.id
  WHERE p.search_vector @@ tsquery_obj
    AND (era_ids IS NULL OR p.era_id = ANY(era_ids))
  ORDER BY
    public.normalize_arabic_text(p.name, FALSE) = processed_query DESC,
    public.normalize_arabic_text(p.name, FALSE) ILIKE '%' || processed_query || '%' DESC,
    relevance DESC
  LIMIT results_per_page
  OFFSET (page_number - 1) * results_per_page;

END;
$$;

--
-- Name: set_poem_text_hash(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_poem_text_hash() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.poem_text IS NOT NULL THEN
    NEW.poem_text_hash := md5(NEW.poem_text);
  END IF;
  RETURN NEW;
END;
$$;

--
-- Name: tag_usage_counts(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.tag_usage_counts() RETURNS TABLE(tag_id integer, slug character varying, name_ar character varying, name_en character varying, tag_type public.tag_type, poem_count bigint)
    LANGUAGE sql STABLE
    AS $$
  SELECT
    t.id,
    t.slug,
    t.name_ar,
    t.name_en,
    t.tag_type,
    COUNT(pt.poem_id) AS poem_count
  FROM public.tags t
  LEFT JOIN public.poem_tags pt ON pt.tag_id = t.id
  GROUP BY t.id, t.slug, t.name_ar, t.name_en, t.tag_type
  ORDER BY poem_count DESC, t.display_order;
$$;

--
-- Name: update_poem_primary_tag(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_poem_primary_tag() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_poem_id  INTEGER;
  v_tag_id   INTEGER;
BEGIN
  -- Determine which poem_id changed
  v_poem_id := COALESCE(NEW.poem_id, OLD.poem_id);

  -- Select the best tag for this poem
  SELECT tag_id INTO v_tag_id
  FROM public.poem_tags
  WHERE poem_id = v_poem_id
  ORDER BY
    confidence_score DESC,
    -- Prefer 'manual' on tie (manual=0 sorts first when DESC doesn't matter)
    CASE source WHEN 'manual' THEN 0 ELSE 1 END ASC
  LIMIT 1;

  -- Update poems.primary_tag_id (NULL if no tags remain)
  UPDATE public.poems
  SET primary_tag_id = v_tag_id
  WHERE id = v_poem_id;

  RETURN NULL; -- AFTER trigger, return value ignored
END;
$$;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

--
-- Name: eras; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.eras (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);

--
-- Name: meters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.meters (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL
);

--
-- Name: poems; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.poems (
    id integer NOT NULL,
    title text NOT NULL,
    meter_id integer NOT NULL,
    theme_id integer NOT NULL,
    poet_id integer NOT NULL,
    slug uuid NOT NULL,
    content text NOT NULL,
    rhyme_id integer,
    search_vector tsvector GENERATED ALWAYS AS ((setweight(to_tsvector('simple'::regconfig, replace(public.normalize_arabic_text(title, true), '*'::text, ' '::text)), 'A'::"char") || setweight(to_tsvector('simple'::regconfig, replace(public.normalize_arabic_text(content, true), '*'::text, ' '::text)), 'B'::"char"))) STORED,
    pattern_id integer,
    diacritized_content text,
    quality_score smallint,
    quality_subscores jsonb,
    source_dataset character varying(20) DEFAULT 'original'::character varying,
    poem_form smallint,
    scoring_model character varying(30),
    scored_at timestamp with time zone,
    raw_content text,
    cached_translation text,
    cached_explanation text,
    cached_author_bio text,
    translated_at timestamp with time zone,
    title_en text,
    primary_tag_id integer,
    mood_primary text,
    emotional_intensity smallint,
    accessibility_level smallint,
    century smallint,
    categories jsonb,
    categorized_at timestamp with time zone,
    categorization_model character varying(40),
    accessibility_score real,
    accessibility_factors jsonb,
    categorization_prompt_version character varying(40)
);

--
-- Name: COLUMN poems.accessibility_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.poems.accessibility_level IS 'Raw model 1-5 ease estimate (provenance only; currently unused). Canonical difficulty facet is accessibility_score (0-10). Retained, not dropped — see migration 20260727000000.';

--
-- Name: COLUMN poems.accessibility_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.poems.accessibility_score IS 'Canonical difficulty facet, 0-10 (higher = harder), populated by the quality-curation pipeline. Prefer this over accessibility_level.';

--
-- Name: poets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.poets (
    id integer NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    era_id integer NOT NULL,
    bio text,
    search_vector tsvector GENERATED ALWAYS AS (setweight(to_tsvector('simple'::regconfig, public.normalize_arabic_text(name, false)), 'A'::"char")) STORED,
    name_en text
);

--
-- Name: era_poems; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.era_poems WITH (security_invoker='on') AS
 SELECT p.id AS poem_id,
    p.title AS poem_title,
    p.slug AS poem_slug,
    pt.name AS poet_name,
    m.name AS meter_name,
    e.id AS era_id,
    e.name AS era_name,
    e.slug AS era_slug,
    count(*) OVER (PARTITION BY e.id) AS total_poems_in_era
   FROM (((public.poems p
     JOIN public.poets pt ON ((p.poet_id = pt.id)))
     JOIN public.meters m ON ((p.meter_id = m.id)))
     JOIN public.eras e ON ((pt.era_id = e.id)))
  ORDER BY p.id;

--
-- Name: era_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE OR REPLACE VIEW public.era_stats WITH (security_invoker='on') AS
 SELECT e.id,
    e.name,
    e.slug,
    COALESCE(poet_counts.count, (0)::bigint) AS poets_count,
    COALESCE(poem_counts.count, (0)::bigint) AS poems_count
   FROM ((public.eras e
     LEFT JOIN ( SELECT poets.era_id,
            count(*) AS count
           FROM public.poets
          GROUP BY poets.era_id) poet_counts ON ((e.id = poet_counts.era_id)))
     LEFT JOIN ( SELECT p.era_id,
            count(*) AS count
           FROM (public.poems pm
             JOIN public.poets p ON ((pm.poet_id = p.id)))
          GROUP BY p.era_id) poem_counts ON ((e.id = poem_counts.era_id)));

--
-- Name: eras_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE public.eras ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.eras_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: meter_poems; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.meter_poems WITH (security_invoker='on') AS
     SELECT p.id AS poem_id,
        p.title AS poem_title,
        p.slug AS poem_slug,
        pt.name AS poet_name,
        m.id AS meter_id,
        m.name AS meter_name,
        m.slug AS meter_slug,
        count(*) OVER (PARTITION BY m.id) AS total_poems_in_meter
       FROM ((public.poems p
         JOIN public.poets pt ON ((p.poet_id = pt.id)))
         JOIN public.meters m ON ((p.meter_id = m.id)))
      ORDER BY p.id;
    
    --
    -- Name: meter_stats; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.meter_stats WITH (security_invoker='on') AS
     SELECT m.id,
        m.name,
        m.slug,
        count(DISTINCT p.id) AS poems_count,
        count(DISTINCT p.poet_id) AS poets_count
       FROM (public.meters m
         LEFT JOIN public.poems p ON ((m.id = p.meter_id)))
      GROUP BY m.id, m.name, m.slug;
    
    --
    -- Name: meters_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    ALTER TABLE public.meters ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.meters_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: patterns; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.patterns (
        id integer NOT NULL,
        pattern text NOT NULL
    );
    
    --
    -- Name: patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    CREATE SEQUENCE IF NOT EXISTS public.patterns_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    
    --
    -- Name: patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
    --
    
    ALTER SEQUENCE public.patterns_id_seq OWNED BY public.patterns.id;
    
    --
    -- Name: themes; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.themes (
        id integer NOT NULL,
        name text NOT NULL,
        slug uuid NOT NULL
    );
    
    --
    -- Name: poem_full_data; Type: MATERIALIZED VIEW; Schema: public; Owner: -
    --
    
    CREATE MATERIALIZED VIEW IF NOT EXISTS public.poem_full_data AS
     SELECT p.slug,
        p.title,
        p.content,
        po.name AS poet_name,
        po.slug AS poet_slug,
        m.name AS meter_name,
        t.name AS theme_name,
        e.name AS era_name,
        e.slug AS era_slug
       FROM ((((public.poems p
         JOIN public.poets po ON ((p.poet_id = po.id)))
         JOIN public.meters m ON ((p.meter_id = m.id)))
         JOIN public.themes t ON ((p.theme_id = t.id)))
         JOIN public.eras e ON ((po.era_id = e.id)))
      WITH NO DATA;
    
    --
    -- Name: poem_tags; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.poem_tags (
        poem_id integer NOT NULL,
        tag_id integer NOT NULL,
        confidence_score real DEFAULT 1.0 NOT NULL,
        source character varying(10) DEFAULT 'manual'::character varying NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT poem_tags_confidence_score_check CHECK (((confidence_score >= (0.0)::double precision) AND (confidence_score <= (1.0)::double precision))),
        CONSTRAINT poem_tags_source_check CHECK (((source)::text = ANY ((ARRAY['auto'::character varying, 'manual'::character varying])::text[])))
    );
    
    --
    -- Name: tags; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.tags (
        id integer NOT NULL,
        slug character varying(100) NOT NULL,
        name_ar character varying(200) NOT NULL,
        name_en character varying(200) NOT NULL,
        description_ar text,
        description_en text,
        tag_type public.tag_type DEFAULT 'theme'::public.tag_type NOT NULL,
        color character varying(7),
        icon character varying(50),
        parent_tag_id integer,
        display_order integer DEFAULT 0,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
    );
    
    --
    -- Name: poem_tag_summary; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.poem_tag_summary AS
     SELECT pt.poem_id,
        pt.confidence_score,
        pt.source,
        t.id AS tag_id,
        t.slug AS tag_slug,
        t.name_ar AS tag_name_ar,
        t.name_en AS tag_name_en,
        t.tag_type,
        t.color
       FROM (public.poem_tags pt
         JOIN public.tags t ON ((t.id = pt.tag_id)))
      ORDER BY pt.poem_id, pt.confidence_score DESC;
    
    --
    -- Name: poems_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    ALTER TABLE public.poems ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.poems_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: poet_poems; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.poet_poems WITH (security_invoker='on') AS
     SELECT p.id AS poem_id,
        p.title AS poem_title,
        p.slug AS poem_slug,
        pt.id AS poet_id,
        pt.name AS poet_name,
        pt.slug AS poet_slug,
        m.name AS meter_name,
        count(*) OVER (PARTITION BY pt.id) AS total_poems_by_poet
       FROM ((public.poems p
         JOIN public.poets pt ON ((p.poet_id = pt.id)))
         JOIN public.meters m ON ((p.meter_id = m.id)))
      ORDER BY p.id;
    
    --
    -- Name: poet_stats; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.poet_stats WITH (security_invoker='on') AS
     SELECT p.id,
        p.name,
        p.slug,
        p.era_id,
        count(pm.id) AS poems_count
       FROM (public.poets p
         LEFT JOIN public.poems pm ON ((p.id = pm.poet_id)))
      GROUP BY p.id, p.name, p.slug, p.era_id
      ORDER BY p.name;
    
    --
    -- Name: poets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    ALTER TABLE public.poets ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.poets_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: rhymes; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.rhymes (
        id integer NOT NULL,
        pattern text NOT NULL,
        slug uuid NOT NULL
    );
    
    --
    -- Name: rhyme_poems; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.rhyme_poems WITH (security_invoker='on') AS
     SELECT p.id AS poem_id,
        p.title AS poem_title,
        p.slug AS poem_slug,
        r.id AS rhyme_id,
        r.pattern AS rhyme_pattern,
        r.slug AS rhyme_slug,
        m.name AS meter_name,
        count(*) OVER (PARTITION BY r.id) AS total_poems_by_rhyme
       FROM ((public.poems p
         JOIN public.rhymes r ON ((p.rhyme_id = r.id)))
         JOIN public.meters m ON ((p.meter_id = m.id)))
      ORDER BY p.id;
    
    --
    -- Name: rhyme_stats; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.rhyme_stats WITH (security_invoker='on') AS
     SELECT r.id,
        r.pattern,
        r.slug,
        count(DISTINCT p.id) AS poems_count,
        count(DISTINCT pt.id) AS poets_count
       FROM ((public.rhymes r
         LEFT JOIN public.poems p ON ((r.id = p.rhyme_id)))
         LEFT JOIN public.poets pt ON ((p.poet_id = pt.id)))
      GROUP BY r.id, r.pattern, r.slug;
    
    --
    -- Name: rhymes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    ALTER TABLE public.rhymes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.rhymes_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: tagging_jobs; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.tagging_jobs (
        id integer NOT NULL,
        status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
        total integer DEFAULT 0,
        processed integer DEFAULT 0,
        failed_count integer DEFAULT 0,
        started_at timestamp with time zone,
        finished_at timestamp with time zone,
        error_msg text,
        created_at timestamp with time zone DEFAULT now(),
        CONSTRAINT tagging_jobs_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'done'::character varying, 'failed'::character varying])::text[])))
    );
    
    --
    -- Name: tagging_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    CREATE SEQUENCE IF NOT EXISTS public.tagging_jobs_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    
    --
    -- Name: tagging_jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
    --
    
    ALTER SEQUENCE public.tagging_jobs_id_seq OWNED BY public.tagging_jobs.id;
    
    --
    -- Name: tags_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    CREATE SEQUENCE IF NOT EXISTS public.tags_id_seq
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;
    
    --
    -- Name: tags_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
    --
    
    ALTER SEQUENCE public.tags_id_seq OWNED BY public.tags.id;
    
    --
    -- Name: theme_poems; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.theme_poems WITH (security_invoker='on') AS
     SELECT p.id AS poem_id,
        p.title AS poem_title,
        p.slug AS poem_slug,
        t.id AS theme_id,
        t.name AS theme_name,
        t.slug AS theme_slug,
        pt.name AS poet_name,
        m.name AS meter_name,
        count(*) OVER (PARTITION BY t.id) AS total_poems_by_theme
       FROM (((public.poems p
         JOIN public.themes t ON ((p.theme_id = t.id)))
         JOIN public.poets pt ON ((p.poet_id = pt.id)))
         JOIN public.meters m ON ((p.meter_id = m.id)))
      ORDER BY p.id;
    
    --
    -- Name: theme_stats; Type: VIEW; Schema: public; Owner: -
    --
    
    CREATE OR REPLACE VIEW public.theme_stats WITH (security_invoker='on') AS
     SELECT t.id,
        t.name,
        t.slug,
        count(DISTINCT p.id) AS poems_count,
        count(DISTINCT pt.id) AS poets_count
       FROM ((public.themes t
         LEFT JOIN public.poems p ON ((t.id = p.theme_id)))
         LEFT JOIN public.poets pt ON ((p.poet_id = pt.id)))
      GROUP BY t.id, t.name, t.slug;
    
    --
    -- Name: themes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
    --
    
    ALTER TABLE public.themes ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY (
        SEQUENCE NAME public.themes_id_seq
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1
    );
    
    --
    -- Name: users; Type: TABLE; Schema: public; Owner: -
    --
    
    CREATE TABLE IF NOT EXISTS public.users (
        id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        can_edit_poem_content boolean DEFAULT true,
        can_edit_poem_title boolean DEFAULT true,
        can_edit_poem_meter boolean DEFAULT true,
        can_edit_poem_rhyme boolean DEFAULT true,
        can_edit_poem_verses boolean DEFAULT true,
        can_edit_poem_theme boolean DEFAULT true,
        can_add_poem boolean DEFAULT true,
        can_edit_poet_name boolean DEFAULT true,
        can_edit_poet_era boolean DEFAULT true,
        can_add_poet boolean DEFAULT true
    );
    
    --
    -- Name: patterns id; Type: DEFAULT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.patterns ALTER COLUMN id SET DEFAULT nextval('public.patterns_id_seq'::regclass);
    
    --
    -- Name: tagging_jobs id; Type: DEFAULT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.tagging_jobs ALTER COLUMN id SET DEFAULT nextval('public.tagging_jobs_id_seq'::regclass);
    
    --
    -- Name: tags id; Type: DEFAULT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.tags ALTER COLUMN id SET DEFAULT nextval('public.tags_id_seq'::regclass);
    
    --
    -- Name: eras eras_name_key; Type: CONSTRAINT; Schema: public; Owner: -
    --
    
    ALTER TABLE ONLY public.eras
        ADD CONSTRAINT eras_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: eras eras_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.eras
        ADD CONSTRAINT eras_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: eras eras_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.eras
        ADD CONSTRAINT eras_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: meters meters_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.meters
        ADD CONSTRAINT meters_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: meters meters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.meters
        ADD CONSTRAINT meters_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: meters meters_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.meters
        ADD CONSTRAINT meters_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: patterns patterns_pattern_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.patterns
        ADD CONSTRAINT patterns_pattern_key UNIQUE (pattern);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: patterns patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.patterns
        ADD CONSTRAINT patterns_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poem_tags poem_tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poem_tags
        ADD CONSTRAINT poem_tags_pkey PRIMARY KEY (poem_id, tag_id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poets poets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poets
        ADD CONSTRAINT poets_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: rhymes rhymes_pattern_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.rhymes
        ADD CONSTRAINT rhymes_pattern_key UNIQUE (pattern);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: rhymes rhymes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.rhymes
        ADD CONSTRAINT rhymes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: rhymes rhymes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.rhymes
        ADD CONSTRAINT rhymes_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: tagging_jobs tagging_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.tagging_jobs
        ADD CONSTRAINT tagging_jobs_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: tags tags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.tags
        ADD CONSTRAINT tags_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: tags tags_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.tags
        ADD CONSTRAINT tags_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: themes themes_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.themes
        ADD CONSTRAINT themes_name_key UNIQUE (name);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: themes themes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.themes
        ADD CONSTRAINT themes_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: themes themes_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.themes
        ADD CONSTRAINT themes_slug_key UNIQUE (slug);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.users
        ADD CONSTRAINT users_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: idx_meters_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_meters_name ON public.meters USING btree (name);

--
-- Name: idx_poem_tags_covering; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poem_tags_covering ON public.poem_tags USING btree (poem_id, tag_id, confidence_score DESC) INCLUDE (source);

--
-- Name: idx_poem_tags_poem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poem_tags_poem_id ON public.poem_tags USING btree (poem_id);

--
-- Name: idx_poem_tags_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poem_tags_source ON public.poem_tags USING btree (source);

--
-- Name: idx_poem_tags_tag_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_confidence ON public.poem_tags USING btree (tag_id, confidence_score DESC);

--
-- Name: idx_poem_tags_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poem_tags_tag_id ON public.poem_tags USING btree (tag_id);

--
-- Name: idx_poems_accessibility_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_accessibility_score ON public.poems USING btree (accessibility_score);

--
-- Name: idx_poems_categorized; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_categorized ON public.poems USING btree (id) WHERE (categorized_at IS NOT NULL);

--
-- Name: idx_poems_century; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_century ON public.poems USING btree (century);

--
-- Name: idx_poems_has_translation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_has_translation ON public.poems USING btree (id) WHERE (cached_translation IS NOT NULL);

--
-- Name: idx_poems_meter_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_meter_id ON public.poems USING btree (meter_id);

--
-- Name: idx_poems_mood_primary; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_mood_primary ON public.poems USING btree (mood_primary);

--
-- Name: idx_poems_pattern_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_pattern_id ON public.poems USING btree (pattern_id);

--
-- Name: idx_poems_poet_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_poet_id ON public.poems USING btree (poet_id);

--
-- Name: idx_poems_poet_id_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_poet_id_slug ON public.poems USING btree (poet_id, slug);

--
-- Name: idx_poems_poet_id_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_poet_id_title ON public.poems USING btree (poet_id, title);

--
-- Name: idx_poems_poet_meter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_poet_meter ON public.poems USING btree (poet_id, meter_id);

--
-- Name: idx_poems_primary_tag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_primary_tag_id ON public.poems USING btree (primary_tag_id) WHERE (primary_tag_id IS NOT NULL);

--
-- Name: idx_poems_quality_poet; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_quality_poet ON public.poems USING btree (quality_score DESC NULLS LAST, poet_id);

--
-- Name: idx_poems_quality_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_quality_score ON public.poems USING btree (quality_score DESC NULLS LAST);

--
-- Name: idx_poems_rhyme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_rhyme_id ON public.poems USING btree (rhyme_id);

--
-- Name: idx_poems_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_poems_slug ON public.poems USING btree (slug);

--
-- Name: idx_poems_source_dataset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_source_dataset ON public.poems USING btree (source_dataset);

--
-- Name: idx_poems_theme_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_theme_id ON public.poems USING btree (theme_id);

--
-- Name: idx_poems_theme_id_title; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_theme_id_title ON public.poems USING btree (theme_id, title);

--
-- Name: idx_poems_theme_meter; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poems_theme_meter ON public.poems USING btree (theme_id, meter_id);

--
-- Name: idx_poets_era_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poets_era_id ON public.poets USING btree (era_id);

--
-- Name: idx_poets_name_en; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_poets_name_en ON public.poets USING btree (name_en) WHERE (name_en IS NOT NULL);

--
-- Name: idx_poets_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS idx_poets_slug ON public.poets USING btree (slug);

--
-- Name: idx_tagging_jobs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tagging_jobs_status ON public.tagging_jobs USING btree (status);

--
-- Name: idx_tags_display_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_display_order ON public.tags USING btree (tag_type, display_order);

--
-- Name: idx_tags_name_ar_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_name_ar_gin ON public.tags USING gin (to_tsvector('simple'::regconfig, (name_ar)::text));

--
-- Name: idx_tags_name_en_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_name_en_gin ON public.tags USING gin (to_tsvector('simple'::regconfig, (name_en)::text));

--
-- Name: idx_tags_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_parent ON public.tags USING btree (parent_tag_id) WHERE (parent_tag_id IS NOT NULL);

--
-- Name: idx_tags_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_slug ON public.tags USING btree (slug);

--
-- Name: idx_tags_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_tags_type ON public.tags USING btree (tag_type);

--
-- Name: idx_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_users_id ON public.users USING btree (id);

--
-- Name: poem_full_data_unique_slug_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS poem_full_data_unique_slug_idx ON public.poem_full_data USING btree (slug);

--
-- Name: poems_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS poems_search_idx ON public.poems USING gin (search_vector);

--
-- Name: poets_search_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS poets_search_idx ON public.poets USING gin (search_vector);

--
-- Name: poem_tags sync_poem_primary_tag; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER sync_poem_primary_tag AFTER INSERT OR DELETE OR UPDATE ON public.poem_tags FOR EACH ROW EXECUTE FUNCTION public.update_poem_primary_tag();

--
-- Name: tags tags_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE OR REPLACE TRIGGER tags_updated_at BEFORE UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: poem_tags poem_tags_poem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poem_tags
        ADD CONSTRAINT poem_tags_poem_id_fkey FOREIGN KEY (poem_id) REFERENCES public.poems(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poem_tags poem_tags_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poem_tags
        ADD CONSTRAINT poem_tags_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES public.tags(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_meter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_meter_id_fkey FOREIGN KEY (meter_id) REFERENCES public.meters(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_pattern_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_pattern_id_fkey FOREIGN KEY (pattern_id) REFERENCES public.patterns(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_poet_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_poet_id_fkey FOREIGN KEY (poet_id) REFERENCES public.poets(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_primary_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_primary_tag_id_fkey FOREIGN KEY (primary_tag_id) REFERENCES public.tags(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_rhyme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_rhyme_id_fkey FOREIGN KEY (rhyme_id) REFERENCES public.rhymes(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poems poems_theme_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poems
        ADD CONSTRAINT poems_theme_id_fkey FOREIGN KEY (theme_id) REFERENCES public.themes(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: poets poets_era_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.poets
        ADD CONSTRAINT poets_era_id_fkey FOREIGN KEY (era_id) REFERENCES public.eras(id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: tags tags_parent_tag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

DO $guard$ BEGIN
    ALTER TABLE ONLY public.tags
        ADD CONSTRAINT tags_parent_tag_id_fkey FOREIGN KEY (parent_tag_id) REFERENCES public.tags(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;
--
-- Name: tagging_jobs Authenticated read tagging_jobs; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Authenticated read tagging_jobs" ON public.tagging_jobs;
CREATE POLICY "Authenticated read tagging_jobs" ON public.tagging_jobs FOR SELECT USING ((auth.role() = 'authenticated'::text));

--
-- Name: poem_tags Public read poem_tags; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public read poem_tags" ON public.poem_tags;
CREATE POLICY "Public read poem_tags" ON public.poem_tags FOR SELECT USING (true);

--
-- Name: tags Public read tags; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Public read tags" ON public.tags;
CREATE POLICY "Public read tags" ON public.tags FOR SELECT USING (true);

--
-- Name: eras; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.eras ENABLE ROW LEVEL SECURITY;

--
-- Name: meters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.meters ENABLE ROW LEVEL SECURITY;

--
-- Name: patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: poem_tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poem_tags ENABLE ROW LEVEL SECURITY;

--
-- Name: poems; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poems ENABLE ROW LEVEL SECURITY;

--
-- Name: poets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.poets ENABLE ROW LEVEL SECURITY;

--
-- Name: rhymes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rhymes ENABLE ROW LEVEL SECURITY;

--
-- Name: tagging_jobs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tagging_jobs ENABLE ROW LEVEL SECURITY;

--
-- Name: tags; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

--
-- Name: themes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

--
--

RESET check_function_bodies;
