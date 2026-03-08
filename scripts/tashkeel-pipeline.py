#!/usr/bin/env python3
"""Arabic diacritization (tashkeel) pipeline for poetry recitation.

End-to-end pipeline: export poems from DB, diacritize with Mishkal,
post-process to fix known issues, audit quality, generate reports,
and upload back to the database.

Usage:
    python scripts/tashkeel-pipeline.py export          # DB -> parquet
    python scripts/tashkeel-pipeline.py diacritize      # Mishkal processing
    python scripts/tashkeel-pipeline.py postprocess     # Apply 8 fix rules
    python scripts/tashkeel-pipeline.py audit           # Quality checks
    python scripts/tashkeel-pipeline.py report          # Generate HTML analysis report
    python scripts/tashkeel-pipeline.py showcase        # Generate before/after poet showcase
    python scripts/tashkeel-pipeline.py upload          # Parquet -> DB
    python scripts/tashkeel-pipeline.py run-all         # Full pipeline (export through upload)
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
REPORT_HTML = DATA_DIR / "tashkeel-report.html"
SHOWCASE_HTML = DATA_DIR / "tashkeel-showcase.html"


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
    if args.only_missing:
        query = "SELECT id, content FROM poems WHERE diacritized_content IS NULL ORDER BY id"
    else:
        query = "SELECT id, content FROM poems ORDER BY id"
    df = pd.read_sql(query, conn)
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


def cmd_report(args):
    """Generate HTML analysis report with pipeline statistics."""
    cmd = [
        sys.executable, str(SCRIPTS_DIR / "generate-tashkeel-report.py"),
        "--output", str(args.output),
        "--with-samples",
    ]
    run_cmd(cmd)
    print(f"\nReport generated: {args.output}")
    if args.open:
        subprocess.run(["open", str(args.output)], check=False)


def cmd_showcase(args):
    """Generate before/after poet showcase HTML.

    Requires showcase-data.json in diacritize-data/ (generated during
    the initial pipeline run with famous poet samples).
    """
    showcase_data = DATA_DIR / "showcase-data.json"
    if not showcase_data.exists():
        print(f"Error: {showcase_data} not found.")
        print("The showcase data is generated separately with poet samples from the DB.")
        sys.exit(1)

    # The report generator handles showcase when --with-samples is passed
    # and showcase-data.json exists. Generate the standalone showcase too.
    cmd = [
        sys.executable, str(SCRIPTS_DIR / "generate-tashkeel-report.py"),
        "--output", str(args.output),
        "--with-samples",
    ]
    run_cmd(cmd)
    print(f"\nShowcase generated: {args.output}")
    if args.open:
        subprocess.run(["open", str(args.output)], check=False)


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
    if args.resume:
        cmd.append("--resume")
    if args.dry_run:
        cmd.append("--dry-run")
    if args.verify:
        cmd.append("--verify")
    run_cmd(cmd)


def cmd_run_all(args):
    """Run full pipeline: export -> diacritize -> postprocess -> audit -> report -> upload."""
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

    # Report
    cmd_report(args)

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
        description="Arabic diacritization (tashkeel) pipeline for poetry recitation"
    )
    subparsers = parser.add_subparsers(dest="command", help="Pipeline step to run")

    # Export
    p_export = subparsers.add_parser("export", help="Export poems from DB to parquet")
    p_export.add_argument("--force", action="store_true",
                          help="Re-export even if parquet exists")
    p_export.add_argument("--only-missing", action="store_true",
                          help="Only export poems where diacritized_content IS NULL")

    # Diacritize
    p_dia = subparsers.add_parser("diacritize", help="Run Mishkal batch diacritization")
    p_dia.add_argument("--workers", type=int, default=4)
    p_dia.add_argument("--max-chars", type=int, default=5012)

    # Postprocess
    p_post = subparsers.add_parser("postprocess", help="Apply 8 post-processing fix rules")
    p_post.add_argument("--dry-run", action="store_true")

    # Audit
    subparsers.add_parser("audit", help="Run quality audit on diacritized output")

    # Report
    p_report = subparsers.add_parser("report", help="Generate HTML analysis report")
    p_report.add_argument("--output", type=str, default=str(REPORT_HTML),
                          help=f"Output path (default: {REPORT_HTML})")
    p_report.add_argument("--open", action="store_true",
                          help="Open report in browser after generating")

    # Showcase
    p_showcase = subparsers.add_parser("showcase",
                                       help="Generate before/after poet showcase HTML")
    p_showcase.add_argument("--output", type=str, default=str(SHOWCASE_HTML),
                            help=f"Output path (default: {SHOWCASE_HTML})")
    p_showcase.add_argument("--open", action="store_true",
                            help="Open showcase in browser after generating")

    # Upload
    p_upload = subparsers.add_parser("upload", help="Upload diacritized poems to DB")
    p_upload.add_argument("--batch-size", type=int, default=2000)
    p_upload.add_argument("--dry-run", action="store_true")
    p_upload.add_argument("--resume", action="store_true",
                          help="Resume from checkpoint")
    p_upload.add_argument("--verify", action="store_true",
                          help="Verify DB state after upload")

    # Run-all
    p_all = subparsers.add_parser("run-all", help="Full pipeline: export through upload")
    p_all.add_argument("--force", action="store_true")
    p_all.add_argument("--only-missing", action="store_true",
                       help="Only export poems where diacritized_content IS NULL")
    p_all.add_argument("--workers", type=int, default=4)
    p_all.add_argument("--max-chars", type=int, default=5012)
    p_all.add_argument("--batch-size", type=int, default=2000)
    p_all.add_argument("--dry-run", action="store_true")
    p_all.add_argument("--open", action="store_true",
                       help="Open report in browser after generating")
    p_all.add_argument("--output", type=str, default=str(REPORT_HTML))
    p_all.add_argument("--resume", action="store_true")
    p_all.add_argument("--verify", action="store_true")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    commands = {
        "export": cmd_export,
        "diacritize": cmd_diacritize,
        "audit": cmd_audit,
        "postprocess": cmd_postprocess,
        "report": cmd_report,
        "showcase": cmd_showcase,
        "upload": cmd_upload,
        "run-all": cmd_run_all,
    }

    commands[args.command](args)


if __name__ == "__main__":
    main()
