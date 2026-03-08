"""Parallel scoring wrapper for Diwan poems.

Splits unscored poems across N worker processes, each writing to a separate
output file, then merges all shards into the main scores file.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.parallel_score \
        --workers 4 --concurrency 10 --model openai/bedrock-haiku-45

Each worker runs 02_score_poems.py with --source diwan --resume and a shard-specific
output file. After all workers finish, shards are merged into the main output.
"""
import argparse
import asyncio
import os
import sys
import signal
import subprocess
from pathlib import Path

import pandas as pd

from poetry_quality_and_curation.retriever_and_quality_curator import config


def get_unscored_poem_ids(main_output: Path, diwan_path: Path) -> list[str]:
    """Return poem IDs from diwan that haven't been scored yet."""
    diwan_df = pd.read_parquet(diwan_path)
    all_ids = diwan_df["poem_id"].astype(str).tolist()

    scored_ids = set()
    # Check main output
    if main_output.exists():
        scored_df = pd.read_parquet(main_output)
        scored_ids.update(scored_df["poem_id"].astype(str).tolist())

    # Check existing shards
    shard_dir = main_output.parent
    for shard_file in shard_dir.glob("scores_diwan_haiku_shard_*.parquet"):
        try:
            shard_df = pd.read_parquet(shard_file)
            scored_ids.update(shard_df["poem_id"].astype(str).tolist())
        except Exception:
            pass

    unscored = [pid for pid in all_ids if pid not in scored_ids]
    return unscored


def split_ids(ids: list[str], n_workers: int) -> list[list[str]]:
    """Split IDs into roughly equal chunks."""
    chunk_size = len(ids) // n_workers
    remainder = len(ids) % n_workers
    chunks = []
    start = 0
    for i in range(n_workers):
        end = start + chunk_size + (1 if i < remainder else 0)
        chunks.append(ids[start:end])
        start = end
    return chunks


def write_id_list(ids: list[str], path: Path):
    """Write poem IDs to a file, one per line."""
    with open(path, "w") as f:
        for pid in ids:
            f.write(f"{pid}\n")


def merge_shards(main_output: Path, shard_dir: Path):
    """Merge all shard files into the main output."""
    frames = []

    # Load existing main output
    if main_output.exists():
        frames.append(pd.read_parquet(main_output))

    # Load all shards
    shard_files = sorted(shard_dir.glob("scores_diwan_haiku_shard_*.parquet"))
    for shard_file in shard_files:
        try:
            df = pd.read_parquet(shard_file)
            if len(df) > 0:
                frames.append(df)
                print(f"  Merging {shard_file.name}: {len(df)} scores")
        except Exception as e:
            print(f"  Warning: could not read {shard_file.name}: {e}")

    if not frames:
        print("No scores to merge.")
        return

    merged = pd.concat(frames, ignore_index=True)
    # Deduplicate by poem_id, keeping the latest score
    merged = merged.drop_duplicates(subset=["poem_id"], keep="last")
    merged.to_parquet(main_output, index=False)
    print(f"\nMerged: {len(merged)} total scores in {main_output}")

    # Clean up shard files
    for shard_file in shard_files:
        shard_file.unlink()
        print(f"  Removed shard: {shard_file.name}")


def main():
    parser = argparse.ArgumentParser(description="Parallel Diwan scoring")
    parser.add_argument("--workers", type=int, default=4, help="Number of parallel workers (default: 4)")
    parser.add_argument("--concurrency", type=int, default=10, help="Concurrency per worker (default: 10)")
    parser.add_argument("--batch-size", type=int, default=5, help="Batch size per worker (default: 5)")
    parser.add_argument("--model", type=str, default=config.DEFAULT_HAIKU_MODEL, help="LiteLLM model string")
    parser.add_argument("--max-cost", type=float, default=200, help="Total cost cap across all workers")
    parser.add_argument("--prompt", choices=["optimized", "baseline"], default="optimized")
    parser.add_argument("--merge-only", action="store_true", help="Just merge existing shards, don't score")
    parser.add_argument("--dry-run", action="store_true", help="Show plan without executing")
    args = parser.parse_args()

    main_output = config.DATA_DIR / "scores_diwan_haiku.parquet"
    diwan_path = config.DATA_DIR / "diwan_processed.parquet"

    if args.merge_only:
        merge_shards(main_output, config.DATA_DIR)
        return

    # Get unscored poem IDs
    unscored_ids = get_unscored_poem_ids(main_output, diwan_path)
    print(f"Unscored Diwan poems: {len(unscored_ids)}")

    if not unscored_ids:
        print("All poems already scored!")
        return

    # Split across workers
    chunks = split_ids(unscored_ids, args.workers)
    per_worker_cost = args.max_cost / args.workers

    print(f"\nPlan:")
    print(f"  Workers: {args.workers}")
    print(f"  Total concurrency: {args.workers * args.concurrency}")
    print(f"  Per-worker poems: {[len(c) for c in chunks]}")
    print(f"  Per-worker cost cap: ${per_worker_cost:.2f}")
    print(f"  Total cost cap: ${args.max_cost:.2f}")
    print(f"  Model: {args.model}")

    if args.dry_run:
        return

    # Write ID lists for each shard
    id_list_dir = config.DATA_DIR / "shard_ids"
    id_list_dir.mkdir(exist_ok=True)
    for i, chunk in enumerate(chunks):
        write_id_list(chunk, id_list_dir / f"shard_{i}.txt")

    # Launch worker processes
    processes = []
    for i, chunk in enumerate(chunks):
        shard_output = str(config.DATA_DIR / f"scores_diwan_haiku_shard_{i}.parquet")
        id_file = str(id_list_dir / f"shard_{i}.txt")

        cmd = [
            sys.executable, "-m",
            "poetry_quality_and_curation.retriever_and_quality_curator.02_score_poems",
            "--model", args.model,
            "--source", "diwan",
            "--batch-size", str(args.batch_size),
            "--concurrency", str(args.concurrency),
            "--max-cost", str(per_worker_cost),
            "--prompt", args.prompt,
            "--resume",
            "--output", shard_output,
            "--id-file", id_file,
        ]
        print(f"\nStarting worker {i}: {len(chunk)} poems -> {shard_output}")
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(Path(__file__).resolve().parents[2]),
        )
        processes.append((i, proc))

    # Monitor progress
    print(f"\n{'='*60}")
    print(f"All {args.workers} workers started. Monitoring...")
    print(f"{'='*60}\n")

    def handle_sigint(signum, frame):
        print("\n\nInterrupt received! Terminating workers...")
        for i, proc in processes:
            proc.terminate()
        print("Workers terminated. Merging partial results...")
        merge_shards(main_output, config.DATA_DIR)
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_sigint)

    # Wait for all processes, streaming output
    finished = set()
    while len(finished) < len(processes):
        for i, proc in processes:
            if i in finished:
                continue
            retcode = proc.poll()
            if retcode is not None:
                finished.add(i)
                # Read remaining output
                remaining = proc.stdout.read()
                if remaining:
                    for line in remaining.strip().split("\n")[-5:]:
                        print(f"  [worker {i}] {line}")
                status = "completed" if retcode == 0 else f"failed (code {retcode})"
                print(f"Worker {i} {status}")

        if len(finished) < len(processes):
            # Print a periodic status line
            import time
            time.sleep(5)

    # Merge all shards
    print(f"\n{'='*60}")
    print("All workers done. Merging shards...")
    print(f"{'='*60}")
    merge_shards(main_output, config.DATA_DIR)

    # Print final stats
    if main_output.exists():
        final_df = pd.read_parquet(main_output)
        print(f"\nFinal stats:")
        print(f"  Total scored: {len(final_df)}")
        print(f"  Mean score: {final_df['quality_score'].mean():.1f}")
        print(f"  Std dev: {final_df['quality_score'].std():.1f}")
        print(f"  Score range: {final_df['quality_score'].min()}-{final_df['quality_score'].max()}")

    # Clean up ID lists
    import shutil
    shutil.rmtree(id_list_dir, ignore_errors=True)


if __name__ == "__main__":
    main()
