


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;




ALTER SCHEMA "public" OWNER TO "postgres";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."tag_type" AS ENUM (
    'theme',
    'form',
    'period',
    'emotion',
    'style',
    'region',
    'other'
);


ALTER TYPE "public"."tag_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_poem_tag"("p_poem_id" integer, "p_tag_id" integer, "p_confidence" real DEFAULT 1.0, "p_source" "text" DEFAULT 'manual'::"text") RETURNS "void"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."assign_poem_tag"("p_poem_id" integer, "p_tag_id" integer, "p_confidence" real, "p_source" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_tag"("p_slug" character varying, "p_name_ar" character varying, "p_name_en" character varying, "p_type" "public"."tag_type" DEFAULT 'theme'::"public"."tag_type", "p_color" character varying DEFAULT '#c5a059'::character varying) RETURNS integer
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."get_or_create_tag"("p_slug" character varying, "p_name_ar" character varying, "p_name_en" character varying, "p_type" "public"."tag_type", "p_color" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_poem_details"("poem_id_param" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_poem_details"("poem_id_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_poem_slug"("poem_id_param" integer) RETURNS json
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_poem_slug"("poem_id_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_poem_with_related"("p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_poem_with_related"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_eligible_poem"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_random_eligible_poem"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_eligible_poem_slug"() RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_random_eligible_poem_slug"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_eligible_poet"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_random_eligible_poet"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_random_poem_by_poet"("poet_id_param" integer) RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_random_poem_by_poet"("poet_id_param" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_related_poems"("p_slug" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."get_related_poems"("p_slug" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_arabic_text"("input_text" "text", "keep_asterisk" boolean) RETURNS "text"
    LANGUAGE "plpgsql" IMMUTABLE SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."normalize_arabic_text"("input_text" "text", "keep_asterisk" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_slug"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
  SELECT lower(regexp_replace(trim(input), '[^a-z0-9\-]', '', 'g'));
$$;


ALTER FUNCTION "public"."normalize_slug"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."normalize_tag_name"("input" "text") RETURNS "text"
    LANGUAGE "sql" IMMUTABLE STRICT
    AS $$
  SELECT lower(trim(regexp_replace(input, '\s+', ' ', 'g')));
$$;


ALTER FUNCTION "public"."normalize_tag_name"("input" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."poems_by_tag"("p_slug" character varying, "p_limit" integer DEFAULT 20, "p_offset" integer DEFAULT 0) RETURNS TABLE("poem_id" integer, "confidence_score" real, "source" character varying)
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."poems_by_tag"("p_slug" character varying, "p_limit" integer, "p_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_poems"("query_text" "text", "page_number" integer, "match_type" "text", "meter_ids" integer[] DEFAULT NULL::integer[], "era_ids" integer[] DEFAULT NULL::integer[], "theme_ids" integer[] DEFAULT NULL::integer[], "rhyme_ids" integer[] DEFAULT NULL::integer[]) RETURNS TABLE("poet_name" "text", "poet_era" "text", "poet_slug" "text", "poem_title" "text", "poem_snippet" "text", "poem_meter" "text", "poem_slug" "uuid", "relevance" real, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."search_poems"("query_text" "text", "page_number" integer, "match_type" "text", "meter_ids" integer[], "era_ids" integer[], "theme_ids" integer[], "rhyme_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_poets"("query_text" "text", "page_number" integer, "match_type" "text", "era_ids" integer[] DEFAULT NULL::integer[]) RETURNS TABLE("poet_name" "text", "poet_era" "text", "poet_slug" "text", "poet_bio" "text", "relevance" double precision, "total_count" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."search_poets"("query_text" "text", "page_number" integer, "match_type" "text", "era_ids" integer[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_poem_text_hash"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.poem_text IS NOT NULL THEN
    NEW.poem_text_hash := md5(NEW.poem_text);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_poem_text_hash"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."tag_usage_counts"() RETURNS TABLE("tag_id" integer, "slug" character varying, "name_ar" character varying, "name_en" character varying, "tag_type" "public"."tag_type", "poem_count" bigint)
    LANGUAGE "sql" STABLE
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


ALTER FUNCTION "public"."tag_usage_counts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_poem_primary_tag"() RETURNS "trigger"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."update_poem_primary_tag"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."bug_reports" (
    "id" integer NOT NULL,
    "description" "text",
    "logs" "jsonb" DEFAULT '[]'::"jsonb",
    "timestamp" timestamp with time zone NOT NULL,
    "user_agent" "text",
    "poem_id" integer,
    "poem_poet" "text",
    "poem_title" "text",
    "app_mode" "text",
    "app_theme" "text",
    "app_font" "text",
    "github_issue_number" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "url" "text",
    "screen_size" "text",
    "language" "text",
    "online" boolean,
    "referrer" "text",
    "feature_flags" "jsonb"
);


ALTER TABLE "public"."bug_reports" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."bug_reports_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."bug_reports_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."bug_reports_id_seq" OWNED BY "public"."bug_reports"."id";



CREATE TABLE IF NOT EXISTS "public"."design_feedback_actions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "verdict_id" integer,
    "session_id" integer NOT NULL,
    "item_key" "text",
    "action_type" "text" NOT NULL,
    "action_description" "text",
    "file_path" "text",
    "commit_sha" "text",
    "applied" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "design_feedback_actions_action_type_check" CHECK (("action_type" = ANY (ARRAY['css_change'::"text", 'layout_change'::"text", 'animation_change'::"text", 'component_change'::"text", 'typography_change'::"text", 'color_change'::"text", 'responsive_fix'::"text", 'accessibility_fix'::"text", 'new_variant'::"text", 'removal'::"text", 'no_action'::"text", 'deferred'::"text"])))
);


ALTER TABLE "public"."design_feedback_actions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."design_items" (
    "id" integer NOT NULL,
    "item_key" "text" NOT NULL,
    "name" "text" NOT NULL,
    "component" "text" NOT NULL,
    "category" "text" NOT NULL,
    "file_path" "text",
    "description" "text",
    "generation" integer DEFAULT 1,
    "iteration" "text",
    "source_branch" "text",
    "source_pr" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_items" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."design_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."design_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."design_items_id_seq" OWNED BY "public"."design_items"."id";



CREATE TABLE IF NOT EXISTS "public"."design_review_history" (
    "id" integer NOT NULL,
    "item_key" "text" NOT NULL,
    "session_id" integer NOT NULL,
    "action" "text" NOT NULL,
    "old_value" "jsonb",
    "new_value" "jsonb",
    "commit_sha" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."design_review_history" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."design_review_history_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."design_review_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."design_review_history_id_seq" OWNED BY "public"."design_review_history"."id";



CREATE TABLE IF NOT EXISTS "public"."design_review_sessions" (
    "id" integer NOT NULL,
    "reviewer" "text" DEFAULT 'owner'::"text",
    "branch" "text",
    "commit_sha" "text",
    "round_number" integer NOT NULL,
    "total_designs" integer DEFAULT 0,
    "reviewed_count" integer DEFAULT 0,
    "status" "text" DEFAULT 'in_progress'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "completed_at" timestamp with time zone,
    CONSTRAINT "design_review_sessions_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'completed'::"text", 'abandoned'::"text"])))
);


ALTER TABLE "public"."design_review_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."design_review_sessions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."design_review_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."design_review_sessions_id_seq" OWNED BY "public"."design_review_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."design_verdicts" (
    "id" integer NOT NULL,
    "session_id" integer NOT NULL,
    "item_id" integer NOT NULL,
    "item_key" "text" NOT NULL,
    "verdict" "text" NOT NULL,
    "comment" "text",
    "priority" integer DEFAULT 0,
    "tags" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "design_name" "text",
    "component" "text",
    "category" "text",
    "generation" integer,
    "position_in_filter" integer,
    "total_in_filter" integer,
    "position_in_session" integer,
    "total_in_session" integer,
    "component_tags" "text"[],
    CONSTRAINT "design_verdicts_verdict_check" CHECK (("verdict" = ANY (ARRAY['keep'::"text", 'discard'::"text", 'skip'::"text", 'revisit'::"text"])))
);


ALTER TABLE "public"."design_verdicts" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."design_verdicts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."design_verdicts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."design_verdicts_id_seq" OWNED BY "public"."design_verdicts"."id";



CREATE TABLE IF NOT EXISTS "public"."discussion_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "discussion_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discussion_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."discussions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "poem_id" integer,
    "poem_text" "text",
    "comment" "text" NOT NULL,
    "parent_id" "uuid",
    "likes_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."discussions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."eras" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL
);


ALTER TABLE "public"."eras" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."meters" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL
);


ALTER TABLE "public"."meters" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poems" (
    "id" integer NOT NULL,
    "title" "text" NOT NULL,
    "meter_id" integer NOT NULL,
    "theme_id" integer NOT NULL,
    "poet_id" integer NOT NULL,
    "slug" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "rhyme_id" integer,
    "search_vector" "tsvector" GENERATED ALWAYS AS (("setweight"("to_tsvector"('"simple"'::"regconfig", "replace"("public"."normalize_arabic_text"("title", true), '*'::"text", ' '::"text")), 'A'::"char") || "setweight"("to_tsvector"('"simple"'::"regconfig", "replace"("public"."normalize_arabic_text"("content", true), '*'::"text", ' '::"text")), 'B'::"char"))) STORED,
    "pattern_id" integer,
    "diacritized_content" "text",
    "quality_score" smallint,
    "quality_subscores" "jsonb",
    "source_dataset" character varying(20) DEFAULT 'original'::character varying,
    "poem_form" smallint,
    "scoring_model" character varying(30),
    "scored_at" timestamp with time zone,
    "raw_content" "text",
    "cached_translation" "text",
    "cached_explanation" "text",
    "cached_author_bio" "text",
    "translated_at" timestamp with time zone,
    "title_en" "text",
    "primary_tag_id" integer
);


ALTER TABLE "public"."poems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poets" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "era_id" integer NOT NULL,
    "bio" "text",
    "search_vector" "tsvector" GENERATED ALWAYS AS ("setweight"("to_tsvector"('"simple"'::"regconfig", "public"."normalize_arabic_text"("name", false)), 'A'::"char")) STORED,
    "name_en" "text"
);


ALTER TABLE "public"."poets" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."era_poems" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "poem_id",
    "p"."title" AS "poem_title",
    "p"."slug" AS "poem_slug",
    "pt"."name" AS "poet_name",
    "m"."name" AS "meter_name",
    "e"."id" AS "era_id",
    "e"."name" AS "era_name",
    "e"."slug" AS "era_slug",
    "count"(*) OVER (PARTITION BY "e"."id") AS "total_poems_in_era"
   FROM ((("public"."poems" "p"
     JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
     JOIN "public"."eras" "e" ON (("pt"."era_id" = "e"."id")))
  ORDER BY "p"."id";


ALTER VIEW "public"."era_poems" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."era_stats" WITH ("security_invoker"='on') AS
 SELECT "e"."id",
    "e"."name",
    "e"."slug",
    COALESCE("poet_counts"."count", (0)::bigint) AS "poets_count",
    COALESCE("poem_counts"."count", (0)::bigint) AS "poems_count"
   FROM (("public"."eras" "e"
     LEFT JOIN ( SELECT "poets"."era_id",
            "count"(*) AS "count"
           FROM "public"."poets"
          GROUP BY "poets"."era_id") "poet_counts" ON (("e"."id" = "poet_counts"."era_id")))
     LEFT JOIN ( SELECT "p"."era_id",
            "count"(*) AS "count"
           FROM ("public"."poems" "pm"
             JOIN "public"."poets" "p" ON (("pm"."poet_id" = "p"."id")))
          GROUP BY "p"."era_id") "poem_counts" ON (("e"."id" = "poem_counts"."era_id")));


ALTER VIEW "public"."era_stats" OWNER TO "postgres";


ALTER TABLE "public"."eras" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."eras_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."meter_poems" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "poem_id",
    "p"."title" AS "poem_title",
    "p"."slug" AS "poem_slug",
    "pt"."name" AS "poet_name",
    "m"."id" AS "meter_id",
    "m"."name" AS "meter_name",
    "m"."slug" AS "meter_slug",
    "count"(*) OVER (PARTITION BY "m"."id") AS "total_poems_in_meter"
   FROM (("public"."poems" "p"
     JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
  ORDER BY "p"."id";


ALTER VIEW "public"."meter_poems" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."meter_stats" WITH ("security_invoker"='on') AS
 SELECT "m"."id",
    "m"."name",
    "m"."slug",
    "count"(DISTINCT "p"."id") AS "poems_count",
    "count"(DISTINCT "p"."poet_id") AS "poets_count"
   FROM ("public"."meters" "m"
     LEFT JOIN "public"."poems" "p" ON (("m"."id" = "p"."meter_id")))
  GROUP BY "m"."id", "m"."name", "m"."slug";


ALTER VIEW "public"."meter_stats" OWNER TO "postgres";


ALTER TABLE "public"."meters" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."meters_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."patterns" (
    "id" integer NOT NULL,
    "pattern" "text" NOT NULL
);


ALTER TABLE "public"."patterns" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."patterns_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."patterns_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."patterns_id_seq" OWNED BY "public"."patterns"."id";



CREATE TABLE IF NOT EXISTS "public"."poem_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "poem_id" integer NOT NULL,
    "event_type" character varying(20) NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "poem_events_event_type_check" CHECK ((("event_type")::"text" = ANY ((ARRAY['downvote'::character varying, 'save'::character varying, 'serve'::character varying, 'share'::character varying, 'copy'::character varying, 'view'::character varying])::"text"[])))
);


ALTER TABLE "public"."poem_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."themes" (
    "id" integer NOT NULL,
    "name" "text" NOT NULL,
    "slug" "uuid" NOT NULL
);


ALTER TABLE "public"."themes" OWNER TO "postgres";


CREATE MATERIALIZED VIEW "public"."poem_full_data" AS
 SELECT "p"."slug",
    "p"."title",
    "p"."content",
    "po"."name" AS "poet_name",
    "po"."slug" AS "poet_slug",
    "m"."name" AS "meter_name",
    "t"."name" AS "theme_name",
    "e"."name" AS "era_name",
    "e"."slug" AS "era_slug"
   FROM (((("public"."poems" "p"
     JOIN "public"."poets" "po" ON (("p"."poet_id" = "po"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
     JOIN "public"."themes" "t" ON (("p"."theme_id" = "t"."id")))
     JOIN "public"."eras" "e" ON (("po"."era_id" = "e"."id")))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."poem_full_data" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."poem_tags" (
    "poem_id" integer NOT NULL,
    "tag_id" integer NOT NULL,
    "confidence_score" real DEFAULT 1.0 NOT NULL,
    "source" character varying(10) DEFAULT 'manual'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "poem_tags_confidence_score_check" CHECK ((("confidence_score" >= (0.0)::double precision) AND ("confidence_score" <= (1.0)::double precision))),
    CONSTRAINT "poem_tags_source_check" CHECK ((("source")::"text" = ANY ((ARRAY['auto'::character varying, 'manual'::character varying])::"text"[])))
);


ALTER TABLE "public"."poem_tags" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tags" (
    "id" integer NOT NULL,
    "slug" character varying(100) NOT NULL,
    "name_ar" character varying(200) NOT NULL,
    "name_en" character varying(200) NOT NULL,
    "description_ar" "text",
    "description_en" "text",
    "tag_type" "public"."tag_type" DEFAULT 'theme'::"public"."tag_type" NOT NULL,
    "color" character varying(7),
    "icon" character varying(50),
    "parent_tag_id" integer,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."tags" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."poem_tag_summary" AS
 SELECT "pt"."poem_id",
    "pt"."confidence_score",
    "pt"."source",
    "t"."id" AS "tag_id",
    "t"."slug" AS "tag_slug",
    "t"."name_ar" AS "tag_name_ar",
    "t"."name_en" AS "tag_name_en",
    "t"."tag_type",
    "t"."color"
   FROM ("public"."poem_tags" "pt"
     JOIN "public"."tags" "t" ON (("t"."id" = "pt"."tag_id")))
  ORDER BY "pt"."poem_id", "pt"."confidence_score" DESC;


ALTER VIEW "public"."poem_tag_summary" OWNER TO "postgres";


ALTER TABLE "public"."poems" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."poems_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."poet_poems" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "poem_id",
    "p"."title" AS "poem_title",
    "p"."slug" AS "poem_slug",
    "pt"."id" AS "poet_id",
    "pt"."name" AS "poet_name",
    "pt"."slug" AS "poet_slug",
    "m"."name" AS "meter_name",
    "count"(*) OVER (PARTITION BY "pt"."id") AS "total_poems_by_poet"
   FROM (("public"."poems" "p"
     JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
  ORDER BY "p"."id";


ALTER VIEW "public"."poet_poems" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."poet_stats" WITH ("security_invoker"='on') AS
 SELECT "p"."id",
    "p"."name",
    "p"."slug",
    "p"."era_id",
    "count"("pm"."id") AS "poems_count"
   FROM ("public"."poets" "p"
     LEFT JOIN "public"."poems" "pm" ON (("p"."id" = "pm"."poet_id")))
  GROUP BY "p"."id", "p"."name", "p"."slug", "p"."era_id"
  ORDER BY "p"."name";


ALTER VIEW "public"."poet_stats" OWNER TO "postgres";


ALTER TABLE "public"."poets" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."poets_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."rhymes" (
    "id" integer NOT NULL,
    "pattern" "text" NOT NULL,
    "slug" "uuid" NOT NULL
);


ALTER TABLE "public"."rhymes" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rhyme_poems" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "poem_id",
    "p"."title" AS "poem_title",
    "p"."slug" AS "poem_slug",
    "r"."id" AS "rhyme_id",
    "r"."pattern" AS "rhyme_pattern",
    "r"."slug" AS "rhyme_slug",
    "m"."name" AS "meter_name",
    "count"(*) OVER (PARTITION BY "r"."id") AS "total_poems_by_rhyme"
   FROM (("public"."poems" "p"
     JOIN "public"."rhymes" "r" ON (("p"."rhyme_id" = "r"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
  ORDER BY "p"."id";


ALTER VIEW "public"."rhyme_poems" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."rhyme_stats" WITH ("security_invoker"='on') AS
 SELECT "r"."id",
    "r"."pattern",
    "r"."slug",
    "count"(DISTINCT "p"."id") AS "poems_count",
    "count"(DISTINCT "pt"."id") AS "poets_count"
   FROM (("public"."rhymes" "r"
     LEFT JOIN "public"."poems" "p" ON (("r"."id" = "p"."rhyme_id")))
     LEFT JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
  GROUP BY "r"."id", "r"."pattern", "r"."slug";


ALTER VIEW "public"."rhyme_stats" OWNER TO "postgres";


ALTER TABLE "public"."rhymes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."rhymes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."saved_poems" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "poem_id" integer,
    "poem_text" "text",
    "poet" character varying(255),
    "title" character varying(255),
    "english" "text",
    "category" character varying(100),
    "saved_at" timestamp with time zone DEFAULT "now"(),
    "poem_text_hash" "text"
);


ALTER TABLE "public"."saved_poems" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tagging_jobs" (
    "id" integer NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "total" integer DEFAULT 0,
    "processed" integer DEFAULT 0,
    "failed_count" integer DEFAULT 0,
    "started_at" timestamp with time zone,
    "finished_at" timestamp with time zone,
    "error_msg" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "tagging_jobs_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'running'::character varying, 'done'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."tagging_jobs" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."tagging_jobs_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tagging_jobs_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tagging_jobs_id_seq" OWNED BY "public"."tagging_jobs"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."tags_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tags_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tags_id_seq" OWNED BY "public"."tags"."id";



CREATE OR REPLACE VIEW "public"."theme_poems" WITH ("security_invoker"='on') AS
 SELECT "p"."id" AS "poem_id",
    "p"."title" AS "poem_title",
    "p"."slug" AS "poem_slug",
    "t"."id" AS "theme_id",
    "t"."name" AS "theme_name",
    "t"."slug" AS "theme_slug",
    "pt"."name" AS "poet_name",
    "m"."name" AS "meter_name",
    "count"(*) OVER (PARTITION BY "t"."id") AS "total_poems_by_theme"
   FROM ((("public"."poems" "p"
     JOIN "public"."themes" "t" ON (("p"."theme_id" = "t"."id")))
     JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
     JOIN "public"."meters" "m" ON (("p"."meter_id" = "m"."id")))
  ORDER BY "p"."id";


ALTER VIEW "public"."theme_poems" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."theme_stats" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."name",
    "t"."slug",
    "count"(DISTINCT "p"."id") AS "poems_count",
    "count"(DISTINCT "pt"."id") AS "poets_count"
   FROM (("public"."themes" "t"
     LEFT JOIN "public"."poems" "p" ON (("t"."id" = "p"."theme_id")))
     LEFT JOIN "public"."poets" "pt" ON (("p"."poet_id" = "pt"."id")))
  GROUP BY "t"."id", "t"."name", "t"."slug";


ALTER VIEW "public"."theme_stats" OWNER TO "postgres";


ALTER TABLE "public"."themes" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."themes_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."user_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "theme" character varying(10) DEFAULT 'dark'::character varying,
    "font_id" character varying(50) DEFAULT 'Amiri'::character varying,
    "voice_preference" character varying(50),
    "transliteration_enabled" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_settings_theme_check" CHECK ((("theme")::"text" = ANY ((ARRAY['dark'::character varying, 'light'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "can_edit_poem_content" boolean DEFAULT true,
    "can_edit_poem_title" boolean DEFAULT true,
    "can_edit_poem_meter" boolean DEFAULT true,
    "can_edit_poem_rhyme" boolean DEFAULT true,
    "can_edit_poem_verses" boolean DEFAULT true,
    "can_edit_poem_theme" boolean DEFAULT true,
    "can_add_poem" boolean DEFAULT true,
    "can_edit_poet_name" boolean DEFAULT true,
    "can_edit_poet_era" boolean DEFAULT true,
    "can_add_poet" boolean DEFAULT true
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."bug_reports" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."bug_reports_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."design_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."design_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."design_review_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."design_review_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."design_review_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."design_review_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."design_verdicts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."design_verdicts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."patterns" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."patterns_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tagging_jobs" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tagging_jobs_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tags" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tags_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."bug_reports"
    ADD CONSTRAINT "bug_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_feedback_actions"
    ADD CONSTRAINT "design_feedback_actions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_items"
    ADD CONSTRAINT "design_items_item_key_key" UNIQUE ("item_key");



ALTER TABLE ONLY "public"."design_items"
    ADD CONSTRAINT "design_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_review_history"
    ADD CONSTRAINT "design_review_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_review_sessions"
    ADD CONSTRAINT "design_review_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_verdicts"
    ADD CONSTRAINT "design_verdicts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."design_verdicts"
    ADD CONSTRAINT "design_verdicts_session_id_item_id_key" UNIQUE ("session_id", "item_id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_user_id_discussion_id_key" UNIQUE ("user_id", "discussion_id");



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eras"
    ADD CONSTRAINT "eras_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."eras"
    ADD CONSTRAINT "eras_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."eras"
    ADD CONSTRAINT "eras_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."meters"
    ADD CONSTRAINT "meters_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."patterns"
    ADD CONSTRAINT "patterns_pattern_key" UNIQUE ("pattern");



ALTER TABLE ONLY "public"."patterns"
    ADD CONSTRAINT "patterns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poem_events"
    ADD CONSTRAINT "poem_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poem_tags"
    ADD CONSTRAINT "poem_tags_pkey" PRIMARY KEY ("poem_id", "tag_id");



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."poets"
    ADD CONSTRAINT "poets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rhymes"
    ADD CONSTRAINT "rhymes_pattern_key" UNIQUE ("pattern");



ALTER TABLE ONLY "public"."rhymes"
    ADD CONSTRAINT "rhymes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rhymes"
    ADD CONSTRAINT "rhymes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."saved_poems"
    ADD CONSTRAINT "saved_poems_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tagging_jobs"
    ADD CONSTRAINT "tagging_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."themes"
    ADD CONSTRAINT "themes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_bug_reports_created_at" ON "public"."bug_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_design_history_item_key" ON "public"."design_review_history" USING "btree" ("item_key");



CREATE INDEX "idx_design_history_session" ON "public"."design_review_history" USING "btree" ("session_id");



CREATE INDEX "idx_design_items_active" ON "public"."design_items" USING "btree" ("is_active");



CREATE INDEX "idx_design_items_category" ON "public"."design_items" USING "btree" ("category");



CREATE INDEX "idx_design_items_component" ON "public"."design_items" USING "btree" ("component");



CREATE INDEX "idx_design_verdicts_category" ON "public"."design_verdicts" USING "btree" ("category");



CREATE INDEX "idx_design_verdicts_component" ON "public"."design_verdicts" USING "btree" ("component");



CREATE INDEX "idx_design_verdicts_component_tags" ON "public"."design_verdicts" USING "gin" ("component_tags");



CREATE INDEX "idx_design_verdicts_item" ON "public"."design_verdicts" USING "btree" ("item_id");



CREATE INDEX "idx_design_verdicts_item_key" ON "public"."design_verdicts" USING "btree" ("item_key");



CREATE INDEX "idx_design_verdicts_session" ON "public"."design_verdicts" USING "btree" ("session_id");



CREATE INDEX "idx_discussion_likes_discussion_id" ON "public"."discussion_likes" USING "btree" ("discussion_id");



CREATE INDEX "idx_discussions_created_at" ON "public"."discussions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_discussions_poem_id" ON "public"."discussions" USING "btree" ("poem_id");



CREATE INDEX "idx_discussions_user_id" ON "public"."discussions" USING "btree" ("user_id");



CREATE INDEX "idx_feedback_actions_item_key" ON "public"."design_feedback_actions" USING "btree" ("item_key");



CREATE INDEX "idx_feedback_actions_session" ON "public"."design_feedback_actions" USING "btree" ("session_id");



CREATE INDEX "idx_feedback_actions_verdict" ON "public"."design_feedback_actions" USING "btree" ("verdict_id");



CREATE INDEX "idx_meters_name" ON "public"."meters" USING "btree" ("name");



CREATE INDEX "idx_poem_events_poem_id" ON "public"."poem_events" USING "btree" ("poem_id");



CREATE INDEX "idx_poem_events_poem_type" ON "public"."poem_events" USING "btree" ("poem_id", "event_type");



CREATE INDEX "idx_poem_events_type" ON "public"."poem_events" USING "btree" ("event_type");



CREATE UNIQUE INDEX "idx_poem_events_unique_toggle" ON "public"."poem_events" USING "btree" ("user_id", "poem_id", "event_type") WHERE (("event_type")::"text" = ANY ((ARRAY['downvote'::character varying, 'save'::character varying])::"text"[]));



CREATE INDEX "idx_poem_events_user_id" ON "public"."poem_events" USING "btree" ("user_id");



CREATE INDEX "idx_poem_tags_covering" ON "public"."poem_tags" USING "btree" ("poem_id", "tag_id", "confidence_score" DESC) INCLUDE ("source");



CREATE INDEX "idx_poem_tags_poem_id" ON "public"."poem_tags" USING "btree" ("poem_id");



CREATE INDEX "idx_poem_tags_source" ON "public"."poem_tags" USING "btree" ("source");



CREATE INDEX "idx_poem_tags_tag_confidence" ON "public"."poem_tags" USING "btree" ("tag_id", "confidence_score" DESC);



CREATE INDEX "idx_poem_tags_tag_id" ON "public"."poem_tags" USING "btree" ("tag_id");



CREATE INDEX "idx_poems_has_translation" ON "public"."poems" USING "btree" ("id") WHERE ("cached_translation" IS NOT NULL);



CREATE INDEX "idx_poems_meter_id" ON "public"."poems" USING "btree" ("meter_id");



CREATE INDEX "idx_poems_pattern_id" ON "public"."poems" USING "btree" ("pattern_id");



CREATE INDEX "idx_poems_poet_id" ON "public"."poems" USING "btree" ("poet_id");



CREATE INDEX "idx_poems_poet_id_slug" ON "public"."poems" USING "btree" ("poet_id", "slug");



CREATE INDEX "idx_poems_poet_id_title" ON "public"."poems" USING "btree" ("poet_id", "title");



CREATE INDEX "idx_poems_poet_meter" ON "public"."poems" USING "btree" ("poet_id", "meter_id");



CREATE INDEX "idx_poems_primary_tag_id" ON "public"."poems" USING "btree" ("primary_tag_id") WHERE ("primary_tag_id" IS NOT NULL);



CREATE INDEX "idx_poems_quality_poet" ON "public"."poems" USING "btree" ("quality_score" DESC NULLS LAST, "poet_id");



CREATE INDEX "idx_poems_quality_score" ON "public"."poems" USING "btree" ("quality_score" DESC NULLS LAST);



CREATE INDEX "idx_poems_rhyme_id" ON "public"."poems" USING "btree" ("rhyme_id");



CREATE UNIQUE INDEX "idx_poems_slug" ON "public"."poems" USING "btree" ("slug");



CREATE INDEX "idx_poems_source_dataset" ON "public"."poems" USING "btree" ("source_dataset");



CREATE INDEX "idx_poems_theme_id" ON "public"."poems" USING "btree" ("theme_id");



CREATE INDEX "idx_poems_theme_id_title" ON "public"."poems" USING "btree" ("theme_id", "title");



CREATE INDEX "idx_poems_theme_meter" ON "public"."poems" USING "btree" ("theme_id", "meter_id");



CREATE INDEX "idx_poets_era_id" ON "public"."poets" USING "btree" ("era_id");



CREATE INDEX "idx_poets_name_en" ON "public"."poets" USING "btree" ("name_en") WHERE ("name_en" IS NOT NULL);



CREATE UNIQUE INDEX "idx_poets_slug" ON "public"."poets" USING "btree" ("slug");



CREATE INDEX "idx_saved_poems_poem_id" ON "public"."saved_poems" USING "btree" ("poem_id");



CREATE INDEX "idx_saved_poems_saved_at" ON "public"."saved_poems" USING "btree" ("saved_at" DESC);



CREATE UNIQUE INDEX "idx_saved_poems_unique_ai" ON "public"."saved_poems" USING "btree" ("user_id", "poem_text_hash") WHERE (("poem_id" IS NULL) AND ("poem_text_hash" IS NOT NULL));



CREATE UNIQUE INDEX "idx_saved_poems_unique_db" ON "public"."saved_poems" USING "btree" ("user_id", "poem_id") WHERE ("poem_id" IS NOT NULL);



CREATE INDEX "idx_saved_poems_user_id" ON "public"."saved_poems" USING "btree" ("user_id");



CREATE INDEX "idx_tagging_jobs_status" ON "public"."tagging_jobs" USING "btree" ("status");



CREATE INDEX "idx_tags_display_order" ON "public"."tags" USING "btree" ("tag_type", "display_order");



CREATE INDEX "idx_tags_name_ar_gin" ON "public"."tags" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ("name_ar")::"text"));



CREATE INDEX "idx_tags_name_en_gin" ON "public"."tags" USING "gin" ("to_tsvector"('"simple"'::"regconfig", ("name_en")::"text"));



CREATE INDEX "idx_tags_parent" ON "public"."tags" USING "btree" ("parent_tag_id") WHERE ("parent_tag_id" IS NOT NULL);



CREATE INDEX "idx_tags_slug" ON "public"."tags" USING "btree" ("slug");



CREATE INDEX "idx_tags_type" ON "public"."tags" USING "btree" ("tag_type");



CREATE INDEX "idx_users_id" ON "public"."users" USING "btree" ("id");



CREATE UNIQUE INDEX "poem_full_data_unique_slug_idx" ON "public"."poem_full_data" USING "btree" ("slug");



CREATE INDEX "poems_search_idx" ON "public"."poems" USING "gin" ("search_vector");



CREATE INDEX "poets_search_idx" ON "public"."poets" USING "gin" ("search_vector");



CREATE OR REPLACE TRIGGER "sync_poem_primary_tag" AFTER INSERT OR DELETE OR UPDATE ON "public"."poem_tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_poem_primary_tag"();



CREATE OR REPLACE TRIGGER "tags_updated_at" BEFORE UPDATE ON "public"."tags" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_set_poem_text_hash" BEFORE INSERT OR UPDATE ON "public"."saved_poems" FOR EACH ROW EXECUTE FUNCTION "public"."set_poem_text_hash"();



CREATE OR REPLACE TRIGGER "update_discussions_updated_at" BEFORE UPDATE ON "public"."discussions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_settings_updated_at" BEFORE UPDATE ON "public"."user_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."design_feedback_actions"
    ADD CONSTRAINT "design_feedback_actions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."design_review_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_feedback_actions"
    ADD CONSTRAINT "design_feedback_actions_verdict_id_fkey" FOREIGN KEY ("verdict_id") REFERENCES "public"."design_verdicts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."design_review_history"
    ADD CONSTRAINT "design_review_history_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."design_review_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_verdicts"
    ADD CONSTRAINT "design_verdicts_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."design_items"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."design_verdicts"
    ADD CONSTRAINT "design_verdicts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."design_review_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_discussion_id_fkey" FOREIGN KEY ("discussion_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussion_likes"
    ADD CONSTRAINT "discussion_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."discussions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."discussions"
    ADD CONSTRAINT "discussions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poem_events"
    ADD CONSTRAINT "poem_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."poem_tags"
    ADD CONSTRAINT "poem_tags_poem_id_fkey" FOREIGN KEY ("poem_id") REFERENCES "public"."poems"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poem_tags"
    ADD CONSTRAINT "poem_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "public"."meters"("id");



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_pattern_id_fkey" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id");



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_poet_id_fkey" FOREIGN KEY ("poet_id") REFERENCES "public"."poets"("id");



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_primary_tag_id_fkey" FOREIGN KEY ("primary_tag_id") REFERENCES "public"."tags"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_rhyme_id_fkey" FOREIGN KEY ("rhyme_id") REFERENCES "public"."rhymes"("id");



ALTER TABLE ONLY "public"."poems"
    ADD CONSTRAINT "poems_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "public"."themes"("id");



ALTER TABLE ONLY "public"."poets"
    ADD CONSTRAINT "poets_era_id_fkey" FOREIGN KEY ("era_id") REFERENCES "public"."eras"("id");



ALTER TABLE ONLY "public"."saved_poems"
    ADD CONSTRAINT "saved_poems_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tags"
    ADD CONSTRAINT "tags_parent_tag_id_fkey" FOREIGN KEY ("parent_tag_id") REFERENCES "public"."tags"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_settings"
    ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can view discussion likes" ON "public"."discussion_likes" FOR SELECT USING (true);



CREATE POLICY "Anyone can view discussions" ON "public"."discussions" FOR SELECT USING (true);



CREATE POLICY "Authenticated read tagging_jobs" ON "public"."tagging_jobs" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can create discussions" ON "public"."discussions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Authenticated users can like discussions" ON "public"."discussion_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read poem_tags" ON "public"."poem_tags" FOR SELECT USING (true);



CREATE POLICY "Public read tags" ON "public"."tags" FOR SELECT USING (true);



CREATE POLICY "Users can delete own discussions" ON "public"."discussions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own events" ON "public"."poem_events" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own likes" ON "public"."discussion_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own saved poems" ON "public"."saved_poems" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own settings" ON "public"."user_settings" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own events" ON "public"."poem_events" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own settings" ON "public"."user_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can save poems" ON "public"."saved_poems" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own discussions" ON "public"."discussions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own settings" ON "public"."user_settings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own events" ON "public"."poem_events" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own saved poems" ON "public"."saved_poems" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own settings" ON "public"."user_settings" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."design_feedback_actions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_review_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_review_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."design_verdicts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussion_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."discussions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."eras" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."meters" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patterns" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poem_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poem_tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."poets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."rhymes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_poems" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tagging_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tags" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."themes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT SELECT,INSERT ON TABLE "public"."bug_reports" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."bug_reports" TO "authenticated";



GRANT SELECT,USAGE ON SEQUENCE "public"."bug_reports_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."bug_reports_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."design_feedback_actions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."design_feedback_actions" TO "authenticated";



GRANT SELECT ON TABLE "public"."design_items" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."design_items" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."design_items_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."design_items_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."design_review_history" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."design_review_history" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."design_review_history_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."design_review_history_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."design_review_sessions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."design_review_sessions" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."design_review_sessions_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."design_review_sessions_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."design_verdicts" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."design_verdicts" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."design_verdicts_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."design_verdicts_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."discussion_likes" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."discussion_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."discussion_likes" TO "service_role";



GRANT SELECT ON TABLE "public"."discussions" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."discussions" TO "authenticated";
GRANT ALL ON TABLE "public"."discussions" TO "service_role";



GRANT SELECT ON TABLE "public"."eras" TO "anon";
GRANT SELECT ON TABLE "public"."eras" TO "authenticated";
GRANT ALL ON TABLE "public"."eras" TO "service_role";



GRANT SELECT ON TABLE "public"."meters" TO "anon";
GRANT SELECT ON TABLE "public"."meters" TO "authenticated";
GRANT ALL ON TABLE "public"."meters" TO "service_role";



GRANT SELECT ON TABLE "public"."poems" TO "anon";
GRANT SELECT ON TABLE "public"."poems" TO "authenticated";
GRANT ALL ON TABLE "public"."poems" TO "service_role";



GRANT SELECT ON TABLE "public"."poets" TO "anon";
GRANT SELECT ON TABLE "public"."poets" TO "authenticated";
GRANT ALL ON TABLE "public"."poets" TO "service_role";



GRANT SELECT ON TABLE "public"."era_poems" TO "anon";
GRANT ALL ON TABLE "public"."era_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."era_stats" TO "anon";
GRANT ALL ON TABLE "public"."era_stats" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."eras_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."eras_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."meter_poems" TO "anon";
GRANT ALL ON TABLE "public"."meter_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."meter_stats" TO "anon";
GRANT ALL ON TABLE "public"."meter_stats" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."meters_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."meters_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."patterns" TO "anon";
GRANT SELECT ON TABLE "public"."patterns" TO "authenticated";
GRANT ALL ON TABLE "public"."patterns" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."patterns_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."patterns_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."poem_events" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."poem_events" TO "authenticated";



GRANT SELECT ON TABLE "public"."themes" TO "anon";
GRANT SELECT ON TABLE "public"."themes" TO "authenticated";
GRANT ALL ON TABLE "public"."themes" TO "service_role";



GRANT ALL ON TABLE "public"."poem_full_data" TO "service_role";



GRANT SELECT ON TABLE "public"."poem_tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."poem_tags" TO "authenticated";



GRANT SELECT ON TABLE "public"."tags" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tags" TO "authenticated";



GRANT SELECT ON TABLE "public"."poem_tag_summary" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."poem_tag_summary" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."poems_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."poems_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."poet_poems" TO "anon";
GRANT ALL ON TABLE "public"."poet_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."poet_stats" TO "anon";
GRANT ALL ON TABLE "public"."poet_stats" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."poets_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."poets_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."rhymes" TO "anon";
GRANT SELECT ON TABLE "public"."rhymes" TO "authenticated";
GRANT ALL ON TABLE "public"."rhymes" TO "service_role";



GRANT SELECT ON TABLE "public"."rhyme_poems" TO "anon";
GRANT ALL ON TABLE "public"."rhyme_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."rhyme_stats" TO "anon";
GRANT ALL ON TABLE "public"."rhyme_stats" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."rhymes_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."rhymes_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."saved_poems" TO "anon";
GRANT SELECT,INSERT,DELETE ON TABLE "public"."saved_poems" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."tagging_jobs" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."tagging_jobs" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."tagging_jobs_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."tagging_jobs_id_seq" TO "authenticated";



GRANT USAGE ON SEQUENCE "public"."tags_id_seq" TO "anon";
GRANT SELECT,USAGE ON SEQUENCE "public"."tags_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."theme_poems" TO "anon";
GRANT ALL ON TABLE "public"."theme_poems" TO "service_role";



GRANT SELECT ON TABLE "public"."theme_stats" TO "anon";
GRANT ALL ON TABLE "public"."theme_stats" TO "service_role";



GRANT USAGE ON SEQUENCE "public"."themes_id_seq" TO "anon";
GRANT USAGE ON SEQUENCE "public"."themes_id_seq" TO "authenticated";



GRANT SELECT ON TABLE "public"."user_settings" TO "anon";
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."user_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."user_settings" TO "service_role";



GRANT SELECT ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT,INSERT,DELETE,UPDATE ON TABLES TO "authenticated";




























