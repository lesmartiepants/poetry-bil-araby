"""Translation Quality Scorer — judges both synthesized and baseline variants.

For each poem, scores the synthesized (humanized) variant and the baseline
variant across 10 dimensions (5 translation + 4 insight + ai_detection_score),
computes composites, and generates train/val/test splits from Opus-scored data.

Usage:
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.03_score_translations \
        --model openai/bedrock-opus-46 --tier opus --concurrency 5 --resume
"""
import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.translation_and_insight_optimizer import config
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import (
    format_for_scoring,
)


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Score translation quality across 10 dimensions"
    )
    parser.add_argument(
        "--model",
        required=True,
        help="LiteLLM model string for the judge (e.g. openai/bedrock-opus-46)",
    )
    parser.add_argument(
        "--tier",
        choices=["opus", "sonnet", "haiku"],
        required=True,
        help="Which tier's translations to score",
    )
    parser.add_argument(
        "--translation-model",
        default=None,
        help="Model slug used for translations (default: same as --model)",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=config.DEFAULT_CONCURRENCY,
        help=f"Max parallel scoring calls (default: {config.DEFAULT_CONCURRENCY})",
    )
    parser.add_argument(
        "--max-cost",
        type=float,
        default=config.DEFAULT_MAX_COST,
        help=f"Dollar cap — stop when reached (default: {config.DEFAULT_MAX_COST})",
    )
    parser.add_argument(
        "--resume",
        action="store_true",
        help="Skip poem/variant pairs already scored in output file",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print stats without calling API",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# JSON extraction (copied from 02_score_poems.py)
# ---------------------------------------------------------------------------

def _extract_json_objects(text: str) -> list[dict]:
    """Extract JSON objects from text using a bracket-counting parser.

    Handles arbitrarily nested braces (e.g., notes: {sound: "...", ...}).
    """
    results = []
    i = 0
    while i < len(text):
        if text[i] == "{":
            depth = 0
            start = i
            in_string = False
            escape_next = False
            while i < len(text):
                ch = text[i]
                if escape_next:
                    escape_next = False
                elif ch == "\\" and in_string:
                    escape_next = True
                elif ch == '"' and not escape_next:
                    in_string = not in_string
                elif not in_string:
                    if ch == "{":
                        depth += 1
                    elif ch == "}":
                        depth -= 1
                        if depth == 0:
                            candidate = text[start : i + 1]
                            try:
                                results.append(json.loads(candidate))
                            except json.JSONDecodeError:
                                cleaned = re.sub(r",\s*}", "}", candidate)
                                cleaned = re.sub(r",\s*]", "]", cleaned)
                                try:
                                    results.append(json.loads(cleaned))
                                except json.JSONDecodeError:
                                    pass
                            break
                i += 1
        i += 1
    return results


def parse_judge_response(text: str) -> dict | None:
    """Parse the judge's JSON response into dimension scores."""
    # Strip markdown code fences
    text = re.sub(r"```(?:json)?\s*", "", text).strip()

    # Layer 1: Direct JSON parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return _validate_scores(parsed)
    except json.JSONDecodeError:
        pass

    # Layer 2: Bracket-counting extraction
    extracted = _extract_json_objects(text)
    if extracted:
        return _validate_scores(extracted[0])

    # Layer 3: Lenient repair
    cleaned = re.sub(r",\s*}", "}", text)
    cleaned = re.sub(r",\s*]", "]", cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            return _validate_scores(parsed)
    except json.JSONDecodeError:
        print(f"  Failed to parse judge response: {text[:200]}...")
        return None


def _validate_scores(parsed: dict) -> dict | None:
    """Validate and clamp dimension scores to 0-100."""
    scores = {}
    for dim in config.ALL_DIMENSIONS:
        val = parsed.get(dim, 0)
        if isinstance(val, (int, float)):
            scores[dim] = max(0, min(100, int(val)))
        else:
            scores[dim] = 0
    return scores


# ---------------------------------------------------------------------------
# LLM call helpers
# ---------------------------------------------------------------------------

def _get_api_config() -> dict:
    """Get API configuration from environment."""
    api_base = os.environ.get("ANTHROPIC_BASE_URL") or os.environ.get("LITELLM_API_BASE")
    api_key = (
        os.environ.get("ANTHROPIC_API_KEY")
        or os.environ.get("ANTHROPIC_AUTH_TOKEN")
        or os.environ.get("LITELLM_API_KEY")
    )
    result = {}
    if api_base:
        result["api_base"] = api_base
    if api_key:
        result["api_key"] = api_key
    return result


async def score_variant(
    poem_id: str,
    variant: str,
    original_arabic: str,
    poem_section: str,
    depth_section: str,
    author_section: str,
    model: str,
    semaphore: asyncio.Semaphore,
) -> dict | None:
    """Score a single translation variant (synthesized or baseline)."""
    import litellm

    user_message = (
        f"ORIGINAL ARABIC:\n{original_arabic}\n\n"
        f"--- ENGLISH TRANSLATION ---\n"
        f"POEM:\n{poem_section}\n\n"
        f"THE DEPTH: {depth_section}\n\n"
        f"THE AUTHOR: {author_section}"
    )

    async with semaphore:
        api_cfg = _get_api_config()
        try:
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": config.JUDGE_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=0.3,
                max_tokens=500,
                **api_cfg,
            )
        except Exception as exc:
            print(f"  Judge call failed for poem {poem_id} ({variant}): {exc}")
            return None

        text = response.choices[0].message.content or ""
        cost = 0.0
        try:
            cost = litellm.completion_cost(completion_response=response)
        except Exception:
            pass

        scores = parse_judge_response(text)
        if scores is None:
            return None

        # Compute composites
        composites = config.compute_composites(scores)

        return {
            "poem_id": str(poem_id),
            "variant": variant,
            **scores,
            **composites,
            "model_used": model,
            "cost": round(cost, 6),
            "timestamp": pd.Timestamp.now(tz="UTC").isoformat(),
        }


# ---------------------------------------------------------------------------
# Checkpoint / resume
# ---------------------------------------------------------------------------

def load_existing_pairs(output_path: Path) -> set[tuple[str, str]]:
    """Load (poem_id, variant) pairs already scored."""
    if not output_path.exists():
        return set()
    try:
        df = pd.read_parquet(output_path)
        return set(
            zip(df["poem_id"].astype(str), df["variant"].astype(str))
        )
    except Exception:
        return set()


def save_checkpoint(results: list[dict], output_path: Path):
    """Save scores to parquet, merging with existing data."""
    if not results:
        return
    new_df = pd.DataFrame(results)
    if output_path.exists():
        existing_df = pd.read_parquet(output_path)
        # Remove duplicates by (poem_id, variant)
        new_pairs = set(
            zip(new_df["poem_id"].astype(str), new_df["variant"].astype(str))
        )
        keep = existing_df[
            ~existing_df.apply(
                lambda r: (str(r["poem_id"]), str(r["variant"])) in new_pairs, axis=1
            )
        ]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df
    merged.to_parquet(output_path, index=False)
    print(f"  Checkpoint: {len(merged)} total scores saved ({len(results)} new)")


# ---------------------------------------------------------------------------
# Train/val/test splits
# ---------------------------------------------------------------------------

def generate_splits(scores_path: Path, sampled_path: Path, seed: int = 42):
    """Generate train/val/test splits from Opus-scored data.

    Splits: 30 train / 10 val / 10 test.
    Only poems that have both synthesized and baseline scores are included.
    """
    if not scores_path.exists():
        print("  No scores file found, skipping splits generation.")
        return

    scores_df = pd.read_parquet(scores_path)
    sampled_df = pd.read_parquet(sampled_path) if sampled_path.exists() else None

    # Find poems with both variants scored
    synth_ids = set(
        scores_df[scores_df["variant"] == "synthesized"]["poem_id"].astype(str)
    )
    baseline_ids = set(
        scores_df[scores_df["variant"] == "baseline"]["poem_id"].astype(str)
    )
    both_ids = sorted(synth_ids & baseline_ids)

    if len(both_ids) < 50:
        print(f"  Only {len(both_ids)} poems with both variants scored; need 50 for splits.")
        print("  Generating splits with available data...")

    # Shuffle deterministically
    import numpy as np
    np.random.seed(seed)
    np.random.shuffle(both_ids)

    train_ids = both_ids[:30]
    val_ids = both_ids[30:40]
    test_ids = both_ids[40:50]

    # Build split DataFrames with scores + poem metadata
    for split_name, split_ids in [
        ("train", train_ids),
        ("val", val_ids),
        ("test", test_ids),
    ]:
        if not split_ids:
            print(f"  No data for {split_name} split, skipping.")
            continue

        split_scores = scores_df[scores_df["poem_id"].astype(str).isin(split_ids)].copy()

        # Merge poem metadata if available
        if sampled_df is not None:
            meta_cols = ["poem_id", "title", "content", "poet_name", "quality_score",
                         "poem_form", "theme", "meter"]
            available_cols = [c for c in meta_cols if c in sampled_df.columns]
            meta = sampled_df[available_cols].copy()
            meta["poem_id"] = meta["poem_id"].astype(str)
            split_scores["poem_id"] = split_scores["poem_id"].astype(str)
            split_df = split_scores.merge(meta, on="poem_id", how="left")
        else:
            split_df = split_scores

        out_path = config.DATA_DIR / f"splits_{split_name}.parquet"
        split_df.to_parquet(out_path, index=False)
        print(f"  Split {split_name}: {len(split_ids)} poems, {len(split_df)} rows -> {out_path}")


# ---------------------------------------------------------------------------
# Main async loop
# ---------------------------------------------------------------------------

async def main_scoring_loop(
    translations: list[dict],
    args,
    output_path: Path,
    done_pairs: set[tuple[str, str]],
) -> tuple[list[dict], float]:
    """Score all translation variants."""
    semaphore = asyncio.Semaphore(args.concurrency)
    all_results: list[dict] = []
    total_cost = 0.0

    # Build scoring tasks: 2 per poem (synthesized + baseline)
    tasks_to_run = []
    for row in translations:
        pid = str(row["poem_id"])

        # Synthesized variant (uses humanized depth/author)
        if (pid, "synthesized") not in done_pairs:
            tasks_to_run.append({
                "poem_id": pid,
                "variant": "synthesized",
                "original_arabic": row.get("_formatted_arabic", ""),
                "poem_section": row.get("synthesized_poem", ""),
                "depth_section": row.get("humanized_depth", "") or row.get("synthesized_depth", ""),
                "author_section": row.get("humanized_author", "") or row.get("synthesized_author", ""),
            })

        # Baseline variant
        if (pid, "baseline") not in done_pairs:
            tasks_to_run.append({
                "poem_id": pid,
                "variant": "baseline",
                "original_arabic": row.get("_formatted_arabic", ""),
                "poem_section": row.get("baseline_poem", ""),
                "depth_section": row.get("baseline_depth", ""),
                "author_section": row.get("baseline_author", ""),
            })

    pbar = tqdm(total=len(tasks_to_run), desc="Scoring translations")

    # Process in chunks
    for chunk_start in range(0, len(tasks_to_run), args.concurrency):
        chunk = tasks_to_run[chunk_start : chunk_start + args.concurrency]

        coros = [
            score_variant(
                t["poem_id"],
                t["variant"],
                t["original_arabic"],
                t["poem_section"],
                t["depth_section"],
                t["author_section"],
                args.model,
                semaphore,
            )
            for t in chunk
        ]
        results = await asyncio.gather(*coros, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Scoring error: {result}")
                pbar.update(1)
                continue
            if result is None:
                pbar.update(1)
                continue

            all_results.append(result)
            total_cost += result["cost"]
            pbar.update(1)

        # Cost cap
        if total_cost >= args.max_cost:
            print(f"\nCost cap reached: ${total_cost:.2f} >= ${args.max_cost}")
            break

        # Periodic checkpoint
        if len(all_results) > 0 and len(all_results) % config.CHECKPOINT_INTERVAL < args.concurrency:
            save_checkpoint(all_results, output_path)

    pbar.close()
    return all_results, total_cost


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()
    model_slug = args.model.replace("/", "_")
    trans_model_slug = (args.translation_model or args.model).replace("/", "_")

    # Load translations
    trans_path = config.DATA_DIR / f"translations_{trans_model_slug}_{args.tier}.parquet"
    if not trans_path.exists():
        print(f"Error: {trans_path} not found. Run 02_generate_translations.py first.")
        sys.exit(1)

    trans_df = pd.read_parquet(trans_path)
    print(f"Loaded {len(trans_df)} translations from {trans_path}")

    # Load sampled poems for original Arabic text
    sampled_path = config.DATA_DIR / f"sampled_poems_{args.tier}.parquet"
    if sampled_path.exists():
        sampled_df = pd.read_parquet(sampled_path)
        # Merge Arabic content for judge context
        sampled_df["poem_id"] = sampled_df["poem_id"].astype(str)
        trans_df["poem_id"] = trans_df["poem_id"].astype(str)
        # Format Arabic for the judge
        formatted_arabic = {}
        for _, row in sampled_df.iterrows():
            formatted_arabic[str(row["poem_id"])] = format_for_scoring(
                str(row["poem_id"]),
                row.get("title", ""),
                row["content"],
                row.get("poet_name", ""),
            )
        trans_df["_formatted_arabic"] = trans_df["poem_id"].map(formatted_arabic).fillna("")
    else:
        print(f"Warning: {sampled_path} not found. Judge will not see original Arabic.")
        trans_df["_formatted_arabic"] = ""

    translations = trans_df.to_dict("records")

    output_path = config.DATA_DIR / f"scores_translations_{model_slug}.parquet"

    # Resume: find already-scored pairs
    done_pairs = set()
    if args.resume:
        done_pairs = load_existing_pairs(output_path)
        if done_pairs:
            total_possible = len(translations) * 2
            print(f"  Resume: {len(done_pairs)} variant scores already done out of {total_possible}")

    if args.dry_run:
        n_tasks = sum(
            1
            for t in translations
            for v in ["synthesized", "baseline"]
            if (str(t["poem_id"]), v) not in done_pairs
        )
        print(f"Dry run: would score {n_tasks} variants with {args.model}")
        print(f"  Poems: {len(translations)}")
        print(f"  Concurrency: {args.concurrency}")
        print(f"  Max cost: ${args.max_cost}")
        print(f"  Output: {output_path}")
        return

    # Run scoring
    results, total_cost = asyncio.run(
        main_scoring_loop(translations, args, output_path, done_pairs)
    )

    # Final save
    save_checkpoint(results, output_path)
    print(f"\nDone! {len(results)} variants scored, total cost: ${total_cost:.2f}")
    print(f"Scores saved to: {output_path}")

    # Generate train/val/test splits for Opus tier
    if args.tier == "opus":
        print("\nGenerating train/val/test splits from Opus scores...")
        generate_splits(output_path, sampled_path, seed=42)


if __name__ == "__main__":
    main()
