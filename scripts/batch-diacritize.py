#!/usr/bin/env python3
"""Batch-diacritize all poems using Mishkal (rule-based, no AI).

Usage:
    pip install -r scripts/requirements-diacritize.txt
    DATABASE_URL="postgresql://..." python scripts/batch-diacritize.py

Generates a SQL migration file at:
    supabase/migrations/20260306000001_populate_diacritics.sql.skip
"""
import os
import sys
import time

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

try:
    from mishkal.tashkeel import TashkeelClass
except ImportError:
    print("Error: mishkal not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL environment variable is required")
    sys.exit(1)

BATCH_SIZE = 500
OUT_PATH = "supabase/migrations/20260306000001_populate_diacritics.sql.skip"

def main():
    print("Initializing Mishkal vocalizer...")
    vocalizer = TashkeelClass()

    print("Connecting to database...")
    conn = psycopg2.connect(DATABASE_URL)

    # Use a named server-side cursor to stream rows without loading all into memory
    cur = conn.cursor(name="diacritize_cursor")
    cur.itersize = BATCH_SIZE

    # Count total poems (separate cursor)
    count_cur = conn.cursor()
    count_cur.execute("SELECT COUNT(*) FROM poems")
    total = count_cur.fetchone()[0]
    count_cur.close()
    print(f"Found {total} poems to diacritize")

    # Fetch and process via server-side cursor
    cur.execute("SELECT id, content FROM poems ORDER BY id")

    processed = 0
    errors = 0
    start_time = time.time()

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("-- Batch diacritization via Mishkal (rule-based, no AI)\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Total poems: {total}\n\n")
        f.write("BEGIN;\n\n")

        for row in cur:
            pid, content = row
            try:
                diacritized = vocalizer.tashkeel(content)
                # Use psycopg2's adapt() for proper SQL literal escaping
                escaped = psycopg2.extensions.adapt(diacritized)
                escaped.prepare(conn)
                f.write(f"UPDATE poems SET diacritized_content = {escaped.getquoted().decode('utf-8')} WHERE id = {pid};\n")
                processed += 1
            except Exception as e:
                print(f"  Error on poem {pid}: {e}")
                errors += 1

            if (processed + errors) % BATCH_SIZE == 0:
                elapsed = time.time() - start_time
                rate = (processed + errors) / elapsed if elapsed > 0 else 0
                print(f"  Progress: {processed + errors}/{total} ({rate:.0f} poems/sec)")
                # Split into smaller transactions to reduce lock time
                f.write("\nCOMMIT;\n\nBEGIN;\n\n")

        f.write("\nCOMMIT;\n")

    cur.close()
    conn.close()

    elapsed = time.time() - start_time
    print(f"\nDone! Processed {processed} poems, {errors} errors in {elapsed:.1f}s")
    print(f"Migration file: {OUT_PATH}")

if __name__ == "__main__":
    main()
