"""
Score the top 1500 poems with the DSPy-optimized Sonnet prompt.

Checkpoints every 100 poems. Resume-safe: skips already-scored poem_ids.
Output: data/scores_dspy_sonnet.parquet

Budget: ~$3 max.
"""

import os
import sys

# Force unbuffered output
sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', buffering=1)
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', buffering=1)

import json
import time
import re
import asyncio
import numpy as np
import pandas as pd

BASE = os.path.dirname(os.path.abspath(__file__))
PARENT = os.path.dirname(BASE)
sys.path.insert(0, PARENT)

from dotenv import load_dotenv
load_dotenv(os.path.join(PARENT, '..', '.env'))

import dspy
from arabic_utils import format_for_scoring

# ── Constants ────────────────────────────────────────────────────────
SCORE_DIMS = ["sound", "imagery", "emotion", "language", "cultural"]
CHECKPOINT_EVERY = 100
OUTPUT_FILE = os.path.join(BASE, "scores_dspy_sonnet.parquet")
OPTIMIZED_PROGRAM = os.path.join(BASE, "dspy_sonnet_optimized.json")
BATCH_SIZE = 1  # DSPy predict is synchronous per call
MAX_POEMS = 1500


# ── DSPy Signature & Module (must match optimization) ───────────────
class PoemScoring(dspy.Signature):
    """Arabic poetry scoring."""
    poem_text: str = dspy.InputField(desc="القصيدة العربية مع العنوان واسم الشاعر والأبيات")
    sound: int = dspy.OutputField(desc="درجة الإيقاع والموسيقى 0-100")
    imagery: int = dspy.OutputField(desc="درجة التصوير والاستعارات 0-100")
    emotion: int = dspy.OutputField(desc="درجة العمق العاطفي 0-100")
    language: int = dspy.OutputField(desc="درجة الجودة اللغوية 0-100")
    cultural: int = dspy.OutputField(desc="درجة القيمة الثقافية 0-100")


class PoemScorer(dspy.Module):
    def __init__(self):
        super().__init__()
        self.predict_scores = dspy.Predict(PoemScoring)

    def forward(self, poem_text):
        result = self.predict_scores(poem_text=poem_text)
        parsed = {}
        for dim in SCORE_DIMS:
            val = getattr(result, dim, None)
            if val is None:
                parsed[dim] = 50
            else:
                try:
                    if isinstance(val, str):
                        match = re.search(r'\d+', val)
                        val = int(match.group()) if match else 50
                    else:
                        val = int(val)
                    parsed[dim] = max(0, min(100, val))
                except (ValueError, TypeError):
                    parsed[dim] = 50
        return dspy.Prediction(**parsed)


def setup_lm():
    api_base = os.environ.get('ANTHROPIC_BASE_URL')
    api_key = os.environ.get('ANTHROPIC_AUTH_TOKEN') or os.environ.get('ANTHROPIC_API_KEY')
    if not api_base or not api_key:
        print("ERROR: ANTHROPIC_BASE_URL and ANTHROPIC_AUTH_TOKEN/ANTHROPIC_API_KEY must be set")
        sys.exit(1)
    lm = dspy.LM(
        'openai/bedrock-sonnet-46',
        api_base=api_base,
        api_key=api_key,
        temperature=0.3,
        max_tokens=500,
    )
    dspy.configure(lm=lm)
    print(f"LM configured: openai/bedrock-sonnet-46")
    return lm


def load_poems():
    """Load top 1500 poems by v7 quality_score."""
    v7 = pd.read_parquet(os.path.join(BASE, "scores_final_merged_v7.parquet"))
    content = pd.read_parquet(os.path.join(BASE, "final_selection_v4.parquet"))

    top_ids = v7.nlargest(MAX_POEMS, "quality_score")["poem_id"].tolist()
    poems = content[content["poem_id"].isin(top_ids)][["poem_id", "title", "content", "poet_name"]].copy()
    print(f"Loaded {len(poems)} poems for Sonnet scoring (top {MAX_POEMS} by v7)")
    return poems


def load_checkpoint():
    """Load existing checkpoint if it exists, return set of scored poem_ids."""
    if os.path.exists(OUTPUT_FILE):
        df = pd.read_parquet(OUTPUT_FILE)
        print(f"Resuming from checkpoint: {len(df)} poems already scored")
        return df, set(df["poem_id"].tolist())
    return pd.DataFrame(), set()


def save_checkpoint(results):
    """Save results atomically."""
    if not results:
        return
    df = pd.DataFrame(results)
    tmp = OUTPUT_FILE + ".tmp"
    df.to_parquet(tmp, index=False)
    os.replace(tmp, OUTPUT_FILE)
    print(f"  Checkpoint saved: {len(df)} poems -> {OUTPUT_FILE}")


def main():
    print("=" * 60)
    print("  Score Top 1500 Poems with Calibrated Sonnet")
    print("=" * 60)

    lm = setup_lm()

    # Load optimized program
    scorer = PoemScorer()
    scorer.load(OPTIMIZED_PROGRAM)
    print(f"Loaded optimized program from {OPTIMIZED_PROGRAM}")
    print(f"  Demos: {len(scorer.predict_scores.demos)}")

    # Load poems
    poems = load_poems()

    # Load checkpoint
    existing_df, scored_ids = load_checkpoint()
    existing_results = existing_df.to_dict("records") if len(existing_df) > 0 else []

    # Filter out already-scored poems
    remaining = poems[~poems["poem_id"].isin(scored_ids)].reset_index(drop=True)
    print(f"Remaining to score: {len(remaining)}")

    if len(remaining) == 0:
        print("All poems already scored!")
        return

    all_results = list(existing_results)
    failures = 0
    start_time = time.time()

    for i, row in remaining.iterrows():
        poem_text = format_for_scoring(
            row["poem_id"], row["title"], row["content"], row.get("poet_name", "")
        )

        try:
            pred = scorer(poem_text=poem_text)
            result = {
                "poem_id": row["poem_id"],
                "sound": int(getattr(pred, "sound", 50)),
                "imagery": int(getattr(pred, "imagery", 50)),
                "emotion": int(getattr(pred, "emotion", 50)),
                "language": int(getattr(pred, "language", 50)),
                "cultural": int(getattr(pred, "cultural", 50)),
                "model_used": "openai/bedrock-sonnet-46",
                "prompt_version": "dspy_optimized_v8",
                "scored_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            }
            # Compute quality_score as weighted average
            scores = [result["sound"], result["imagery"], result["emotion"],
                      result["language"], result["cultural"]]
            result["quality_score"] = round(np.mean(scores), 1)
            all_results.append(result)
        except Exception as e:
            print(f"  ERROR scoring {row['poem_id']}: {e}")
            failures += 1
            # Add a fallback score
            all_results.append({
                "poem_id": row["poem_id"],
                "sound": 50, "imagery": 50, "emotion": 50,
                "language": 50, "cultural": 50,
                "quality_score": 50.0,
                "model_used": "openai/bedrock-sonnet-46",
                "prompt_version": "dspy_optimized_v8_FAILED",
                "scored_at": time.strftime("%Y-%m-%dT%H:%M:%S"),
            })

        scored_count = len(all_results)
        new_count = scored_count - len(existing_results)

        # Progress
        if new_count % 10 == 0:
            elapsed = time.time() - start_time
            rate = new_count / elapsed if elapsed > 0 else 0
            eta = (len(remaining) - new_count) / rate if rate > 0 else 0
            print(f"  [{new_count}/{len(remaining)}] {rate:.1f} poems/s, ETA: {eta/60:.1f}min")

        # Checkpoint
        if new_count > 0 and new_count % CHECKPOINT_EVERY == 0:
            save_checkpoint(all_results)

    # Final save
    save_checkpoint(all_results)

    elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"  COMPLETE: {len(all_results)} poems scored")
    print(f"  Failures: {failures}")
    print(f"  Time: {elapsed/60:.1f} minutes")
    print(f"  Output: {OUTPUT_FILE}")
    print(f"{'='*60}")

    # Stats
    df = pd.DataFrame(all_results)
    print(f"\nScore stats:")
    print(df[SCORE_DIMS + ["quality_score"]].describe().to_string())


if __name__ == "__main__":
    main()
