"""Import classifier output (Parquet) into the production database.

Writes both representations:
  * normalized rows in `poem_categories` (mood/topic/motif -> value_id, confidence)
  * denormalized scalars + JSONB provenance on `poems`
    (mood_primary, emotional_intensity, accessibility_level,
     categories {moods, topics, motifs, confidences, taxonomy_version},
     categorized_at, categorization_model)

`century` is NOT written from the parquet — it is derived from the poet's era
via the separate, idempotent `--backfill-century` step (config.ERA_CENTURY).

Idempotent per poem: re-importing replaces that poem's category rows.

Usage:
    python -m poetry_quality_and_curation.categorization.import_categories \
        --input poetry_quality_and_curation/categorization/data/categories_gemini_gemini-2.5-flash.parquet
    python -m poetry_quality_and_curation.categorization.import_categories --input <file> --dry-run

    # Derive poems.century from poet era (run once after any import):
    python -m poetry_quality_and_curation.categorization.import_categories --backfill-century
"""
import argparse
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.categorization import config


def parse_args():
    p = argparse.ArgumentParser(description="Import categories into the DB")
    p.add_argument("--input", type=Path, default=None,
                   help="Classifier Parquet output (required unless --backfill-century)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--batch-size", type=int, default=500)
    p.add_argument("--backfill-century", action="store_true",
                   help="Derive poems.century from poet era (config.ERA_CENTURY). "
                        "No AI, no parquet; idempotent. Ignores --input.")
    return p.parse_args()


def load_value_lookup(conn) -> dict:
    """(dimension_key, value_key) -> value_id."""
    cur = conn.cursor()
    cur.execute("""
        SELECT d.key, v.key, v.id
        FROM category_values v
        JOIN category_dimensions d ON v.dimension_id = d.id
    """)
    lookup = {(r[0], r[1]): r[2] for r in cur.fetchall()}
    cur.close()
    return lookup


def _as_list(val):
    if isinstance(val, (list, tuple)):
        return list(val)
    if hasattr(val, "tolist"):
        return list(val.tolist())
    return []


def _as_conf_dict(val) -> dict:
    """Decode the per-value confidence map from a parquet cell.

    classify_poems stores it JSON-encoded (a string), but tolerate a raw dict
    too. Values are coerced to ints in 0-100; anything unparseable is dropped.
    """
    raw = val
    if isinstance(val, str):
        try:
            raw = json.loads(val)
        except (json.JSONDecodeError, ValueError):
            return {}
    if not isinstance(raw, dict):
        return {}
    out = {}
    for k, v in raw.items():
        try:
            n = int(round(float(v)))
        except (TypeError, ValueError):
            continue
        out[str(k)] = max(0, min(100, n))
    return out


def backfill_century(conn, dry_run: bool = False) -> int:
    """Set poems.century deterministically from the poet's era.

    Century is not model-produced; it is a coarse, honest value derived from
    era via config.ERA_CENTURY. era_ids mapped to None (too broad to pin) are
    skipped, leaving century NULL. Idempotent: re-running writes the same value.

    Returns the number of poem rows affected (or that would be, in dry-run).
    """
    cur = conn.cursor()
    total = 0
    try:
        for era_id, century in sorted(config.ERA_CENTURY.items()):
            if century is None:
                continue  # era too broad -> leave century NULL on purpose
            if dry_run:
                cur.execute(
                    "SELECT count(*) FROM poems p JOIN poets po ON p.poet_id = po.id "
                    "WHERE po.era_id = %s",
                    (era_id,),
                )
                n = cur.fetchone()[0]
                print(f"  era {era_id} -> century {century}: {n} poems (dry-run)")
            else:
                cur.execute(
                    "UPDATE poems p SET century = %s FROM poets po "
                    "WHERE p.poet_id = po.id AND po.era_id = %s",
                    (century, era_id),
                )
                n = cur.rowcount
                print(f"  era {era_id} -> century {century}: {n} poems")
            total += n
        if not dry_run:
            conn.commit()
    finally:
        cur.close()
    return total


def import_rows(conn, df: pd.DataFrame, lookup: dict, batch_size: int) -> tuple[int, int]:
    poems_updated, links_written = 0, 0
    batches = [df.iloc[i:i + batch_size] for i in range(0, len(df), batch_size)]

    for batch_df in tqdm(batches, desc="Importing categories"):
        cur = conn.cursor()
        for _, row in batch_df.iterrows():
            poem_id = int(row["poem_id"])
            model = row.get("model_used") or None
            confidences = _as_conf_dict(row.get("confidences"))
            taxonomy_version = row.get("taxonomy_version")
            taxonomy_version = str(taxonomy_version) if pd.notna(taxonomy_version) else None

            dim_lists = {
                "mood": _as_list(row.get("moods")),
                "topic": _as_list(row.get("topics")),
                "motif": _as_list(row.get("motifs")),
            }

            # Resolve (value_id, value_key) so we can attach each value's confidence.
            value_entries = []
            for dim, keys in dim_lists.items():
                for k in keys:
                    vid = lookup.get((dim, k))
                    if vid:
                        value_entries.append((vid, k))

            # JSONB provenance mirrors the shape promised in the migration:
            #   {"moods":[...], "topics":[...], "motifs":[...], "confidences":{...}}
            # plus a taxonomy_version stamp so we know which taxonomy tagged it.
            categories_payload = {
                "moods": dim_lists["mood"],
                "topics": dim_lists["topic"],
                "motifs": dim_lists["motif"],
                "confidences": confidences,
            }
            if taxonomy_version is not None:
                categories_payload["taxonomy_version"] = taxonomy_version
            categories_json = json.dumps(categories_payload, ensure_ascii=False)

            def _num(v):
                return int(v) if pd.notna(v) else None

            # 1. Scalars + provenance on poems. `century` is intentionally NOT
            #    written here — it is derived from poet era by --backfill-century.
            cur.execute("""
                UPDATE poems SET
                    mood_primary = %s,
                    emotional_intensity = %s,
                    accessibility_level = %s,
                    categories = %s::jsonb,
                    categorized_at = COALESCE(%s::timestamptz, now()),
                    categorization_model = %s
                WHERE id = %s
            """, (
                (row.get("mood_primary") or None),
                _num(row.get("emotional_intensity")),
                _num(row.get("accessibility_level")),
                categories_json,
                (row.get("categorized_at") or None),
                model,
                poem_id,
            ))
            poems_updated += cur.rowcount

            # 2. Replace this poem's normalized links, carrying per-value confidence.
            cur.execute("DELETE FROM poem_categories WHERE poem_id = %s", (poem_id,))
            for vid, vkey in value_entries:
                cur.execute("""
                    INSERT INTO poem_categories (poem_id, value_id, confidence, model)
                    VALUES (%s, %s, %s, %s)
                    ON CONFLICT (poem_id, value_id) DO NOTHING
                """, (poem_id, vid, confidences.get(vkey), model))
                links_written += cur.rowcount
        conn.commit()
        cur.close()
    return poems_updated, links_written


def main():
    args = parse_args()

    # Century backfill is a standalone, DB-only step (no parquet needed).
    if args.backfill_century:
        conn = config.get_db_connection()
        try:
            n = backfill_century(conn, dry_run=args.dry_run)
            verb = "would update" if args.dry_run else "updated"
            print(f"\nDone! century backfill {verb} {n} poems from poet era.")
        finally:
            conn.close()
        return

    if not args.input:
        print("Error: --input is required unless --backfill-century is set.")
        sys.exit(1)
    if not args.input.exists():
        print(f"Error: input not found: {args.input}")
        sys.exit(1)

    df = pd.read_parquet(args.input)
    print(f"Loaded {len(df)} classified poems from {args.input}")

    if args.dry_run:
        print("[DRY RUN] No DB writes.")
        for dim, col in [("mood", "moods"), ("topic", "topics"), ("motif", "motifs")]:
            counts = {}
            for _, row in df.iterrows():
                for k in _as_list(row.get(col)):
                    counts[k] = counts.get(k, 0) + 1
            top = sorted(counts.items(), key=lambda kv: -kv[1])[:8]
            print(f"  {dim}: {top}")
        return

    conn = config.get_db_connection()
    try:
        lookup = load_value_lookup(conn)
        if not lookup:
            print("Error: category vocab is empty. Run the migration first.")
            sys.exit(1)
        print(f"[db] Loaded {len(lookup)} vocab values")
        updated, links = import_rows(conn, df, lookup, args.batch_size)
        print(f"\nDone! Updated {updated} poems, wrote {links} category links.")
        print("Next: derive centuries from poet era with "
              "`python -m poetry_quality_and_curation.categorization.import_categories --backfill-century`")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
