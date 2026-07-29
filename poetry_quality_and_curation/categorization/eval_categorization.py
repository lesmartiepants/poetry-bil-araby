"""Bake-off + hybrid gold set for the poem categorization taxonomy.

Mirrors the quality-scoring harness (retriever_and_quality_curator/
optimize_prompt.py + cross_eval.py): sample a stratified reference set, label
it with a strong judge model, spot-check a slice against a human, then score
cheaper candidate models against that gold on multi-label F1 / Jaccard,
mood_primary accuracy, and intensity/accessibility MAE — plus $/1k and
poems/min so cost and speed sit next to quality.

Gemini is the working provider here: the judge is `gemini/gemini-2.5-pro` and
the bulk candidate is `gemini/gemini-2.5-flash`. Anthropic model strings can be
added via --candidates once the proxy is reachable.

The gold set is stored as JSON (data/categorization_gold.json) so it can be
committed and diffed — NOT as the gitignored parquet checkpoints the bulk
classifier writes. The judge's raw labels are kept even after human
corrections, so pro-vs-human agreement stays measurable.

CLI modes
---------
  --build-gold        Sample N poems (DB), label with the judge, write gold JSON.
  --emit-review       Dump the spot-check slice to a human-editable JSON file.
  --apply-corrections Load human corrections, patch gold, report agreement, and
                      decide whether a judge recalibration is warranted.
  --bakeoff           Label the gold poems with each candidate, score vs gold,
                      write data/categorization_bakeoff.json + an HTML chart.

The sampling / scoring / HTML functions take poems + labels as plain data, so
they are unit-testable with no DB and no network.

Usage:
    # 1. Build the reference gold set (needs DATABASE_URL):
    python -m poetry_quality_and_curation.categorization.eval_categorization --build-gold

    # 2. Emit 20 poems for human review, correct the file, then apply:
    python -m poetry_quality_and_curation.categorization.eval_categorization --emit-review
    python -m poetry_quality_and_curation.categorization.eval_categorization \
        --apply-corrections data/categorization_gold_review.json

    # 3. Bake off the candidate model(s) against the gold:
    python -m poetry_quality_and_curation.categorization.eval_categorization --bakeoff
"""
from __future__ import annotations

import argparse
import asyncio
import json
import random
import time
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from poetry_quality_and_curation.categorization import config
from poetry_quality_and_curation.categorization.classify_poems import (
    classify_batch,
    parse_categories,
)

# ---------------------------------------------------------------------------
# Constants (kept local to the eval module — config.py holds only the taxonomy)
# ---------------------------------------------------------------------------
DATA_DIR = config.DATA_DIR
GOLD_PATH = DATA_DIR / "categorization_gold.json"
REVIEW_PATH = DATA_DIR / "categorization_gold_review.json"
BAKEOFF_JSON = DATA_DIR / "categorization_bakeoff.json"
BAKEOFF_HTML = DATA_DIR / "categorization_bakeoff.html"

DEFAULT_JUDGE_MODEL = "gemini/gemini-2.5-pro"
DEFAULT_CANDIDATE_MODELS = ["gemini/gemini-2.5-flash"]

REFERENCE_SAMPLE_SIZE = 120
SPOT_CHECK_SIZE = 20

# Agreement thresholds: if pro-vs-human agreement clears BOTH, keep the judge's
# labels for the other 100. If either falls short, a recalibration is warranted.
CALIBRATION_PRIMARY_THRESHOLD = 0.85   # mood_primary accuracy
CALIBRATION_JACCARD_THRESHOLD = 0.70   # mean multi-label Jaccard across dims

DIMS = ("mood", "topic", "motif")
DIM_COL = {"mood": "moods", "topic": "topics", "motif": "motifs"}
LABEL_KEYS = ("moods", "topics", "motifs", "mood_primary",
              "emotional_intensity", "accessibility_level", "confidences")


# ===========================================================================
# Pure metric helpers (unit-testable — no DB, no network)
# ===========================================================================
def _prf1(gold: set, pred: set) -> tuple[float, float, float]:
    """Precision / recall / F1 for one multi-label field.

    Two empty sets count as a perfect match (the model correctly abstained).
    """
    if not gold and not pred:
        return 1.0, 1.0, 1.0
    tp = len(gold & pred)
    precision = tp / len(pred) if pred else 0.0
    recall = tp / len(gold) if gold else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    return precision, recall, f1


def _jaccard(gold: set, pred: set) -> float:
    """Intersection-over-union; empty-vs-empty is a perfect 1.0."""
    union = gold | pred
    if not union:
        return 1.0
    return len(gold & pred) / len(union)


def _mae(pairs) -> float | None:
    """Mean absolute error over (gold, pred) numeric pairs, skipping None."""
    diffs = [abs(g - p) for g, p in pairs if g is not None and p is not None]
    return (sum(diffs) / len(diffs)) if diffs else None


def _mean(xs) -> float:
    xs = list(xs)
    return sum(xs) / len(xs) if xs else 0.0


def score_labels(gold_rows: dict, pred_rows: dict) -> dict:
    """Score predicted labels against gold. Both are {poem_id: label_dict}.

    Only poems present in BOTH are scored. Returns per-dim F1/Jaccard,
    mood_primary accuracy, and MAE for the two scalar fields.
    """
    ids = [pid for pid in gold_rows if pid in pred_rows]
    per_dim = {}
    for dim in DIMS:
        col = DIM_COL[dim]
        f1s, jacs = [], []
        for pid in ids:
            g = set(gold_rows[pid].get(col) or [])
            p = set(pred_rows[pid].get(col) or [])
            f1s.append(_prf1(g, p)[2])
            jacs.append(_jaccard(g, p))
        per_dim[dim] = {"f1": _mean(f1s), "jaccard": _mean(jacs)}

    primary_hits = sum(
        1 for pid in ids
        if gold_rows[pid].get("mood_primary")
        and gold_rows[pid].get("mood_primary") == pred_rows[pid].get("mood_primary")
    )
    intensity_mae = _mae([
        (gold_rows[pid].get("emotional_intensity"), pred_rows[pid].get("emotional_intensity"))
        for pid in ids
    ])
    access_mae = _mae([
        (gold_rows[pid].get("accessibility_level"), pred_rows[pid].get("accessibility_level"))
        for pid in ids
    ])
    return {
        "n": len(ids),
        "per_dim": per_dim,
        "macro_f1": _mean(per_dim[d]["f1"] for d in DIMS),
        "macro_jaccard": _mean(per_dim[d]["jaccard"] for d in DIMS),
        "mood_primary_accuracy": (primary_hits / len(ids)) if ids else 0.0,
        "emotional_intensity_mae": intensity_mae,
        "accessibility_level_mae": access_mae,
    }


def decide_calibration(agreement: dict,
                       primary_threshold: float = CALIBRATION_PRIMARY_THRESHOLD,
                       jaccard_threshold: float = CALIBRATION_JACCARD_THRESHOLD) -> tuple[bool, str]:
    """Given a pro-vs-human `score_labels` result, decide if recalibration fires.

    Returns (fired, reason). `fired` True means the judge disagreed with the
    human enough that the other 100 poems should be re-labeled with the 20
    corrections as few-shot, rather than trusting the judge's originals.
    """
    primary = agreement.get("mood_primary_accuracy", 0.0)
    jac = agreement.get("macro_jaccard", 0.0)
    if primary >= primary_threshold and jac >= jaccard_threshold:
        return False, (f"agreement OK (primary {primary:.2f} >= {primary_threshold}, "
                       f"Jaccard {jac:.2f} >= {jaccard_threshold}) — keeping judge labels")
    return True, (f"agreement LOW (primary {primary:.2f} vs {primary_threshold}, "
                  f"Jaccard {jac:.2f} vs {jaccard_threshold}) — recalibration warranted")


# ---------------------------------------------------------------------------
# Stratified sampling (pure)
# ---------------------------------------------------------------------------
def _quality_band(q) -> str:
    if q is None:
        return "none"
    if q < 60:
        return "low"
    if q < 80:
        return "mid"
    return "high"


def stratified_sample(poems: list[dict], n: int, seed: int = 42) -> list[dict]:
    """Sample up to `n` poems, spread across (era_id, quality-band) strata.

    Deterministic for a given seed. Round-robins across strata ordered by size
    so every stratum is represented before any is exhausted — coverage matters
    more than exact proportionality for a gold set. If len(poems) <= n, returns
    all poems (shuffled).
    """
    rng = random.Random(seed)
    strata: dict = {}
    for p in poems:
        key = (p.get("era_id"), _quality_band(p.get("quality_score")))
        strata.setdefault(key, []).append(p)

    order = sorted(strata.keys(), key=lambda k: (-len(strata[k]), str(k)))
    for k in order:
        lst = sorted(strata[k], key=lambda x: str(x["id"]))
        rng.shuffle(lst)
        strata[k] = lst

    if len(poems) <= n:
        allp = sorted(poems, key=lambda x: str(x["id"]))
        rng.shuffle(allp)
        return allp

    picked, idx = [], {k: 0 for k in order}
    while len(picked) < n:
        progressed = False
        for k in order:
            if idx[k] < len(strata[k]):
                picked.append(strata[k][idx[k]])
                idx[k] += 1
                progressed = True
                if len(picked) >= n:
                    break
        if not progressed:
            break
    return picked


def _label_row_only(row: dict) -> dict:
    """Project a classifier row down to the label fields we score / store."""
    return {k: row.get(k) for k in LABEL_KEYS}


# ===========================================================================
# Labeling (async LiteLLM — network; reuses the bulk classifier's machinery)
# ===========================================================================
async def _label_async(poems: list[dict], model: str, batch_size: int,
                       concurrency: int) -> tuple[dict, float]:
    """Label `poems` with `model`. Returns ({poem_id: label_row}, total_cost)."""
    import litellm

    semaphore = asyncio.Semaphore(concurrency)
    provider_kwargs = config.resolve_provider(model)
    system_prompt = config.CLASSIFICATION_PROMPT
    batches = [poems[i:i + batch_size] for i in range(0, len(poems), batch_size)]

    rows_by_id: dict = {}
    total_cost = 0.0
    for start in range(0, len(batches), concurrency):
        chunk = batches[start:start + concurrency]
        tasks = [classify_batch(b, model, system_prompt, semaphore, provider_kwargs) for b in chunk]
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        for batch, resp in zip(chunk, responses):
            if isinstance(resp, Exception):
                print(f"  [warn] batch failed on {model}: {resp}")
                continue
            try:
                total_cost += litellm.completion_cost(completion_response=resp)
            except Exception:
                pass
            for r in parse_categories(resp.choices[0].message.content, batch):
                rows_by_id[str(r["poem_id"])] = _label_row_only(r)
    return rows_by_id, total_cost


def label_poems(poems: list[dict], model: str, batch_size: int = 4,
                concurrency: int = 8) -> dict:
    """Sync wrapper around _label_async. Returns a result dict with rows,
    cost, elapsed seconds, and derived $/1k + poems/min."""
    start = time.time()
    rows, cost = asyncio.run(_label_async(poems, model, batch_size, concurrency))
    elapsed = time.time() - start
    n = max(1, len(rows))
    return {
        "model": model,
        "rows": rows,
        "n": len(rows),
        "cost_usd": cost,
        "elapsed_s": elapsed,
        "cost_per_1k": (cost / n) * 1000,
        "poems_per_min": (len(rows) / elapsed * 60) if elapsed > 0 else 0.0,
    }


# ---------------------------------------------------------------------------
# DB loading (only used by --build-gold; needs DATABASE_URL)
# ---------------------------------------------------------------------------
def load_candidate_poems(limit: int = 4000) -> list[dict]:
    """Load poems (with era_id + quality_score) to sample the gold set from."""
    conn = config.get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT p.id, p.title, p.content, po.name AS poet_name,
                   po.era_id, p.quality_score
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.content IS NOT NULL AND p.content != ''
            ORDER BY p.quality_score DESC NULLS LAST
            LIMIT %s
            """,
            (int(limit),),
        )
        return [
            {"id": str(r[0]), "title": r[1] or "", "content": r[2],
             "poet_name": r[3] or "", "era_id": r[4], "quality_score": r[5]}
            for r in cur.fetchall()
        ]
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Gold set I/O (JSON, committed)
# ---------------------------------------------------------------------------
def save_gold(gold: dict, path: Path = GOLD_PATH) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(gold, f, ensure_ascii=False, indent=2)


def load_gold(path: Path = GOLD_PATH) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def effective_gold_rows(gold: dict) -> dict:
    """Return {poem_id: label_row}, preferring human corrections over the judge.

    A poem's `human` labels (if present and non-empty) win; otherwise the
    judge's original `pro` labels are used. This is what candidates score against.
    """
    out = {}
    for pid, entry in gold.get("poems", {}).items():
        human = entry.get("human")
        out[pid] = human if human else entry.get("pro", {})
    return out


# ===========================================================================
# HTML report (pure — takes the results dict)
# ===========================================================================
def generate_html(bakeoff: dict) -> str:
    """Self-contained HTML bar chart + table comparing candidate models."""
    results = bakeoff.get("results", [])
    gold_meta = bakeoff.get("gold", {})

    def bar(value, vmax, color):
        pct = 0 if vmax <= 0 else max(0, min(100, value / vmax * 100))
        return (f'<div style="background:#eee;border-radius:4px;height:18px;width:180px;'
                f'display:inline-block;vertical-align:middle">'
                f'<div style="background:{color};height:18px;width:{pct:.0f}%;border-radius:4px"></div></div>')

    rows_html = []
    for r in results:
        s = r["scores"]
        rows_html.append(f"""
        <tr>
          <td><code>{r['model']}</code></td>
          <td>{bar(s['macro_f1'], 1.0, '#2b8a3e')} {s['macro_f1']:.3f}</td>
          <td>{bar(s['macro_jaccard'], 1.0, '#1971c2')} {s['macro_jaccard']:.3f}</td>
          <td>{bar(s['mood_primary_accuracy'], 1.0, '#5f3dc4')} {s['mood_primary_accuracy']:.3f}</td>
          <td>{_fmt(s['emotional_intensity_mae'])}</td>
          <td>{_fmt(s['accessibility_level_mae'])}</td>
          <td>${r['cost_per_1k']:.3f}</td>
          <td>{r['poems_per_min']:.0f}</td>
        </tr>""")

    per_dim_rows = []
    for r in results:
        cells = "".join(
            f"<td>{r['scores']['per_dim'][d]['f1']:.3f} / {r['scores']['per_dim'][d]['jaccard']:.3f}</td>"
            for d in DIMS
        )
        per_dim_rows.append(f"<tr><td><code>{r['model']}</code></td>{cells}</tr>")

    rec = bakeoff.get("recommendation", "")
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<title>Categorization model bake-off</title>
<style>
  body {{ font-family: -apple-system, system-ui, sans-serif; margin: 2rem; color: #222; }}
  h1 {{ font-size: 1.4rem; }} h2 {{ font-size: 1.1rem; margin-top: 2rem; }}
  table {{ border-collapse: collapse; margin-top: .5rem; }}
  th, td {{ padding: 6px 10px; border-bottom: 1px solid #ddd; text-align: left; font-size: .9rem; }}
  th {{ background: #f6f6f6; }}
  code {{ background: #f0f0f0; padding: 1px 4px; border-radius: 3px; }}
  .rec {{ background: #fff8e1; border-left: 4px solid #f59f00; padding: .8rem 1rem; margin-top: 1rem; }}
  .muted {{ color: #888; font-size: .85rem; }}
</style></head><body>
<h1>Categorization model bake-off</h1>
<p class="muted">Judge: <code>{gold_meta.get('judge_model', '?')}</code> ·
  Gold poems scored: {gold_meta.get('n_scored', '?')} ·
  Human-corrected: {gold_meta.get('n_human', 0)} ·
  Calibration fired: {gold_meta.get('calibration_fired', 'n/a')}</p>

<h2>Headline metrics</h2>
<table>
  <tr><th>Model</th><th>Macro F1</th><th>Macro Jaccard</th><th>mood_primary acc</th>
      <th>intensity MAE</th><th>access MAE</th><th>$/1k</th><th>poems/min</th></tr>
  {''.join(rows_html)}
</table>

<h2>Per-dimension (F1 / Jaccard)</h2>
<table>
  <tr><th>Model</th>{''.join(f'<th>{d}</th>' for d in DIMS)}</tr>
  {''.join(per_dim_rows)}
</table>

<div class="rec"><strong>Recommendation:</strong> {rec}</div>
</body></html>"""


def _fmt(v) -> str:
    return "—" if v is None else f"{v:.2f}"


def recommend(results: list[dict]) -> str:
    """Pick the bulk model: best macro-F1 among candidates, noting cost."""
    if not results:
        return "No candidates scored."
    best = max(results, key=lambda r: r["scores"]["macro_f1"])
    cheapest = min(results, key=lambda r: r["cost_per_1k"])
    parts = [
        f"Use <code>{best['model']}</code> for bulk classification "
        f"(macro-F1 {best['scores']['macro_f1']:.3f}, "
        f"mood_primary {best['scores']['mood_primary_accuracy']:.3f}, "
        f"${best['cost_per_1k']:.3f}/1k)."
    ]
    if cheapest["model"] != best["model"]:
        parts.append(
            f"Cheapest is <code>{cheapest['model']}</code> at ${cheapest['cost_per_1k']:.3f}/1k "
            f"(macro-F1 {cheapest['scores']['macro_f1']:.3f}); "
            f"trade the F1 gap against the cost delta at 84k poems."
        )
    return " ".join(parts)


# ===========================================================================
# CLI mode implementations
# ===========================================================================
def cmd_build_gold(args) -> None:
    poems = load_candidate_poems(limit=args.pool)
    print(f"Loaded {len(poems)} candidate poems from DB")
    sample = stratified_sample(poems, args.sample_size, seed=args.seed)
    print(f"Sampled {len(sample)} poems (stratified by era + quality band)")

    print(f"Labeling with judge {args.judge} ...")
    labeled = label_poems(sample, args.judge, batch_size=args.batch_size,
                          concurrency=args.concurrency)
    print(f"  judge cost ${labeled['cost_usd']:.3f}, "
          f"{labeled['poems_per_min']:.0f} poems/min")

    gold = {
        "judge_model": args.judge,
        "taxonomy_version": config.TAXONOMY_VERSION,
        "seed": args.seed,
        "spot_check_size": SPOT_CHECK_SIZE,
        "poems": {},
    }
    for p in sample:
        pid = str(p["id"])
        gold["poems"][pid] = {
            "id": pid,
            "title": p.get("title", ""),
            "content": p.get("content", ""),
            "poet_name": p.get("poet_name", ""),
            "era_id": p.get("era_id"),
            "quality_score": p.get("quality_score"),
            "pro": labeled["rows"].get(pid, {}),
            "human": None,
        }
    save_gold(gold)
    print(f"Wrote gold set -> {GOLD_PATH} ({len(gold['poems'])} poems)")


def cmd_emit_review(args) -> None:
    gold = load_gold()
    pids = list(gold["poems"].keys())[:SPOT_CHECK_SIZE]
    review = {"instructions": (
        "For each poem, copy the 'pro' block into 'human' and correct the labels. "
        "Keys must come from the taxonomy vocab. Leave 'human' null to accept the "
        "judge's labels unchanged. Then run --apply-corrections on this file."
    ), "poems": {}}
    for pid in pids:
        e = gold["poems"][pid]
        review["poems"][pid] = {
            "content": e.get("content", ""),
            "pro": e.get("pro", {}),
            "human": None,
        }
    REVIEW_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(REVIEW_PATH, "w", encoding="utf-8") as f:
        json.dump(review, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(pids)} poems for human review -> {REVIEW_PATH}")


def cmd_apply_corrections(args) -> None:
    gold = load_gold()
    with open(args.apply_corrections, "r", encoding="utf-8") as f:
        review = json.load(f)

    patched = 0
    for pid, entry in review.get("poems", {}).items():
        human = entry.get("human")
        if human and pid in gold["poems"]:
            gold["poems"][pid]["human"] = human
            patched += 1
    print(f"Applied {patched} human corrections")

    # Agreement on the spot-check slice: judge vs human.
    checked_ids = [pid for pid, e in gold["poems"].items() if e.get("human")]
    pro_rows = {pid: gold["poems"][pid]["pro"] for pid in checked_ids}
    human_rows = {pid: gold["poems"][pid]["human"] for pid in checked_ids}
    agreement = score_labels(human_rows, pro_rows)  # gold=human, pred=judge
    fired, reason = decide_calibration(agreement)

    gold["spot_check"] = {
        "n": agreement["n"],
        "macro_jaccard": agreement["macro_jaccard"],
        "mood_primary_accuracy": agreement["mood_primary_accuracy"],
        "per_dim": agreement["per_dim"],
        "calibration_fired": fired,
        "reason": reason,
    }
    save_gold(gold)
    print(f"Judge-vs-human agreement over {agreement['n']} poems: "
          f"macro-Jaccard {agreement['macro_jaccard']:.3f}, "
          f"mood_primary {agreement['mood_primary_accuracy']:.3f}")
    print(f"Calibration decision: {'FIRED' if fired else 'not fired'} — {reason}")
    if fired:
        print("  -> Re-label the full gold set with the judge using the 20 "
              "corrections as few-shot, then re-run --apply-corrections.")


def cmd_bakeoff(args) -> None:
    gold = load_gold()
    gold_rows = effective_gold_rows(gold)
    poems = [
        {"id": e["id"], "title": e.get("title", ""), "content": e.get("content", ""),
         "poet_name": e.get("poet_name", "")}
        for e in gold["poems"].values()
    ]
    print(f"Scoring {len(args.candidates)} candidate(s) against "
          f"{len(gold_rows)} gold poems")

    results = []
    for model in args.candidates:
        print(f"\n== {model} ==")
        labeled = label_poems(poems, model, batch_size=args.batch_size,
                              concurrency=args.concurrency)
        scores = score_labels(gold_rows, labeled["rows"])
        print(f"  macro-F1 {scores['macro_f1']:.3f} · "
              f"macro-Jaccard {scores['macro_jaccard']:.3f} · "
              f"mood_primary {scores['mood_primary_accuracy']:.3f} · "
              f"${labeled['cost_per_1k']:.3f}/1k · {labeled['poems_per_min']:.0f}/min")
        results.append({
            "model": model,
            "scores": scores,
            "cost_usd": labeled["cost_usd"],
            "cost_per_1k": labeled["cost_per_1k"],
            "poems_per_min": labeled["poems_per_min"],
            "elapsed_s": labeled["elapsed_s"],
        })

    bakeoff = {
        "gold": {
            "judge_model": gold.get("judge_model"),
            "taxonomy_version": gold.get("taxonomy_version"),
            "n_scored": len(gold_rows),
            "n_human": sum(1 for e in gold["poems"].values() if e.get("human")),
            "calibration_fired": gold.get("spot_check", {}).get("calibration_fired", "n/a"),
        },
        "results": results,
    }
    bakeoff["recommendation"] = recommend(results)

    BAKEOFF_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(BAKEOFF_JSON, "w", encoding="utf-8") as f:
        json.dump(bakeoff, f, ensure_ascii=False, indent=2)
    with open(BAKEOFF_HTML, "w", encoding="utf-8") as f:
        f.write(generate_html(bakeoff))
    print(f"\nWrote {BAKEOFF_JSON}\nWrote {BAKEOFF_HTML}")
    # Strip HTML tags for the terminal print of the recommendation.
    import re as _re
    print("\nRECOMMENDATION: " + _re.sub(r"<[^>]+>", "", bakeoff["recommendation"]))


# ---------------------------------------------------------------------------
# Args + dispatch
# ---------------------------------------------------------------------------
def parse_args():
    p = argparse.ArgumentParser(description="Categorization bake-off + hybrid gold set")
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--build-gold", action="store_true",
                      help="Sample + judge-label the reference gold set (needs DB)")
    mode.add_argument("--emit-review", action="store_true",
                      help="Dump the spot-check slice for human review")
    mode.add_argument("--apply-corrections", type=Path, default=None,
                      help="Apply a human-corrected review file and report agreement")
    mode.add_argument("--bakeoff", action="store_true",
                      help="Score candidate models against the gold set")

    p.add_argument("--judge", default=DEFAULT_JUDGE_MODEL, help="Reference/judge model")
    p.add_argument("--candidates", nargs="+", default=DEFAULT_CANDIDATE_MODELS,
                   help="Candidate model strings to bake off")
    p.add_argument("--sample-size", type=int, default=REFERENCE_SAMPLE_SIZE)
    p.add_argument("--pool", type=int, default=4000,
                   help="How many DB poems to sample the gold set from")
    p.add_argument("--seed", type=int, default=42)
    p.add_argument("--batch-size", type=int, default=4)
    p.add_argument("--concurrency", type=int, default=8)
    return p.parse_args()


def main():
    args = parse_args()
    if args.build_gold:
        cmd_build_gold(args)
    elif args.emit_review:
        cmd_emit_review(args)
    elif args.apply_corrections:
        cmd_apply_corrections(args)
    elif args.bakeoff:
        cmd_bakeoff(args)


if __name__ == "__main__":
    main()
