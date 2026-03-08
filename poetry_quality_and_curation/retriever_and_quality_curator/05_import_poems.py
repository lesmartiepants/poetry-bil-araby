#!/usr/bin/env python3
"""Import final curated selection into the production PostgreSQL database.

Updates quality scores for existing (original) poems and inserts new Diwan poems.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems
    python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems --dry-run
    python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems --scores-only
    python -m poetry_quality_and_curation.retriever_and_quality_curator.05_import_poems --input data/diwan_import_ready.parquet --batch-size 250
"""
import argparse
import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.retriever_and_quality_curator import config
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import normalize_arabic, strip_diacritics


def parse_args():
    parser = argparse.ArgumentParser(
        description="Import final poem selection into production database"
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=config.DATA_DIR / "diwan_import_ready.parquet",
        help="Input parquet path (default: data/diwan_import_ready.parquet)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be written without writing to DB",
    )
    parser.add_argument(
        "--scores-only",
        action="store_true",
        help="Only update quality scores for existing poems, skip new poem imports",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Poems per DB batch write (default: 500)",
    )
    return parser.parse_args()


def load_final_selection(path: Path) -> pd.DataFrame:
    """Load the final selection parquet file."""
    if not path.exists():
        print(f"Error: Input file not found: {path}")
        sys.exit(1)
    df = pd.read_parquet(path)
    print(f"Loaded {len(df)} poems from {path}")
    return df


def update_existing_scores(conn, df: pd.DataFrame, batch_size: int, dry_run: bool) -> int:
    """Update quality scores for existing (original) poems using UNNEST batch writes.

    Returns the number of poems updated.
    """
    original = df[df["source"] == "original"].copy()
    if original.empty:
        print("[scores] No original poems to update")
        return 0

    print(f"[scores] Updating scores for {len(original)} original poems...")

    if dry_run:
        print(f"  [DRY RUN] Would update {len(original)} poems in {len(original) // batch_size + 1} batches")
        return len(original)

    total_updated = 0
    batches = [original.iloc[i:i + batch_size] for i in range(0, len(original), batch_size)]

    for batch_df in tqdm(batches, desc="Updating scores"):
        ids = batch_df["poem_id"].astype(int).tolist()
        scores = batch_df["quality_score"].astype(int).tolist()
        subscores_jsons = batch_df["quality_subscores"].fillna("{}").tolist()
        models = batch_df["scoring_model"].fillna("").tolist()
        scored_ats = batch_df["scored_at"].fillna(
            datetime.now(timezone.utc).isoformat()
        ).tolist()
        poem_forms = []
        for _, row in batch_df.iterrows():
            pf = row.get("poem_form")
            if pd.notna(pf):
                try:
                    poem_forms.append(int(pf))
                except (ValueError, TypeError):
                    poem_forms.append(None)
            else:
                poem_forms.append(None)

        cur = conn.cursor()
        cur.execute("""
            UPDATE poems p SET
                quality_score = v.quality_score,
                quality_subscores = v.quality_subscores::jsonb,
                scoring_model = v.scoring_model,
                scored_at = v.scored_at::timestamptz,
                poem_form = v.poem_form
            FROM (SELECT unnest(%s::int[]) AS id,
                         unnest(%s::smallint[]) AS quality_score,
                         unnest(%s::text[]) AS quality_subscores,
                         unnest(%s::varchar[]) AS scoring_model,
                         unnest(%s::timestamptz[]) AS scored_at,
                         unnest(%s::smallint[]) AS poem_form) v
            WHERE p.id = v.id
        """, (ids, scores, subscores_jsons, models, scored_ats, poem_forms))
        total_updated += cur.rowcount
        conn.commit()
        cur.close()

    print(f"[scores] Updated {total_updated} existing poems")
    return total_updated


def resolve_poets(conn, df: pd.DataFrame, dry_run: bool) -> dict:
    """Resolve poet names to DB IDs. Insert new poets as needed.

    Returns dict mapping poet_name -> poet_id.
    """
    def norm_name(n):
        return normalize_arabic(strip_diacritics(n)).strip()

    if dry_run:
        # In dry-run mode we can't query DB, just report unique poets
        unique_poets = df[["poet_name", "era_id"]].drop_duplicates(subset=["poet_name"])
        print(f"  [DRY RUN] Would resolve {len(unique_poets)} unique poets")
        mapping = {}
        for _, row in unique_poets.iterrows():
            mapping[row["poet_name"]] = -1
        return mapping

    cur = conn.cursor()

    # Load existing DB poets
    cur.execute("SELECT id, name FROM poets")
    db_poets = {row[1]: row[0] for row in cur.fetchall()}

    # Build normalized lookup for fuzzy matching
    db_poets_norm = {}
    for name, pid in db_poets.items():
        nk = norm_name(name)
        db_poets_norm[nk] = (name, pid)

    # Resolve each unique poet from the import data
    unique_poets = df[["poet_name", "era_id"]].drop_duplicates(subset=["poet_name"])
    mapping = {}
    new_poets = []

    for _, row in unique_poets.iterrows():
        name = row["poet_name"]
        era_id = int(row["era_id"]) if pd.notna(row.get("era_id")) else 3

        # Exact match first
        if name in db_poets:
            mapping[name] = db_poets[name]
            continue

        # Normalized match
        nk = norm_name(name)
        if nk in db_poets_norm:
            mapping[name] = db_poets_norm[nk][1]
            continue

        # New poet - need to insert
        new_poets.append((name, era_id))

    # Insert new poets
    for name, era_id in new_poets:
        slug = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO poets (name, slug, era_id) VALUES (%s, %s, %s) RETURNING id",
            (name, slug, era_id)
        )
        pid = cur.fetchone()[0]
        mapping[name] = pid
        db_poets[name] = pid

    conn.commit()
    cur.close()

    matched = len(mapping) - len(new_poets)
    print(f"[poets] Resolved {len(mapping)} poets ({matched} matched DB, {len(new_poets)} new)")
    return mapping


def resolve_themes(conn, theme_names: list, dry_run: bool) -> dict:
    """Resolve theme names to DB IDs. Insert new themes as needed."""
    unique_names = list(set(n for n in theme_names if n and str(n).strip()))

    if dry_run:
        print(f"  [DRY RUN] Would resolve {len(unique_names)} unique themes")
        return {name: -1 for name in unique_names}

    cur = conn.cursor()
    cur.execute("SELECT id, name FROM themes")
    db_themes = {row[1]: row[0] for row in cur.fetchall()}

    mapping = {}
    new_themes = []

    for name in unique_names:
        if name in db_themes:
            mapping[name] = db_themes[name]
        else:
            new_themes.append(name)

    for name in new_themes:
        slug = str(uuid.uuid4())
        cur.execute(
            "INSERT INTO themes (name, slug) VALUES (%s, %s) RETURNING id",
            (name, slug)
        )
        tid = cur.fetchone()[0]
        mapping[name] = tid
        db_themes[name] = tid

    conn.commit()
    cur.close()

    if new_themes:
        print(f"  New themes inserted: {new_themes}")
    print(f"[themes] Resolved {len(mapping)} themes ({len(mapping) - len(new_themes)} matched DB, {len(new_themes)} new)")
    return mapping


def resolve_meters(conn, meter_names: list, dry_run: bool) -> dict:
    """Resolve meter names to DB IDs. Default unknown to a fallback meter."""
    unique_names = list(set(n for n in meter_names if n and str(n).strip()))

    if dry_run:
        print(f"  [DRY RUN] Would resolve {len(unique_names)} unique meters")
        return {name: -1 for name in unique_names}

    cur = conn.cursor()
    cur.execute("SELECT id, name FROM meters")
    db_meters = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()

    # Find a default meter ID for unmatched names
    default_meter_id = db_meters.get("\u063a\u064a\u0631 \u0645\u0635\u0646\u0641", db_meters.get("\u063a\u064a\u0631 \u0645\u062d\u062f\u062f"))
    if not default_meter_id:
        default_meter_id = next(iter(db_meters.values())) if db_meters else None

    mapping = {}
    unmatched = []

    for name in unique_names:
        if name in db_meters:
            mapping[name] = db_meters[name]
        elif name == "\u063a\u064a\u0631 \u0645\u0635\u0646\u0641" and default_meter_id:
            mapping[name] = default_meter_id
        else:
            unmatched.append(name)
            mapping[name] = default_meter_id  # fallback

    if unmatched:
        print(f"[meters] WARNING: {len(unmatched)} meter names not in DB (using default): {unmatched[:10]}")
    print(f"[meters] Resolved {len(mapping)} meters ({len(mapping) - len(unmatched)} exact match, {len(unmatched)} defaulted)")
    return mapping


def import_diwan_poems(conn, df, poet_map, theme_map, meter_map, batch_size, dry_run):
    """Import Diwan poems with all FK columns resolved."""
    diwan = df[df["source"] == "diwan"].copy()
    if diwan.empty:
        print("[import] No Diwan poems to import")
        return 0, 0

    print(f"[import] Importing {len(diwan)} Diwan poems...")

    if dry_run:
        # Validate FK resolution
        missing_poets = diwan[~diwan["poet_name"].isin(poet_map)]["poet_name"].unique()
        missing_themes = diwan[~diwan["theme"].isin(theme_map)]["theme"].unique()
        missing_meters = diwan[~diwan["meter"].isin(meter_map)]["meter"].unique()
        print(f"  [DRY RUN] FK resolution: {len(missing_poets)} missing poets, {len(missing_themes)} missing themes, {len(missing_meters)} missing meters")
        if len(missing_poets) > 0:
            print(f"  Missing poets: {list(missing_poets)[:10]}")
        if len(missing_themes) > 0:
            print(f"  Missing themes: {list(missing_themes)[:10]}")
        print(f"  [DRY RUN] Would insert up to {len(diwan)} poems")
        return len(diwan), 0

    inserted = 0
    skipped = 0
    errors = []
    batches = [diwan.iloc[i:i + batch_size] for i in range(0, len(diwan), batch_size)]

    for batch_df in tqdm(batches, desc="Importing poems"):
        cur = conn.cursor()
        for _, row in batch_df.iterrows():
            title = str(row.get("title", "")) if pd.notna(row.get("title")) else ""
            content = str(row.get("content", "")) if pd.notna(row.get("content")) else ""
            diacritized = str(row.get("diacritized_content", content)) if pd.notna(row.get("diacritized_content")) else content
            poet_name = str(row.get("poet_name", "")) if pd.notna(row.get("poet_name")) else ""
            theme_name = str(row.get("theme", "")) if pd.notna(row.get("theme")) else ""
            meter_name = str(row.get("meter", "")) if pd.notna(row.get("meter")) else ""
            quality_score = int(row["quality_score"]) if pd.notna(row.get("quality_score")) else None
            quality_subscores = str(row.get("quality_subscores", "{}")) if pd.notna(row.get("quality_subscores")) else "{}"
            scoring_model = str(row.get("scoring_model", "")) if pd.notna(row.get("scoring_model")) else ""
            scored_at = row.get("scored_at") if pd.notna(row.get("scored_at")) else None
            slug = str(uuid.uuid4())

            poet_id = poet_map.get(poet_name)
            theme_id = theme_map.get(theme_name)
            meter_id = meter_map.get(meter_name)

            poem_form = None
            pf = row.get("poem_form")
            if pd.notna(pf):
                try:
                    poem_form = int(pf)
                except (ValueError, TypeError):
                    pass

            if not poet_id or not theme_id:
                errors.append(f"Missing FK: poet={poet_name}({poet_id}), theme={theme_name}({theme_id})")
                skipped += 1
                continue

            try:
                cur.execute("""
                    INSERT INTO poems (title, content, diacritized_content, slug,
                                       poet_id, theme_id, meter_id, quality_score,
                                       quality_subscores, source_dataset, poem_form,
                                       scoring_model, scored_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, 'diwan', %s, %s, %s)
                """, (
                    title, content, diacritized, slug,
                    poet_id, theme_id, meter_id, quality_score,
                    quality_subscores, poem_form, scoring_model, scored_at,
                ))
                inserted += 1
            except Exception as e:
                errors.append(f"Insert error for '{title[:30]}': {e}")
                conn.rollback()
                skipped += 1
                continue

        conn.commit()
        cur.close()

    if errors:
        print(f"[import] {len(errors)} errors (first 10):")
        for e in errors[:10]:
            print(f"  - {e}")

    print(f"[import] Inserted {inserted}, skipped {skipped}")
    return inserted, skipped


def print_summary(updated: int, inserted: int, skipped: int):
    """Print import summary."""
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)
    print(f"  Existing poems updated (scores): {updated:>6,}")
    print(f"  New poems inserted (diwan):      {inserted:>6,}")
    print(f"  Skipped (errors/missing FK):     {skipped:>6,}")
    print(f"  {'─' * 40}")
    print(f"  Total operations:                {updated + inserted + skipped:>6,}")
    print("=" * 60)


def main():
    args = parse_args()

    # Load data
    df = load_final_selection(args.input)

    # Add default columns if missing (diwan_import_ready.parquet is Diwan-only)
    if "source" not in df.columns:
        df["source"] = "diwan"
    if "scoring_model" not in df.columns:
        df["scoring_model"] = ""
    if "scored_at" not in df.columns:
        df["scored_at"] = None

    # Validate expected columns
    required_cols = {"poem_id", "source", "quality_score"}
    missing = required_cols - set(df.columns)
    if missing:
        print(f"Error: Missing required columns: {missing}")
        sys.exit(1)

    # Source distribution
    source_counts = df["source"].value_counts()
    print(f"Source distribution:")
    for source, count in source_counts.items():
        print(f"  {source}: {count}")

    if args.dry_run:
        print("\n[DRY RUN MODE] No database changes will be made.\n")

    # Connect to DB (unless dry run)
    conn = None
    if not args.dry_run:
        conn = config.get_db_connection()
        print("[db] Connected to database")

    try:
        # Operation 1: Update scores for existing poems
        updated = update_existing_scores(conn, df, args.batch_size, args.dry_run)

        # Operation 2: Import new Diwan poems
        inserted, skipped = 0, 0
        if not args.scores_only:
            diwan = df[df["source"] == "diwan"]
            if not diwan.empty:
                # Pre-import safety checks
                if not args.dry_run:
                    cur = conn.cursor()

                    # Advance ALL sequences to avoid ID collisions
                    for seq_table in [("poems_id_seq", "poems"), ("poets_id_seq", "poets"),
                                      ("themes_id_seq", "themes"), ("meters_id_seq", "meters")]:
                        try:
                            cur.execute(f"SELECT setval('{seq_table[0]}', (SELECT COALESCE(MAX(id), 0) FROM {seq_table[1]}))")
                            seq_val = cur.fetchone()[0]
                            print(f"[safety] {seq_table[0]} advanced to {seq_val}")
                        except Exception as e:
                            print(f"[safety] {seq_table[0]} skip: {e}")
                            conn.rollback()
                    conn.commit()

                    # Check for existing Diwan poems (detect partial prior imports)
                    cur.execute("SELECT COUNT(*) FROM poems WHERE source_dataset = 'diwan'")
                    existing_diwan = cur.fetchone()[0]
                    if existing_diwan > 0:
                        print(f"[WARNING] Found {existing_diwan} existing Diwan poems in DB!")
                        print("  This may indicate a partial prior import. Proceeding with caution.")
                    cur.close()

                # Resolve FKs
                poet_map = resolve_poets(conn, diwan, args.dry_run)
                theme_map = resolve_themes(conn, diwan["theme"].tolist(), args.dry_run)
                meter_map = resolve_meters(conn, diwan["meter"].tolist(), args.dry_run)

                # Import poems
                inserted, skipped = import_diwan_poems(
                    conn, df, poet_map, theme_map, meter_map, args.batch_size, args.dry_run
                )

                # Post-import maintenance
                if not args.dry_run and inserted > 0:
                    cur = conn.cursor()

                    # Reset sequence
                    cur.execute("SELECT setval('poems_id_seq', (SELECT COALESCE(MAX(id), 0) FROM poems))")
                    print(f"[post] poems_id_seq reset to {cur.fetchone()[0]}")

                    # Refresh materialized view if it exists
                    try:
                        cur.execute("REFRESH MATERIALIZED VIEW CONCURRENTLY poem_full_data")
                        print("[post] Refreshed materialized view poem_full_data")
                    except Exception as e:
                        print(f"[post] Materialized view refresh skipped: {e}")
                        conn.rollback()

                    # ANALYZE tables
                    cur.execute("ANALYZE poems")
                    cur.execute("ANALYZE poets")
                    cur.execute("ANALYZE themes")
                    print("[post] ANALYZE complete on poems, poets, themes")

                    conn.commit()
                    cur.close()
            else:
                print("[import] No Diwan poems in input file")
        else:
            diwan_count = len(df[df["source"] == "diwan"])
            if diwan_count > 0:
                print(f"[import] Skipping {diwan_count} Diwan poems (--scores-only mode)")

        # Summary
        print_summary(updated, inserted, skipped)

    finally:
        if conn:
            conn.close()
            print("[db] Connection closed")


if __name__ == "__main__":
    main()
