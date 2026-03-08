-- Security Advisor Fixes
-- Migration: 20260306100000_security_advisor_fixes
-- Resolves Supabase Security Advisor errors and warnings
--
-- ERRORS fixed:
--   1. RLS disabled on design_items, design_review_sessions, design_verdicts
--   2. design_review_history RLS (if table exists)
--   3. poet_poems SECURITY DEFINER view → SECURITY INVOKER
--   4. Sensitive columns exposed on design tables
--
-- WARNINGS fixed:
--   1. update_updated_at_column() mutable search_path → pinned to ''
--   2. poem_full_data materialized view API exposure → revoke anon/authenticated
--
-- NOT fixable via migration (dashboard setting):
--   - Leaked password protection (enable in Supabase Dashboard → Auth → Settings)
--
-- INFO items (no changes needed):
--   - Poetry tables (poems, poets, eras, etc.) have RLS enabled with no policies.
--     This is correct: they are accessed only via Express server (postgres superuser
--     bypasses RLS), and PostgREST access is intentionally blocked.

-- ============================================================
-- 1. ENABLE RLS ON DESIGN REVIEW TABLES
-- ============================================================
-- These tables are managed exclusively by the Express backend (server.js)
-- via direct postgres connection. Enabling RLS with no public policies
-- blocks any PostgREST/Supabase client access while the Express server
-- (superuser) continues to work unaffected.

ALTER TABLE IF EXISTS public.design_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.design_review_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.design_verdicts ENABLE ROW LEVEL SECURITY;

-- design_review_history may exist in some environments (created outside migrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'design_review_history') THEN
    EXECUTE 'ALTER TABLE public.design_review_history ENABLE ROW LEVEL SECURITY';
  END IF;
END
$$;

-- ============================================================
-- 2. FIX poet_poems VIEW — SECURITY INVOKER
-- ============================================================
-- The view was created with SECURITY DEFINER (default for older PG versions),
-- which bypasses RLS on underlying tables. Recreate as SECURITY INVOKER
-- so the view respects the caller's RLS policies.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views
             WHERE table_schema = 'public' AND table_name = 'poet_poems') THEN
    -- Get the view definition and recreate with SECURITY INVOKER
    EXECUTE 'ALTER VIEW public.poet_poems SET (security_invoker = on)';
  END IF;
END
$$;

-- ============================================================
-- 3. FIX update_updated_at_column() SEARCH PATH
-- ============================================================
-- Supabase warns that a mutable search_path can be exploited if an
-- attacker can create objects in a schema that appears earlier in the
-- search_path. Pinning to empty string forces fully-qualified names.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 4. RESTRICT poem_full_data MATERIALIZED VIEW API ACCESS
-- ============================================================
-- Materialized views in the public schema are automatically exposed
-- via PostgREST. Revoke access from API roles since this data is
-- served by the Express backend, not the Supabase client.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews
             WHERE schemaname = 'public' AND matviewname = 'poem_full_data') THEN
    EXECUTE 'REVOKE SELECT ON public.poem_full_data FROM anon, authenticated';
  END IF;
END
$$;
