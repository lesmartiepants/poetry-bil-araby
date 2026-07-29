"""Classify poems into reader-facing categories (mood / topic / motif + scalars)
using Claude via LiteLLM.

Mirrors the quality-scoring pipeline (02_score_poems.py): async batching,
Parquet checkpoints, --resume, cost cap, --dry-run. Output feeds
import_categories.py, which writes to the DB.

Usage:
    # Bulk classify everything with Gemini Flash (cheap; working provider here):
    python -m poetry_quality_and_curation.categorization.classify_poems \
        --model gemini/gemini-2.5-flash --scope all --concurrency 15 --max-cost 40 --resume

    # Or via the Anthropic/Bedrock proxy when it's reachable:
    python -m poetry_quality_and_curation.categorization.classify_poems \
        --model openai/bedrock-haiku-45 --scope all --concurrency 15 --max-cost 40 --resume

    # Only classify poems not yet categorized:
    python -m poetry_quality_and_curation.categorization.classify_poems \
        --model openai/bedrock-haiku-45 --scope unclassified --resume

    # Sanity check without calling the API:
    python -m poetry_quality_and_curation.categorization.classify_poems --model x --dry-run
"""
import argparse
import asyncio
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.categorization import config
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import format_for_scoring


# ---------------------------------------------------------------------------
# Args
# ---------------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser(description="Classify poems into categories via LiteLLM")
    p.add_argument("--model", required=True, help="LiteLLM model string (e.g. openai/bedrock-haiku-45)")
    p.add_argument("--scope", choices=["all", "top", "unclassified"], default="all",
                   help="Which poems to classify (default: all)")
    p.add_argument("--top-k", type=int, default=5000, help="Top-K by quality when --scope top")
    p.add_argument("--batch-size", type=int, default=config.DEFAULT_BATCH_SIZE)
    p.add_argument("--concurrency", type=int, default=config.DEFAULT_CONCURRENCY)
    p.add_argument("--max-cost", type=float, default=config.DEFAULT_MAX_COST)
    p.add_argument("--resume", action="store_true", help="Skip poems already in the output file")
    p.add_argument("--dry-run", action="store_true", help="Print stats without calling the API")
    p.add_argument("--output", type=str, default=None,
                   help="Output parquet (default: data/categories_{model_slug}.parquet)")
    return p.parse_args()


# ---------------------------------------------------------------------------
# Poem loading (from the production DB)
# ---------------------------------------------------------------------------
def load_db_poems(scope: str, top_k: int) -> list[dict]:
    conn = config.get_db_connection()
    try:
        cur = conn.cursor()
        where = "p.content IS NOT NULL AND p.content != ''"
        if scope == "unclassified":
            where += " AND p.categorized_at IS NULL"
        order = ""
        if scope == "top":
            where += " AND p.quality_score IS NOT NULL"
            order = "ORDER BY p.quality_score DESC NULLS LAST"
        limit = f"LIMIT {int(top_k)}" if scope == "top" else ""
        cur.execute(f"""
            SELECT p.id, p.title, p.content, po.name AS poet_name
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE {where}
            {order}
            {limit}
        """)
        return [
            {"id": str(r[0]), "title": r[1] or "", "content": r[2], "poet_name": r[3] or ""}
            for r in cur.fetchall()
        ]
    finally:
        conn.close()


def load_existing_ids(output_path: str) -> set[str]:
    path = Path(output_path)
    if not path.exists():
        return set()
    try:
        return set(pd.read_parquet(path)["poem_id"].astype(str).tolist())
    except Exception:
        return set()


def load_poems(args) -> list[dict]:
    poems = load_db_poems(args.scope, args.top_k)
    print(f"Loaded {len(poems)} poems (scope={args.scope})")
    if args.resume:
        done = load_existing_ids(args.output)
        if done:
            before = len(poems)
            poems = [p for p in poems if p["id"] not in done]
            print(f"  Resume: skipped {before - len(poems)} already-classified, {len(poems)} remaining")
    return poems


# ---------------------------------------------------------------------------
# Parsing + validation against the controlled vocabulary
# ---------------------------------------------------------------------------
def _extract_json_objects(text: str) -> list[dict]:
    """Bracket-counting JSON extractor (handles arrays / nested objects)."""
    results, i = [], 0
    while i < len(text):
        if text[i] == '{':
            depth, start, in_str, esc = 0, i, False, False
            while i < len(text):
                ch = text[i]
                if esc:
                    esc = False
                elif ch == '\\' and in_str:
                    esc = True
                elif ch == '"':
                    in_str = not in_str
                elif not in_str:
                    if ch == '{':
                        depth += 1
                    elif ch == '}':
                        depth -= 1
                        if depth == 0:
                            try:
                                results.append(json.loads(text[start:i + 1]))
                            except json.JSONDecodeError:
                                pass
                            break
                i += 1
        i += 1
    return results


def _clean_list(raw, dim: str) -> list[str]:
    """Keep only valid keys for `dim`, dedupe, cap length."""
    if not isinstance(raw, list):
        return []
    valid = config.VALID_KEYS[dim]
    out = []
    for x in raw:
        k = str(x).strip()
        if k in valid and k not in out:
            out.append(k)
    return out[: config.MAX_LABELS_PER_DIM[dim]]


def _clean_int(raw, lo, hi):
    if isinstance(raw, (int, float)):
        return max(lo, min(hi, int(raw)))
    return None


def _clean_confidences(raw, kept_keys) -> dict:
    """Keep confidences only for labels we actually kept, clamped to 0-100.

    `kept_keys` is the flat list of value keys that survived vocab validation
    (moods + topics + motifs). Confidences for hallucinated / dropped keys are
    discarded so the persisted map lines up 1:1 with poem_categories rows.
    """
    if not isinstance(raw, dict):
        return {}
    kept = set(kept_keys)
    out = {}
    for k, v in raw.items():
        key = str(k).strip()
        if key not in kept:
            continue
        c = config.clamp_confidence(v)
        if c is not None:
            out[key] = c
    return out


def parse_categories(text: str, batch: list[dict]) -> list[dict]:
    text = re.sub(r'```(?:json)?\s*', '', text).strip()
    parsed = None
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            parsed = [parsed]
    except json.JSONDecodeError:
        parsed = _extract_json_objects(text)
    if not parsed:
        print(f"Failed to parse categories from: {text[:160]}...")
        return []

    results = []
    for i, item in enumerate(parsed):
        poem = batch[i] if i < len(batch) else None
        if not poem or not isinstance(item, dict):
            continue
        moods = _clean_list(item.get("moods"), "mood")
        topics = _clean_list(item.get("topics"), "topic")
        motifs = _clean_list(item.get("motifs"), "motif")
        mood_primary = str(item.get("mood_primary", "")).strip()
        if mood_primary not in config.VALID_KEYS["mood"]:
            mood_primary = moods[0] if moods else None
        confidences = _clean_confidences(item.get("confidences"), moods + topics + motifs)
        rationale = str(item.get("rationale", "")).strip() or None
        results.append({
            "poem_id": str(poem["id"]),
            "moods": moods,
            "topics": topics,
            "motifs": motifs,
            "mood_primary": mood_primary,
            "emotional_intensity": _clean_int(item.get("emotional_intensity"), 0, 100),
            "accessibility_level": _clean_int(item.get("accessibility_level"), 1, 5),
            # Per-value 0-100 confidences, JSON-encoded so the parquet column
            # stays a plain string (keys vary per row; a struct would fight
            # pyarrow's schema inference). import_categories decodes it.
            "confidences": json.dumps(confidences, ensure_ascii=False),
            # Distillation (v3): the model's one-line justification of the poem's
            # core concept. Stored as provenance in the categories JSONB.
            "rationale": rationale,
            # Provenance: which taxonomy + prompt build produced this row.
            "taxonomy_version": config.TAXONOMY_VERSION,
            "prompt_version": config.PROMPT_VERSION,
            # `century` is NOT here: it's derived from poet era on the import
            # side (import_categories --backfill-century), never model-guessed.
            "model_used": "",  # filled by caller
            "categorized_at": pd.Timestamp.now(tz="UTC").isoformat(),
        })
    return results


# ---------------------------------------------------------------------------
# Checkpoint
# ---------------------------------------------------------------------------
def save_checkpoint(rows: list[dict], output_path: str):
    if not rows:
        return
    new_df = pd.DataFrame(rows)
    if os.path.exists(output_path):
        existing = pd.read_parquet(output_path)
        new_ids = set(new_df["poem_id"].astype(str))
        keep = existing[~existing["poem_id"].astype(str).isin(new_ids)]
        merged = pd.concat([keep, new_df], ignore_index=True)
    else:
        merged = new_df
    merged.to_parquet(output_path, index=False)
    print(f"  Checkpoint: {len(merged)} total ({len(rows)} new) -> {output_path}")


# ---------------------------------------------------------------------------
# Async classify
# ---------------------------------------------------------------------------
async def classify_batch(batch, model, system_prompt, semaphore, provider_kwargs):
    import litellm
    async with semaphore:
        user_content = "\n\n---\n\n".join(
            format_for_scoring(p["id"], p["title"], p["content"], p.get("poet_name", ""))
            for p in batch
        )
        kwargs = dict(
            model=model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            temperature=0.2,
            # Floor of 1500 covers a judge model's low-effort thinking budget
            # plus the JSON; for thinking-disabled bulk models the extra headroom
            # costs nothing (you only pay for tokens actually generated).
            max_tokens=max(1500, 500 * len(batch)),
            **provider_kwargs,
        )
        return await litellm.acompletion(**kwargs)


async def run(poems: list[dict], args) -> tuple[list[dict], float]:
    import litellm

    semaphore = asyncio.Semaphore(args.concurrency)
    system_prompt = config.CLASSIFICATION_PROMPT
    # Per-model provider routing: `gemini/*` -> Gemini via GEMINI_API_KEY;
    # `openai/bedrock-*` -> the Anthropic/LiteLLM proxy. See config.resolve_provider.
    provider_kwargs = config.resolve_provider(args.model)

    all_rows, total_cost = [], 0.0
    batches = [poems[i:i + args.batch_size] for i in range(0, len(poems), args.batch_size)]
    pbar = tqdm(total=len(poems), desc="Classifying poems")

    for start in range(0, len(batches), args.concurrency):
        chunk = batches[start:start + args.concurrency]
        tasks = [classify_batch(b, args.model, system_prompt, semaphore, provider_kwargs) for b in chunk]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for batch, resp in zip(chunk, responses):
            if isinstance(resp, Exception):
                print(f"Error classifying batch: {resp}")
                continue
            try:
                total_cost += litellm.completion_cost(completion_response=resp)
            except Exception:
                pass
            rows = parse_categories(resp.choices[0].message.content, batch)
            for r in rows:
                r["model_used"] = args.model
            all_rows.extend(rows)
            pbar.update(len(batch))
        if total_cost >= args.max_cost:
            print(f"\nCost cap reached: ${total_cost:.2f} >= ${args.max_cost}")
            break
        if len(all_rows) % 1000 < args.batch_size * args.concurrency:
            save_checkpoint(all_rows, args.output)

    pbar.close()
    return all_rows, total_cost


def main():
    args = parse_args()
    if not args.output:
        slug = args.model.replace("/", "_")
        args.output = str(config.DATA_DIR / f"categories_{slug}.parquet")

    poems = load_poems(args)
    if not poems:
        print("No poems to classify.")
        return

    if args.dry_run:
        est = (len(poems) + args.batch_size - 1) // args.batch_size
        print(f"Dry run: would classify {len(poems)} poems with {args.model}")
        print(f"  Batches: {est}, batch-size: {args.batch_size}, concurrency: {args.concurrency}")
        print(f"  Output: {args.output}")
        print(f"  Dimensions: {list(config.DIMENSIONS)} + scalars {list(config.SCALARS)}")
        return

    rows, cost = asyncio.run(run(poems, args))
    save_checkpoint(rows, args.output)
    print(f"\nDone! {len(rows)} poems classified, total cost: ${cost:.2f}")
    print(f"Saved to: {args.output}")
    print(f"Next: python -m poetry_quality_and_curation.categorization.import_categories --input {args.output}")


if __name__ == "__main__":
    main()
