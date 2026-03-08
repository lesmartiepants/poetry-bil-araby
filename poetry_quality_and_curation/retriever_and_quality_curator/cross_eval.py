"""Cross-evaluate optimized prompts: run each model's best prompt on the other model.

Adds two new data points:
  - Sonnet's optimized prompt + demos -> run by Haiku
  - Haiku's optimized prompt + demos -> run by Sonnet

Results are appended to the existing history JSON files under
`cross_eval_<source>_prompt` keys and the chart is regenerated.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.cross_eval
"""
import json
import os
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import dspy
import numpy as np

from poetry_quality_and_curation.retriever_and_quality_curator import config
from poetry_quality_and_curation.retriever_and_quality_curator.optimize_prompt import (
    MODEL_CONFIGS,
    PoemScorer,
    PoemScoring,
    build_eval_dataset,
    compute_detailed_mae,
    DIMS,
    MAX_POEMS,
)

DATA_DIR = config.DATA_DIR


def load_saved_scorer(path: Path) -> PoemScorer:
    """Load a DSPy-saved optimized scorer from JSON."""
    scorer = PoemScorer()
    scorer.load(str(path))
    return scorer


def build_cross_scorer(source_scorer_path: Path) -> PoemScorer:
    """Build a scorer with another model's optimized instructions + demos.

    Loads the saved scorer (instructions + demos) but does NOT set the LM --
    that's done by the caller via dspy.configure(lm=...).
    """
    scorer = load_saved_scorer(source_scorer_path)
    return scorer


def run_cross_assessment():
    """Run cross-assessment for both model/prompt combinations."""
    haiku_scorer_path = DATA_DIR / "dspy_haiku_optimized_scorer.json"
    sonnet_scorer_path = DATA_DIR / "dspy_sonnet_optimized_scorer.json"
    haiku_history_path = DATA_DIR / "dspy_haiku_history.json"
    sonnet_history_path = DATA_DIR / "dspy_sonnet_history.json"

    # Verify files exist
    for p in [haiku_scorer_path, sonnet_scorer_path, haiku_history_path, sonnet_history_path]:
        if not p.exists():
            print(f"ERROR: Missing {p}")
            return

    # Load histories
    with open(haiku_history_path, "r", encoding="utf-8") as f:
        haiku_history = json.load(f)
    with open(sonnet_history_path, "r", encoding="utf-8") as f:
        sonnet_history = json.load(f)

    # Build the same dataset used during optimization (same seed, same split)
    examples = build_eval_dataset(max_poems=MAX_POEMS)
    rng = np.random.RandomState(42)
    indices = rng.permutation(len(examples))
    assessment_size = max(10, int(len(examples) * 0.3))
    assessment_examples = [examples[i] for i in indices[len(examples) - assessment_size:]]
    print(f"Assessment set: {len(assessment_examples)} poems")

    # Cross-assessment 1: Sonnet's prompt on Haiku model
    print("\n=== Cross-assessment: Sonnet's optimized prompt on HAIKU model ===")
    haiku_lm = dspy.LM(
        model=MODEL_CONFIGS["haiku"],
        api_base=os.environ["ANTHROPIC_BASE_URL"],
        api_key=os.environ["ANTHROPIC_AUTH_TOKEN"],
        temperature=0.3,
        max_tokens=2000,
    )
    dspy.configure(lm=haiku_lm)

    sonnet_prompt_scorer = build_cross_scorer(sonnet_scorer_path)
    start = time.time()
    cross_mae_sonnet_on_haiku = compute_detailed_mae(assessment_examples, sonnet_prompt_scorer, bypass_cache=True)
    elapsed_1 = time.time() - start

    print(f"  Overall MAE: {cross_mae_sonnet_on_haiku['mae_overall']:.2f}")
    for dim in DIMS:
        print(f"    {dim}: {cross_mae_sonnet_on_haiku[f'mae_{dim}']:.2f}")
    print(f"  Time: {elapsed_1:.0f}s")

    # Per-poem details for this cross-assessment
    cross_poem_details_sonnet_on_haiku = []
    with dspy.context(bypass_cache=True):
        for ex in assessment_examples:
            pred = sonnet_prompt_scorer(poem_text=ex.poem_text)
            detail = {"poem_text_prefix": ex.poem_text[:80]}
            for dim in DIMS:
                gold = getattr(ex, dim)
                pred_val = int(getattr(pred, dim, 50))
                detail[f"{dim}_gold"] = gold
                detail[f"{dim}_cross"] = pred_val
                detail[f"{dim}_cross_err"] = abs(gold - pred_val)
            cross_poem_details_sonnet_on_haiku.append(detail)

    # Cross-assessment 2: Haiku's prompt on Sonnet model
    print("\n=== Cross-assessment: Haiku's optimized prompt on SONNET model ===")
    sonnet_lm = dspy.LM(
        model=MODEL_CONFIGS["sonnet"],
        api_base=os.environ["ANTHROPIC_BASE_URL"],
        api_key=os.environ["ANTHROPIC_AUTH_TOKEN"],
        temperature=0.3,
        max_tokens=2000,
    )
    dspy.configure(lm=sonnet_lm)

    haiku_prompt_scorer = build_cross_scorer(haiku_scorer_path)
    start = time.time()
    cross_mae_haiku_on_sonnet = compute_detailed_mae(assessment_examples, haiku_prompt_scorer, bypass_cache=True)
    elapsed_2 = time.time() - start

    print(f"  Overall MAE: {cross_mae_haiku_on_sonnet['mae_overall']:.2f}")
    for dim in DIMS:
        print(f"    {dim}: {cross_mae_haiku_on_sonnet[f'mae_{dim}']:.2f}")
    print(f"  Time: {elapsed_2:.0f}s")

    # Per-poem details for this cross-assessment
    cross_poem_details_haiku_on_sonnet = []
    with dspy.context(bypass_cache=True):
        for ex in assessment_examples:
            pred = haiku_prompt_scorer(poem_text=ex.poem_text)
            detail = {"poem_text_prefix": ex.poem_text[:80]}
            for dim in DIMS:
                gold = getattr(ex, dim)
                pred_val = int(getattr(pred, dim, 50))
                detail[f"{dim}_gold"] = gold
                detail[f"{dim}_cross"] = pred_val
                detail[f"{dim}_cross_err"] = abs(gold - pred_val)
            cross_poem_details_haiku_on_sonnet.append(detail)

    # Update Haiku history: add "sonnet's prompt run on haiku"
    haiku_history["cross_eval_sonnet_prompt"] = {
        "description": "Sonnet's optimized prompt + demos assessed on Haiku model",
        "mae": cross_mae_sonnet_on_haiku,
        "elapsed_seconds": elapsed_1,
        "poem_details": cross_poem_details_sonnet_on_haiku,
    }

    # Update Sonnet history: add "haiku's prompt run on sonnet"
    sonnet_history["cross_eval_haiku_prompt"] = {
        "description": "Haiku's optimized prompt + demos assessed on Sonnet model",
        "mae": cross_mae_haiku_on_sonnet,
        "elapsed_seconds": elapsed_2,
        "poem_details": cross_poem_details_haiku_on_sonnet,
    }

    # Save updated histories
    with open(haiku_history_path, "w", encoding="utf-8") as f:
        json.dump(haiku_history, f, ensure_ascii=False, indent=2)
    print(f"\nUpdated {haiku_history_path}")

    with open(sonnet_history_path, "w", encoding="utf-8") as f:
        json.dump(sonnet_history, f, ensure_ascii=False, indent=2)
    print(f"Updated {sonnet_history_path}")

    # Print comparison summary
    print("\n" + "=" * 60)
    print("CROSS-EVALUATION SUMMARY")
    print("=" * 60)

    h_base = haiku_history["baseline_eval_mae"]["mae_overall"]
    h_opt = haiku_history["optimized_eval_mae"]["mae_overall"]
    h_cross = cross_mae_sonnet_on_haiku["mae_overall"]

    s_base = sonnet_history["baseline_eval_mae"]["mae_overall"]
    s_opt = sonnet_history["optimized_eval_mae"]["mae_overall"]
    s_cross = cross_mae_haiku_on_sonnet["mae_overall"]

    print(f"\nHaiku model:")
    print(f"  Baseline prompt:   MAE {h_base:.2f}")
    print(f"  Haiku opt prompt:  MAE {h_opt:.2f}  ({h_base - h_opt:+.2f})")
    print(f"  Sonnet opt prompt: MAE {h_cross:.2f}  ({h_base - h_cross:+.2f})")

    print(f"\nSonnet model:")
    print(f"  Baseline prompt:   MAE {s_base:.2f}")
    print(f"  Sonnet opt prompt: MAE {s_opt:.2f}  ({s_base - s_opt:+.2f})")
    print(f"  Haiku opt prompt:  MAE {s_cross:.2f}  ({s_base - s_cross:+.2f})")

    # Regenerate chart
    print("\nRegenerating chart...")
    from poetry_quality_and_curation.retriever_and_quality_curator.plot_optimization import (
        generate_html, load_history,
    )
    haiku = load_history(str(haiku_history_path))
    sonnet = load_history(str(sonnet_history_path))
    chart_path = DATA_DIR / "dspy_optimization_chart.html"
    with open(chart_path, "w", encoding="utf-8") as f:
        f.write(generate_html(haiku, sonnet))
    print(f"Chart updated: {chart_path}")


if __name__ == "__main__":
    run_cross_assessment()
