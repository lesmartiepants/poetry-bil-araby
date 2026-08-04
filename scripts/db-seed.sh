#!/usr/bin/env bash
#
# Load the fabricated test fixtures into a local Postgres.
#
#   npm run db:seed                        # uses postgresql://localhost:5432/qafiyah
#   LOCAL_DATABASE_URL=... npm run db:seed
#
# Run this after `npm run db:setup`, which builds the schema. The fixtures are
# invented poets and invented Arabic test sentences -- see supabase/seed/fixtures.sql
# for what they contain and why they are synthetic rather than sampled.
#
# Like db-setup.sh this deliberately ignores DATABASE_URL, so a production URL
# sitting in .env cannot be seeded by accident. The SQL itself also refuses to
# run against a database holding non-fixture poems.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SEED="$ROOT/supabase/seed/fixtures.sql"

URL="${LOCAL_DATABASE_URL:-postgresql://localhost:5432/qafiyah}"

case "$URL" in
  *pooler.supabase.com*|*supabase.co*)
    echo "Refusing to run: '$URL' looks like a hosted Supabase database." >&2
    echo "db:seed loads test fixtures and is for local databases only." >&2
    exit 1
    ;;
esac

command -v psql >/dev/null 2>&1 || {
  echo "psql not found. Install PostgreSQL 15+ (17 recommended) and retry." >&2
  exit 1
}

if ! psql "$URL" -c 'SELECT 1' >/dev/null 2>&1; then
  echo "Cannot connect to '$URL'. Run 'npm run db:setup' first." >&2
  exit 1
fi

# The fixtures reference category_values keys, which migration
# 20260722000000_add_poem_categorization.sql seeds. Without it the join in
# section 4 silently matches nothing.
if [ "$(psql "$URL" -tAc "SELECT to_regclass('public.poem_categories') IS NOT NULL")" != "t" ]; then
  echo "Schema is missing the categorization layer. Run 'npm run db:setup' first." >&2
  exit 1
fi

echo "==> seeding fabricated fixtures into '$URL'"
psql "$URL" -v ON_ERROR_STOP=1 -q -f "$SEED"

read -r POEMS POETS CATS <<EOF
$(psql "$URL" -tAF' ' -c "
  SELECT (SELECT count(*) FROM poems WHERE source_dataset = 'fixture'),
         (SELECT count(*) FROM poets WHERE slug LIKE 'test-poet-%'),
         (SELECT count(*) FROM poem_categories)")
EOF

echo
echo "Done. $POEMS fixture poems, $POETS fixture poets, $CATS category assignments."
echo "All of it is invented test data -- 'SELECT ... WHERE source_dataset = ''fixture'''"
echo "separates it from anything real."
