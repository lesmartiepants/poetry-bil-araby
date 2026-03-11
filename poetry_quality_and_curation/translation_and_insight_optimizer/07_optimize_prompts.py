"""DSPy-based prompt optimization for translation & insight quality.

Compares three DSPy optimizers (MIPROv2, SIMBA, BootstrapFewShot) to find
the best prompt for each expert persona and for the single-prompt variant.

Usage:
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.07_optimize_prompts \
        --optimizer mipro --num-trials 20
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.07_optimize_prompts \
        --optimizer simba --num-trials 20
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.07_optimize_prompts \
        --optimizer bootstrap --num-trials 20
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.07_optimize_prompts \
        --compare  # Compare all optimizers and generate summary
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import dspy
import numpy as np
import pandas as pd

from poetry_quality_and_curation.translation_and_insight_optimizer import config
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring


DATA_DIR = config.DATA_DIR

OPTIMIZER_CHOICES = ["mipro", "simba", "bootstrap"]

PERSONA_CHOICES = ["single_prompt", "bridge", "scholar", "craftsperson", "synthesizer"]


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    p = argparse.ArgumentParser(
        description="DSPy prompt optimization for translation quality"
    )
    p.add_argument("--optimizer", choices=OPTIMIZER_CHOICES,
                   help="Which optimizer to run (mipro, simba, or bootstrap)")
    p.add_argument("--persona", choices=PERSONA_CHOICES, default="single_prompt",
                   help="Which persona/prompt to optimize (default: single_prompt)")
    p.add_argument("--num-trials", type=int, default=20,
                   help="Number of optimization trials (default: 20)")
    p.add_argument("--temperature", type=float, default=0.3,
                   help="LLM temperature (default: 0.3)")
    p.add_argument("--compare", action="store_true",
                   help="Compare all optimizer results and generate summary")
    p.add_argument("--model", default=config.DEFAULT_SONNET_MODEL,
                   help=f"Student model to optimize (default: {config.DEFAULT_SONNET_MODEL})")
    p.add_argument("--prompt-model", default=config.DEFAULT_SONNET_MODEL,
                   help=f"Model for SIMBA rule generation (default: {config.DEFAULT_SONNET_MODEL})")
    return p.parse_args()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_scored_translations() -> pd.DataFrame:
    """Load Opus-scored translations for train/val/test splits."""
    # Try pre-split files first
    train_path = DATA_DIR / "splits_train.parquet"
    val_path = DATA_DIR / "splits_val.parquet"
    test_path = DATA_DIR / "splits_test.parquet"

    if train_path.exists() and val_path.exists() and test_path.exists():
        train = pd.read_parquet(train_path)
        val = pd.read_parquet(val_path)
        test = pd.read_parquet(test_path)
        print(f"Loaded pre-split data: train={len(train)}, val={len(val)}, test={len(test)}")
        return train, val, test

    # Fall back to full scores file and do the split here
    opus_slug = config.DEFAULT_OPUS_MODEL.replace("/", "_")
    scores_path = DATA_DIR / f"scores_translations_{opus_slug}.parquet"
    if not scores_path.exists():
        print(f"ERROR: No scored translations found at {scores_path}")
        print("Run 03_score_translations.py with --tier opus first.")
        sys.exit(1)

    df = pd.read_parquet(scores_path)
    # Only use synthesized variant for optimization
    synth = df[df["variant"] == "synthesized"].copy()

    # Also need poem content — load from the translations file
    trans_path = DATA_DIR / f"translations_{opus_slug}_opus.parquet"
    if trans_path.exists():
        trans = pd.read_parquet(trans_path)
        synth = synth.merge(
            trans[["poem_id", "synthesized_poem", "synthesized_depth",
                   "synthesized_author", "humanized_depth", "humanized_author"]],
            on="poem_id", how="left"
        )

    # Split: 30 train / 10 val / 10 test (from 50 Opus poems)
    rng = np.random.RandomState(42)
    indices = rng.permutation(len(synth))
    n = len(synth)
    test_size = min(10, n // 5)
    val_size = min(10, n // 5)
    train_size = n - val_size - test_size

    train = synth.iloc[indices[:train_size]].reset_index(drop=True)
    val = synth.iloc[indices[train_size:train_size + val_size]].reset_index(drop=True)
    test = synth.iloc[indices[train_size + val_size:]].reset_index(drop=True)

    print(f"Split scored translations: train={len(train)}, val={len(val)}, test={len(test)}")
    return train, val, test


def load_poem_content(poem_ids: list[str]) -> dict[str, dict]:
    """Load poem content from PostgreSQL."""
    conn = config.get_db_connection()
    try:
        cur = conn.cursor()
        placeholders = ",".join(["%s"] * len(poem_ids))
        cur.execute(f"""
            SELECT p.id, p.title, p.content, po.name AS poet_name
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.id IN ({placeholders})
        """, [int(pid) for pid in poem_ids])
        return {
            str(r[0]): {
                "id": str(r[0]),
                "title": r[1] or "",
                "content": r[2] or "",
                "poet_name": r[3] or "",
            }
            for r in cur.fetchall()
        }
    finally:
        conn.close()


def build_dspy_examples(df: pd.DataFrame, poems: dict) -> list[dspy.Example]:
    """Build DSPy examples from scored translation data."""
    examples = []
    for _, row in df.iterrows():
        pid = str(row["poem_id"])
        poem = poems.get(pid)
        if not poem:
            continue

        poem_text = format_for_scoring(
            poem["id"], poem["title"], poem["content"], poem["poet_name"]
        )

        # Gold scores from the judge
        gold_scores = {}
        for dim in config.TRANSLATION_DIMENSIONS:
            gold_scores[dim] = int(row.get(dim, 50))
        for dim in config.INSIGHT_DIMENSIONS:
            gold_scores[dim] = int(row.get(dim, 50))
        gold_scores["ai_detection_score"] = int(row.get("ai_detection_score", 50))

        ex = dspy.Example(
            poem_text=poem_text,
            **gold_scores,
        ).with_inputs("poem_text")
        examples.append(ex)

    print(f"Built {len(examples)} DSPy examples")
    return examples


# ---------------------------------------------------------------------------
# DSPy Signatures & Modules
# ---------------------------------------------------------------------------

class SinglePromptTranslation(dspy.Signature):
    """You are an expert scholar of Arabic poetry and a gifted English prose stylist.
    Translate this Arabic poem and provide cultural insight.

    Produce exactly three sections:
    POEM: One English line per Arabic line, preserving imagery and emotional weight.
    THE DEPTH: 3-5 sentences explaining the poem's meaning, metaphors, and literary significance.
    THE AUTHOR: 3-4 sentences about the poet's life, era, and standing.

    Write THE DEPTH and THE AUTHOR as compelling human prose — vary sentence lengths,
    lead with the most vivid observation, avoid hedging phrases like "It's worth noting",
    and never use sycophantic qualifiers like "remarkable" or "fascinating".
    """
    poem_text: str = dspy.InputField(desc="Arabic poem with title, poet, and verses")
    translation: str = dspy.OutputField(desc="POEM: section with 1:1 line translation")
    depth: str = dspy.OutputField(desc="THE DEPTH: section with cultural/literary analysis")
    author: str = dspy.OutputField(desc="THE AUTHOR: section with poet biography")

    # Score fields used by the metric (gold labels)
    faithfulness: int = dspy.OutputField(desc="Faithfulness score 0-100")
    poetic_craft: int = dspy.OutputField(desc="Poetic craft score 0-100")
    emotional_impact: int = dspy.OutputField(desc="Emotional impact score 0-100")
    cultural_bridge: int = dspy.OutputField(desc="Cultural bridge score 0-100")
    readability: int = dspy.OutputField(desc="Readability score 0-100")
    narrative_engagement: int = dspy.OutputField(desc="Narrative engagement score 0-100")
    depth_accuracy: int = dspy.OutputField(desc="Depth accuracy score 0-100")
    humanization: int = dspy.OutputField(desc="Humanization score 0-100")
    storybook_quality: int = dspy.OutputField(desc="Storybook quality score 0-100")
    ai_detection_score: int = dspy.OutputField(desc="AI detection score 0-100 (100=human)")


class TranslationModule(dspy.Module):
    """DSPy module for single-prompt translation optimization."""

    def __init__(self):
        super().__init__()
        self.translate = dspy.Predict(SinglePromptTranslation)

    def forward(self, poem_text: str):
        result = self.translate(poem_text=poem_text)
        # Clamp scores
        for dim in config.ALL_DIMENSIONS:
            val = getattr(result, dim, 50)
            try:
                val = int(val)
            except (ValueError, TypeError):
                val = 50
            setattr(result, dim, max(0, min(100, val)))
        return result


# ---------------------------------------------------------------------------
# Metric
# ---------------------------------------------------------------------------

def translation_quality_metric(example, prediction, trace=None) -> float:
    """Composite quality metric: 40% translation + 40% insight + 20% AI detection.

    Returns 0.0 (worst) to 1.0 (best), compatible with DSPy's maximization.
    """
    trans_errors = []
    for dim in config.TRANSLATION_DIMENSIONS:
        gold = getattr(example, dim, 50)
        pred_val = getattr(prediction, dim, 50)
        try:
            pred_val = int(pred_val)
        except (ValueError, TypeError):
            pred_val = 50
        trans_errors.append(abs(gold - pred_val))

    insight_errors = []
    for dim in config.INSIGHT_DIMENSIONS:
        gold = getattr(example, dim, 50)
        pred_val = getattr(prediction, dim, 50)
        try:
            pred_val = int(pred_val)
        except (ValueError, TypeError):
            pred_val = 50
        insight_errors.append(abs(gold - pred_val))

    ai_gold = getattr(example, "ai_detection_score", 50)
    ai_pred = getattr(prediction, "ai_detection_score", 50)
    try:
        ai_pred = int(ai_pred)
    except (ValueError, TypeError):
        ai_pred = 50
    ai_error = abs(ai_gold - ai_pred)

    # Weighted composite (lower error = better)
    trans_mae = np.mean(trans_errors)
    insight_mae = np.mean(insight_errors)
    weighted_error = (
        config.TRANSLATION_WEIGHT * trans_mae
        + config.INSIGHT_WEIGHT * insight_mae
        + config.AI_DETECTION_WEIGHT * ai_error
    )

    # Normalize to 0-1 (higher is better for DSPy)
    return 1.0 - (weighted_error / 100.0)


def compute_detailed_metrics(examples, module, label: str = "") -> dict:
    """Compute per-dimension and overall metrics."""
    dim_errors = {d: [] for d in config.ALL_DIMENSIONS}

    for ex in examples:
        try:
            pred = module(poem_text=ex.poem_text)
            for dim in config.ALL_DIMENSIONS:
                gold = getattr(ex, dim, 50)
                pred_val = getattr(pred, dim, 50)
                try:
                    pred_val = int(pred_val)
                except (ValueError, TypeError):
                    pred_val = 50
                dim_errors[dim].append(abs(gold - pred_val))
        except Exception as e:
            print(f"  Warning: prediction failed: {e}")

    result = {}
    all_errors = []
    for dim in config.ALL_DIMENSIONS:
        if dim_errors[dim]:
            result[f"mae_{dim}"] = float(np.mean(dim_errors[dim]))
            all_errors.extend(dim_errors[dim])
        else:
            result[f"mae_{dim}"] = 100.0

    result["mae_overall"] = float(np.mean(all_errors)) if all_errors else 100.0
    result["n_evaluated"] = len(all_errors) // len(config.ALL_DIMENSIONS) if all_errors else 0

    # Compute composite metric
    trans_maes = [result.get(f"mae_{d}", 100) for d in config.TRANSLATION_DIMENSIONS]
    insight_maes = [result.get(f"mae_{d}", 100) for d in config.INSIGHT_DIMENSIONS]
    ai_mae = result.get("mae_ai_detection_score", 100)
    result["composite_metric"] = 1.0 - (
        config.TRANSLATION_WEIGHT * np.mean(trans_maes)
        + config.INSIGHT_WEIGHT * np.mean(insight_maes)
        + config.AI_DETECTION_WEIGHT * ai_mae
    ) / 100.0

    if label:
        print(f"\n  {label}:")
        print(f"    n={result['n_evaluated']}, overall MAE={result['mae_overall']:.2f}")
        print(f"    composite metric={result['composite_metric']:.4f}")
        for dim in config.ALL_DIMENSIONS:
            print(f"    {dim}: MAE={result.get(f'mae_{dim}', 'N/A'):.2f}")

    return result


# ---------------------------------------------------------------------------
# Prompt progression extraction
# ---------------------------------------------------------------------------

def extract_prompt_info(optimized_module, history: dict) -> dict:
    """Extract optimized instructions, demos, and trial progression."""
    # Trial-level progression (MIPROv2)
    progression = []
    if hasattr(optimized_module, "trial_logs"):
        for trial_num in sorted(optimized_module.trial_logs.keys()):
            trial_data = optimized_module.trial_logs[trial_num]
            entry = {
                "trial": trial_num,
                "score": trial_data.get("full_eval_score"),
            }
            if "program" in trial_data:
                prog = trial_data["program"]
                if hasattr(prog, "translate") and hasattr(prog.translate, "signature"):
                    sig = prog.translate.signature
                    entry["instructions"] = getattr(sig, "instructions", "")
                if hasattr(prog, "translate") and hasattr(prog.translate, "demos"):
                    entry["num_demos"] = len(prog.translate.demos)
            progression.append(entry)
    history["prompt_progression"] = progression

    # Final optimized instructions
    if hasattr(optimized_module, "translate") and hasattr(optimized_module.translate, "signature"):
        sig = optimized_module.translate.signature
        instructions = getattr(sig, "instructions", str(sig.__doc__) if sig.__doc__ else "")
        history["optimized_instructions"] = instructions

    # Count demos
    num_demos = 0
    if hasattr(optimized_module, "translate") and hasattr(optimized_module.translate, "demos"):
        num_demos = len(optimized_module.translate.demos)
    history["num_demos"] = num_demos

    return history


# ---------------------------------------------------------------------------
# Optimizers
# ---------------------------------------------------------------------------

def run_mipro(module, train_examples, val_examples, num_trials: int) -> tuple:
    """Run MIPROv2 optimizer."""
    print(f"\n--- MIPROv2 ({num_trials} trials) ---")
    optimizer = dspy.MIPROv2(
        metric=translation_quality_metric,
        num_threads=1,
        max_bootstrapped_demos=3,
        max_labeled_demos=5,
        num_candidates=10,
        auto=None,
        verbose=True,
    )
    optimized = optimizer.compile(
        module,
        trainset=train_examples,
        num_trials=num_trials,
        minibatch=False,
    )
    return optimized, "mipro"


def run_simba(module, train_examples, val_examples, num_trials: int,
              prompt_model_id: str, api_base: str, api_key: str) -> tuple:
    """Run SIMBA optimizer."""
    print(f"\n--- SIMBA ({num_trials} steps) ---")
    prompt_lm = dspy.LM(
        prompt_model_id,
        api_base=api_base,
        api_key=api_key,
        temperature=0.7,
        max_tokens=2000,
    )
    optimizer = dspy.SIMBA(
        metric=translation_quality_metric,
        bsize=min(16, len(train_examples)),
        num_candidates=6,
        max_steps=num_trials,
        max_demos=4,
        prompt_model=prompt_lm,
        temperature_for_sampling=0.3,
        temperature_for_candidates=0.3,
    )
    optimized = optimizer.compile(
        module,
        trainset=train_examples,
        seed=42,
    )
    return optimized, "simba"


def run_bootstrap(module, train_examples, val_examples, num_trials: int) -> tuple:
    """Run BootstrapFewShot optimizer."""
    print(f"\n--- BootstrapFewShot ({num_trials} rounds) ---")
    optimizer = dspy.BootstrapFewShot(
        metric=translation_quality_metric,
        max_bootstrapped_demos=4,
        max_labeled_demos=6,
        max_rounds=num_trials,
    )
    optimized = optimizer.compile(
        module,
        trainset=train_examples,
    )
    return optimized, "bootstrap"


# ---------------------------------------------------------------------------
# Comparison
# ---------------------------------------------------------------------------

def compare_optimizers():
    """Load all optimizer results and generate comparison summary."""
    print("\n=== OPTIMIZER COMPARISON ===\n")

    results = {}
    for opt in OPTIMIZER_CHOICES:
        for persona in PERSONA_CHOICES:
            path = DATA_DIR / f"dspy_{opt}_{persona}_history.json"
            if path.exists():
                with open(path, encoding="utf-8") as f:
                    data = json.load(f)
                key = f"{opt}_{persona}"
                results[key] = data
                print(f"  Loaded: {key}")

    if not results:
        print("  No optimizer results found. Run optimizers first.")
        return

    # Build comparison table
    comparison = {
        "optimizers_compared": list(results.keys()),
        "per_optimizer": {},
    }

    for key, data in results.items():
        entry = {
            "optimizer": data.get("optimizer", "unknown"),
            "persona": data.get("persona", "unknown"),
            "num_trials": data.get("num_trials", 0),
            "elapsed_seconds": data.get("elapsed_seconds", 0),
            "num_demos": data.get("num_demos", 0),
        }

        # Baseline vs optimized
        baseline = data.get("baseline_eval_mae", {})
        optimized = data.get("optimized_eval_mae", {})
        entry["baseline_composite"] = baseline.get("composite_metric", 0)
        entry["optimized_composite"] = optimized.get("composite_metric", 0)
        entry["improvement"] = entry["optimized_composite"] - entry["baseline_composite"]
        entry["baseline_mae"] = baseline.get("mae_overall", 100)
        entry["optimized_mae"] = optimized.get("mae_overall", 100)

        comparison["per_optimizer"][key] = entry

    # Find overall winner
    if comparison["per_optimizer"]:
        winner_key = max(
            comparison["per_optimizer"],
            key=lambda k: comparison["per_optimizer"][k].get("optimized_composite", 0)
        )
        comparison["winner"] = winner_key
        comparison["winner_composite"] = comparison["per_optimizer"][winner_key]["optimized_composite"]

    # Print summary table
    print("\n  Optimizer           | Baseline  | Optimized | Improve | MAE    | Demos | Trials")
    print("  " + "-" * 85)
    for key, entry in sorted(comparison["per_optimizer"].items(),
                              key=lambda x: -x[1].get("optimized_composite", 0)):
        marker = " *" if key == comparison.get("winner") else "  "
        print(f"  {key:<20} | {entry['baseline_composite']:.4f}   | "
              f"{entry['optimized_composite']:.4f}   | {entry['improvement']:+.4f} | "
              f"{entry['optimized_mae']:.2f} | {entry['num_demos']:>5} | "
              f"{entry['num_trials']:>6}{marker}")

    if comparison.get("winner"):
        print(f"\n  Winner: {comparison['winner']} (composite={comparison['winner_composite']:.4f})")

    # Save comparison
    output_path = DATA_DIR / "optimizer_comparison.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(comparison, f, ensure_ascii=False, indent=2)
    print(f"\n  Comparison saved to {output_path}")

    return comparison


# ---------------------------------------------------------------------------
# Main optimization flow
# ---------------------------------------------------------------------------

def run_optimization(args):
    """Run a single optimizer for a persona."""
    optimizer_name = args.optimizer
    persona = args.persona

    output_path = DATA_DIR / f"dspy_{optimizer_name}_{persona}_history.json"

    print(f"=== Optimizing {persona} with {optimizer_name.upper()} ===")
    print(f"    Model: {args.model}")

    # Configure LM
    api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
    api_key = (os.environ.get("ANTHROPIC_API_KEY")
               or os.environ.get("ANTHROPIC_AUTH_TOKEN")
               or os.environ.get("LITELLM_API_KEY"))

    lm = dspy.LM(
        model=args.model,
        api_base=api_base,
        api_key=api_key,
        temperature=args.temperature,
        max_tokens=4000,
    )
    dspy.configure(lm=lm)

    # Load data
    train_df, val_df, test_df = load_scored_translations()

    # Get poem content
    all_ids = list(set(
        train_df["poem_id"].astype(str).tolist()
        + val_df["poem_id"].astype(str).tolist()
        + test_df["poem_id"].astype(str).tolist()
    ))
    poems = load_poem_content(all_ids)

    train_examples = build_dspy_examples(train_df, poems)
    val_examples = build_dspy_examples(val_df, poems)
    test_examples = build_dspy_examples(test_df, poems)

    if len(train_examples) < 5:
        print(f"ERROR: Need at least 5 training examples, got {len(train_examples)}")
        return

    # Baseline evaluation
    baseline_module = TranslationModule()
    print(f"\n--- Baseline ({persona}) ---")
    baseline_train = compute_detailed_metrics(train_examples, baseline_module, "Train baseline")
    baseline_eval = compute_detailed_metrics(val_examples, baseline_module, "Val baseline")

    history = {
        "optimizer": optimizer_name,
        "persona": persona,
        "model": args.model,
        "num_trials": args.num_trials,
        "train_size": len(train_examples),
        "val_size": len(val_examples),
        "test_size": len(test_examples),
        "baseline_train_mae": baseline_train,
        "baseline_eval_mae": baseline_eval,
    }

    # Run selected optimizer
    start_time = time.time()
    module = TranslationModule()

    try:
        if optimizer_name == "mipro":
            optimized_module, _ = run_mipro(module, train_examples, val_examples, args.num_trials)
        elif optimizer_name == "simba":
            optimized_module, _ = run_simba(
                module, train_examples, val_examples, args.num_trials,
                args.prompt_model, api_base, api_key,
            )
        elif optimizer_name == "bootstrap":
            optimized_module, _ = run_bootstrap(module, train_examples, val_examples, args.num_trials)
        else:
            print(f"Unknown optimizer: {optimizer_name}")
            return
    except Exception as e:
        print(f"Optimization failed: {e}")
        history["error"] = str(e)
        history["elapsed_seconds"] = time.time() - start_time
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(history, f, ensure_ascii=False, indent=2)
        return

    elapsed = time.time() - start_time
    history["elapsed_seconds"] = elapsed
    print(f"\nOptimization completed in {elapsed:.1f}s")

    # Extract prompt info
    extract_prompt_info(optimized_module, history)

    # Final evaluation on val + test sets
    print(f"\n--- Final evaluation ({optimizer_name}) ---")
    optimized_val = compute_detailed_metrics(val_examples, optimized_module, "Val optimized")
    optimized_test = compute_detailed_metrics(test_examples, optimized_module, "Test optimized")

    history["optimized_eval_mae"] = optimized_val
    history["optimized_test_mae"] = optimized_test

    # Improvement summary
    val_imp = optimized_val.get("composite_metric", 0) - baseline_eval.get("composite_metric", 0)
    test_imp = optimized_test.get("composite_metric", 0) - baseline_eval.get("composite_metric", 0)
    print(f"\n--- Summary ---")
    print(f"  Val composite:  baseline={baseline_eval.get('composite_metric', 0):.4f}  "
          f"optimized={optimized_val.get('composite_metric', 0):.4f}  "
          f"improvement={val_imp:+.4f}")
    print(f"  Test composite: optimized={optimized_test.get('composite_metric', 0):.4f}  "
          f"improvement={test_imp:+.4f}")

    if history.get("optimized_instructions"):
        print(f"\n--- Optimized Instructions (first 500 chars) ---")
        print(history["optimized_instructions"][:500])

    # Save history
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    print(f"\nHistory saved to {output_path}")

    # Save the optimized program
    program_path = DATA_DIR / f"dspy_{optimizer_name}_{persona}_program.json"
    try:
        optimized_module.save(str(program_path))
        print(f"Optimized program saved to {program_path}")
    except Exception as e:
        print(f"Warning: Could not save program state: {e}")

    return history


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()

    if args.compare:
        compare_optimizers()
    elif args.optimizer:
        run_optimization(args)
    else:
        print("ERROR: Specify --optimizer or --compare")
        sys.exit(1)


if __name__ == "__main__":
    main()
