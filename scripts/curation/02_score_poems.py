"""Score poems using LLM APIs via LiteLLM.

Sends batches of poems to a specified model, parses quality scores across
five dimensions, and saves results as Parquet checkpoints.

Usage:
    python -m scripts.curation.02_score_poems --model anthropic/claude-haiku-4-20250414
    python -m scripts.curation.02_score_poems --model anthropic/claude-haiku-4-20250414 --scope unscored --resume
    python -m scripts.curation.02_score_poems --model anthropic/claude-haiku-4-20250414 --dry-run
"""
import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

import pandas as pd
from tqdm import tqdm

from scripts.curation import config
from scripts.curation.arabic_utils import format_for_scoring


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(description="Score poems with LLM via LiteLLM")
    parser.add_argument("--model", required=True, help="LiteLLM model string (e.g. anthropic/claude-haiku-4-20250414)")
    parser.add_argument("--scope", choices=["all", "top", "unscored"], default="all",
                        help="Which poems to score (default: all)")
    parser.add_argument("--top-k", type=int, default=5000,
                        help="How many top poems when --scope top (default: 5000)")
    parser.add_argument("--batch-size", type=int, default=config.DEFAULT_BATCH_SIZE,
                        help=f"Poems per API call (default: {config.DEFAULT_BATCH_SIZE})")
    parser.add_argument("--concurrency", type=int, default=config.DEFAULT_CONCURRENCY,
                        help=f"Parallel requests (default: {config.DEFAULT_CONCURRENCY})")
    parser.add_argument("--max-cost", type=float, default=config.DEFAULT_MAX_COST,
                        help=f"Dollar cap - stop when reached (default: {config.DEFAULT_MAX_COST})")
    parser.add_argument("--prompt-mode", choices=["compact", "detailed"], default="compact",
                        help="Scoring prompt style (default: compact)")
    parser.add_argument("--resume", action="store_true",
                        help="Skip poems already scored by this model")
    parser.add_argument("--source", choices=["original", "diwan", "all"], default="all",
                        help="Poem source filter (default: all)")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print stats without calling API")
    parser.add_argument("--output", type=str, default=None,
                        help="Output parquet path (default: data/scores_{model_slug}.parquet)")
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Poem loading
# ---------------------------------------------------------------------------

def load_db_poems() -> list[dict]:
    """Load poems from the PostgreSQL database."""
    try:
        conn = config.get_db_connection()
    except (ValueError, Exception) as exc:
        print(f"Warning: Could not connect to DB: {exc}")
        return []

    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT p.id, p.title, p.content, po.name AS poet_name
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.content IS NOT NULL AND p.content != ''
        """)
        rows = cur.fetchall()
        poems = []
        for row in rows:
            poems.append({
                "id": str(row[0]),
                "title": row[1] or "",
                "content": row[2],
                "poet_name": row[3] or "",
                "source": "original",
            })
        return poems
    finally:
        conn.close()


def load_diwan_poems() -> list[dict]:
    """Load poems from the diwan processed parquet file."""
    diwan_path = config.DATA_DIR / "diwan_processed.parquet"
    if not diwan_path.exists():
        print(f"Warning: {diwan_path} not found, skipping diwan poems")
        return []

    df = pd.read_parquet(diwan_path)
    poems = []
    for _, row in df.iterrows():
        poems.append({
            "id": str(row.get("poem_id", row.get("id", row.name))),
            "title": str(row.get("title", "")),
            "content": str(row.get("content", "")),
            "poet_name": str(row.get("poet_name", "")),
            "source": "diwan",
            "poem_form": row.get("poem_form", None),
            "meter": row.get("meter", None),
            "theme": row.get("theme", None),
        })
    return poems


def load_existing_scores(output_path: str) -> set[str]:
    """Load poem IDs already scored from an existing output file."""
    path = Path(output_path)
    if not path.exists():
        return set()
    try:
        df = pd.read_parquet(path)
        return set(df["poem_id"].astype(str).tolist())
    except Exception:
        return set()


def load_poems(args) -> list[dict]:
    """Load and filter poems based on CLI arguments."""
    poems = []

    # Load by source
    if args.source in ("original", "all"):
        poems.extend(load_db_poems())
    if args.source in ("diwan", "all"):
        poems.extend(load_diwan_poems())

    print(f"Loaded {len(poems)} poems (source={args.source})")

    # Apply scope filter
    if args.scope == "top":
        # Use existing scores to pick top-k
        existing_path = Path(args.output) if args.output else None
        if existing_path and existing_path.exists():
            existing_df = pd.read_parquet(existing_path)
            top_ids = set(
                existing_df.nlargest(args.top_k, "quality_score")["poem_id"]
                .astype(str).tolist()
            )
            poems = [p for p in poems if p["id"] in top_ids]
            print(f"  Scope=top: filtered to {len(poems)} top-{args.top_k} poems")
        else:
            print(f"  Scope=top: no existing scores found, scoring all {len(poems)} poems")

    elif args.scope == "unscored":
        scored_ids = load_existing_scores(args.output)
        if scored_ids:
            poems = [p for p in poems if p["id"] not in scored_ids]
            print(f"  Scope=unscored: {len(poems)} poems remaining after filtering {len(scored_ids)} scored")

    # Apply resume filter
    if args.resume:
        scored_ids = load_existing_scores(args.output)
        if scored_ids:
            before = len(poems)
            poems = [p for p in poems if p["id"] not in scored_ids]
            print(f"  Resume: skipped {before - len(poems)} already-scored poems, {len(poems)} remaining")

    return poems


# ---------------------------------------------------------------------------
# Score parsing
# ---------------------------------------------------------------------------

def parse_scores(text: str, batch: list[dict]) -> list[dict]:
    """Parse scoring response with triple-layer fallback."""
    # Layer 1: Direct JSON parse
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            parsed = [parsed]
        return validate_scores(parsed, batch)
    except json.JSONDecodeError:
        pass

    # Layer 2: Regex extract JSON objects from text
    json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
    matches = re.findall(json_pattern, text)
    if matches:
        parsed = []
        for m in matches:
            try:
                parsed.append(json.loads(m))
            except json.JSONDecodeError:
                continue
        if parsed:
            return validate_scores(parsed, batch)

    # Layer 3: Lenient repair (fix trailing commas, missing quotes, etc.)
    cleaned = text.strip()
    cleaned = re.sub(r',\s*}', '}', cleaned)
    cleaned = re.sub(r',\s*]', ']', cleaned)
    try:
        parsed = json.loads(cleaned)
        if isinstance(parsed, dict):
            parsed = [parsed]
        return validate_scores(parsed, batch)
    except json.JSONDecodeError:
        print(f"Failed to parse scores from response: {text[:200]}...")
        return []


def validate_scores(parsed: list[dict], batch: list[dict]) -> list[dict]:
    """Validate and pair parsed scores with batch poems."""
    results = []
    for i, item in enumerate(parsed):
        poem = batch[i] if i < len(batch) else None
        if not poem:
            continue
        score_entry = {
            "poem_id": str(poem["id"]),
            "source": poem.get("source", "unknown"),
            "model_used": "",  # filled by caller
        }
        for dim in config.SCORE_DIMENSIONS:
            val = item.get(dim, 0)
            score_entry[dim] = max(0, min(100, int(val))) if isinstance(val, (int, float)) else 0
        score_entry["quality_score"] = round(
            sum(score_entry[d] for d in config.SCORE_DIMENSIONS) / len(config.SCORE_DIMENSIONS)
        )
        score_entry["scored_at"] = pd.Timestamp.now(tz="UTC").isoformat()
        if "notes" in item:
            score_entry["notes"] = json.dumps(item["notes"], ensure_ascii=False)
        if "verdict" in item:
            score_entry["verdict"] = item["verdict"]
        results.append(score_entry)
    return results


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------

def save_checkpoint(scores: list[dict], output_path: str):
    """Save scores to Parquet file."""
    if not scores:
        return
    df = pd.DataFrame(scores)
    df.to_parquet(output_path, index=False)
    print(f"  Checkpoint: {len(scores)} scores saved to {output_path}")


# ---------------------------------------------------------------------------
# Async scoring
# ---------------------------------------------------------------------------

async def score_batch(batch, model, system_prompt, semaphore, max_tokens):
    """Score a single batch of poems via LiteLLM."""
    import litellm

    async with semaphore:
        user_content = "\n\n---\n\n".join(
            format_for_scoring(p["id"], p["title"], p["content"], p.get("poet_name", ""))
            for p in batch
        )
        response = await litellm.acompletion(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.3,
            max_tokens=max_tokens,
        )
        return response


async def main_scoring_loop(poems: list[dict], args) -> tuple[list[dict], float]:
    """Run the async scoring loop over all poems."""
    import litellm

    semaphore = asyncio.Semaphore(args.concurrency)
    system_prompt = (
        config.COMPACT_SCORING_PROMPT if args.prompt_mode == "compact"
        else config.DETAILED_SCORING_PROMPT
    )
    max_tokens = (
        200 * args.batch_size if args.prompt_mode == "compact"
        else 500 * args.batch_size
    )

    all_scores: list[dict] = []
    total_cost = 0.0
    batches = [poems[i:i + args.batch_size] for i in range(0, len(poems), args.batch_size)]

    pbar = tqdm(total=len(poems), desc="Scoring poems")

    # Process in chunks of concurrency
    for chunk_start in range(0, len(batches), args.concurrency):
        chunk = batches[chunk_start:chunk_start + args.concurrency]
        tasks = [
            score_batch(b, args.model, system_prompt, semaphore, max_tokens)
            for b in chunk
        ]
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        for batch, response in zip(chunk, responses):
            if isinstance(response, Exception):
                print(f"Error scoring batch: {response}")
                continue

            # Track cost
            try:
                cost = litellm.completion_cost(completion_response=response)
                total_cost += cost
            except Exception:
                pass

            # Parse scores
            scores = parse_scores(response.choices[0].message.content, batch)
            for s in scores:
                s["model_used"] = args.model
            all_scores.extend(scores)
            pbar.update(len(batch))

        # Check cost cap
        if total_cost >= args.max_cost:
            print(f"\nCost cap reached: ${total_cost:.2f} >= ${args.max_cost}")
            break

        # Periodic checkpoint
        if len(all_scores) % config.CHECKPOINT_INTERVAL < args.batch_size * args.concurrency:
            save_checkpoint(all_scores, args.output)

    pbar.close()
    return all_scores, total_cost


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()
    model_slug = args.model.replace("/", "_")
    if not args.output:
        args.output = str(config.DATA_DIR / f"scores_{model_slug}.parquet")

    poems = load_poems(args)

    if not poems:
        print("No poems to score.")
        return

    if args.dry_run:
        est_batches = len(poems) // args.batch_size + (1 if len(poems) % args.batch_size else 0)
        print(f"Dry run: would score {len(poems)} poems with {args.model}")
        print(f"  Estimated batches: {est_batches}")
        print(f"  Batch size: {args.batch_size}")
        print(f"  Concurrency: {args.concurrency}")
        print(f"  Prompt mode: {args.prompt_mode}")
        print(f"  Max cost: ${args.max_cost}")
        print(f"  Output: {args.output}")
        return

    scores, total_cost = asyncio.run(main_scoring_loop(poems, args))

    # Final save
    save_checkpoint(scores, args.output)
    print(f"\nDone! {len(scores)} poems scored, total cost: ${total_cost:.2f}")
    print(f"Scores saved to: {args.output}")


if __name__ == "__main__":
    main()
