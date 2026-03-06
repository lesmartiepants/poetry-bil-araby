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

def get_connection():
    """Create a new database connection with keepalive settings."""
    return psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=30,
        keepalives_interval=10,
        keepalives_count=5
    )

def main():
    print("Initializing Mishkal vocalizer...")
    vocalizer = TashkeelClass()

    print("Connecting to database...")
    conn = get_connection()
    cur = conn.cursor()

    # Count total poems
    cur.execute("SELECT COUNT(*) FROM poems")
    total = cur.fetchone()[0]
    cur.close()
    conn.close()
    print(f"Found {total} poems to diacritize")

    processed = 0
    errors = 0
    start_time = time.time()

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        f.write("-- Batch diacritization via Mishkal (rule-based, no AI)\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Total poems: {total}\n\n")
        f.write("BEGIN;\n\n")

        offset = 0
        while offset < total:
            # Fetch a batch with a fresh short-lived query
            try:
                conn = get_connection()
                cur = conn.cursor()
                cur.execute(
                    "SELECT id, content FROM poems ORDER BY id LIMIT %s OFFSET %s",
                    (BATCH_SIZE, offset)
                )
                rows = cur.fetchall()
                cur.close()
                conn.close()
            except Exception as e:
                print(f"  DB error at offset {offset}: {e}")
                print("  Retrying in 5 seconds...")
                time.sleep(5)
                continue

            if not rows:
                break

            for pid, content in rows:
                try:
                    diacritized = vocalizer.tashkeel(content)
                    # Use psycopg2's adapt() for proper SQL literal escaping
                    escaped = psycopg2.extensions.adapt(diacritized)
                    f.write(f"UPDATE poems SET diacritized_content = {escaped.getquoted().decode('utf-8')} WHERE id = {pid};\n")
                    processed += 1
                except Exception as e:
                    print(f"  Error on poem {pid}: {e}")
                    errors += 1

            offset += len(rows)

            # Split into smaller transactions every batch to reduce lock time
            f.write("\nCOMMIT;\n\nBEGIN;\n\n")

            elapsed = time.time() - start_time
            rate = (processed + errors) / elapsed if elapsed > 0 else 0
            print(f"  Progress: {processed + errors}/{total} ({rate:.0f} poems/sec)")

        f.write("\nCOMMIT;\n")

    elapsed = time.time() - start_time
    print(f"\nDone! Processed {processed} poems, {errors} errors in {elapsed:.1f}s")
    print(f"Migration file: {OUT_PATH}")

if __name__ == "__main__":
    main()
