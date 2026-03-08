"""Production re-score: apply variant_a (Anchor+Rubric) with Haiku to all 5K poems.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.data.run_production_rescore

Expected cost: ~$2.25 for Haiku pass on 5K poems.
Resume-safe: saves checkpoints every 500 poems.
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

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring
from poetry_quality_and_curation.retriever_and_quality_curator.data.calibration_prompts import CALIBRATION_PROMPTS

DATA_DIR = Path(__file__).resolve().parent
INPUT_PATH = DATA_DIR / "final_selection_v4.parquet"
OUTPUT_PATH = DATA_DIR / "scores_recalibrated_v7.parquet"

MODEL = "openai/bedrock-haiku-45"
VARIANT = "variant_a"
BATCH_SIZE = 5
CONCURRENCY = 20
MAX_COST = 15.0
CHECKPOINT_INTERVAL = 500

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]


def parse_scores_from_response(text: str, batch_records: list[dict]) -> list[dict]:
    """Parse JSON scores from model response."""
    import re
    text = re.sub(r'```(?:json)?\s*', '', text).strip()

    def _extract_and_validate(parsed, records):
        results = []
        if isinstance(parsed, dict):
            parsed = [parsed]
        for i, item in enumerate(parsed):
            if i >= len(records):
                break
            entry = {"poem_id": str(records[i]["poem_id"])}
            for d in DIMS:
                v = item.get(d, 0)
                entry[d] = max(0, min(100, int(v))) if isinstance(v, (int, float)) else 0
            entry["quality_score"] = round(sum(entry[d] for d in DIMS) / len(DIMS))
            results.append(entry)
        return results

    # Direct parse
    try:
        parsed = json.loads(text)
        return _extract_and_validate(parsed, batch_records)
    except json.JSONDecodeError:
        pass

    # Bracket-counting
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
                                cleaned = text[start:i+1].replace(',}', '}').replace(',]', ']')
                                try:
                                    results.append(json.loads(cleaned))
                                except json.JSONDecodeError:
                                    pass
                            break
                i += 1
        i += 1

    if results:
        return _extract_and_validate(results, batch_records)

    print(f"  WARN: Failed to parse: {text[:150]}...")
    return []


def load_checkpoint() -> set[str]:
    """Load already-scored poem IDs from checkpoint file."""
    if OUTPUT_PATH.exists():
        df = pd.read_parquet(OUTPUT_PATH)
        return set(df["poem_id"].astype(str).tolist())
    return set()


def save_checkpoint(all_scores: list[dict]):
    """Save scores to parquet, merging with existing checkpoint."""
    if not all_scores:
        return
    new_df = pd.DataFrame(all_scores)
    if OUTPUT_PATH.exists():
        existing = pd.read_parquet(OUTPUT_PATH)
        new_ids = set(new_df["poem_id"].astype(str))
        keep = existing[~existing["poem_id"].astype(str).isin(new_ids)]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df
    merged.to_parquet(OUTPUT_PATH, index=False)
    return len(merged)


async def score_batch(batch_df: pd.DataFrame, system_prompt: str,
                      semaphore: asyncio.Semaphore) -> tuple[list[dict], float]:
    """Score a batch of poems."""
    import litellm

    async with semaphore:
        user_content = "\n\n---\n\n".join(
            format_for_scoring(str(r["poem_id"]), str(r["title"]),
                               str(r["content"]), str(r.get("poet_name", "")))
            for _, r in batch_df.iterrows()
        )

        api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
        api_key = (os.environ.get("ANTHROPIC_API_KEY")
                   or os.environ.get("ANTHROPIC_AUTH_TOKEN")
                   or os.environ.get("LITELLM_API_KEY"))

        kwargs = dict(
            model=MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=200 * len(batch_df),
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
                batch_df.to_dict("records")
            )
            return scores, cost
        except Exception as e:
            print(f"  ERROR: {e}")
            return [], 0.0


async def main():
    print("=" * 60)
    print("PRODUCTION RE-SCORE: variant_a (Anchor+Rubric) x Haiku")
    print("=" * 60)

    # Load poems
    df = pd.read_parquet(INPUT_PATH)
    print(f"Loaded {len(df)} poems from {INPUT_PATH.name}")

    # Resume: skip already-scored
    scored_ids = load_checkpoint()
    if scored_ids:
        before = len(df)
        df = df[~df["poem_id"].astype(str).isin(scored_ids)]
        print(f"Resume: skipping {before - len(df)} already scored, {len(df)} remaining")

    if len(df) == 0:
        print("All poems already scored!")
        return

    system_prompt = CALIBRATION_PROMPTS[VARIANT]["prompt"]
    semaphore = asyncio.Semaphore(CONCURRENCY)

    # Create batches
    batches = [df.iloc[i:i+BATCH_SIZE] for i in range(0, len(df), BATCH_SIZE)]
    print(f"Batches: {len(batches)} (batch_size={BATCH_SIZE}, concurrency={CONCURRENCY})")

    all_scores = []
    total_cost = 0.0
    pbar = tqdm(total=len(df), desc="Scoring")

    for chunk_start in range(0, len(batches), CONCURRENCY):
        chunk = batches[chunk_start:chunk_start + CONCURRENCY]
        tasks = [score_batch(b, system_prompt, semaphore) for b in chunk]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Batch error: {result}")
                continue
            scores, cost = result
            for s in scores:
                s["model_used"] = MODEL
                s["variant"] = VARIANT
                s["scored_at"] = pd.Timestamp.now(tz="UTC").isoformat()
            all_scores.extend(scores)
            total_cost += cost
            pbar.update(len(scores))

        # Checkpoint
        if len(all_scores) >= CHECKPOINT_INTERVAL:
            total_saved = save_checkpoint(all_scores)
            print(f"\n  Checkpoint: {total_saved} total saved, cost=${total_cost:.4f}")
            all_scores = []  # Reset buffer after save

        # Cost check
        if total_cost >= MAX_COST:
            print(f"\nCost cap: ${total_cost:.4f} >= ${MAX_COST}")
            break

    pbar.close()

    # Final save
    if all_scores:
        total_saved = save_checkpoint(all_scores)
        print(f"Final save: {total_saved} total scores")

    # Print summary
    if OUTPUT_PATH.exists():
        result_df = pd.read_parquet(OUTPUT_PATH)
        print(f"\n{'='*60}")
        print(f"PRODUCTION RE-SCORE COMPLETE")
        print(f"{'='*60}")
        print(f"Total poems scored: {len(result_df)}")
        print(f"Total cost: ${total_cost:.4f}")
        print(f"Output: {OUTPUT_PATH}")
        print(f"\nNew score distribution:")
        print(f"  Mean: {result_df['quality_score'].mean():.1f}")
        print(f"  Std:  {result_df['quality_score'].std():.1f}")
        print(f"  Min:  {result_df['quality_score'].min()}")
        print(f"  P25:  {result_df['quality_score'].quantile(0.25):.0f}")
        print(f"  Med:  {result_df['quality_score'].median():.0f}")
        print(f"  P75:  {result_df['quality_score'].quantile(0.75):.0f}")
        print(f"  Max:  {result_df['quality_score'].max()}")
        print(f"  IQR:  {result_df['quality_score'].quantile(0.75) - result_df['quality_score'].quantile(0.25):.0f}")
        print(f"  Range: {result_df['quality_score'].max() - result_df['quality_score'].min()}")


if __name__ == "__main__":
    asyncio.run(main())
