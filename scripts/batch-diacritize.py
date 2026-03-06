#!/usr/bin/env python3
"""Batch-diacritize all poems using Mishkal with parallel DB writes.

Usage:
    # Direct parallel writes (default, ~33 min for 84K poems with 8 workers)
    DATABASE_URL="..." python scripts/batch-diacritize.py

    # Resume after interruption (skip already-diacritized poems)
    DATABASE_URL="..." python scripts/batch-diacritize.py --resume

    # Generate SQL file instead (legacy mode, no parallelism)
    DATABASE_URL="..." python scripts/batch-diacritize.py --sql-only

    # Custom parallelism
    DATABASE_URL="..." python scripts/batch-diacritize.py --workers 4 --chunk-size 250
"""
import os
import sys
import time
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from multiprocessing import Value

try:
    import psycopg2
except ImportError:
    print("Error: psycopg2 not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

# ── Worker function (runs in separate process) ───────────────────────

def process_chunk(db_url, offset, limit, resume, shared_counter):
    """Fetch a chunk of poems, diacritize with Mishkal, write back via UNNEST."""
    from mishkal.tashkeel import TashkeelClass
    vocalizer = TashkeelClass()

    conn = psycopg2.connect(db_url, keepalives=1, keepalives_idle=30,
                            keepalives_interval=10, keepalives_count=5)
    cur = conn.cursor()

    where = "WHERE diacritized_content IS NULL" if resume else ""
    cur.execute(f"SELECT id, content FROM poems {where} ORDER BY id LIMIT %s OFFSET %s",
                (limit, offset))
    rows = cur.fetchall()

    if not rows:
        cur.close()
        conn.close()
        return 0, 0

    ids, diacritized = [], []
    errors = 0
    for pid, content in rows:
        try:
            result = vocalizer.tashkeel(content)
            ids.append(pid)
            diacritized.append(result)
        except Exception as e:
            errors += 1

    # UNNEST batch write — ~1.6ms/poem amortized at chunk_size=500
    if ids:
        cur.execute("""
            UPDATE poems p SET diacritized_content = v.content
            FROM (SELECT unnest(%s::int[]) AS id, unnest(%s::text[]) AS content) v
            WHERE p.id = v.id
        """, (ids, diacritized))
        conn.commit()

    with shared_counter.get_lock():
        shared_counter.value += len(ids)

    cur.close()
    conn.close()
    return len(ids), errors


# ── SQL-only mode (legacy) ────────────────────────────────────────────

def generate_sql(db_url):
    """Original behavior: generate a SQL migration file."""
    from mishkal.tashkeel import TashkeelClass
    vocalizer = TashkeelClass()

    out_path = "supabase/migrations/20260306000001_populate_diacritics.sql.skip"

    conn = psycopg2.connect(db_url)
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM poems")
    total = cur.fetchone()[0]
    print(f"Found {total} poems to diacritize")

    cur.execute("SELECT id, content FROM poems ORDER BY id")

    processed = 0
    errors = 0
    start_time = time.time()

    with open(out_path, "w", encoding="utf-8") as f:
        f.write("-- Batch diacritization via Mishkal (rule-based, no AI)\n")
        f.write(f"-- Generated: {time.strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"-- Total poems: {total}\n\n")
        f.write("BEGIN;\n\n")

        for row in cur:
            pid, content = row
            try:
                result = vocalizer.tashkeel(content)
                escaped = cur.mogrify("%s", (result,)).decode("utf-8")
                f.write(f"UPDATE poems SET diacritized_content = {escaped} WHERE id = {pid};\n")
                processed += 1
            except Exception as e:
                print(f"  Error on poem {pid}: {e}")
                errors += 1

            if (processed + errors) % 500 == 0:
                elapsed = time.time() - start_time
                rate = (processed + errors) / elapsed if elapsed > 0 else 0
                print(f"  Progress: {processed + errors}/{total} ({rate:.0f} poems/sec)")

        f.write("\nCOMMIT;\n")

    conn.close()
    elapsed = time.time() - start_time
    print(f"\nDone! {processed} poems written to {out_path}")
    print(f"  Errors: {errors}, Time: {elapsed:.0f}s")


# ── Main ──────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Batch-diacritize poems using Mishkal with parallel DB writes"
    )
    parser.add_argument("--sql-only", action="store_true",
                        help="Generate SQL migration file instead of direct writes")
    parser.add_argument("--resume", action="store_true",
                        help="Skip poems that already have diacritized_content")
    parser.add_argument("--workers", type=int, default=8,
                        help="Number of parallel workers (default: 8)")
    parser.add_argument("--chunk-size", type=int, default=500,
                        help="Poems per worker chunk (default: 500)")
    args = parser.parse_args()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is required")
        sys.exit(1)

    if args.sql_only:
        generate_sql(db_url)
        return

    # Count work
    conn = psycopg2.connect(db_url)
    cur = conn.cursor()
    where = "WHERE diacritized_content IS NULL" if args.resume else ""
    cur.execute(f"SELECT COUNT(*) FROM poems {where}")
    total = cur.fetchone()[0]
    cur.close()
    conn.close()

    if total == 0:
        print("All poems already diacritized!")
        return

    print(f"Diacritizing {total} poems with {args.workers} workers, "
          f"chunk size {args.chunk_size}")
    print(f"Mode: {'resume (skip existing)' if args.resume else 'full (overwrite all)'}")

    # Generate chunk offsets
    offsets = list(range(0, total, args.chunk_size))
    counter = Value('i', 0)
    start = time.time()

    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = {
            pool.submit(process_chunk, db_url, off, args.chunk_size,
                        args.resume, counter): off
            for off in offsets
        }

        total_done, total_errors = 0, 0
        for future in as_completed(futures):
            try:
                done, errs = future.result()
                total_done += done
                total_errors += errs
            except Exception as e:
                print(f"  Worker error: {e}")
                total_errors += 1

            elapsed = time.time() - start
            rate = counter.value / elapsed if elapsed > 0 else 0
            eta = (total - counter.value) / rate if rate > 0 else 0
            print(f"  Progress: {counter.value}/{total} ({rate:.0f}/sec, "
                  f"errors={total_errors}, elapsed={elapsed:.0f}s, "
                  f"ETA={eta:.0f}s)")

    elapsed = time.time() - start
    print(f"\nDone! {total_done} poems diacritized in {elapsed:.0f}s "
          f"({total_done/elapsed:.0f}/sec)")
    if total_errors:
        print(f"  {total_errors} errors encountered")


if __name__ == "__main__":
    main()
