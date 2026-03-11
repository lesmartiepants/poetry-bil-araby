"""Multi-expert Translation Generator — parallel expert + synthesis + humanizer pipeline.

Per poem, runs 3 expert prompts in parallel (bridge, scholar, craftsperson),
then a synthesizer to merge them, then a humanizer to rewrite DEPTH/AUTHOR
sections. Also generates a baseline translation using the production prompt.

Total 6 LLM calls per poem: 3 experts + 1 synthesis + 1 humanizer + 1 baseline.

Usage:
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.02_generate_translations \
        --model openai/bedrock-opus-46 --tier opus --concurrency 5 --max-cost 30 --resume
"""
import argparse
import asyncio
import os
import re
import sys
import time
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
# Baseline prompt (copied from src/prompts.js INSIGHTS_SYSTEM_PROMPT)
# ---------------------------------------------------------------------------

BASELINE_PROMPT = """\
You are an expert scholar of Arabic poetry and a gifted English prose stylist.

TASK: Explain this Arabic poem so an English-speaking reader truly understands it.

Provide exactly three sections:

POEM:
Translate the poem into natural, flowing English. Preserve the imagery and emotional weight but prioritize clarity — the reader should understand what the poet is actually saying. Preserve the original line breaks exactly: produce one English line for each Arabic line, in the same order. You may paraphrase freely within each line for clarity, but do not merge, split, add, or remove lines.

THE DEPTH:
In 3-5 sentences, explain what this poem means. Cover: the central theme or argument, key metaphors or cultural references an English speaker would miss, and why this poem matters in the Arabic literary tradition.

THE AUTHOR:
In 3-4 sentences, describe the poet. Include their full name, their historical era and geographic context, and what they are most famous for. If their exact birth/death years are known, include them; otherwise state approximate century or say dates are unknown. Mention their standing among Arab poets only if well established; if uncertain, say so rather than guessing. If the poet cannot be confidently identified from the text, say the attribution is uncertain and avoid inventing biographical details.

IMPORTANT: Use the section headers POEM:, THE DEPTH:, and THE AUTHOR: only as labels. Never write these exact strings (with colon) inside the body of any section.

Strictly use this format:
POEM:
[Translation]
THE DEPTH: [Text]
THE AUTHOR: [Text]"""


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Multi-expert translation generator with synthesis and humanization"
    )
    parser.add_argument(
        "--model",
        required=True,
        help="LiteLLM model string (e.g. openai/bedrock-opus-46)",
    )
    parser.add_argument(
        "--tier",
        choices=["opus", "sonnet", "haiku"],
        required=True,
        help="Which sampled tier to translate",
    )
    parser.add_argument(
        "--concurrency",
        type=int,
        default=config.DEFAULT_CONCURRENCY,
        help=f"Max parallel poem pipelines (default: {config.DEFAULT_CONCURRENCY})",
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
        help="Skip poems already processed (by poem_id in output file)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print stats without calling API",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Section parsing
# ---------------------------------------------------------------------------

_SECTION_RE = re.compile(
    r"POEM:\s*\n?(.*?)(?=THE DEPTH:)",
    re.DOTALL,
)
_DEPTH_RE = re.compile(
    r"THE DEPTH:\s*(.*?)(?=THE AUTHOR:)",
    re.DOTALL,
)
_AUTHOR_RE = re.compile(
    r"THE AUTHOR:\s*(.*)",
    re.DOTALL,
)


def parse_sections(text: str) -> dict:
    """Parse POEM / THE DEPTH / THE AUTHOR sections from synthesizer or baseline output."""
    result = {"poem": "", "depth": "", "author": ""}

    m = _SECTION_RE.search(text)
    if m:
        result["poem"] = m.group(1).strip()

    m = _DEPTH_RE.search(text)
    if m:
        result["depth"] = m.group(1).strip()

    m = _AUTHOR_RE.search(text)
    if m:
        result["author"] = m.group(1).strip()

    return result


def parse_humanizer_sections(text: str) -> dict:
    """Parse THE DEPTH / THE AUTHOR from humanizer output."""
    result = {"depth": "", "author": ""}

    m = _DEPTH_RE.search(text)
    if m:
        result["depth"] = m.group(1).strip()

    m = _AUTHOR_RE.search(text)
    if m:
        result["author"] = m.group(1).strip()

    return result


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


async def _llm_call(
    model: str,
    system_prompt: str,
    user_message: str,
    semaphore: asyncio.Semaphore,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> tuple[str, float]:
    """Make a single LLM call and return (response_text, cost)."""
    import litellm

    async with semaphore:
        api_cfg = _get_api_config()
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=temperature,
            max_tokens=max_tokens,
            **api_cfg,
        )

        text = response.choices[0].message.content or ""
        cost = 0.0
        try:
            cost = litellm.completion_cost(completion_response=response)
        except Exception:
            pass

        return text, cost


# ---------------------------------------------------------------------------
# Per-poem pipeline
# ---------------------------------------------------------------------------

async def translate_poem(
    poem: dict,
    model: str,
    semaphore: asyncio.Semaphore,
) -> dict | None:
    """Run the full translation pipeline for a single poem.

    Steps:
    1. Three expert translations in parallel (bridge, scholar, craftsperson)
    2. Synthesizer merges the three into POEM + DEPTH + AUTHOR
    3. Humanizer rewrites DEPTH and AUTHOR
    4. Baseline translation using production prompt

    Returns a dict with all columns or None on failure.
    """
    formatted = format_for_scoring(
        str(poem["poem_id"]),
        poem.get("title", ""),
        poem["content"],
        poem.get("poet_name", ""),
    )

    total_cost = 0.0

    # --- Step 1: Three experts in parallel ---
    expert_prompts = config.get_expert_prompts()
    expert_tasks = []
    expert_names = []
    for role, prompt in expert_prompts.items():
        expert_names.append(role)
        expert_tasks.append(
            _llm_call(model, prompt, formatted, semaphore, temperature=0.7)
        )

    # Also run baseline in parallel with experts
    baseline_task = _llm_call(
        model, BASELINE_PROMPT, formatted, semaphore, temperature=0.7
    )

    results = await asyncio.gather(
        *expert_tasks, baseline_task, return_exceptions=True
    )

    # Parse expert results
    expert_translations = {}
    for i, name in enumerate(expert_names):
        if isinstance(results[i], Exception):
            print(f"  Expert {name} failed for poem {poem['poem_id']}: {results[i]}")
            return None
        text, cost = results[i]
        expert_translations[name] = text
        total_cost += cost

    # Parse baseline result
    if isinstance(results[-1], Exception):
        print(f"  Baseline failed for poem {poem['poem_id']}: {results[-1]}")
        return None
    baseline_full, baseline_cost = results[-1]
    total_cost += baseline_cost

    # --- Step 2: Synthesizer ---
    synth_user_msg = (
        f"ORIGINAL ARABIC:\n{formatted}\n\n"
        f"--- BRIDGE EXPERT TRANSLATION ---\n{expert_translations['bridge']}\n\n"
        f"--- ARABIC POETRY SCHOLAR TRANSLATION ---\n{expert_translations['scholar']}\n\n"
        f"--- ENGLISH POETRY CRAFTSPERSON TRANSLATION ---\n{expert_translations['craftsperson']}"
    )
    try:
        synth_full, synth_cost = await _llm_call(
            model, config.SYNTHESIZER_PROMPT, synth_user_msg, semaphore, temperature=0.5
        )
        total_cost += synth_cost
    except Exception as exc:
        print(f"  Synthesizer failed for poem {poem['poem_id']}: {exc}")
        return None

    synth_sections = parse_sections(synth_full)

    # --- Step 3: Humanizer ---
    if synth_sections["depth"] and synth_sections["author"]:
        humanizer_input = config.HUMANIZER_PROMPT.format(
            depth=synth_sections["depth"],
            author=synth_sections["author"],
        )
        try:
            humanizer_out, humanizer_cost = await _llm_call(
                model,
                "You are a Humanizer editor. Follow the instructions exactly.",
                humanizer_input,
                semaphore,
                temperature=0.8,
            )
            total_cost += humanizer_cost
            humanized = parse_humanizer_sections(humanizer_out)
        except Exception as exc:
            print(f"  Humanizer failed for poem {poem['poem_id']}: {exc}")
            humanized = {"depth": synth_sections["depth"], "author": synth_sections["author"]}
    else:
        humanized = {"depth": synth_sections["depth"], "author": synth_sections["author"]}

    # --- Parse baseline sections ---
    baseline_sections = parse_sections(baseline_full)

    return {
        "poem_id": str(poem["poem_id"]),
        "bridge_translation": expert_translations.get("bridge", ""),
        "scholar_translation": expert_translations.get("scholar", ""),
        "craftsperson_translation": expert_translations.get("craftsperson", ""),
        "synthesized_full": synth_full,
        "synthesized_poem": synth_sections["poem"],
        "synthesized_depth": synth_sections["depth"],
        "synthesized_author": synth_sections["author"],
        "humanized_depth": humanized["depth"],
        "humanized_author": humanized["author"],
        "baseline_full": baseline_full,
        "baseline_poem": baseline_sections["poem"],
        "baseline_depth": baseline_sections["depth"],
        "baseline_author": baseline_sections["author"],
        "model_used": model,
        "cost": round(total_cost, 6),
        "timestamp": pd.Timestamp.now(tz="UTC").isoformat(),
    }


# ---------------------------------------------------------------------------
# Checkpoint / resume
# ---------------------------------------------------------------------------

def load_existing_ids(output_path: Path) -> set[str]:
    """Load poem IDs already processed from existing output."""
    if not output_path.exists():
        return set()
    try:
        df = pd.read_parquet(output_path)
        return set(df["poem_id"].astype(str).tolist())
    except Exception:
        return set()


def save_checkpoint(results: list[dict], output_path: Path):
    """Save results to parquet, merging with existing data."""
    if not results:
        return
    new_df = pd.DataFrame(results)
    if output_path.exists():
        existing_df = pd.read_parquet(output_path)
        new_ids = set(new_df["poem_id"].astype(str))
        keep = existing_df[~existing_df["poem_id"].astype(str).isin(new_ids)]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df
    merged.to_parquet(output_path, index=False)
    print(f"  Checkpoint: {len(merged)} total translations saved ({len(results)} new)")


# ---------------------------------------------------------------------------
# Main async loop
# ---------------------------------------------------------------------------

async def main_translation_loop(
    poems: list[dict], args, output_path: Path
) -> tuple[list[dict], float]:
    """Run translations for all poems with concurrency control."""
    semaphore = asyncio.Semaphore(args.concurrency)
    all_results: list[dict] = []
    total_cost = 0.0

    pbar = tqdm(total=len(poems), desc="Translating poems")

    # Process poems in chunks equal to concurrency
    for chunk_start in range(0, len(poems), args.concurrency):
        chunk = poems[chunk_start : chunk_start + args.concurrency]

        tasks = [
            translate_poem(poem, args.model, semaphore)
            for poem in chunk
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, Exception):
                print(f"  Pipeline error: {result}")
                pbar.update(1)
                continue
            if result is None:
                pbar.update(1)
                continue

            all_results.append(result)
            total_cost += result["cost"]
            pbar.update(1)

        # Cost cap check
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

    # Load sampled poems
    input_path = config.DATA_DIR / f"sampled_poems_{args.tier}.parquet"
    if not input_path.exists():
        print(f"Error: {input_path} not found. Run 01_sample_poems.py first.")
        sys.exit(1)

    df = pd.read_parquet(input_path)
    poems = df.to_dict("records")
    print(f"Loaded {len(poems)} poems from {input_path}")

    output_path = config.DATA_DIR / f"translations_{model_slug}_{args.tier}.parquet"

    # Resume: skip already-processed poems
    if args.resume:
        done_ids = load_existing_ids(output_path)
        if done_ids:
            before = len(poems)
            poems = [p for p in poems if str(p["poem_id"]) not in done_ids]
            print(f"  Resume: skipped {before - len(poems)} already-processed, {len(poems)} remaining")

    if not poems:
        print("No poems to translate.")
        return

    if args.dry_run:
        est_calls = len(poems) * 6
        print(f"Dry run: would translate {len(poems)} poems with {args.model}")
        print(f"  Estimated LLM calls: {est_calls} (6 per poem)")
        print(f"  Concurrency: {args.concurrency}")
        print(f"  Max cost: ${args.max_cost}")
        print(f"  Output: {output_path}")
        return

    # Run the pipeline
    results, total_cost = asyncio.run(main_translation_loop(poems, args, output_path))

    # Final save
    save_checkpoint(results, output_path)
    print(f"\nDone! {len(results)} poems translated, total cost: ${total_cost:.2f}")
    print(f"Translations saved to: {output_path}")


if __name__ == "__main__":
    main()
