"""Diverse Poem Sampler — stratified sampling for translation evaluation.

Queries poems with quality_score >= 60 from the database and creates
nested tier samples (Opus 50, Sonnet 100, Haiku 200) with diversity
constraints: 50/50 classical/modern, proportional themes, max 2 per poet,
mixed line lengths.

Usage:
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.01_sample_poems --tier both --seed 42
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.01_sample_poems --tier opus --dry-run
"""
import argparse
import sys

import pandas as pd
from tqdm import tqdm

from poetry_quality_and_curation.retriever_and_quality_curator.config import (
    get_db_connection,
)
from poetry_quality_and_curation.translation_and_insight_optimizer import config


# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Stratified diverse poem sampler for translation evaluation"
    )
    parser.add_argument(
        "--tier",
        choices=["opus", "sonnet", "haiku", "both"],
        default="both",
        help="Which tier(s) to sample (default: both = all three nested tiers)",
    )
    parser.add_argument(
        "--seed", type=int, default=42, help="Random seed (default: 42)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print stats without saving output files",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

def load_scored_poems() -> pd.DataFrame:
    """Load poems with quality_score >= 60 from the database."""
    conn = get_db_connection()
    try:
        query = """
            SELECT
                p.id AS poem_id,
                p.title,
                p.content,
                po.name AS poet_name,
                p.quality_score,
                p.poem_form,
                p.theme,
                p.meter,
                p.line_count
            FROM poems p
            LEFT JOIN poets po ON p.poet_id = po.id
            WHERE p.quality_score >= 60
              AND p.content IS NOT NULL
              AND p.content != ''
        """
        df = pd.read_sql(query, conn)
        return df
    finally:
        conn.close()


# ---------------------------------------------------------------------------
# Line count helpers
# ---------------------------------------------------------------------------

def compute_line_count(content: str) -> int:
    """Count lines in poem content (handles * delimiter and newlines)."""
    if not content:
        return 0
    if "*" in content:
        lines = [l.strip() for l in content.split("*") if l.strip()]
    else:
        lines = [l.strip() for l in content.split("\n") if l.strip()]
    return len(lines)


def classify_length(line_count: int) -> str:
    """Classify poem length into short/medium/long."""
    if line_count < 10:
        return "short"
    elif line_count <= 25:
        return "medium"
    else:
        return "long"


# ---------------------------------------------------------------------------
# Stratified sampling
# ---------------------------------------------------------------------------

def stratified_sample(df: pd.DataFrame, target_size: int, seed: int) -> pd.DataFrame:
    """Perform stratified sampling with diversity constraints.

    Constraints:
    - 50% classical (poem_form == 1) / 50% modern (poem_form == 2)
    - Proportional theme coverage
    - Max 2 poems per poet
    - Mix of line lengths (short <10, medium 10-25, long >25)
    """
    rng = pd.np if hasattr(pd, "np") else __import__("numpy")
    import numpy as np

    np.random.seed(seed)

    # Ensure line_count exists
    if "line_count" not in df.columns or df["line_count"].isna().all():
        df = df.copy()
        df["line_count"] = df["content"].apply(compute_line_count)
    else:
        df = df.copy()
        mask = df["line_count"].isna()
        if mask.any():
            df.loc[mask, "line_count"] = df.loc[mask, "content"].apply(
                compute_line_count
            )

    df["length_class"] = df["line_count"].apply(classify_length)

    # Split by form (classical=1, modern=2)
    classical = df[df["poem_form"] == 1].copy()
    modern = df[df["poem_form"] == 2].copy()
    other = df[~df["poem_form"].isin([1, 2])].copy()

    # Target split: 50/50, with overflow from one going to the other
    classical_target = target_size // 2
    modern_target = target_size - classical_target

    # Adjust if one category has too few poems
    if len(classical) < classical_target:
        classical_target = len(classical)
        modern_target = target_size - classical_target
    elif len(modern) < modern_target:
        modern_target = len(modern)
        classical_target = target_size - modern_target

    sampled_parts = []

    for subset, target in [
        (classical, classical_target),
        (modern, modern_target),
    ]:
        if target <= 0 or len(subset) == 0:
            continue
        sampled_parts.append(
            _sample_from_subset(subset, target, seed)
        )

    # If we still need more poems (e.g. from 'other' forms), fill from there
    if sampled_parts:
        combined = pd.concat(sampled_parts, ignore_index=True)
    else:
        combined = pd.DataFrame()

    shortfall = target_size - len(combined)
    if shortfall > 0 and len(other) > 0:
        fill = _sample_from_subset(other, min(shortfall, len(other)), seed + 1)
        combined = pd.concat([combined, fill], ignore_index=True)

    # Final trim if somehow we oversampled
    if len(combined) > target_size:
        combined = combined.sample(n=target_size, random_state=seed)

    return combined.reset_index(drop=True)


def _sample_from_subset(
    subset: pd.DataFrame, target: int, seed: int
) -> pd.DataFrame:
    """Sample from a subset enforcing per-poet cap and theme/length diversity."""
    import numpy as np

    if len(subset) <= target:
        return subset.copy()

    # Enforce max 2 per poet first
    poet_limited = (
        subset.groupby("poet_name", group_keys=False)
        .apply(lambda g: g.sample(n=min(len(g), 2), random_state=seed))
        .reset_index(drop=True)
    )

    if len(poet_limited) <= target:
        return poet_limited

    # Proportional theme sampling within the poet-limited pool
    theme_counts = poet_limited["theme"].value_counts(normalize=True)
    sampled = []
    remaining_target = target

    for theme, proportion in theme_counts.items():
        theme_pool = poet_limited[poet_limited["theme"] == theme]
        n_theme = max(1, round(proportion * target))
        n_theme = min(n_theme, len(theme_pool), remaining_target)
        if n_theme <= 0:
            continue
        # Within each theme, try to get a mix of line lengths
        theme_sampled = _length_diverse_sample(theme_pool, n_theme, seed)
        sampled.append(theme_sampled)
        remaining_target -= len(theme_sampled)
        if remaining_target <= 0:
            break

    result = pd.concat(sampled, ignore_index=True) if sampled else pd.DataFrame()

    # Fill any remaining slots from the leftover pool
    if len(result) < target:
        used_ids = set(result["poem_id"].tolist()) if len(result) > 0 else set()
        leftover = poet_limited[~poet_limited["poem_id"].isin(used_ids)]
        need = target - len(result)
        if len(leftover) > 0:
            fill = leftover.sample(n=min(need, len(leftover)), random_state=seed)
            result = pd.concat([result, fill], ignore_index=True)

    return result.head(target).reset_index(drop=True)


def _length_diverse_sample(
    pool: pd.DataFrame, n: int, seed: int
) -> pd.DataFrame:
    """Sample n poems from pool with a mix of short/medium/long."""
    if len(pool) <= n:
        return pool.copy()

    length_groups = pool.groupby("length_class")
    parts = []
    per_class = max(1, n // 3)

    for cls in ["short", "medium", "long"]:
        if cls in length_groups.groups:
            group = length_groups.get_group(cls)
            take = min(per_class, len(group))
            parts.append(group.sample(n=take, random_state=seed))

    result = pd.concat(parts, ignore_index=True) if parts else pd.DataFrame()

    # Fill remaining from the full pool
    if len(result) < n:
        used_ids = set(result["poem_id"].tolist()) if len(result) > 0 else set()
        leftover = pool[~pool["poem_id"].isin(used_ids)]
        need = n - len(result)
        if len(leftover) > 0:
            fill = leftover.sample(n=min(need, len(leftover)), random_state=seed)
            result = pd.concat([result, fill], ignore_index=True)

    return result.head(n).reset_index(drop=True)


# ---------------------------------------------------------------------------
# Nested tier sampling
# ---------------------------------------------------------------------------

def sample_nested_tiers(df: pd.DataFrame, seed: int) -> dict[str, pd.DataFrame]:
    """Create nested tier samples: Opus (50) subset of Sonnet (100) subset of Haiku (200)."""
    # Start with the largest tier
    haiku = stratified_sample(df, config.HAIKU_SAMPLE, seed)

    # Sonnet is a subset of Haiku
    sonnet = stratified_sample(haiku, config.SONNET_SAMPLE, seed)

    # Opus is a subset of Sonnet
    opus = stratified_sample(sonnet, config.OPUS_SAMPLE, seed)

    return {"opus": opus, "sonnet": sonnet, "haiku": haiku}


# ---------------------------------------------------------------------------
# Stats / reporting
# ---------------------------------------------------------------------------

def print_diversity_stats(name: str, df: pd.DataFrame):
    """Print diversity statistics for a sample."""
    print(f"\n{'='*60}")
    print(f"  {name.upper()} TIER: {len(df)} poems")
    print(f"{'='*60}")

    # Form distribution
    form_counts = df["poem_form"].value_counts()
    classical_n = form_counts.get(1, 0)
    modern_n = form_counts.get(2, 0)
    other_n = len(df) - classical_n - modern_n
    print(f"\n  Form:  classical={classical_n}  modern={modern_n}  other={other_n}")
    if len(df) > 0:
        print(
            f"         ({classical_n/len(df)*100:.0f}% / {modern_n/len(df)*100:.0f}%)"
        )

    # Theme distribution
    print(f"\n  Themes ({df['theme'].nunique()} unique):")
    for theme, count in df["theme"].value_counts().head(10).items():
        print(f"    {theme}: {count}")
    if df["theme"].nunique() > 10:
        print(f"    ... and {df['theme'].nunique() - 10} more")

    # Poet distribution
    print(f"\n  Poets: {df['poet_name'].nunique()} unique")
    poet_poem_counts = df["poet_name"].value_counts()
    print(f"    Max poems per poet: {poet_poem_counts.max()}")
    print(f"    Avg poems per poet: {poet_poem_counts.mean():.1f}")

    # Line length distribution
    if "line_count" in df.columns:
        length_class = df["line_count"].apply(classify_length)
        lc = length_class.value_counts()
        print(f"\n  Length: short(<10)={lc.get('short', 0)}  "
              f"medium(10-25)={lc.get('medium', 0)}  "
              f"long(>25)={lc.get('long', 0)}")

    # Quality score range
    print(f"\n  Quality: min={df['quality_score'].min():.0f}  "
          f"max={df['quality_score'].max():.0f}  "
          f"mean={df['quality_score'].mean():.1f}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

OUTPUT_COLUMNS = [
    "poem_id",
    "title",
    "content",
    "poet_name",
    "quality_score",
    "poem_form",
    "theme",
    "meter",
    "line_count",
]


def main():
    args = parse_args()

    print("Loading scored poems from database (quality_score >= 60)...")
    df = load_scored_poems()

    if df.empty:
        print("No poems found with quality_score >= 60.")
        sys.exit(1)

    # Ensure line_count
    if "line_count" not in df.columns or df["line_count"].isna().all():
        print("Computing line counts...")
        df["line_count"] = df["content"].apply(compute_line_count)
    else:
        mask = df["line_count"].isna()
        if mask.any():
            df.loc[mask, "line_count"] = df.loc[mask, "content"].apply(
                compute_line_count
            )

    print(f"Loaded {len(df)} poems from database")
    print(f"  Forms: {df['poem_form'].value_counts().to_dict()}")
    print(f"  Poets: {df['poet_name'].nunique()} unique")

    # Sample tiers
    if args.tier == "both":
        tiers = sample_nested_tiers(df, args.seed)
    else:
        tier_config = config.get_tier_config(args.tier)
        sample = stratified_sample(df, tier_config["sample_size"], args.seed)
        tiers = {args.tier: sample}

    # Print stats
    for name, tier_df in tiers.items():
        print_diversity_stats(name, tier_df)

    if args.dry_run:
        print("\n[DRY RUN] No files saved.")
        return

    # Save outputs
    for name, tier_df in tiers.items():
        # Ensure all output columns exist
        for col in OUTPUT_COLUMNS:
            if col not in tier_df.columns:
                tier_df[col] = None
        output_path = config.DATA_DIR / f"sampled_poems_{name}.parquet"
        tier_df[OUTPUT_COLUMNS].to_parquet(output_path, index=False)
        print(f"\nSaved {len(tier_df)} poems to {output_path}")

    # Verify nesting
    if args.tier == "both":
        opus_ids = set(tiers["opus"]["poem_id"])
        sonnet_ids = set(tiers["sonnet"]["poem_id"])
        haiku_ids = set(tiers["haiku"]["poem_id"])
        assert opus_ids.issubset(sonnet_ids), "Opus must be a subset of Sonnet"
        assert sonnet_ids.issubset(haiku_ids), "Sonnet must be a subset of Haiku"
        print("\nNesting verified: Opus is subset of Sonnet is subset of Haiku")


if __name__ == "__main__":
    main()
