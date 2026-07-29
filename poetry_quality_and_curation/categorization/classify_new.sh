#!/usr/bin/env bash
# classify_new.sh — categorize only poems that don't have categories yet.
#
# Closes the new-insert coverage gap: brand-new poems (INSERTed after the last
# bulk run) have no poem_categories rows and NULL categorized_at until something
# classifies them. There is no DB trigger; this is that "something". It chains
# the pipeline's existing --scope unclassified path:
#
#   classify_poems --scope unclassified  ->  import_categories  ->  backfill-century
#
# Idempotent and cheap: --scope unclassified only pulls poems with
# categorized_at IS NULL, and --resume skips anything already in the output file.
# Safe to run repeatedly; a run with nothing to do costs one quick query.
#
# Requires (in the environment, never echoed): DATABASE_URL, GEMINI_API_KEY.
#
# Schedule it nightly (do NOT enable without approval). Example crontab line —
# 03:17 local, off the top of the hour on purpose:
#   17 3 * * *  cd /path/to/repo && ./poetry_quality_and_curation/categorization/classify_new.sh >> /var/log/classify_new.log 2>&1
# or as a Render/GitHub-Actions scheduled job invoking the same command.
set -euo pipefail

MODEL="${CLASSIFY_MODEL:-gemini/gemini-3.6-flash}"   # matches config.DEFAULT_GEMINI_MODEL
MAX_COST="${CLASSIFY_MAX_COST:-5}"                    # hard cost cap per run (USD)
OUT="poetry_quality_and_curation/categorization/data/new_$(date +%Y%m%d_%H%M%S).parquet"

cd "$(git rev-parse --show-toplevel)"

: "${DATABASE_URL:?set DATABASE_URL}"
: "${GEMINI_API_KEY:?set GEMINI_API_KEY}"

echo "[classify_new] scope=unclassified model=$MODEL max_cost=\$$MAX_COST"
python -m poetry_quality_and_curation.categorization.classify_poems \
  --model "$MODEL" --scope unclassified --resume --max-cost "$MAX_COST" --output "$OUT"

# The classifier writes the parquet only when it had poems to classify.
if [[ -f "$OUT" ]]; then
  python -m poetry_quality_and_curation.categorization.import_categories --input "$OUT"
  python -m poetry_quality_and_curation.categorization.import_categories --backfill-century
  echo "[classify_new] imported $OUT"
else
  echo "[classify_new] nothing to classify — no new poems."
fi
