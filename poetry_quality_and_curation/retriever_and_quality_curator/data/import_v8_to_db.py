"""Import v8 quality scores to production Supabase DB.

Updates quality_score, quality_subscores, scoring_model, and scored_at
for all poems in scores_final_v8.parquet that exist in the DB.

Uses UNNEST batch writes for efficiency (following batch-diacritize.py pattern).

Usage:
    python data/import_v8_to_db.py --dry-run    # Preview without writing
    python data/import_v8_to_db.py               # Actually import
"""
import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

DATA_DIR = Path(__file__).resolve().parent
SCORES_PATH = DATA_DIR / "scores_final_v8.parquet"
DIMS = ["sound", "imagery", "emotion", "language", "cultural"]
BATCH_SIZE = 500


def get_connection():
    """Get PostgreSQL connection from env vars."""
    db_url = os.environ.get("DATABASE_URL")
    if db_url:
        return psycopg2.connect(db_url)
    return psycopg2.connect(
        host=os.environ.get("PGHOST", "localhost"),
        port=os.environ.get("PGPORT", 5432),
        dbname=os.environ.get("PGDATABASE", "qafiyah"),
        user=os.environ.get("PGUSER", os.environ.get("USER")),
        password=os.environ.get("PGPASSWORD", ""),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    parser.add_argument("--scores-file", type=str, default=str(SCORES_PATH))
    args = parser.parse_args()

    print("=" * 60)
    print(f"IMPORT V8 SCORES TO DB {'(DRY RUN)' if args.dry_run else ''}")
    print("=" * 60)

    # Load scores
    scores_df = pd.read_parquet(args.scores_file)
    scores_df["poem_id"] = scores_df["poem_id"].astype(str)
    print(f"Loaded {len(scores_df)} poems from {args.scores_file}")

    # Check score distribution before import
    print(f"\nScore distribution:")
    print(f"  Mean: {scores_df['quality_score'].mean():.1f}")
    print(f"  Std:  {scores_df['quality_score'].std():.1f}")
    print(f"  90+:  {(scores_df['quality_score'] >= 90).sum()}")
    print(f"  <50:  {(scores_df['quality_score'] < 50).sum()}")

    if args.dry_run:
        print(f"\n[DRY RUN] Would update {len(scores_df)} poems in DB")
        print(f"[DRY RUN] Sample rows:")
        for _, row in scores_df.head(5).iterrows():
            subscores = {d: int(row[d]) for d in DIMS if d in row}
            print(f"  poem_id={row['poem_id']}, quality_score={row['quality_score']}, "
                  f"subscores={json.dumps(subscores)}, model={row.get('model_used', 'N/A')}")
        return

    # Connect to DB
    conn = get_connection()
    cur = conn.cursor()

    # Check if quality_score column exists
    cur.execute("""
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'poems'
        AND column_name = 'quality_score' LIMIT 1
    """)
    if not cur.fetchone():
        print("ERROR: quality_score column not found. Run migration first:")
        print("  supabase db push  (or apply 20260307000000_add_curation_columns.sql)")
        conn.close()
        sys.exit(1)

    # Filter to numeric poem_ids only (non-numeric like 'diwan_*' are not in the DB)
    numeric_mask = scores_df["poem_id"].str.match(r'^\d+$')
    db_scores_df = scores_df[numeric_mask].copy()
    skipped = len(scores_df) - len(db_scores_df)
    if skipped > 0:
        print(f"Skipping {skipped} non-numeric poem IDs (not in DB)")

    # Count existing poems
    sample_ids = [int(x) for x in db_scores_df["poem_id"].values[:100]]
    cur.execute("SELECT COUNT(*) FROM poems WHERE id = ANY(%s)", (sample_ids,))
    sample_count = cur.fetchone()[0]
    print(f"\nSample match check: {sample_count}/100 poem IDs found in DB")

    # Batch update using UNNEST
    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    failed = 0

    for batch_start in range(0, len(db_scores_df), BATCH_SIZE):
        batch = db_scores_df.iloc[batch_start:batch_start + BATCH_SIZE]

        ids = []
        quality_scores = []
        subscores_list = []
        models = []
        scored_ats = []

        for _, row in batch.iterrows():
            try:
                pid = int(row["poem_id"])
                score = int(row["quality_score"])
                subscores = json.dumps({d: int(row[d]) for d in DIMS if d in row})
                model = str(row.get("model_used", "dspy-calibrated"))

                ids.append(pid)
                quality_scores.append(score)
                subscores_list.append(subscores)
                models.append(model)
                scored_ats.append(now)
            except (ValueError, KeyError) as e:
                failed += 1
                continue

        if not ids:
            continue

        try:
            cur.execute("""
                UPDATE poems p SET
                    quality_score = v.quality_score,
                    quality_subscores = v.quality_subscores::jsonb,
                    scoring_model = v.scoring_model,
                    scored_at = v.scored_at::timestamptz
                FROM (
                    SELECT
                        UNNEST(%s::int[]) AS id,
                        UNNEST(%s::smallint[]) AS quality_score,
                        UNNEST(%s::text[]) AS quality_subscores,
                        UNNEST(%s::varchar[]) AS scoring_model,
                        UNNEST(%s::text[]) AS scored_at
                ) v
                WHERE p.id = v.id
            """, (ids, quality_scores, subscores_list, models, scored_ats))

            batch_updated = cur.rowcount
            updated += batch_updated
            conn.commit()

            print(f"  Batch {batch_start//BATCH_SIZE + 1}: "
                  f"updated {batch_updated}/{len(ids)} poems "
                  f"(total: {updated})")
        except Exception as e:
            print(f"  Batch error: {e}")
            conn.rollback()
            failed += len(ids)

    cur.close()
    conn.close()

    print(f"\n{'='*60}")
    print("IMPORT COMPLETE")
    print(f"{'='*60}")
    print(f"Updated: {updated}")
    print(f"Failed:  {failed}")
    print(f"Skipped (non-DB): {skipped}")
    print(f"Total:   {len(db_scores_df)} (of {len(scores_df)})")

    # Verify
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM poems WHERE quality_score IS NOT NULL")
    total_scored = cur.fetchone()[0]
    cur.execute("SELECT AVG(quality_score), STDDEV(quality_score) FROM poems WHERE quality_score IS NOT NULL")
    avg, std = cur.fetchone()
    cur.execute("SELECT COUNT(*) FROM poems WHERE quality_score >= 90")
    count_90 = cur.fetchone()[0]
    cur.close()
    conn.close()

    print(f"\nDB verification:")
    print(f"  Poems with scores: {total_scored}")
    print(f"  Mean: {avg:.1f}, Std: {std:.1f}")
    print(f"  90+: {count_90}")


if __name__ == "__main__":
    main()
