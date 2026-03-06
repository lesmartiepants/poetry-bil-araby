#!/usr/bin/env python3
"""Upload diacritized poems from parquet to Supabase PostgreSQL.

Uses UNNEST batch writes for efficient bulk updates.
Writes to the `diacritized_content` column of the `poems` table.

Usage:
    DATABASE_URL="..." python scripts/upload-diacritized.py
    DATABASE_URL="..." python scripts/upload-diacritized.py --input poems_diacritized_final.parquet
    DATABASE_URL="..." python scripts/upload-diacritized.py --batch-size 2000 --dry-run
"""
import os
import sys
import time
import argparse
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Error: pandas not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

DATA_DIR = Path(__file__).parent / "diacritize-data"
DEFAULT_INPUT = DATA_DIR / "poems_diacritized_final.parquet"


def upload(input_path, db_url, batch_size=2000, dry_run=False):
    """Upload diacritized poems to the database."""
    df = pd.read_parquet(input_path)
    print(f"Loaded {len(df)} poems from {input_path}")
    print(f"Columns: {list(df.columns)}")

    if "diacritized_content" not in df.columns:
        print("Error: parquet must have 'diacritized_content' column")
        sys.exit(1)

    # Filter out rows with null diacritized_content
    df = df.dropna(subset=["diacritized_content"])
    print(f"Poems with diacritized content: {len(df)}")

    if dry_run:
        print(f"\n[DRY RUN] Would upload {len(df)} poems in "
              f"{(len(df) + batch_size - 1) // batch_size} batches of {batch_size}")
        return

    conn = psycopg2.connect(db_url, keepalives=1, keepalives_idle=30,
                            keepalives_interval=10, keepalives_count=5)
    cur = conn.cursor()

    # Verify table has the column
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'poems' AND column_name = 'diacritized_content'
    """)
    if not cur.fetchone():
        print("Error: diacritized_content column does not exist in poems table.")
        print("Run the migration first: supabase/migrations/20260306000001_add_raw_content_remove_long.sql")
        cur.close()
        conn.close()
        sys.exit(1)

    total = len(df)
    total_uploaded = 0
    start = time.time()

    ids = df["id"].tolist()
    contents = df["diacritized_content"].tolist()

    num_batches = (total + batch_size - 1) // batch_size
    print(f"\nUploading {total} poems in {num_batches} batches of {batch_size}...")

    for batch_num in range(num_batches):
        batch_start = batch_num * batch_size
        batch_end = min(batch_start + batch_size, total)
        batch_ids = ids[batch_start:batch_end]
        batch_contents = contents[batch_start:batch_end]

        cur.execute("""
            UPDATE poems p SET diacritized_content = v.content
            FROM (SELECT unnest(%s::int[]) AS id, unnest(%s::text[]) AS content) v
            WHERE p.id = v.id
        """, (batch_ids, batch_contents))
        conn.commit()

        total_uploaded += len(batch_ids)
        elapsed = time.time() - start
        rate = total_uploaded / elapsed if elapsed > 0 else 0
        eta = (total - total_uploaded) / rate if rate > 0 else 0
        print(f"  Batch {batch_num + 1}/{num_batches}: "
              f"{total_uploaded}/{total} ({rate:.0f}/sec, "
              f"elapsed={elapsed:.0f}s, ETA={eta:.0f}s)")

    # Verification
    cur.execute("SELECT COUNT(*) FROM poems WHERE diacritized_content IS NOT NULL")
    db_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM poems")
    total_poems = cur.fetchone()[0]

    cur.close()
    conn.close()

    elapsed = time.time() - start
    print(f"\nDone! {total_uploaded} poems uploaded in {elapsed:.0f}s")
    print(f"\nVerification:")
    print(f"  Total poems in DB: {total_poems}")
    print(f"  Poems with diacritized_content: {db_count}")
    print(f"  Coverage: {db_count/total_poems*100:.1f}%")


def main():
    parser = argparse.ArgumentParser(
        description="Upload diacritized poems from parquet to Supabase PostgreSQL"
    )
    parser.add_argument("--input", type=str, default=str(DEFAULT_INPUT),
                        help=f"Input parquet (default: {DEFAULT_INPUT})")
    parser.add_argument("--batch-size", type=int, default=2000,
                        help="Rows per UNNEST batch (default: 2000)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview upload without writing to DB")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url and not args.dry_run:
        print("Error: DATABASE_URL environment variable is required")
        sys.exit(1)

    upload(args.input, db_url, args.batch_size, args.dry_run)


if __name__ == "__main__":
    main()
