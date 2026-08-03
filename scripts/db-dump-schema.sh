#!/usr/bin/env bash
#
# Regenerate supabase/migrations/20260101000000_base_poetry_schema.sql from the
# live database. Read-only against the source; writes only the local file.
#
#   npm run db:dump-schema
#
# Requires DATABASE_URL (pooler host) in the environment or .env, and pg_dump 17.
# Schema only -- this never dumps poem rows.
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/supabase/migrations/20260101000000_base_poetry_schema.sql"

if [ -z "${DATABASE_URL:-}" ] && [ -f "$ROOT/.env" ]; then
  set -a; . "$ROOT/.env"; set +a
fi
: "${DATABASE_URL:?DATABASE_URL is not set}"

case "$DATABASE_URL" in
  *pooler.supabase.com:6543*|postgresql://*localhost*|postgres://*localhost*) ;;
  *) echo "DATABASE_URL should use the Supabase pooler host (…pooler.supabase.com:6543)." >&2
     exit 1 ;;
esac

# Tables created by later migrations, plus their owned sequences (--exclude-table
# does not follow ownership, and leaving the sequence in makes the later SERIAL
# fall back to <table>_id_seq1).
OWNED_BY_MIGRATIONS=(
  bug_reports category_dimensions category_families category_values
  design_feedback_actions design_items design_review_sessions design_verdicts
  design_review_history discussion_likes discussions poem_categories
  poem_events poem_factor_scores saved_poems user_settings
)
EX=()
for t in "${OWNED_BY_MIGRATIONS[@]}"; do
  EX+=(--exclude-table="public.$t" --exclude-table="public.${t}_id_seq")
done

command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump not found (need v17)." >&2; exit 1; }

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT
pg_dump -s -n public --no-owner --no-acl "${EX[@]}" "$DATABASE_URL" > "$TMP"

python3 "$ROOT/scripts/db-schema-to-migration.py" "$TMP" "$OUT"
echo "wrote $OUT"
