"""Merge v8 calibrated scores from Haiku (bottom 3500) and Sonnet (top 1500).

Unlike v7 which needed quantile remap, DSPy-calibrated scores should produce
a natural distribution without post-hoc adjustment. Still applies canon boost.

Output: data/scores_final_v8.parquet
"""
import json
import shutil
from pathlib import Path

import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent

HAIKU_PATH = DATA_DIR / "scores_calibrated_v8_haiku.parquet"
SONNET_PATH = DATA_DIR / "scores_calibrated_v8_sonnet.parquet"
CANON_PATH = DATA_DIR / "canon_poems.json"
V7_PATH = DATA_DIR / "scores_final_merged_v7.parquet"
CONTENT_PATH = DATA_DIR / "final_selection_v4.parquet"
OUTPUT_PATH = DATA_DIR / "scores_final_v8.parquet"

DIMS = ["sound", "imagery", "emotion", "language", "cultural"]


def main():
    print("=" * 60)
    print("MERGE V8 CALIBRATED SCORES + CANON BOOST")
    print("=" * 60)

    # Load both score sources
    haiku_df = pd.read_parquet(HAIKU_PATH)
    haiku_df["poem_id"] = haiku_df["poem_id"].astype(str)
    haiku_df["scoring_tier"] = "haiku-calibrated"
    print(f"Haiku scores: {len(haiku_df)} poems")

    sonnet_df = pd.read_parquet(SONNET_PATH)
    sonnet_df["poem_id"] = sonnet_df["poem_id"].astype(str)
    sonnet_df["scoring_tier"] = "sonnet-calibrated"
    print(f"Sonnet scores: {len(sonnet_df)} poems")

    # Combine (no overlap expected)
    merged = pd.concat([sonnet_df, haiku_df], ignore_index=True)
    merged = merged.drop_duplicates("poem_id", keep="first")  # Sonnet takes priority
    print(f"Combined: {len(merged)} poems")

    # Load canon poems
    with open(CANON_PATH) as f:
        canon = json.load(f)
    canon_ids = {str(p["matched_id"]) for p in canon if p.get("found") and p.get("matched_id")}
    canon_by_id = {str(p["matched_id"]): p for p in canon if p.get("found") and p.get("matched_id")}
    print(f"Canon poems: {len(canon_ids)} matched")

    # Canon boost
    canon_boosted = 0
    for pid in canon_ids:
        mask = merged["poem_id"] == pid
        if mask.any():
            current_score = merged.loc[mask, "quality_score"].iloc[0]
            canon_entry = canon_by_id.get(pid, {})
            tier = canon_entry.get("fame_tier", 3)

            min_score = {1: 92, 2: 88, 3: 85}.get(tier, 85)

            if current_score < min_score:
                boost = min_score - current_score
                merged.loc[mask, "quality_score"] = min_score
                for d in DIMS:
                    if d in merged.columns:
                        old_val = merged.loc[mask, d].iloc[0]
                        merged.loc[mask, d] = min(100, old_val + boost)
                merged.loc[mask, "scoring_tier"] = merged.loc[mask, "scoring_tier"].values[0] + "+canon"
                canon_boosted += 1

    print(f"Canon boosted: {canon_boosted} poems")

    # Add v7 scores for comparison
    if V7_PATH.exists():
        v7 = pd.read_parquet(V7_PATH)
        v7["poem_id"] = v7["poem_id"].astype(str)
        v7_map = v7.set_index("poem_id")["quality_score"]
        merged["v7_score"] = merged["poem_id"].map(v7_map)
        merged["score_change_v7_v8"] = merged["quality_score"] - merged["v7_score"]

    # Add content for later use
    if CONTENT_PATH.exists():
        content = pd.read_parquet(CONTENT_PATH)
        content["poem_id"] = content["poem_id"].astype(str)
        for col in ["title", "poet_name", "content"]:
            if col in content.columns and col not in merged.columns:
                content_map = content.drop_duplicates("poem_id").set_index("poem_id")[col]
                merged[col] = merged["poem_id"].map(content_map)

    # Save
    tmp = OUTPUT_PATH.with_suffix('.parquet.tmp')
    merged.to_parquet(tmp, index=False)
    shutil.move(str(tmp), str(OUTPUT_PATH))

    # Report
    print(f"\n{'='*60}")
    print("V8 MERGED SCORES SUMMARY")
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

    for lo, hi, label in [
        (0, 30, "Broken"), (30, 50, "Flat"), (50, 60, "Below avg"),
        (60, 70, "Average"), (70, 75, "Decent"), (75, 82, "Good"),
        (82, 89, "Excellent"), (90, 100, "Masterpiece"),
    ]:
        count = len(merged[(merged['quality_score'] >= lo) & (merged['quality_score'] < hi)])
        pct = count / len(merged) * 100
        print(f"  {lo:>3}-{hi:<3}: {count:>5} ({pct:5.1f}%)  {label}")

    # Canon poem report
    print(f"\nCanon poem scores:")
    canon_scores = []
    for pid in canon_ids:
        mask = merged["poem_id"] == pid
        if mask.any():
            row = merged.loc[mask].iloc[0]
            canon_scores.append({
                "title": canon_by_id.get(pid, {}).get("canon_title", "?")[:35],
                "poet": canon_by_id.get(pid, {}).get("poet", "?")[:15],
                "fame_tier": canon_by_id.get(pid, {}).get("fame_tier", 9),
                "v8_score": row["quality_score"],
                "v7_score": row.get("v7_score", 0),
                "tier": row["scoring_tier"],
            })
    canon_scores.sort(key=lambda x: (-x["v8_score"], x["fame_tier"]))
    for c in canon_scores[:20]:
        v7 = f"{c['v7_score']:.0f}" if c['v7_score'] else "?"
        print(f"  T{c['fame_tier']} | v7:{v7:>3} -> v8:{c['v8_score']:>3.0f} | {c['title']:35} | {c['poet']:15} | {c['tier']}")

    below_90 = [c for c in canon_scores if c["v8_score"] < 90]
    print(f"\nCanon poems below 90: {len(below_90)}/{len(canon_scores)}")

    # v7 vs v8 movement
    if "score_change_v7_v8" in merged.columns:
        changed = merged[merged["score_change_v7_v8"].notna()]
        print(f"\n{'='*60}")
        print("V7 vs V8 MOVEMENT")
        print(f"{'='*60}")
        print(f"Mean change: {changed['score_change_v7_v8'].mean():.1f}")
        print(f"Std change:  {changed['score_change_v7_v8'].std():.1f}")
        corr = changed["quality_score"].corr(changed["v7_score"])
        print(f"v7-v8 correlation: {corr:.3f}")

    print(f"\nSaved: {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
