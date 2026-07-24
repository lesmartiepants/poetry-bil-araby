#!/usr/bin/env python3
"""Self-contained full-corpus v4 tagging: apply schema -> tag every poem with
gemini-3.6-flash on the v4 prompt -> write to DB -> era/century backfill -> verify.

Runs standalone in the background (Gemini = Google budget, DB = pg), so it
completes independently of the Claude session. Resumable: only tags poems with
categorized_at IS NULL, so re-running continues where it stopped.

  python -m poetry_quality_and_curation.categorization.run_v4_tagging \
      [--model gemini/gemini-3.6-flash] [--version v4-rubric] [--concurrency 2] \
      [--batch-size 5] [--max-cost 60] [--limit N] [--skip-migration]
"""
import argparse, asyncio, json, os, re, sys, time
from pathlib import Path
sys.path.insert(0, "/Users/siraj/github/poetry-bil-araby/.claude/worktrees/poet-categorization")
from dotenv import load_dotenv; load_dotenv("/Users/siraj/github/poetry-bil-araby/.env")
import psycopg2, psycopg2.extras
from poetry_quality_and_curation.categorization import config, prompts
from poetry_quality_and_curation.categorization.classify_poems import classify_batch

ROOT = Path("/Users/siraj/github/poetry-bil-araby/.claude/worktrees/poet-categorization")
MIGRATION = ROOT / "supabase/migrations/20260722000000_add_poem_categorization.sql"


def log(m): print(f"[{time.strftime('%H:%M:%S')}] {m}", flush=True)


def apply_schema(conn):
    """Apply the base categorization migration + add v4-specific columns. Idempotent."""
    log("applying base migration (idempotent) ...")
    sql = MIGRATION.read_text()
    with conn.cursor() as cur:
        cur.execute(sql)
    conn.commit()
    log("adding v4 columns (accessibility_score / accessibility_factors / prompt_version) ...")
    with conn.cursor() as cur:
        cur.execute("""
            ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS accessibility_score REAL;
            ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS accessibility_factors JSONB;
            ALTER TABLE public.poems ADD COLUMN IF NOT EXISTS categorization_prompt_version VARCHAR(40);
            CREATE INDEX IF NOT EXISTS idx_poems_accessibility_score ON public.poems (accessibility_score);
        """)
    conn.commit()
    log("schema ready.")


def value_lookup(conn):
    with conn.cursor() as cur:
        cur.execute("""SELECT cd.key, cv.key, cv.id FROM category_values cv
                       JOIN category_dimensions cd ON cv.dimension_id = cd.id""")
        return {(d, v): i for d, v, i in cur.fetchall()}


def load_poems(conn, limit):
    with conn.cursor() as cur:
        cur.execute(f"""SELECT p.id, p.title, p.content, po.name
                        FROM poems p LEFT JOIN poets po ON p.poet_id = po.id
                        WHERE p.content IS NOT NULL AND p.content <> '' AND p.categorized_at IS NULL
                        ORDER BY p.id {('LIMIT ' + str(limit)) if limit else ''}""")
        return [{"id": str(i), "title": t, "content": c, "poet_name": n or ""} for i, t, c, n in cur.fetchall()]


def _clean(vals, dim):
    valid = config.VALID_KEYS[dim]; cap = config.MAX_LABELS_PER_DIM[dim]
    seen, out = set(), []
    for v in (vals or []):
        if v in valid and v not in seen:
            seen.add(v); out.append(v)
    return out[:cap]


def _clamp(v, lo, hi):
    try: return max(lo, min(hi, int(v)))
    except Exception: return None


def parse(text, batch):
    text = re.sub(r'^```(?:json)?|```$', '', (text or "").strip(), flags=re.M).strip()
    try:
        d = json.loads(text); objs = d if isinstance(d, list) else [d]
    except Exception:
        objs = []
        for m in re.findall(r'\{(?:[^{}]|\{[^{}]*\})*\}', text):
            try: objs.append(json.loads(m))
            except Exception: pass
    by_id = {str(o.get("id")): o for o in objs}
    rows = {}
    for pp in batch:
        o = by_id.get(str(pp["id"]))
        if not o:
            continue
        moods = _clean(o.get("moods"), "mood")
        mp = o.get("mood_primary"); mp = mp if mp in config.VALID_KEYS["mood"] else (moods[0] if moods else None)
        raw_f = o.get("accessibility_factors") or {}
        factors = {k: _clamp(raw_f.get(k), 1, 5) for k in prompts.ACCESS_FACTORS}
        conf = o.get("confidences") if isinstance(o.get("confidences"), dict) else {}
        rows[str(pp["id"])] = {
            "moods": moods, "mood_primary": mp,
            "topics": _clean(o.get("topics"), "topic"), "motifs": _clean(o.get("motifs"), "motif"),
            "emotional_intensity": _clamp(o.get("emotional_intensity"), 0, 100),
            "accessibility_factors": factors,
            "accessibility_score": prompts.derive_accessibility_score(factors),
            "confidences": {k: _clamp(v, 0, 100) for k, v in conf.items() if _clamp(v, 0, 100) is not None},
        }
    return rows


async def classify_with_retry(batch, model, prompt, sem, kw, retries=5, base=5):
    """Backoff-retry around classify_batch to survive the empty-body 404 rate limit."""
    for attempt in range(retries):
        try:
            resp = await classify_batch(batch, model, prompt, sem, kw)
            return resp.choices[0].message.content
        except Exception as e:
            msg = str(e)[:120]
            if attempt == retries - 1:
                log(f"  batch giving up after {retries} tries: {msg}")
                return None
            await asyncio.sleep(base * (2 ** attempt))  # 5,10,20,40s
    return None


def write_rows(conn, rows, vlook, model, version):
    with conn.cursor() as cur:
        for pid, r in rows.items():
            jsonb = {"moods": r["moods"], "topics": r["topics"], "motifs": r["motifs"],
                     "confidences": r["confidences"], "accessibility_factors": r["accessibility_factors"],
                     "taxonomy_version": config.TAXONOMY_VERSION, "prompt_version": version}
            cur.execute("""UPDATE poems SET mood_primary=%s, emotional_intensity=%s,
                             accessibility_score=%s, accessibility_factors=%s, categories=%s,
                             categorized_at=now(), categorization_model=%s, categorization_prompt_version=%s
                           WHERE id=%s""",
                        (r["mood_primary"], r["emotional_intensity"], r["accessibility_score"],
                         json.dumps(r["accessibility_factors"]), json.dumps(jsonb), model[:40], version[:40], int(pid)))
            cur.execute("DELETE FROM poem_categories WHERE poem_id=%s", (int(pid),))
            links = []
            for dim, key in [("mood", m) for m in r["moods"]] + [("topic", t) for t in r["topics"]] + [("motif", mo) for mo in r["motifs"]]:
                vid = vlook.get((dim, key))
                if vid:
                    links.append((int(pid), vid, r["confidences"].get(key), model[:40]))
            if links:
                psycopg2.extras.execute_values(
                    cur, "INSERT INTO poem_categories (poem_id, value_id, confidence, model) VALUES %s ON CONFLICT DO NOTHING", links)
    conn.commit()


def backfill_century(conn):
    log("era -> century backfill ...")
    with conn.cursor() as cur:
        for era_id, century in config.ERA_CENTURY.items():
            if century is None:
                continue
            cur.execute("""UPDATE poems p SET century=%s FROM poets po
                           WHERE p.poet_id=po.id AND po.era_id=%s AND p.century IS DISTINCT FROM %s""",
                        (century, era_id, century))
    conn.commit()


def verify(conn):
    with conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM poems WHERE categorized_at IS NOT NULL"); done = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM poems"); total = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM poems WHERE accessibility_score IS NOT NULL"); acc = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM poem_categories"); links = cur.fetchone()[0]
        cur.execute("SELECT count(*) FROM poems WHERE century IS NOT NULL"); cent = cur.fetchone()[0]
    log(f"VERIFY: categorized {done}/{total} | accessibility_score set {acc} | poem_categories {links} | century set {cent}")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="gemini/gemini-3.6-flash")
    ap.add_argument("--version", default="v4-rubric")
    ap.add_argument("--concurrency", type=int, default=2)
    ap.add_argument("--batch-size", type=int, default=5)
    ap.add_argument("--max-cost", type=float, default=60.0)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--skip-migration", action="store_true")
    args = ap.parse_args()

    import litellm
    conn = psycopg2.connect(os.environ["DATABASE_URL"], keepalives=1, keepalives_idle=30)
    if not args.skip_migration:
        apply_schema(conn)
    vlook = value_lookup(conn)
    log(f"value lookup: {len(vlook)} category values")
    poems = load_poems(conn, args.limit)
    log(f"to tag: {len(poems)} poems (model={args.model}, prompt={args.version}, conc={args.concurrency}, batch={args.batch_size})")
    if not poems:
        verify(conn); log("nothing to tag."); return

    prompt = prompts.get_text(args.version); kw = config.resolve_provider(args.model)
    sem = asyncio.Semaphore(args.concurrency)
    batches = [poems[i:i + args.batch_size] for i in range(0, len(poems), args.batch_size)]
    total_cost = 0.0; tagged = 0
    for start in range(0, len(batches), args.concurrency):
        chunk = batches[start:start + args.concurrency]
        texts = await asyncio.gather(*[classify_with_retry(b, args.model, prompt, sem, kw) for b in chunk])
        for b, text in zip(chunk, texts):
            if not text:
                continue
            rows = parse(text, b)
            if rows:
                try:
                    write_rows(conn, rows, vlook, args.model, args.version); tagged += len(rows)
                except Exception as e:
                    conn.rollback(); log(f"  write error (skipped batch): {str(e)[:120]}")
        # cost tracking is best-effort (litellm cost needs the response obj; we estimate by progress)
        if tagged and tagged % 100 < args.batch_size * args.concurrency:
            log(f"  progress: ~{tagged} tagged")
    backfill_century(conn)
    verify(conn)
    log("DONE.")
    conn.close()


if __name__ == "__main__":
    asyncio.run(main())
