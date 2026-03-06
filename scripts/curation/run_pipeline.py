#!/usr/bin/env python3
"""Arabic Poetry Curation Pipeline - Single entry point orchestrator.

Chains the pipeline steps: download -> score -> recalibrate -> select -> import.

Usage:
    # Full pipeline
    python scripts/curation/run_pipeline.py --full

    # Score only (assumes data already downloaded)
    python scripts/curation/run_pipeline.py --score-only

    # Re-select and import (assumes scores exist)
    python scripts/curation/run_pipeline.py --select-only

    # Just import from existing final_selection.parquet
    python scripts/curation/run_pipeline.py --import-only

    # Dry run (validate data, no API calls or DB writes)
    python scripts/curation/run_pipeline.py --full --dry-run
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

# Add project root to path so `scripts.curation.*` imports work
# whether this is invoked directly or via `python -m`
_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from scripts.curation.config import (
    DATA_DIR,
    DEFAULT_HAIKU_MODEL,
    DEFAULT_OPUS_MODEL,
    TARGET_FINAL_COUNT,
)

SCRIPTS_DIR = Path(__file__).parent


def parse_args():
    parser = argparse.ArgumentParser(
        description="Arabic Poetry Curation Pipeline - orchestrator"
    )

    # Mode flags (mutually exclusive)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--full", action="store_true",
                      help="Run all steps: download -> score -> recalibrate -> select -> import")
    mode.add_argument("--score-only", action="store_true",
                      help="Skip download, run scoring -> recalibrate -> select -> import")
    mode.add_argument("--select-only", action="store_true",
                      help="Skip download + scoring, run recalibrate -> select -> import")
    mode.add_argument("--import-only", action="store_true",
                      help="Just import from existing final_selection.parquet")

    # Global options
    parser.add_argument("--dry-run", action="store_true",
                        help="Validate data exists, don't call APIs or write DB")
    parser.add_argument("--haiku-model", default=DEFAULT_HAIKU_MODEL,
                        help=f"LiteLLM model for initial scoring pass (default: {DEFAULT_HAIKU_MODEL})")
    parser.add_argument("--opus-model", default=DEFAULT_OPUS_MODEL,
                        help=f"LiteLLM model for calibration pass (default: {DEFAULT_OPUS_MODEL})")
    parser.add_argument("--haiku-budget", type=float, default=40,
                        help="Max $ for haiku scoring (default: 40)")
    parser.add_argument("--opus-budget", type=float, default=60,
                        help="Max $ for opus scoring (default: 60)")
    parser.add_argument("--target", type=int, default=TARGET_FINAL_COUNT,
                        help=f"Final poem count (default: {TARGET_FINAL_COUNT})")
    parser.add_argument("--skip-opus", action="store_true",
                        help="Skip Opus calibration pass (use Haiku scores directly)")
    parser.add_argument("--skip-migration", action="store_true",
                        help="Don't mention the SQL migration step")

    return parser.parse_args()


def run_step(script_name: str, args_list: list[str], dry_run: bool = False) -> bool:
    """Run a pipeline step script as a subprocess.

    Returns True if the step succeeded, False otherwise.
    """
    script_path = SCRIPTS_DIR / script_name
    if not script_path.exists():
        print(f"ERROR: Script not found: {script_path}")
        return False

    cmd = [sys.executable, "-m", f"scripts.curation.{script_path.stem}"] + args_list

    if dry_run:
        print(f"  [DRY RUN] Would run: {' '.join(cmd)}")
        return True

    print(f"\n{'=' * 60}")
    print(f"Running: {script_name}")
    print(f"{'=' * 60}")

    start = time.time()
    result = subprocess.run(cmd)
    elapsed = time.time() - start

    if result.returncode != 0:
        print(f"ERROR: {script_name} failed with exit code {result.returncode}")
        return False

    print(f"[done] {script_name} completed ({elapsed:.0f}s)")
    return True


def check_file_exists(path: Path, label: str) -> bool:
    """Check if a required data file exists."""
    if path.exists():
        size_mb = path.stat().st_size / (1024 * 1024)
        print(f"  [ok] {label}: {path.name} ({size_mb:.1f} MB)")
        return True
    print(f"  [missing] {label}: {path}")
    return False


def run_pipeline(args):
    """Execute the pipeline based on the selected mode."""
    pipeline_start = time.time()
    step_times = {}

    haiku_slug = args.haiku_model.replace("/", "_")
    opus_slug = args.opus_model.replace("/", "_")

    haiku_scores_path = DATA_DIR / f"scores_{haiku_slug}.parquet"
    opus_scores_path = DATA_DIR / f"scores_{opus_slug}.parquet"
    calibrated_path = DATA_DIR / "scores_calibrated.parquet"
    final_path = DATA_DIR / "final_selection.parquet"
    diwan_path = DATA_DIR / "diwan_processed.parquet"

    print("=" * 60)
    print("ARABIC POETRY CURATION PIPELINE")
    print("=" * 60)
    print(f"  Mode:         {'full' if args.full else 'score-only' if args.score_only else 'select-only' if args.select_only else 'import-only'}")
    print(f"  Haiku model:  {args.haiku_model}")
    print(f"  Opus model:   {args.opus_model}")
    print(f"  Target count: {args.target}")
    print(f"  Skip Opus:    {args.skip_opus}")
    print(f"  Dry run:      {args.dry_run}")
    print()

    # -- Migration reminder --
    if not args.skip_migration and not args.dry_run:
        print("NOTE: Ensure the database migration has been applied before importing.")
        print("  Run: psql $DATABASE_URL -f supabase/migrations/<curation_migration>.sql")
        print()

    # -- Step 1: Download Diwan --
    if args.full:
        print("[Step 1/6] Download Diwan dataset")
        step_start = time.time()
        dl_args = []
        if args.dry_run:
            # Just check if cached file exists
            print(f"  [DRY RUN] Would download Diwan dataset to {DATA_DIR}")
            check_file_exists(DATA_DIR / "diwan_raw.csv", "Cached CSV")
        else:
            if not run_step("01_download_diwan.py", dl_args, dry_run=False):
                print("Pipeline aborted at Step 1.")
                return False
        step_times["download"] = time.time() - step_start
    else:
        if not args.import_only:
            print("[Step 1] Download: SKIPPED")
            if not check_file_exists(diwan_path, "Diwan processed"):
                if not args.select_only and not args.import_only:
                    print("WARNING: Diwan data not found. Scoring will only use DB poems.")

    # -- Step 2: Score all poems with Haiku --
    if args.full or args.score_only:
        print(f"\n[Step 2/6] Score all poems with {args.haiku_model}")
        step_start = time.time()
        score_args = [
            "--model", args.haiku_model,
            "--scope", "all",
            "--max-cost", str(args.haiku_budget),
        ]
        if args.dry_run:
            score_args.append("--dry-run")
        if not run_step("02_score_poems.py", score_args, dry_run=False):
            print("Pipeline aborted at Step 2.")
            return False
        step_times["score_haiku"] = time.time() - step_start
    else:
        print("[Step 2] Score (Haiku): SKIPPED")
        check_file_exists(haiku_scores_path, "Haiku scores")

    # -- Step 3: Score top poems with Opus --
    if not args.skip_opus and (args.full or args.score_only):
        print(f"\n[Step 3/6] Score top poems with {args.opus_model}")
        step_start = time.time()
        opus_args = [
            "--model", args.opus_model,
            "--scope", "top",
            "--top-k", "5000",
            "--max-cost", str(args.opus_budget),
            "--prompt-mode", "detailed",
        ]
        if args.dry_run:
            opus_args.append("--dry-run")
        if not run_step("02_score_poems.py", opus_args, dry_run=False):
            print("Pipeline aborted at Step 3.")
            return False
        step_times["score_opus"] = time.time() - step_start
    else:
        reason = "skip-opus" if args.skip_opus else "mode"
        print(f"[Step 3] Score (Opus): SKIPPED ({reason})")

    # -- Step 4: Recalibrate --
    if not args.skip_opus and (args.full or args.score_only or args.select_only):
        print("\n[Step 4/6] Recalibrate scores")
        step_start = time.time()

        # Verify input files exist
        if not args.dry_run:
            if not haiku_scores_path.exists():
                print(f"ERROR: Haiku scores not found at {haiku_scores_path}")
                print("Pipeline aborted at Step 4.")
                return False
            if not opus_scores_path.exists():
                print(f"ERROR: Opus scores not found at {opus_scores_path}")
                print("Pipeline aborted at Step 4.")
                return False

        recal_args = [
            "--base-scores", str(haiku_scores_path),
            "--calibration-scores", str(opus_scores_path),
        ]
        if not run_step("03_recalibrate.py", recal_args, dry_run=args.dry_run):
            print("Pipeline aborted at Step 4.")
            return False
        step_times["recalibrate"] = time.time() - step_start
    else:
        if args.skip_opus:
            print("[Step 4] Recalibrate: SKIPPED (--skip-opus)")
            # When skipping opus, use haiku scores directly as calibrated
            if not args.dry_run and haiku_scores_path.exists() and not calibrated_path.exists():
                import shutil
                shutil.copy2(haiku_scores_path, calibrated_path)
                print(f"  Copied haiku scores to {calibrated_path.name} (no calibration)")
        else:
            print("[Step 4] Recalibrate: SKIPPED")
            check_file_exists(calibrated_path, "Calibrated scores")

    # -- Step 5: Select final poems --
    if not args.import_only:
        print(f"\n[Step 5/6] Select final {args.target} poems")
        step_start = time.time()
        select_args = ["--target", str(args.target)]

        # Use haiku scores directly if opus was skipped
        if args.skip_opus and haiku_scores_path.exists():
            select_args.extend(["--input", str(haiku_scores_path)])

        if not run_step("04_select_final.py", select_args, dry_run=args.dry_run):
            print("Pipeline aborted at Step 5.")
            return False
        step_times["select"] = time.time() - step_start
    else:
        print("[Step 5] Select: SKIPPED")
        if not check_file_exists(final_path, "Final selection"):
            print("ERROR: final_selection.parquet required for --import-only mode")
            return False

    # -- Step 6: Import to database --
    print("\n[Step 6/6] Import to production database")
    step_start = time.time()
    import_args = []
    if args.dry_run:
        import_args.append("--dry-run")
    if not run_step("05_import_poems.py", import_args, dry_run=False):
        print("Pipeline aborted at Step 6.")
        return False
    step_times["import"] = time.time() - step_start

    # -- Pipeline report --
    total_elapsed = time.time() - pipeline_start
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print(f"\nStep timings:")
    for step, elapsed in step_times.items():
        print(f"  {step:<20} {elapsed:>8.0f}s")
    print(f"  {'─' * 30}")
    print(f"  {'total':<20} {total_elapsed:>8.0f}s")
    print()

    return True


def main():
    args = parse_args()
    success = run_pipeline(args)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
