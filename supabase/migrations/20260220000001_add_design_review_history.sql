-- =============================================================================
-- design_review_history
-- =============================================================================
--
-- This table exists in production but was never captured in a migration -- it
-- was created by hand alongside the design-review tooling. Adding it here so a
-- fresh database matches production.
--
-- It has to come after 20260220_create_design_review_tables.sql, which creates
-- the design_review_sessions table it references, so it lives in its own file
-- rather than in the base schema migration.
--
-- NOTE ON DRIFT: production's design_review_sessions.id is `integer` (those
-- tables were hand-created before the migration was written), while
-- 20260220_create_design_review_tables.sql declares it `uuid`. session_id here
-- follows the migration, so a database built from this repo is self-consistent.
-- On production this whole file is a no-op -- the table and its FK already
-- exist, and every statement is guarded.
-- =============================================================================

CREATE SEQUENCE IF NOT EXISTS public.design_review_history_id_seq
    AS integer START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

CREATE TABLE IF NOT EXISTS public.design_review_history (
    id           integer NOT NULL DEFAULT nextval('public.design_review_history_id_seq'::regclass),
    item_key     text NOT NULL,
    session_id   uuid NOT NULL,
    action       text NOT NULL,
    old_value    jsonb,
    new_value    jsonb,
    commit_sha   text,
    created_at   timestamp with time zone DEFAULT now()
);

ALTER SEQUENCE public.design_review_history_id_seq
    OWNED BY public.design_review_history.id;

DO $guard$ BEGIN
    ALTER TABLE ONLY public.design_review_history
        ADD CONSTRAINT design_review_history_pkey PRIMARY KEY (id);
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

DO $guard$ BEGIN
    ALTER TABLE ONLY public.design_review_history
        ADD CONSTRAINT design_review_history_session_id_fkey
        FOREIGN KEY (session_id) REFERENCES public.design_review_sessions(id)
        ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object OR duplicate_table OR invalid_table_definition THEN NULL;
END $guard$;

CREATE INDEX IF NOT EXISTS idx_design_history_item_key
    ON public.design_review_history USING btree (item_key);
CREATE INDEX IF NOT EXISTS idx_design_history_session
    ON public.design_review_history USING btree (session_id);

ALTER TABLE public.design_review_history ENABLE ROW LEVEL SECURITY;
