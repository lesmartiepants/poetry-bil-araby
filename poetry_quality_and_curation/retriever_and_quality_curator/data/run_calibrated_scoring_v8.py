"""Score all 5000 poems with DSPy-calibrated prompts.

Haiku scores the bottom 3500 (by v7 score), Sonnet scores the top 1500.
Uses optimized system prompts + few-shot demos from DSPy optimization.

Output: data/scores_calibrated_v8_haiku.parquet, data/scores_calibrated_v8_sonnet.parquet

Usage:
    # Validate on test set first
    python data/run_calibrated_scoring_v8.py --validate

    # Score all 5000 with both models
    python data/run_calibrated_scoring_v8.py --score-all

    # Score only haiku tier
    python data/run_calibrated_scoring_v8.py --score-haiku

    # Score only sonnet tier
    python data/run_calibrated_scoring_v8.py --score-sonnet
"""
import argparse
import asyncio
import json
import os
import re
import shutil
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
import numpy as np
from tqdm import tqdm

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring

DATA_DIR = Path(__file__).resolve().parent
CONTENT_PATH = DATA_DIR / "final_selection_v4.parquet"
V7_SCORES_PATH = DATA_DIR / "scores_final_merged_v7.parquet"

# Available scorer files (multiple optimizers may have been run)
SCORER_FILES = {
    "haiku": [
        DATA_DIR / "dspy_simba_haiku_optimized.json",
        DATA_DIR / "dspy_haiku_optimized_scorer.json",
    ],
    "sonnet": [
        DATA_DIR / "dspy_simba_sonnet_optimized.json",
        DATA_DIR / "dspy_sonnet_optimized.json",
    ],
}

# Select best scorer per model based on log files (lowest full-test MAE)
def select_best_scorer(model: str) -> Path:
    """Pick the scorer with the lowest MAE on the full test set, based on log files."""
    candidates = [(p, p) for p in SCORER_FILES[model] if p.exists()]
    if not candidates:
        raise FileNotFoundError(f"No scorer files found for {model}")
    if len(candidates) == 1:
        return candidates[0][0]

    # Try to find corresponding log files for comparison
    best_path = candidates[0][0]
    best_mae = float("inf")
    for scorer_path, _ in candidates:
        # Try log file patterns
        for log_pattern in [
            scorer_path.with_name(scorer_path.stem.replace("_optimized", "_log") + ".json"),
            scorer_path.with_name(f"dspy_simba_{model}_log.json"),
            scorer_path.with_name(f"dspy_optimize_{model}_v2_history.json"),
        ]:
            if log_pattern.exists():
                try:
                    log_data = json.loads(log_pattern.read_text())
                    # Check full test MAE
                    full_test = log_data.get("optimized_full_test", {})
                    mae = full_test.get("mae_overall", float("inf"))
                    if mae < best_mae:
                        best_mae = mae
                        best_path = scorer_path
                        print(f"  {scorer_path.name}: full-test MAE={mae:.2f}")
                except Exception:
                    pass
                break
    return best_path

HAIKU_SCORER_PATH = select_best_scorer("haiku")
SONNET_SCORER_PATH = select_best_scorer("sonnet")
print(f"Selected Haiku scorer: {HAIKU_SCORER_PATH.name}")
print(f"Selected Sonnet scorer: {SONNET_SCORER_PATH.name}")

HAIKU_OUTPUT = DATA_DIR / "scores_calibrated_v8_haiku.parquet"
SONNET_OUTPUT = DATA_DIR / "scores_calibrated_v8_sonnet.parquet"

TEST_PATH = DATA_DIR / "dspy_test.parquet"

HAIKU_MODEL = "openai/bedrock-haiku-45"
SONNET_MODEL = "openai/bedrock-sonnet-46"

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]

# Scoring parameters
HAIKU_BATCH_SIZE = 5
HAIKU_CONCURRENCY = 20
SONNET_BATCH_SIZE = 5
SONNET_CONCURRENCY = 15
CHECKPOINT_INTERVAL = 100  # checkpoint every 100 poems
MAX_COST_HAIKU = 15.0
MAX_COST_SONNET = 10.0

SONNET_TOP_N = 1500


def load_dspy_scorer(path: Path) -> dict:
    """Load DSPy optimized scorer JSON and extract system prompt + demos.
    Handles both MIPROv2 and SIMBA output formats."""
    with open(path) as f:
        data = json.load(f)

    # MIPROv2 format: {"predict_scores": {"signature": {"instructions": ...}, "demos": [...]}}
    if "predict_scores" in data:
        scorer = data["predict_scores"]
        instructions = scorer.get("signature", {}).get("instructions", "")
        demos = scorer.get("demos", [])
        return {"instructions": instructions, "demos": demos, "source": "mipro"}

    # SIMBA format: {"instructions": ..., "demos": [...], "extended_instructions": ...}
    instructions = data.get("extended_instructions", data.get("instructions", ""))
    demos = data.get("demos", [])
    return {"instructions": instructions, "demos": demos, "source": "simba"}


def build_messages(scorer: dict, user_content: str) -> list[dict]:
    """Build chat messages from DSPy scorer (system + few-shot demos + user query)."""
    messages = [{"role": "system", "content": scorer["instructions"]}]

    # Add few-shot demos as user/assistant pairs
    for demo in scorer["demos"]:
        poem_text = demo["poem_text"]
        scores = {d: demo[d] for d in DIMS if d in demo}

        messages.append({"role": "user", "content": f"قيّم هذه القصيدة:\n\n{poem_text}"})
        messages.append({
            "role": "assistant",
            "content": json.dumps(scores, ensure_ascii=False)
        })

    # Add the actual poems to score
    messages.append({"role": "user", "content": user_content})

    return messages


SCORING_JSON_FORMAT = """أجب بصيغة JSON فقط، قائمة من الكائنات بهذا الشكل:
[{"sound": N, "imagery": N, "emotion": N, "language": N, "cultural": N}]
حيث N عدد صحيح من 0 إلى 100. قصيدة واحدة = كائن واحد. عدة قصائد = قائمة."""


def parse_scores_from_response(text: str, batch_records: list[dict]) -> list[dict]:
    """Parse JSON scores from model response."""
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


def load_checkpoint(output_path: Path) -> set[str]:
    """Load already-scored poem IDs from checkpoint file."""
    if output_path.exists():
        return set(pd.read_parquet(output_path)["poem_id"].astype(str).tolist())
    return set()


def save_checkpoint(all_scores: list[dict], output_path: Path) -> int:
    """Save scores to parquet with atomic write (tmp + rename). Returns total count."""
    if not all_scores:
        return 0

    new_df = pd.DataFrame(all_scores)
    if output_path.exists():
        existing = pd.read_parquet(output_path)
        new_ids = set(new_df["poem_id"].astype(str))
        keep = existing[~existing["poem_id"].astype(str).isin(new_ids)]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df

    # Atomic write: write to tmp file then rename
    tmp_path = output_path.with_suffix('.parquet.tmp')
    merged.to_parquet(tmp_path, index=False)
    shutil.move(str(tmp_path), str(output_path))

    return len(merged)


async def score_batch(
    batch_df: pd.DataFrame,
    semaphore: asyncio.Semaphore,
    scorer: dict,
    model: str,
) -> tuple[list[dict], float]:
    """Score a batch of poems using the DSPy-calibrated prompt."""
    import litellm

    async with semaphore:
        # Format poems
        poem_texts = []
        for _, r in batch_df.iterrows():
            poem_texts.append(format_for_scoring(
                str(r["poem_id"]), str(r["title"]),
                str(r["content"]), str(r.get("poet_name", ""))
            ))

        user_content = "قيّم القصائد التالية:\n\n" + "\n\n---\n\n".join(poem_texts)
        user_content += f"\n\n{SCORING_JSON_FORMAT}"

        messages = build_messages(scorer, user_content)

        api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
        api_key = (os.environ.get("ANTHROPIC_API_KEY")
                   or os.environ.get("ANTHROPIC_AUTH_TOKEN")
                   or os.environ.get("LITELLM_API_KEY"))

        kwargs = dict(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=150 * len(batch_df),
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


async def run_scoring(
    poems_df: pd.DataFrame,
    scorer: dict,
    model: str,
    output_path: Path,
    batch_size: int,
    concurrency: int,
    max_cost: float,
    label: str,
):
    """Score poems with checkpointing and cost tracking."""
    # Resume from checkpoint
    scored_ids = load_checkpoint(output_path)
    if scored_ids:
        before = len(poems_df)
        poems_df = poems_df[~poems_df["poem_id"].astype(str).isin(scored_ids)].copy()
        print(f"  Resume: skipping {before - len(poems_df)} already scored, {len(poems_df)} remaining")

    if len(poems_df) == 0:
        print(f"  All poems already scored for {label}!")
        return

    semaphore = asyncio.Semaphore(concurrency)
    batches = [poems_df.iloc[i:i+batch_size] for i in range(0, len(poems_df), batch_size)]
    print(f"  Batches: {len(batches)} (batch_size={batch_size}, concurrency={concurrency})")

    all_scores = []
    total_cost = 0.0
    pbar = tqdm(total=len(poems_df), desc=f"{label} scoring")

    for chunk_start in range(0, len(batches), concurrency):
        chunk = batches[chunk_start:chunk_start + concurrency]
        tasks = [score_batch(b, semaphore, scorer, model) for b in chunk]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Batch error: {result}")
                continue
            scores, cost = result
            for s in scores:
                s["model_used"] = model
                s["scored_at"] = pd.Timestamp.now(tz="UTC").isoformat()
            all_scores.extend(scores)
            total_cost += cost
            pbar.update(len(scores))

        # Checkpoint every CHECKPOINT_INTERVAL poems
        if len(all_scores) >= CHECKPOINT_INTERVAL:
            total_saved = save_checkpoint(all_scores, output_path)
            print(f"\n  Checkpoint: {total_saved} total saved, cost=${total_cost:.4f}")
            all_scores = []

        if total_cost >= max_cost:
            print(f"\n  Cost cap reached: ${total_cost:.4f}")
            break

    pbar.close()

    # Final save
    if all_scores:
        total_saved = save_checkpoint(all_scores, output_path)
        print(f"  Final save: {total_saved} total, cost=${total_cost:.4f}")

    # Summary
    if output_path.exists():
        result_df = pd.read_parquet(output_path)
        print(f"\n  {label} COMPLETE: {len(result_df)} poems scored")
        print(f"  Cost: ${total_cost:.4f}")
        print(f"  Mean: {result_df['quality_score'].mean():.1f}, "
              f"Std: {result_df['quality_score'].std():.1f}, "
              f"Min: {result_df['quality_score'].min()}, "
              f"Max: {result_df['quality_score'].max()}")
        print(f"  90+: {(result_df['quality_score'] >= 90).sum()}, "
              f"75-89: {((result_df['quality_score'] >= 75) & (result_df['quality_score'] < 90)).sum()}, "
              f"50-74: {((result_df['quality_score'] >= 50) & (result_df['quality_score'] < 75)).sum()}, "
              f"<50: {(result_df['quality_score'] < 50).sum()}")


async def validate_on_test(scorer: dict, model: str, label: str):
    """Validate calibrated prompt on the held-out test set."""
    import litellm

    test_df = pd.read_parquet(TEST_PATH)
    print(f"\n{'='*60}")
    print(f"VALIDATE {label.upper()} on {len(test_df)} test poems")
    print(f"{'='*60}")

    # Score 50 poems from the test set for quick validation
    sample = test_df.head(50).copy()
    semaphore = asyncio.Semaphore(10)

    batch_size = 5
    batches = [sample.iloc[i:i+batch_size] for i in range(0, len(sample), batch_size)]

    # Need content for formatting
    content_df = pd.read_parquet(CONTENT_PATH)
    content_map = dict(zip(
        content_df["poem_id"].astype(str),
        zip(content_df["title"].astype(str),
            content_df["content"].astype(str),
            content_df.get("poet_name", pd.Series([""] * len(content_df))).astype(str))
    ))

    all_scores = []
    for batch_df in tqdm(batches, desc=f"Validating {label}"):
        # Build batch with content
        records = []
        for _, row in batch_df.iterrows():
            pid = str(row["poem_id"])
            if pid in content_map:
                title, content, poet = content_map[pid]
                records.append({"poem_id": pid, "title": title, "content": content, "poet_name": poet})

        if not records:
            continue

        rec_df = pd.DataFrame(records)
        scores, _ = await score_batch(rec_df, semaphore, scorer, model)
        all_scores.extend(scores)

    if not all_scores:
        print("  No scores produced!")
        return

    # Compare with Opus gold standard
    scores_df = pd.DataFrame(all_scores)
    scores_df["poem_id"] = scores_df["poem_id"].astype(str)
    test_df["poem_id"] = test_df["poem_id"].astype(str)

    merged = scores_df.merge(test_df, on="poem_id", suffixes=("_pred", "_gold"))

    print(f"\n  Matched: {len(merged)} poems")

    # MAE per dimension
    for d in DIMS:
        pred_col = f"{d}_pred" if f"{d}_pred" in merged.columns else d
        gold_col = f"{d}_gold" if f"{d}_gold" in merged.columns else f"{d}_y"

        if pred_col in merged.columns and gold_col in merged.columns:
            mae = (merged[pred_col] - merged[gold_col]).abs().mean()
            corr = merged[pred_col].corr(merged[gold_col])
            print(f"  {d:10s}: MAE={mae:.1f}, r={corr:.3f}")

    # Overall
    if "quality_score_pred" in merged.columns and "quality_score_gold" in merged.columns:
        mae = (merged["quality_score_pred"] - merged["quality_score_gold"]).abs().mean()
        corr = merged["quality_score_pred"].corr(merged["quality_score_gold"])
        print(f"  {'overall':10s}: MAE={mae:.1f}, r={corr:.3f}")


async def main():
    parser = argparse.ArgumentParser(description="Score poems with DSPy-calibrated prompts")
    parser.add_argument("--validate", action="store_true", help="Validate on test set")
    parser.add_argument("--score-all", action="store_true", help="Score all 5000 poems")
    parser.add_argument("--score-haiku", action="store_true", help="Score bottom 3500 with Haiku")
    parser.add_argument("--score-sonnet", action="store_true", help="Score top 1500 with Sonnet")
    args = parser.parse_args()

    if not any([args.validate, args.score_all, args.score_haiku, args.score_sonnet]):
        parser.print_help()
        return

    # Load scorers
    haiku_scorer = load_dspy_scorer(HAIKU_SCORER_PATH)
    sonnet_scorer = load_dspy_scorer(SONNET_SCORER_PATH)
    print(f"Loaded Haiku scorer: {len(haiku_scorer['demos'])} demos")
    print(f"Loaded Sonnet scorer: {len(sonnet_scorer['demos'])} demos")

    if args.validate:
        await validate_on_test(haiku_scorer, HAIKU_MODEL, "Haiku")
        await validate_on_test(sonnet_scorer, SONNET_MODEL, "Sonnet")
        return

    # Load content and v7 scores to determine tier split
    content_df = pd.read_parquet(CONTENT_PATH)
    content_df["poem_id"] = content_df["poem_id"].astype(str)
    v7_df = pd.read_parquet(V7_SCORES_PATH)
    v7_df["poem_id"] = v7_df["poem_id"].astype(str)

    # Top 1500 by v7 score = Sonnet tier, rest = Haiku tier
    v7_sorted = v7_df.sort_values("quality_score", ascending=False)
    sonnet_ids = set(v7_sorted.head(SONNET_TOP_N)["poem_id"].values)
    haiku_ids = set(v7_sorted.iloc[SONNET_TOP_N:]["poem_id"].values)

    print(f"\nTier split: {len(sonnet_ids)} Sonnet, {len(haiku_ids)} Haiku")

    # Get content for each tier
    sonnet_poems = content_df[content_df["poem_id"].isin(sonnet_ids)].copy()
    haiku_poems = content_df[content_df["poem_id"].isin(haiku_ids)].copy()

    print(f"Sonnet poems with content: {len(sonnet_poems)}")
    print(f"Haiku poems with content: {len(haiku_poems)}")

    if args.score_all or args.score_haiku:
        print(f"\n{'='*60}")
        print(f"HAIKU SCORING: {len(haiku_poems)} poems")
        print(f"{'='*60}")
        await run_scoring(
            haiku_poems, haiku_scorer, HAIKU_MODEL, HAIKU_OUTPUT,
            HAIKU_BATCH_SIZE, HAIKU_CONCURRENCY, MAX_COST_HAIKU,
            "Haiku"
        )

    if args.score_all or args.score_sonnet:
        print(f"\n{'='*60}")
        print(f"SONNET SCORING: {len(sonnet_poems)} poems")
        print(f"{'='*60}")
        await run_scoring(
            sonnet_poems, sonnet_scorer, SONNET_MODEL, SONNET_OUTPUT,
            SONNET_BATCH_SIZE, SONNET_CONCURRENCY, MAX_COST_SONNET,
            "Sonnet"
        )


if __name__ == "__main__":
    asyncio.run(main())
