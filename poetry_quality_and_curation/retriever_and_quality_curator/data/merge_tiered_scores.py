"""Merge tiered scores from Opus (top 500), Sonnet (top 2000), and Haiku (rest).

Also applies canon boost: canon poems get minimum score of 90.

Output: data/scores_final_merged_v6.parquet
"""
import json
import sys
from pathlib import Path

import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent

HAIKU_PATH = DATA_DIR / "scores_recalibrated_v7.parquet"
OPUS_PATH = DATA_DIR / "scores_opus_top500_v2.parquet"
SONNET_PATH = DATA_DIR / "scores_sonnet_top2000_v2.parquet"
CANON_PATH = DATA_DIR / "canon_poems.json"
OUTPUT_PATH = DATA_DIR / "scores_final_merged_v7.parquet"

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]


def main():
    print("=" * 60)
    print("MERGE TIERED SCORES + CANON BOOST")
    print("=" * 60)

    # Load all score sources
    haiku_df = pd.read_parquet(HAIKU_PATH)
    haiku_df["poem_id"] = haiku_df["poem_id"].astype(str)
    print(f"Haiku scores: {len(haiku_df)} poems")

    opus_exists = OPUS_PATH.exists()
    sonnet_exists = SONNET_PATH.exists()

    opus_df = pd.read_parquet(OPUS_PATH) if opus_exists else pd.DataFrame()
    sonnet_df = pd.read_parquet(SONNET_PATH) if sonnet_exists else pd.DataFrame()

    if opus_exists:
        opus_df["poem_id"] = opus_df["poem_id"].astype(str)
        print(f"Opus scores: {len(opus_df)} poems")
    if sonnet_exists:
        sonnet_df["poem_id"] = sonnet_df["poem_id"].astype(str)
        print(f"Sonnet scores: {len(sonnet_df)} poems")

    # Load canon poems
    with open(CANON_PATH) as f:
        canon = json.load(f)
    canon_ids = {str(p["matched_id"]) for p in canon if p.get("found") and p.get("matched_id")}
    canon_by_id = {str(p["matched_id"]): p for p in canon if p.get("found") and p.get("matched_id")}
    print(f"Canon poems: {len(canon_ids)} matched")

    # Start with Haiku as base, then override with better models
    # Priority: Opus > Sonnet > Haiku
    merged = haiku_df.copy()
    merged["scoring_tier"] = "haiku"
    merged["haiku_score"] = merged["quality_score"].copy()

    # Override with Sonnet scores
    if sonnet_exists and len(sonnet_df) > 0:
        sonnet_ids = set(sonnet_df["poem_id"].values)
        for _, row in sonnet_df.iterrows():
            pid = row["poem_id"]
            mask = merged["poem_id"] == pid
            if mask.any():
                merged.loc[mask, "quality_score"] = row["quality_score"]
                for d in DIMS:
                    if d in row:
                        merged.loc[mask, d] = row[d]
                merged.loc[mask, "scoring_tier"] = "sonnet"
                merged.loc[mask, "model_used"] = row.get("model_used", "sonnet")
        print(f"  Overrode {len(sonnet_ids & set(merged['poem_id'].values))} poems with Sonnet scores")

    # Override with Opus scores (highest priority)
    if opus_exists and len(opus_df) > 0:
        opus_ids = set(opus_df["poem_id"].values)
        for _, row in opus_df.iterrows():
            pid = row["poem_id"]
            mask = merged["poem_id"] == pid
            if mask.any():
                merged.loc[mask, "quality_score"] = row["quality_score"]
                for d in DIMS:
                    if d in row:
                        merged.loc[mask, d] = row[d]
                merged.loc[mask, "scoring_tier"] = "opus"
                merged.loc[mask, "model_used"] = row.get("model_used", "opus")
        print(f"  Overrode {len(opus_ids & set(merged['poem_id'].values))} poems with Opus scores")

    # Canon boost: ensure canon poems score at least 90
    # (except Tier 3 which gets minimum 85)
    canon_boosted = 0
    for pid in canon_ids:
        mask = merged["poem_id"] == pid
        if mask.any():
            current_score = merged.loc[mask, "quality_score"].iloc[0]
            canon_entry = canon_by_id.get(pid, {})
            tier = canon_entry.get("fame_tier", 3)

            if tier == 1:
                min_score = 92
            elif tier == 2:
                min_score = 88
            else:
                min_score = 85

            if current_score < min_score:
                boost = min_score - current_score
                merged.loc[mask, "quality_score"] = min_score
                # Also boost sub-scores proportionally
                for d in DIMS:
                    old_val = merged.loc[mask, d].iloc[0]
                    merged.loc[mask, d] = min(100, old_val + boost)
                merged.loc[mask, "scoring_tier"] = merged.loc[mask, "scoring_tier"].values[0] + "+canon"
                canon_boosted += 1

    print(f"  Canon boosted: {canon_boosted} poems raised to tier-minimum scores")

    # ---------------------------------------------------------------
    # Quantile remap: stretch model scores to match target distribution
    # Target: top 20% → 90+, next 30% → 75-89, middle 30% → 50-74, bottom 20% → <50
    # The model's relative ordering is good, but absolute scores are compressed.
    # ---------------------------------------------------------------
    print(f"\n  Applying quantile remap to match target distribution...")
    merged["raw_score"] = merged["quality_score"].copy()

    # Sort by raw score to establish ranking
    sorted_idx = merged["quality_score"].argsort()
    n = len(merged)

    # Target percentile breakpoints and their score values
    # Bottom 20% maps to 30-50, next 30% to 50-75, next 30% to 75-90, top 20% to 90-97
    target_breakpoints = [
        (0.00, 30),   # worst poem
        (0.10, 40),   # P10
        (0.20, 50),   # P20 = bottom 20% ends at 50
        (0.35, 62),   # P35
        (0.50, 75),   # P50 = median at 75 (end of competent)
        (0.70, 82),   # P70
        (0.80, 90),   # P80 = top 20% starts at 90
        (0.90, 93),   # P90
        (0.95, 95),   # P95
        (1.00, 97),   # best poem
    ]

    # Compute the percentile rank of each poem
    ranks = merged["quality_score"].rank(method="average", pct=True)

    # Interpolate target score from percentile rank
    bp_pcts = [bp[0] for bp in target_breakpoints]
    bp_scores = [bp[1] for bp in target_breakpoints]
    merged["quality_score"] = np.interp(ranks, bp_pcts, bp_scores).round().astype(int)

    # Ensure canon poems keep minimum thresholds after remap
    for pid in canon_ids:
        mask = merged["poem_id"] == pid
        if mask.any():
            canon_entry = canon_by_id.get(pid, {})
            tier = canon_entry.get("fame_tier", 3)
            min_score = {1: 92, 2: 88, 3: 85}.get(tier, 85)
            if merged.loc[mask, "quality_score"].iloc[0] < min_score:
                merged.loc[mask, "quality_score"] = min_score

    remap_stats = {
        "90+": (merged["quality_score"] >= 90).sum(),
        "75-89": ((merged["quality_score"] >= 75) & (merged["quality_score"] < 90)).sum(),
        "50-74": ((merged["quality_score"] >= 50) & (merged["quality_score"] < 75)).sum(),
        "<50": (merged["quality_score"] < 50).sum(),
    }
    print(f"  After remap: {remap_stats}")

    # Save
    merged.to_parquet(OUTPUT_PATH, index=False)

    # Report
    print(f"\n{'='*60}")
    print("MERGED SCORES SUMMARY")
    print(f"{'='*60}")
    print(f"Total poems: {len(merged)}")
    print(f"\nBy scoring tier:")
    for tier, count in merged["scoring_tier"].value_counts().items():
        print(f"  {tier}: {count}")
    print(f"\nScore distribution:")
    print(f"  Mean: {merged['quality_score'].mean():.1f}")
    print(f"  Std:  {merged['quality_score'].std():.1f}")
    print(f"  Min:  {merged['quality_score'].min()}")
    print(f"  P25:  {merged['quality_score'].quantile(0.25):.0f}")
    print(f"  Med:  {merged['quality_score'].median():.0f}")
    print(f"  P75:  {merged['quality_score'].quantile(0.75):.0f}")
    print(f"  Max:  {merged['quality_score'].max()}")

    for lo, hi in [(0,30),(30,50),(50,60),(60,70),(70,75),(75,82),(82,89),(90,100)]:
        count = len(merged[(merged['quality_score']>=lo) & (merged['quality_score']<hi)])
        pct = count/len(merged)*100
        label = {(0,30): "Broken", (30,50): "Flat", (50,60): "Below avg",
                 (60,70): "Average", (70,75): "Decent", (75,82): "Good",
                 (82,89): "Excellent", (90,100): "Masterpiece"}[(lo,hi)]
        print(f"  {lo:>3}-{hi:<3}: {count:>5} ({pct:5.1f}%)  {label}")

    # Canon poem scores
    print(f"\nCanon poem scores:")
    canon_scores = []
    for pid in canon_ids:
        mask = merged["poem_id"] == pid
        if mask.any():
            score = merged.loc[mask, "quality_score"].iloc[0]
            tier_label = merged.loc[mask, "scoring_tier"].iloc[0]
            entry = canon_by_id.get(pid, {})
            canon_scores.append({
                "title": entry.get("canon_title", "?")[:35],
                "poet": entry.get("poet", "?")[:15],
                "fame_tier": entry.get("fame_tier", 9),
                "score": score,
                "tier": tier_label,
            })
    canon_scores.sort(key=lambda x: (-x["score"], x["fame_tier"]))
    for c in canon_scores[:20]:
        print(f"  T{c['fame_tier']} | {c['score']:>3.0f} | {c['title']:35} | {c['poet']:15} | {c['tier']}")
    if len(canon_scores) > 20:
        print(f"  ... and {len(canon_scores)-20} more")

    below_90 = [c for c in canon_scores if c["score"] < 90]
    print(f"\nCanon poems below 90: {len(below_90)}/{len(canon_scores)}")
    for c in below_90:
        print(f"  T{c['fame_tier']} | {c['score']:>3.0f} | {c['title']:35} | {c['tier']}")

    # Movement analysis
    if "haiku_score" in merged.columns:
        merged["score_change"] = merged["quality_score"] - merged["haiku_score"]
        moved = merged[merged["score_change"].abs() > 0]
        print(f"\n{'='*60}")
        print(f"RANK MOVEMENT (vs Haiku baseline)")
        print(f"{'='*60}")
        print(f"Poems with score changes: {len(moved)}")
        print(f"Mean change: {moved['score_change'].mean():.1f}")
        print(f"Median change: {moved['score_change'].median():.1f}")

        # Biggest gainers
        gainers = moved.nlargest(10, "score_change")
        print(f"\nTop 10 biggest gainers:")
        for _, r in gainers.iterrows():
            print(f"  {r['haiku_score']:.0f} → {r['quality_score']:.0f} (+{r['score_change']:.0f}) | {r['poem_id']}")

        # Biggest losers
        losers = moved.nsmallest(10, "score_change")
        print(f"\nTop 10 biggest drops:")
        for _, r in losers.iterrows():
            print(f"  {r['haiku_score']:.0f} → {r['quality_score']:.0f} ({r['score_change']:.0f}) | {r['poem_id']}")


if __name__ == "__main__":
    main()
