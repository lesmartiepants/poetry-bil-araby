"""Import classifier output (Parquet) into the production database.

Writes both representations:
  * normalized rows in `poem_categories` (mood/topic/motif -> value_id, confidence)
  * denormalized scalars + JSONB provenance on `poems`
    (mood_primary, emotional_intensity, accessibility_level, century,
     categories, categorized_at, categorization_model)

Idempotent per poem: re-importing replaces that poem's category rows.

Usage:
    python -m poetry_quality_and_curation.categorization.import_categories \
        --input poetry_quality_and_curation/categorization/data/categories_openai_bedrock-haiku-45.parquet
    python -m poetry_quality_and_curation.categorization.import_categories --input <file> --dry-run
"""
import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.categorization import config


def parse_args():
    p = argparse.ArgumentParser(description="Import categories into the DB")
    p.add_argument("--input", type=Path, required=True, help="Classifier Parquet output")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--batch-size", type=int, default=500)
    return p.parse_args()


def load_value_lookup(conn) -> dict:
    """(dimension_key, value_key) -> value_id."""
    cur = conn.cursor()
    cur.execute("""
        SELECT d.key, v.key, v.id
        FROM category_values v
        JOIN category_dimensions d ON v.dimension_id = d.id
    """)
    lookup = {(r[0], r[1]): r[2] for r in cur.fetchall()}
    cur.close()
    return lookup


def _as_list(val):
    if isinstance(val, (list, tuple)):
        return list(val)
    if hasattr(val, "tolist"):
        return list(val.tolist())
    return []


def import_rows(conn, df: pd.DataFrame, lookup: dict, batch_size: int) -> tuple[int, int]:
    poems_updated, links_written = 0, 0
    batches = [df.iloc[i:i + batch_size] for i in range(0, len(df), batch_size)]

    for batch_df in tqdm(batches, desc="Importing categories"):
        cur = conn.cursor()
        for _, row in batch_df.iterrows():
            poem_id = int(row["poem_id"])
            model = row.get("model_used") or None

            dim_lists = {
                "mood": _as_list(row.get("moods")),
                "topic": _as_list(row.get("topics")),
                "motif": _as_list(row.get("motifs")),
            }

            # Resolve value_ids
            value_ids = []
            for dim, keys in dim_lists.items():
                for k in keys:
                    vid = lookup.get((dim, k))
                    if vid:
                        value_ids.append(vid)

            categories_json = json.dumps({
                "moods": dim_lists["mood"],
                "topics": dim_lists["topic"],
                "motifs": dim_lists["motif"],
            }, ensure_ascii=False)

            def _num(v):
                return int(v) if pd.notna(v) else None

            # 1. Scalars + provenance on poems
            cur.execute("""
                UPDATE poems SET
                    mood_primary = %s,
                    emotional_intensity = %s,
                    accessibility_level = %s,
                    century = %s,
                    categories = %s::jsonb,
                    categorized_at = COALESCE(%s::timestamptz, now()),
                    categorization_model = %s
                WHERE id = %s
            """, (
                (row.get("mood_primary") or None),
                _num(row.get("emotional_intensity")),
                _num(row.get("accessibility_level")),
                _num(row.get("century")),
                categories_json,
                (row.get("categorized_at") or None),
                model,
                poem_id,
            ))
            poems_updated += cur.rowcount

            # 2. Replace this poem's normalized links
            cur.execute("DELETE FROM poem_categories WHERE poem_id = %s", (poem_id,))
            for vid in value_ids:
                cur.execute("""
                    INSERT INTO poem_categories (poem_id, value_id, model)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (poem_id, value_id) DO NOTHING
                """, (poem_id, vid, model))
                links_written += cur.rowcount
        conn.commit()
        cur.close()
    return poems_updated, links_written


def main():
    args = parse_args()
    if not args.input.exists():
        print(f"Error: input not found: {args.input}")
        sys.exit(1)

    df = pd.read_parquet(args.input)
    print(f"Loaded {len(df)} classified poems from {args.input}")

    if args.dry_run:
        print("[DRY RUN] No DB writes.")
        for dim, col in [("mood", "moods"), ("topic", "topics"), ("motif", "motifs")]:
            counts = {}
            for _, row in df.iterrows():
                for k in _as_list(row.get(col)):
                    counts[k] = counts.get(k, 0) + 1
            top = sorted(counts.items(), key=lambda kv: -kv[1])[:8]
            print(f"  {dim}: {top}")
        return

    conn = config.get_db_connection()
    try:
        lookup = load_value_lookup(conn)
        if not lookup:
            print("Error: category vocab is empty. Run the migration first.")
            sys.exit(1)
        print(f"[db] Loaded {len(lookup)} vocab values")
        updated, links = import_rows(conn, df, lookup, args.batch_size)
        print(f"\nDone! Updated {updated} poems, wrote {links} category links.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
