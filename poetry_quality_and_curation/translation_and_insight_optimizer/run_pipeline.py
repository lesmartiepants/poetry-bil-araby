#!/usr/bin/env python3
"""Translation & Insight Quality Optimizer — Pipeline Orchestrator.

Chains: sample -> generate -> score -> compare -> optimize -> report -> update prompts.

Usage:
    # Full pipeline
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.run_pipeline --full

    # Generate translations only
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.run_pipeline --generate-only

    # Score existing translations
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.run_pipeline --score-only

    # Run DSPy optimization only
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.run_pipeline --optimize-only

    # Generate report only
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.run_pipeline --report-only
"""
import argparse
import subprocess
import sys
import time
from pathlib import Path

_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from poetry_quality_and_curation.translation_and_insight_optimizer.config import (
    DATA_DIR,
    DEFAULT_HAIKU_MODEL,
    DEFAULT_SONNET_MODEL,
    DEFAULT_OPUS_MODEL,
    OPUS_SAMPLE,
    SONNET_SAMPLE,
    HAIKU_SAMPLE,
)

MODULE_BASE = "poetry_quality_and_curation.translation_and_insight_optimizer"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Translation & Insight Quality Optimizer — orchestrator"
    )

    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--full", action="store_true",
                      help="Run all steps: sample -> generate -> score -> compare -> optimize -> report")
    mode.add_argument("--generate-only", action="store_true",
                      help="Sample + generate translations only")
    mode.add_argument("--score-only", action="store_true",
                      help="Score existing translations only")
    mode.add_argument("--optimize-only", action="store_true",
                      help="Run DSPy optimization only")
    mode.add_argument("--report-only", action="store_true",
                      help="Generate comparison report only")

    parser.add_argument("--tier", choices=["opus", "sonnet", "haiku", "all"], default="all",
                        help="Which tier(s) to process (default: all)")
    parser.add_argument("--concurrency", type=int, default=10,
                        help="Parallel API requests (default: 10)")
    parser.add_argument("--max-cost", type=float, default=50,
                        help="Dollar cap per generation step (default: 50)")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed for sampling (default: 42)")
    parser.add_argument("--resume", action="store_true",
                        help="Resume from last checkpoint")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print what would be done without calling APIs")
    parser.add_argument("--num-trials", type=int, default=20,
                        help="DSPy optimization trials per optimizer (default: 20)")

    return parser.parse_args()


def run_step(module_name: str, args_list: list[str], label: str, dry_run: bool = False) -> bool:
    """Run a pipeline step as a subprocess."""
    cmd = [sys.executable, "-m", f"{MODULE_BASE}.{module_name}"] + args_list

    if dry_run:
        print(f"  [DRY RUN] Would run: {' '.join(cmd)}")
        return True

    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"{'=' * 60}")

    start = time.time()
    result = subprocess.run(cmd, cwd=str(_project_root))
    elapsed = time.time() - start

    if result.returncode != 0:
        print(f"ERROR: {module_name} failed with exit code {result.returncode}")
        return False

    print(f"[done] {label} ({elapsed:.0f}s)")
    return True


def check_file(path: Path, label: str) -> bool:
    """Check if a required data file exists."""
    if path.exists():
        size_kb = path.stat().st_size / 1024
        print(f"  [ok] {label}: {path.name} ({size_kb:.1f} KB)")
        return True
    print(f"  [missing] {label}: {path}")
    return False


def get_tiers(tier_arg: str) -> list[tuple[str, str, int]]:
    """Return list of (tier_name, model, sample_size) tuples."""
    all_tiers = [
        ("opus", DEFAULT_OPUS_MODEL, OPUS_SAMPLE),
        ("sonnet", DEFAULT_SONNET_MODEL, SONNET_SAMPLE),
        ("haiku", DEFAULT_HAIKU_MODEL, HAIKU_SAMPLE),
    ]
    if tier_arg == "all":
        return all_tiers
    return [t for t in all_tiers if t[0] == tier_arg]


def run_pipeline(args):
    """Execute the pipeline based on selected mode."""
    pipeline_start = time.time()
    step_times = {}
    tiers = get_tiers(args.tier)

    print("=" * 60)
    print("TRANSLATION & INSIGHT QUALITY OPTIMIZER")
    print("=" * 60)
    mode = "full" if args.full else (
        "generate-only" if args.generate_only else (
            "score-only" if args.score_only else (
                "optimize-only" if args.optimize_only else "report-only")))
    print(f"  Mode:        {mode}")
    print(f"  Tiers:       {[t[0] for t in tiers]}")
    print(f"  Concurrency: {args.concurrency}")
    print(f"  Max cost:    ${args.max_cost}")
    print(f"  Seed:        {args.seed}")
    print(f"  Resume:      {args.resume}")
    print(f"  Dry run:     {args.dry_run}")
    print()

    # -- Step 1: Sample poems --
    if args.full or args.generate_only:
        print("[Step 1] Sample poems")
        step_start = time.time()
        sample_args = ["--tier", args.tier, "--seed", str(args.seed)]
        if args.dry_run:
            sample_args.append("--dry-run")
        if not run_step("01_sample_poems", sample_args, "Sample diverse poems", args.dry_run):
            return False
        step_times["sample"] = time.time() - step_start
    else:
        print("[Step 1] Sample: SKIPPED")

    # -- Step 2: Generate translations (per tier) --
    if args.full or args.generate_only:
        for tier_name, model, _sample_size in tiers:
            print(f"\n[Step 2] Generate translations — {tier_name}")
            step_start = time.time()
            gen_args = [
                "--model", model,
                "--tier", tier_name,
                "--concurrency", str(args.concurrency),
                "--max-cost", str(args.max_cost),
            ]
            if args.resume:
                gen_args.append("--resume")
            if not run_step("02_generate_translations", gen_args,
                            f"Generate {tier_name} translations", args.dry_run):
                return False
            step_times[f"generate_{tier_name}"] = time.time() - step_start

    # -- Step 3: Score translations (per tier) --
    if args.full or args.score_only:
        for tier_name, model, _sample_size in tiers:
            print(f"\n[Step 3] Score translations — {tier_name}")
            step_start = time.time()
            score_args = [
                "--model", model,
                "--tier", tier_name,
                "--concurrency", str(args.concurrency),
            ]
            if args.resume:
                score_args.append("--resume")
            if not run_step("03_score_translations", score_args,
                            f"Score {tier_name} translations", args.dry_run):
                return False
            step_times[f"score_{tier_name}"] = time.time() - step_start

    # -- Step 4: Compare and select winners --
    if args.full or args.report_only:
        print("\n[Step 4] Compare and select winners")
        step_start = time.time()
        compare_args = ["--tier", args.tier]
        if not run_step("04_compare_and_select", compare_args,
                        "Compare synthesized vs baseline", args.dry_run):
            return False
        step_times["compare"] = time.time() - step_start

    # -- Step 5: DSPy optimization --
    if args.full or args.optimize_only:
        for optimizer in ["mipro", "simba", "bootstrap"]:
            print(f"\n[Step 5] DSPy optimization — {optimizer}")
            step_start = time.time()
            opt_args = [
                "--optimizer", optimizer,
                "--num-trials", str(args.num_trials),
            ]
            if not run_step("07_optimize_prompts", opt_args,
                            f"Optimize with {optimizer}", args.dry_run):
                print(f"  WARNING: {optimizer} optimization failed, continuing...")
            step_times[f"optimize_{optimizer}"] = time.time() - step_start

    # -- Step 6: Generate report --
    if args.full or args.report_only:
        print("\n[Step 6] Generate HTML report")
        step_start = time.time()
        if not run_step("05_generate_report", [],
                        "Generate comparison report", args.dry_run):
            return False
        step_times["report"] = time.time() - step_start

    # -- Pipeline report --
    total_elapsed = time.time() - pipeline_start
    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60)
    print("\nStep timings:")
    for step, elapsed in step_times.items():
        print(f"  {step:<25} {elapsed:>8.0f}s")
    print(f"  {'─' * 35}")
    print(f"  {'total':<25} {total_elapsed:>8.0f}s")
    print()

    return True


def main():
    args = parse_args()
    success = run_pipeline(args)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
