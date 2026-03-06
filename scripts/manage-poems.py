#!/usr/bin/env python3
"""Unified pipeline for poem diacritization workflow.

Single entry point for the full tashkeel pipeline. Each subcommand is idempotent.

Usage:
    python scripts/manage-poems.py export          # DB -> parquet
    python scripts/manage-poems.py diacritize      # Mishkal processing
    python scripts/manage-poems.py audit           # Quality checks
    python scripts/manage-poems.py postprocess     # Apply fix rules
    python scripts/manage-poems.py upload          # Parquet -> DB
    python scripts/manage-poems.py run-all         # Full pipeline
"""
import os
import sys
import subprocess
import argparse
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent
DATA_DIR = SCRIPTS_DIR / "diacritize-data"
RAW_PARQUET = DATA_DIR / "poems_raw.parquet"
DIACRITIZED_COMPLETE = DATA_DIR / "poems_diacritized_complete.parquet"
DIACRITIZED_FINAL = DATA_DIR / "poems_diacritized_final.parquet"


def run_cmd(cmd, check=True):
    """Run a command and return the result."""
    print(f"\n{'='*60}")
    print(f"Running: {' '.join(cmd)}")
    print(f"{'='*60}")
    result = subprocess.run(cmd, check=check)
    return result.returncode == 0


def cmd_export(args):
    """Export poems from database to parquet."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is required for export")
        sys.exit(1)

    try:
        import psycopg2
        import pandas as pd
    except ImportError:
        print("Error: Install deps: pip install -r scripts/requirements-diacritize.txt")
        sys.exit(1)

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    if RAW_PARQUET.exists() and not args.force:
        print(f"Raw parquet already exists: {RAW_PARQUET}")
        print("Use --force to re-export")
        return

    conn = psycopg2.connect(db_url)
    df = pd.read_sql("SELECT id, content FROM poems ORDER BY id", conn)
    conn.close()

    df.to_parquet(RAW_PARQUET, index=False)
    print(f"Exported {len(df)} poems to {RAW_PARQUET}")


def cmd_diacritize(args):
    """Run batch diacritization on poems."""
    if not RAW_PARQUET.exists():
        print(f"Error: {RAW_PARQUET} not found. Run 'export' first.")
        sys.exit(1)

    cmd = [
        sys.executable, str(SCRIPTS_DIR / "batch-diacritize.py"),
        "--resume",
        "--workers", str(args.workers),
        "--max-chars", str(args.max_chars),
    ]
    run_cmd(cmd)


def cmd_audit(args):
    """Run quality audit on diacritized poems."""
    input_file = DIACRITIZED_FINAL if DIACRITIZED_FINAL.exists() else DIACRITIZED_COMPLETE
    if not input_file.exists():
        print(f"Error: No diacritized parquet found. Run 'diacritize' first.")
        sys.exit(1)

    cmd = [
        sys.executable, str(SCRIPTS_DIR / "audit-tashkeel.py"),
        "--input", str(input_file),
        "--raw-parquet", str(RAW_PARQUET),
    ]
    run_cmd(cmd)


def cmd_postprocess(args):
    """Apply post-processing fixes."""
    if not DIACRITIZED_COMPLETE.exists():
        print(f"Error: {DIACRITIZED_COMPLETE} not found. Run 'diacritize' first.")
        sys.exit(1)

    cmd = [
        sys.executable, str(SCRIPTS_DIR / "postprocess-tashkeel.py"),
        "--input", str(DIACRITIZED_COMPLETE),
        "--output", str(DIACRITIZED_FINAL),
    ]
    if args.dry_run:
        cmd.append("--dry-run")
    run_cmd(cmd)


def cmd_upload(args):
    """Upload diacritized poems to database."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: DATABASE_URL environment variable is required for upload")
        sys.exit(1)

    input_file = DIACRITIZED_FINAL if DIACRITIZED_FINAL.exists() else DIACRITIZED_COMPLETE
    if not input_file.exists():
        print(f"Error: No diacritized parquet found. Run 'diacritize' first.")
        sys.exit(1)

    cmd = [
        sys.executable, str(SCRIPTS_DIR / "upload-diacritized.py"),
        "--input", str(input_file),
        "--batch-size", str(args.batch_size),
    ]
    if args.dry_run:
        cmd.append("--dry-run")
    run_cmd(cmd)


def cmd_run_all(args):
    """Run full pipeline: export -> diacritize -> postprocess -> audit -> upload."""
    print("Running full tashkeel pipeline...")

    # Export (skip if parquet exists and not forced)
    if not RAW_PARQUET.exists() or args.force:
        cmd_export(args)
    else:
        print(f"\nSkipping export: {RAW_PARQUET} exists. Use --force to re-export.")

    # Diacritize
    cmd_diacritize(args)

    # Post-process
    cmd_postprocess(args)

    # Audit (on final output)
    cmd_audit(args)

    # Upload (only if not dry-run)
    if not args.dry_run:
        cmd_upload(args)
    else:
        print("\n[DRY RUN] Skipping upload.")

    print(f"\n{'='*60}")
    print("Pipeline complete!")
    print(f"{'='*60}")


def main():
    parser = argparse.ArgumentParser(
        description="Unified pipeline for poem diacritization workflow"
    )
    subparsers = parser.add_subparsers(dest="command", help="Pipeline step to run")

    # Export
    p_export = subparsers.add_parser("export", help="Export poems from DB to parquet")
    p_export.add_argument("--force", action="store_true",
                          help="Re-export even if parquet exists")

    # Diacritize
    p_dia = subparsers.add_parser("diacritize", help="Run batch diacritization")
    p_dia.add_argument("--workers", type=int, default=4)
    p_dia.add_argument("--max-chars", type=int, default=5012)

    # Audit
    subparsers.add_parser("audit", help="Run quality audit")

    # Postprocess
    p_post = subparsers.add_parser("postprocess", help="Apply post-processing fixes")
    p_post.add_argument("--dry-run", action="store_true")

    # Upload
    p_upload = subparsers.add_parser("upload", help="Upload to database")
    p_upload.add_argument("--batch-size", type=int, default=2000)
    p_upload.add_argument("--dry-run", action="store_true")

    # Run-all
    p_all = subparsers.add_parser("run-all", help="Full pipeline")
    p_all.add_argument("--force", action="store_true")
    p_all.add_argument("--workers", type=int, default=4)
    p_all.add_argument("--max-chars", type=int, default=5012)
    p_all.add_argument("--batch-size", type=int, default=2000)
    p_all.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "export": cmd_export,
        "diacritize": cmd_diacritize,
        "audit": cmd_audit,
        "postprocess": cmd_postprocess,
        "upload": cmd_upload,
        "run-all": cmd_run_all,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
