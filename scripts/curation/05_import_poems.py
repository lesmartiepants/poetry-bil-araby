#!/usr/bin/env python3
"""Import final curated selection into the production PostgreSQL database.

Updates quality scores for existing (original) poems and inserts new Diwan poems.

Usage:
    python -m scripts.curation.05_import_poems
    python -m scripts.curation.05_import_poems --dry-run
    python -m scripts.curation.05_import_poems --scores-only
    python -m scripts.curation.05_import_poems --input data/final_selection.parquet --batch-size 250
"""
import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
from tqdm import tqdm

from scripts.curation import config


def parse_args():
    parser = argparse.ArgumentParser(
        description="Import final poem selection into production database"
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=config.DATA_DIR / "final_selection.parquet",
        help="Input parquet path (default: data/final_selection.parquet)",
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


def upsert_poets(conn, poet_names: list[str]) -> dict[str, int]:
    """Insert new poets and return a name -> id mapping."""
    unique_names = list(set(n for n in poet_names if n and n.strip()))
    if not unique_names:
        return {}

    cur = conn.cursor()

    # Upsert all poet names
    for name in unique_names:
        cur.execute(
            "INSERT INTO poets (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (name,),
        )
    conn.commit()

    # Fetch all IDs
    cur.execute("SELECT id, name FROM poets WHERE name = ANY(%s)", (unique_names,))
    mapping = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()

    print(f"[poets] {len(mapping)} poets in DB ({len(unique_names)} unique names from selection)")
    return mapping


def upsert_themes(conn, theme_names: list[str]) -> dict[str, int]:
    """Insert new themes and return a name -> id mapping."""
    unique_names = list(set(n for n in theme_names if n and str(n).strip() and str(n) != "nan"))
    if not unique_names:
        return {}

    cur = conn.cursor()

    for name in unique_names:
        cur.execute(
            "INSERT INTO themes (name) VALUES (%s) ON CONFLICT (name) DO NOTHING",
            (str(name),),
        )
    conn.commit()

    cur.execute("SELECT id, name FROM themes WHERE name = ANY(%s)", ([str(n) for n in unique_names],))
    mapping = {row[1]: row[0] for row in cur.fetchall()}
    cur.close()

    print(f"[themes] {len(mapping)} themes in DB ({len(unique_names)} unique themes from selection)")
    return mapping


def import_diwan_poems(conn, df: pd.DataFrame, batch_size: int, dry_run: bool) -> tuple[int, int]:
    """Import new Diwan poems into the database.

    Returns (inserted_count, skipped_count).
    """
    diwan = df[df["source"] == "diwan"].copy()
    if diwan.empty:
        print("[import] No Diwan poems to import")
        return 0, 0

    print(f"[import] Importing {len(diwan)} Diwan poems...")

    if dry_run:
        poet_names = diwan["poet_name"].dropna().unique().tolist()
        theme_names = diwan["theme"].dropna().unique().tolist()
        print(f"  [DRY RUN] Would upsert {len(poet_names)} poets, {len(theme_names)} themes")
        print(f"  [DRY RUN] Would insert up to {len(diwan)} new poems in {len(diwan) // batch_size + 1} batches")
        return len(diwan), 0

    # Upsert poets and themes
    poet_names = diwan["poet_name"].fillna("").tolist()
    poet_map = upsert_poets(conn, poet_names)

    theme_names = diwan["theme"].fillna("").astype(str).tolist()
    theme_map = upsert_themes(conn, theme_names)

    inserted = 0
    skipped = 0
    batches = [diwan.iloc[i:i + batch_size] for i in range(0, len(diwan), batch_size)]

    for batch_df in tqdm(batches, desc="Importing poems"):
        cur = conn.cursor()
        for _, row in batch_df.iterrows():
            title = str(row.get("title", "")) if pd.notna(row.get("title")) else ""
            content = str(row.get("content", "")) if pd.notna(row.get("content")) else ""
            poet_name = str(row.get("poet_name", "")) if pd.notna(row.get("poet_name")) else ""
            theme_name = str(row.get("theme", "")) if pd.notna(row.get("theme")) else ""
            quality_score = int(row["quality_score"]) if pd.notna(row.get("quality_score")) else None
            quality_subscores = row.get("quality_subscores", "{}") if pd.notna(row.get("quality_subscores")) else "{}"
            scoring_model = str(row.get("scoring_model", "")) if pd.notna(row.get("scoring_model")) else ""
            scored_at = row.get("scored_at") if pd.notna(row.get("scored_at")) else None

            poet_id = poet_map.get(poet_name)
            theme_id = theme_map.get(theme_name)

            # poem_form: try to get integer value
            poem_form = None
            pf = row.get("poem_form")
            if pd.notna(pf):
                try:
                    poem_form = int(pf)
                except (ValueError, TypeError):
                    pass

            try:
                cur.execute("""
                    INSERT INTO poems (title, content, poet_id, theme_id, quality_score,
                                       quality_subscores, source_dataset, poem_form,
                                       scoring_model, scored_at)
                    VALUES (%s, %s, %s, %s, %s, %s::jsonb, 'diwan', %s, %s, %s)
                    ON CONFLICT DO NOTHING
                """, (
                    title, content, poet_id, theme_id, quality_score,
                    quality_subscores, poem_form, scoring_model, scored_at,
                ))
                if cur.rowcount > 0:
                    inserted += 1
                else:
                    skipped += 1
            except Exception as e:
                print(f"  Error inserting poem: {e}")
                conn.rollback()
                skipped += 1
                continue

        conn.commit()
        cur.close()

    print(f"[import] Inserted {inserted}, skipped {skipped} (already exist)")
    return inserted, skipped


def print_summary(updated: int, inserted: int, skipped: int):
    """Print import summary."""
    print("\n" + "=" * 60)
    print("IMPORT SUMMARY")
    print("=" * 60)
    print(f"  Existing poems updated (scores): {updated:>6,}")
    print(f"  New poems inserted (diwan):      {inserted:>6,}")
    print(f"  Skipped (already exist):         {skipped:>6,}")
    print(f"  {'─' * 40}")
    print(f"  Total operations:                {updated + inserted + skipped:>6,}")
    print("=" * 60)


def main():
    args = parse_args()

    # Load data
    df = load_final_selection(args.input)

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
            inserted, skipped = import_diwan_poems(conn, df, args.batch_size, args.dry_run)
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
