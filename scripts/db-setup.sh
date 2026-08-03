#!/usr/bin/env bash
#
# Build the poetry schema in a local Postgres from nothing but this repo.
#
#   npm run db:setup                       # uses postgresql://localhost:5432/qafiyah
#   LOCAL_DATABASE_URL=... npm run db:setup
#
# Creates the database if it is missing, then applies every file in
# supabase/migrations in filename order. Migrations are idempotent, so re-running
# this is safe. No poem data is loaded -- the schema comes up empty.
#
# This does NOT touch production. It deliberately ignores DATABASE_URL so a
# stray production URL in .env can't be pointed at by accident; use
# LOCAL_DATABASE_URL to target something other than the local default.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS="$ROOT/supabase/migrations"

URL="${LOCAL_DATABASE_URL:-postgresql://localhost:5432/qafiyah}"

case "$URL" in
  *pooler.supabase.com*|*supabase.co*)
    echo "Refusing to run: '$URL' looks like a hosted Supabase database." >&2
    echo "db:setup is for local databases only. Use 'supabase db push' for hosted." >&2
    exit 1
    ;;
esac

command -v psql >/dev/null 2>&1 || {
  echo "psql not found. Install PostgreSQL 15+ (17 recommended) and retry." >&2
  exit 1
}

DBNAME="${URL##*/}"
DBNAME="${DBNAME%%\?*}"
ADMIN_URL="${URL%/*}/postgres"

if ! psql "$URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "==> creating database '$DBNAME'"
  psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -c "CREATE DATABASE \"$DBNAME\"" >/dev/null
fi

# Supabase provides these; a bare Postgres does not. Migrations reference
# auth.uid(), auth.users and the anon/authenticated/service_role roles.
echo "==> ensuring Supabase-compatible stubs (auth schema, roles)"
psql "$URL" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE SCHEMA IF NOT EXISTS auth;
DO $$ BEGIN CREATE ROLE anon NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role NOLOGIN BYPASSRLS; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb,
    created_at timestamptz DEFAULT now()
);
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE AS $fn$ SELECT NULL::uuid $fn$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE AS $fn$ SELECT current_setting('role', true) $fn$;
SQL

echo "==> applying migrations"
for f in "$MIGRATIONS"/*.sql; do
  printf '    %s\n' "$(basename "$f")"
  psql "$URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

TABLES=$(psql "$URL" -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'")

echo
echo "Done. $DBNAME now has $TABLES tables in public."
echo "The schema is empty -- there is no poem data in this repo."
echo "Run 'npm run dev:server' with DATABASE_URL pointed here, or use AI mode."
