#!/usr/bin/env bash
# Runs the @live journeys against a local Supabase stack (real auth and RLS):
# starts Supabase, seeds fixtures, starts the API on the same database, runs the tests.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
supabase status >/dev/null 2>&1 || supabase start
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|DB_URL)=')"
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -f supabase/seed/fixtures.sql 2>/dev/null || true
psql "$DB_URL" -q -f web/journeys/live-seed.sql
psql "$DB_URL" -q -v ON_ERROR_STOP=1 -c "update auth.users set email_confirmed_at = coalesce(email_confirmed_at, now())" >/dev/null
DATABASE_URL="$DB_URL?sslmode=disable" PORT=3001 node server.js > /tmp/redesign2-api.log 2>&1 &
API=$!
trap 'kill $API 2>/dev/null' EXIT
for _ in $(seq 1 30); do curl -sf localhost:3001/api/health >/dev/null && break; sleep 1; done
cd web
VITE_SUPABASE_URL="$API_URL" VITE_SUPABASE_ANON_KEY="$ANON_KEY" npm run test:journeys:live -- "$@"
