"""Select the final 5,000 poems with diversity constraints.

Applies poet caps, modern/classical ratio targets, and theme diversity
guarantees to produce the final curated collection.

Usage:
    python -m scripts.curation.04_select_final
    python -m scripts.curation.04_select_final --input data/scores_calibrated.parquet --target 5000
"""
import argparse
import json
from collections import Counter

import numpy as np
import pandas as pd

from scripts.curation import config
from scripts.curation.arabic_utils import compute_text_hash


def parse_args():
    parser = argparse.ArgumentParser(description="Select final curated poems with diversity constraints")
    parser.add_argument("--input", default=str(config.DATA_DIR / "scores_calibrated.parquet"),
                        help="Calibrated scores parquet (default: data/scores_calibrated.parquet)")
    parser.add_argument("--output", default=str(config.DATA_DIR / "final_selection.parquet"),
                        help="Output parquet path (default: data/final_selection.parquet)")
    parser.add_argument("--target", type=int, default=config.TARGET_FINAL_COUNT,
                        help=f"Target poem count (default: {config.TARGET_FINAL_COUNT})")
    parser.add_argument("--modern-ratio", type=float, default=config.MODERN_RATIO,
                        help=f"Fraction of modern poems (default: {config.MODERN_RATIO})")
    parser.add_argument("--max-per-poet", type=int, default=config.MAX_POEMS_PER_POET,
                        help=f"Max poems per poet (default: {config.MAX_POEMS_PER_POET})")
    return parser.parse_args()


def load_and_merge(args) -> pd.DataFrame:
    """Load calibrated scores and merge with poem metadata."""
    scores = pd.read_parquet(args.input)
    scores["poem_id"] = scores["poem_id"].astype(str)
    print(f"Loaded {len(scores)} scored poems")

    # Merge DB metadata for original poems
    db_poems = _load_db_metadata()
    if db_poems is not None and not db_poems.empty:
        db_poems["poem_id"] = db_poems["poem_id"].astype(str)
        # Only merge columns not already in scores
        merge_cols = ["poem_id"] + [c for c in db_poems.columns if c != "poem_id" and c not in scores.columns]
        if merge_cols:
            scores = scores.merge(db_poems[merge_cols], on="poem_id", how="left")

    # Merge diwan metadata
    diwan_path = config.DATA_DIR / "diwan_processed.parquet"
    if diwan_path.exists():
        diwan = pd.read_parquet(diwan_path)
        if "poem_id" in diwan.columns:
            diwan["poem_id"] = diwan["poem_id"].astype(str)
        elif "id" in diwan.columns:
            diwan["poem_id"] = diwan["id"].astype(str)
        else:
            diwan["poem_id"] = diwan.index.astype(str)
        diwan_cols = ["poem_id"] + [c for c in ["meter", "theme", "poem_form", "poet_name", "title", "content"]
                                     if c in diwan.columns and c not in scores.columns]
        if len(diwan_cols) > 1:
            scores = scores.merge(diwan[diwan_cols], on="poem_id", how="left")

    return scores


def _load_db_metadata() -> pd.DataFrame | None:
    """Load poem metadata from the database."""
    try:
        conn = config.get_db_connection()
    except Exception:
        return None
    try:
        query = """
            SELECT p.id AS poem_id, p.title, p.content, p.poem_form, p.meter, p.theme,
                   po.name AS poet_name
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
        """
        df = pd.read_sql(query, conn)
        df["poem_id"] = df["poem_id"].astype(str)
        return df
    except Exception:
        return None
    finally:
        conn.close()


def classify_poem_form(row) -> str:
    """Classify poem as classical or modern. Returns 'classical' or 'modern'."""
    form = row.get("poem_form")
    if pd.notna(form):
        try:
            form_int = int(form)
            if form_int == 1:
                return "classical"
            elif form_int == 2:
                return "modern"
        except (ValueError, TypeError):
            pass

    # Infer from meter
    meter = row.get("meter")
    if pd.notna(meter):
        try:
            meter_int = int(meter)
            # Free verse and taf'ila meters are modern
            if meter_int in (17, 18, 20):
                return "modern"
            elif meter_int <= 16:
                return "classical"
        except (ValueError, TypeError):
            pass

    # Default to modern bucket
    return "modern"


def select_with_poet_cap(df: pd.DataFrame, target: int, max_per_poet: int) -> pd.DataFrame:
    """Select top poems by quality_score, respecting per-poet cap."""
    sorted_df = df.sort_values("quality_score", ascending=False)
    poet_counts: Counter = Counter()
    selected_indices = []

    for idx, row in sorted_df.iterrows():
        poet = row.get("poet_name", "unknown")
        if pd.isna(poet) or poet == "":
            poet = "unknown"
        if poet_counts[poet] < max_per_poet:
            selected_indices.append(idx)
            poet_counts[poet] += 1
        if len(selected_indices) >= target:
            break

    return df.loc[selected_indices]


def ensure_theme_diversity(selected: pd.DataFrame, full_df: pd.DataFrame,
                           min_themes: int = 10) -> pd.DataFrame:
    """Swap poems to ensure at least min_themes distinct themes are represented."""
    if "theme" not in selected.columns or selected["theme"].isna().all():
        return selected

    theme_counts = selected["theme"].dropna().value_counts()
    n_themes = len(theme_counts)

    if n_themes >= min_themes:
        return selected

    # Find underrepresented themes in the full dataset
    all_themes = full_df["theme"].dropna().unique()
    missing_themes = [t for t in all_themes if t not in theme_counts.index]

    if not missing_themes:
        return selected

    selected = selected.copy()
    selected_ids = set(selected["poem_id"])

    for theme in missing_themes:
        if n_themes >= min_themes:
            break

        # Find best poem of this theme not already selected
        candidates = full_df[
            (full_df["theme"] == theme) & (~full_df["poem_id"].isin(selected_ids))
        ].sort_values("quality_score", ascending=False)

        if candidates.empty:
            continue

        # Find the lowest-scoring poem in the most overrepresented theme to swap
        if theme_counts.empty:
            continue
        overrep_theme = theme_counts.index[0]
        overrep_poems = selected[selected["theme"] == overrep_theme].sort_values("quality_score")

        if overrep_poems.empty:
            continue

        # Swap: remove lowest from overrepresented, add best from underrepresented
        drop_idx = overrep_poems.index[0]
        drop_id = selected.at[drop_idx, "poem_id"]
        selected = selected.drop(drop_idx)
        selected_ids.discard(drop_id)

        new_poem = candidates.iloc[[0]]
        selected = pd.concat([selected, new_poem], ignore_index=True)
        selected_ids.add(new_poem.iloc[0]["poem_id"])

        theme_counts = selected["theme"].dropna().value_counts()
        n_themes = len(theme_counts)

    return selected


def add_content_hashes(df: pd.DataFrame) -> pd.DataFrame:
    """Add content_hash column for deduplication reference."""
    if "content" in df.columns:
        df["content_hash"] = df["content"].apply(
            lambda x: compute_text_hash(x) if pd.notna(x) else ""
        )
    return df


def build_quality_subscores(row) -> str:
    """Build JSON string of quality subscores."""
    subscores = {}
    for dim in config.SCORE_DIMENSIONS:
        if dim in row and pd.notna(row[dim]):
            subscores[dim] = int(row[dim])
    return json.dumps(subscores, ensure_ascii=False)


def print_report(selected: pd.DataFrame):
    """Print selection report."""
    print("\n=== Final Selection Report ===\n")

    # Totals by era
    if "era" in selected.columns:
        modern = selected[selected["era"] == "modern"]
        classical = selected[selected["era"] == "classical"]
        print(f"Total: {len(selected)}")
        print(f"  Modern: {len(modern)} ({100 * len(modern) / len(selected):.1f}%)")
        print(f"  Classical: {len(classical)} ({100 * len(classical) / len(selected):.1f}%)")

    # Top 20 poets by count
    if "poet_name" in selected.columns:
        poet_counts = selected["poet_name"].value_counts().head(20)
        print(f"\nTop 20 poets by count:")
        for poet, count in poet_counts.items():
            print(f"  {poet}: {count}")

    # Theme distribution
    if "theme" in selected.columns and not selected["theme"].isna().all():
        theme_counts = selected["theme"].dropna().value_counts()
        print(f"\nTheme distribution ({len(theme_counts)} themes):")
        for theme, count in theme_counts.items():
            label = config.THEME_MAP.get(theme, str(theme)) if isinstance(theme, (int, float)) and not pd.isna(theme) else str(theme)
            print(f"  {label}: {count}")

    # Score stats
    scores = selected["quality_score"]
    print(f"\nScore statistics:")
    print(f"  Min:    {scores.min()}")
    print(f"  Max:    {scores.max()}")
    print(f"  Mean:   {scores.mean():.1f}")
    print(f"  Median: {scores.median():.0f}")
    print(f"  P25:    {scores.quantile(0.25):.0f}")
    print(f"  P75:    {scores.quantile(0.75):.0f}")

    # Source distribution
    if "source" in selected.columns:
        source_counts = selected["source"].value_counts()
        print(f"\nSource distribution:")
        for source, count in source_counts.items():
            print(f"  {source}: {count}")


def main():
    args = parse_args()

    # Load and merge
    df = load_and_merge(args)

    # Classify poems by era
    df["era"] = df.apply(classify_poem_form, axis=1)

    # Separate buckets
    modern = df[df["era"] == "modern"].copy()
    classical = df[df["era"] == "classical"].copy()
    print(f"Modern pool: {len(modern)}, Classical pool: {len(classical)}")

    # Target counts
    modern_target = round(args.target * args.modern_ratio)
    classical_target = args.target - modern_target
    print(f"Targets: modern={modern_target}, classical={classical_target}")

    # Select with poet cap
    modern_selected = select_with_poet_cap(modern, modern_target, args.max_per_poet)
    classical_selected = select_with_poet_cap(classical, classical_target, args.max_per_poet)
    print(f"Selected: modern={len(modern_selected)}, classical={len(classical_selected)}")

    # Backfill if one bucket is short
    modern_shortfall = modern_target - len(modern_selected)
    classical_shortfall = classical_target - len(classical_selected)

    if modern_shortfall > 0 and classical_shortfall <= 0:
        # Backfill modern shortfall from classical
        extra = select_with_poet_cap(
            classical[~classical.index.isin(classical_selected.index)],
            modern_shortfall, args.max_per_poet
        )
        classical_selected = pd.concat([classical_selected, extra])
        print(f"Backfilled {len(extra)} classical poems for modern shortfall")
    elif classical_shortfall > 0 and modern_shortfall <= 0:
        # Backfill classical shortfall from modern
        extra = select_with_poet_cap(
            modern[~modern.index.isin(modern_selected.index)],
            classical_shortfall, args.max_per_poet
        )
        modern_selected = pd.concat([modern_selected, extra])
        print(f"Backfilled {len(extra)} modern poems for classical shortfall")

    # Combine
    selected = pd.concat([modern_selected, classical_selected], ignore_index=True)

    # Theme diversity check
    selected = ensure_theme_diversity(selected, df)

    # Add content hashes
    selected = add_content_hashes(selected)

    # Build quality subscores JSON column
    selected["quality_subscores"] = selected.apply(build_quality_subscores, axis=1)

    # Add scoring model column
    if "model_used" in selected.columns:
        selected["scoring_model"] = selected["model_used"]

    # Select final output columns (keep all that exist)
    desired_cols = [
        "poem_id", "source", "title", "content", "poet_name", "meter", "theme",
        "poem_form", "quality_score", "quality_subscores", "content_hash",
        "scoring_model", "scored_at",
    ]
    output_cols = [c for c in desired_cols if c in selected.columns]
    # Include any extra score dimensions for reference
    for dim in config.SCORE_DIMENSIONS:
        if dim in selected.columns and dim not in output_cols:
            output_cols.append(dim)

    final = selected[output_cols].copy()

    # Print report
    print_report(selected)

    # Save
    final.to_parquet(args.output, index=False)
    print(f"\nFinal selection saved to: {args.output}")
    print(f"  Total poems: {len(final)}")


if __name__ == "__main__":
    main()
