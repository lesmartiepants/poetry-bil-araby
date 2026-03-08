"""Calibration experiment: test 3 prompt variants x 3 models on 100 poems.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.data.run_calibration_experiment

Budget: $3-5 total across all 9 combinations.
"""
import asyncio
import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from tqdm import tqdm

# Add parent paths for imports
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring
from poetry_quality_and_curation.retriever_and_quality_curator.data.calibration_prompts import CALIBRATION_PROMPTS

DATA_DIR = Path(__file__).resolve().parent
EXPERIMENT_OUTPUT = DATA_DIR / "calibration_experiment_results.parquet"
EXPERIMENT_SUMMARY = DATA_DIR / "calibration_experiment_summary.json"

# Models to test
MODELS = {
    "haiku": "openai/bedrock-haiku-45",
    "sonnet": "openai/bedrock-sonnet-46",
    "opus": "openai/bedrock-opus-46",
}

# Experiment parameters
N_SAMPLE = 100
BATCH_SIZE = 5
CONCURRENCY = 10
MAX_COST_PER_COMBO = 1.5  # safety cap per prompt-model combo


def load_experiment_poems(n: int = N_SAMPLE) -> pd.DataFrame:
    """Load a stratified sample of poems from final_selection_v4."""
    df = pd.read_parquet(DATA_DIR / "final_selection_v4.parquet")

    # Stratified sample: ensure we get poems across the score range
    # and include some canon poems for validation
    canon_poems = df[df["is_canon"] == True]
    non_canon = df[df["is_canon"] != True]

    # Take all canon poems (up to 20) and fill rest from non-canon
    n_canon = min(len(canon_poems), 20)
    n_other = n - n_canon

    # Sample non-canon across score quintiles
    non_canon_sorted = non_canon.sort_values("quality_score")
    quintile_size = n_other // 5
    sampled_parts = []
    for i in range(5):
        start = i * len(non_canon_sorted) // 5
        end = (i + 1) * len(non_canon_sorted) // 5
        chunk = non_canon_sorted.iloc[start:end]
        sampled_parts.append(chunk.sample(min(quintile_size, len(chunk)), random_state=42 + i))

    sample = pd.concat([
        canon_poems.head(n_canon),
        *sampled_parts
    ]).head(n)

    print(f"Experiment sample: {len(sample)} poems")
    print(f"  Canon: {len(sample[sample['is_canon'] == True])}")
    print(f"  Score range: {sample['quality_score'].min()}-{sample['quality_score'].max()}")
    print(f"  Score mean: {sample['quality_score'].mean():.1f}")
    return sample


def parse_scores_from_response(text: str, batch: list[dict]) -> list[dict]:
    """Parse JSON scores from model response. Reuses logic from 02_score_poems.py."""
    import re

    text = re.sub(r'```(?:json)?\s*', '', text).strip()

    # Try direct parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            parsed = [parsed]
        return _validate(parsed, batch)
    except json.JSONDecodeError:
        pass

    # Bracket-counting extraction
    results = []
    i = 0
    while i < len(text):
        if text[i] == '{':
            depth = 0
            start = i
            in_str = False
            esc = False
            while i < len(text):
                ch = text[i]
                if esc:
                    esc = False
                elif ch == '\\' and in_str:
                    esc = True
                elif ch == '"' and not esc:
                    in_str = not in_str
                elif not in_str:
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            try:
                                results.append(json.loads(text[start:i+1]))
                            except json.JSONDecodeError:
                                cleaned = re.sub(r',\s*}', '}', text[start:i+1])
                                try:
                                    results.append(json.loads(cleaned))
                                except json.JSONDecodeError:
                                    pass
                            break
                i += 1
        i += 1

    if results:
        return _validate(results, batch)

    print(f"  WARN: Failed to parse response: {text[:200]}...")
    return []


DIMS = ["sound", "imagery", "emotion", "language", "cultural"]


def _validate(parsed: list[dict], batch: list[dict]) -> list[dict]:
    results = []
    for i, item in enumerate(parsed):
        if i >= len(batch):
            break
        poem = batch[i]
        entry = {"poem_id": str(poem["poem_id"])}
        for d in DIMS:
            v = item.get(d, 0)
            entry[d] = max(0, min(100, int(v))) if isinstance(v, (int, float)) else 0
        entry["quality_score"] = round(sum(entry[d] for d in DIMS) / len(DIMS))
        results.append(entry)
    return results


async def score_batch_async(batch: list[dict], model: str, system_prompt: str,
                            semaphore: asyncio.Semaphore) -> tuple[list[dict], float]:
    """Score a batch of poems, return (scores, cost)."""
    import litellm

    async with semaphore:
        user_content = "\n\n---\n\n".join(
            format_for_scoring(str(p["poem_id"]), str(p["title"]),
                               str(p["content"]), str(p.get("poet_name", "")))
            for _, p in batch.iterrows()
        )

        api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
        api_key = (os.environ.get("ANTHROPIC_API_KEY")
                   or os.environ.get("ANTHROPIC_AUTH_TOKEN")
                   or os.environ.get("LITELLM_API_KEY"))

        kwargs = dict(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=200 * len(batch),
        )
        if api_base:
            kwargs["api_base"] = api_base
        if api_key:
            kwargs["api_key"] = api_key

        try:
            response = await litellm.acompletion(**kwargs)
            cost = 0.0
            try:
                cost = litellm.completion_cost(completion_response=response)
            except Exception:
                pass
            scores = parse_scores_from_response(
                response.choices[0].message.content,
                batch.to_dict("records")
            )
            return scores, cost
        except Exception as e:
            print(f"  ERROR: {e}")
            return [], 0.0


async def run_single_experiment(poems_df: pd.DataFrame, model_name: str,
                                 model_id: str, variant_key: str,
                                 variant_info: dict) -> dict:
    """Run one prompt-model combination on the sample poems."""
    print(f"\n{'='*60}")
    print(f"Running: {variant_info['name']} x {model_name}")
    print(f"{'='*60}")

    semaphore = asyncio.Semaphore(CONCURRENCY)
    system_prompt = variant_info["prompt"]

    # Create batches
    batches = [poems_df.iloc[i:i+BATCH_SIZE] for i in range(0, len(poems_df), BATCH_SIZE)]

    all_scores = []
    total_cost = 0.0

    # Process batches with concurrency
    for chunk_start in range(0, len(batches), CONCURRENCY):
        chunk = batches[chunk_start:chunk_start + CONCURRENCY]
        tasks = [
            score_batch_async(b, model_id, system_prompt, semaphore)
            for b in chunk
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Batch error: {result}")
                continue
            scores, cost = result
            all_scores.extend(scores)
            total_cost += cost

        if total_cost >= MAX_COST_PER_COMBO:
            print(f"  Cost cap reached: ${total_cost:.4f}")
            break

    # Compute statistics
    if all_scores:
        scores_arr = np.array([s["quality_score"] for s in all_scores])
        stats = {
            "variant": variant_key,
            "model": model_name,
            "n_scored": len(all_scores),
            "cost": round(total_cost, 4),
            "mean": round(float(np.mean(scores_arr)), 2),
            "std": round(float(np.std(scores_arr)), 2),
            "min": int(np.min(scores_arr)),
            "p10": int(np.percentile(scores_arr, 10)),
            "p25": int(np.percentile(scores_arr, 25)),
            "median": int(np.median(scores_arr)),
            "p75": int(np.percentile(scores_arr, 75)),
            "p90": int(np.percentile(scores_arr, 90)),
            "max": int(np.max(scores_arr)),
            "iqr": int(np.percentile(scores_arr, 75) - np.percentile(scores_arr, 25)),
            "range": int(np.max(scores_arr) - np.min(scores_arr)),
        }

        # Per-dimension stats
        for dim in DIMS:
            dim_arr = np.array([s[dim] for s in all_scores])
            stats[f"{dim}_mean"] = round(float(np.mean(dim_arr)), 2)
            stats[f"{dim}_std"] = round(float(np.std(dim_arr)), 2)

        # Tag scores with experiment info
        for s in all_scores:
            s["variant"] = variant_key
            s["model"] = model_name

        print(f"  Results: n={stats['n_scored']}, mean={stats['mean']}, "
              f"std={stats['std']}, range=[{stats['min']}-{stats['max']}], "
              f"IQR={stats['iqr']}, cost=${stats['cost']:.4f}")
    else:
        stats = {
            "variant": variant_key, "model": model_name,
            "n_scored": 0, "cost": round(total_cost, 4),
            "error": "No scores parsed"
        }
        print(f"  FAILED: No scores parsed, cost=${total_cost:.4f}")

    return {"stats": stats, "scores": all_scores}


async def run_all_experiments():
    """Run all 9 prompt-model combinations."""
    poems_df = load_experiment_poems()

    all_stats = []
    all_scores = []
    total_cost = 0.0

    for variant_key, variant_info in CALIBRATION_PROMPTS.items():
        for model_name, model_id in MODELS.items():
            result = await run_single_experiment(
                poems_df, model_name, model_id, variant_key, variant_info
            )
            all_stats.append(result["stats"])
            all_scores.extend(result["scores"])
            total_cost += result["stats"].get("cost", 0)

            # Save checkpoint after each combination
            if all_scores:
                scores_df = pd.DataFrame(all_scores)
                scores_df.to_parquet(EXPERIMENT_OUTPUT, index=False)

            print(f"\n  Running total cost: ${total_cost:.4f}")

            # Budget check
            if total_cost > 5.0:
                print("\n*** BUDGET EXCEEDED $5. Stopping. ***")
                break
        if total_cost > 5.0:
            break

    # Save final results
    if all_scores:
        scores_df = pd.DataFrame(all_scores)
        scores_df.to_parquet(EXPERIMENT_OUTPUT, index=False)

    # Save summary
    summary = {
        "total_cost": round(total_cost, 4),
        "experiments": all_stats,
        "recommendation": _pick_winner(all_stats),
    }
    with open(EXPERIMENT_SUMMARY, "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"\n{'='*60}")
    print(f"EXPERIMENT COMPLETE")
    print(f"{'='*60}")
    print(f"Total cost: ${total_cost:.4f}")
    print(f"Results saved to: {EXPERIMENT_OUTPUT}")
    print(f"Summary saved to: {EXPERIMENT_SUMMARY}")

    # Print comparison table
    _print_comparison(all_stats)

    return summary


def _pick_winner(stats_list: list[dict]) -> dict:
    """Pick the best variant-model combo based on score spread and cost."""
    valid = [s for s in stats_list if s.get("n_scored", 0) > 0]
    if not valid:
        return {"winner": "none", "reason": "No valid results"}

    # Score each combo: prioritize IQR (spread), penalize cost
    # Ideal: high IQR, high range, low cost, std > 5
    best = None
    best_score = -1

    for s in valid:
        iqr = s.get("iqr", 0)
        rng = s.get("range", 0)
        std = s.get("std", 0)
        cost = s.get("cost", 999)

        # Composite score: IQR weight 3, range weight 1, std weight 2, cost penalty
        composite = (iqr * 3) + (rng * 1) + (std * 2) - (cost * 10)

        if composite > best_score:
            best_score = composite
            best = s

    if best:
        return {
            "winner": f"{best['variant']} + {best['model']}",
            "iqr": best.get("iqr"),
            "range": best.get("range"),
            "std": best.get("std"),
            "cost": best.get("cost"),
            "reason": f"Best score spread (IQR={best.get('iqr')}, range={best.get('range')}, std={best.get('std'):.1f}) at ${best.get('cost'):.4f}/100 poems"
        }
    return {"winner": "none", "reason": "Could not determine winner"}


def _print_comparison(stats_list: list[dict]):
    """Print a comparison table of all experiments."""
    valid = [s for s in stats_list if s.get("n_scored", 0) > 0]
    if not valid:
        print("No valid results to compare.")
        return

    print(f"\n{'Variant':<14} {'Model':<8} {'N':>4} {'Mean':>6} {'Std':>5} "
          f"{'Min':>4} {'P25':>4} {'Med':>4} {'P75':>4} {'Max':>4} "
          f"{'IQR':>4} {'Range':>5} {'Cost':>7}")
    print("-" * 95)

    for s in sorted(valid, key=lambda x: -(x.get("iqr", 0))):
        print(f"{s['variant']:<14} {s['model']:<8} {s['n_scored']:>4} "
              f"{s.get('mean', 0):>6.1f} {s.get('std', 0):>5.1f} "
              f"{s.get('min', 0):>4} {s.get('p25', 0):>4} {s.get('median', 0):>4} "
              f"{s.get('p75', 0):>4} {s.get('max', 0):>4} "
              f"{s.get('iqr', 0):>4} {s.get('range', 0):>5} "
              f"${s.get('cost', 0):>6.4f}")


if __name__ == "__main__":
    asyncio.run(run_all_experiments())
