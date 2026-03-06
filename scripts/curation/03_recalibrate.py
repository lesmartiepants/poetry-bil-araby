"""Recalibrate scoring by learning a mapping from dual-scored poems.

Takes base scores (e.g. from Haiku) and calibration scores (e.g. from Opus)
on the overlap set, then applies the learned calibration to all base scores.

Usage:
    python -m scripts.curation.03_recalibrate \
        --base-scores data/scores_anthropic_claude-haiku-4-20250414.parquet \
        --calibration-scores data/scores_anthropic_claude-opus-4-5-20250414.parquet
"""
import argparse
import json

import numpy as np
import pandas as pd

from scripts.curation import config


def parse_args():
    parser = argparse.ArgumentParser(description="Recalibrate poem scores using dual-scored overlap")
    parser.add_argument("--base-scores", required=True, help="Parquet path for base (cheap) model scores")
    parser.add_argument("--calibration-scores", required=True, help="Parquet path for calibration (expensive) model scores")
    parser.add_argument("--output", default=str(config.DATA_DIR / "scores_calibrated.parquet"),
                        help="Output parquet path (default: data/scores_calibrated.parquet)")
    return parser.parse_args()


def compute_dimension_calibration(base_df: pd.DataFrame, cal_df: pd.DataFrame) -> dict:
    """Compute per-dimension bias and scale from the overlap set."""
    calibration = {}
    for dim in config.SCORE_DIMENSIONS:
        base_vals = base_df[dim].astype(float)
        cal_vals = cal_df[dim].astype(float)

        bias = float(base_vals.mean() - cal_vals.mean())
        base_std = float(base_vals.std())
        cal_std = float(cal_vals.std())
        scale = cal_std / base_std if base_std > 0 else 1.0

        calibration[dim] = {"bias": bias, "scale": scale}
    return calibration


def compute_fame_discount(base_df: pd.DataFrame, cal_df: pd.DataFrame) -> dict:
    """Compute per-poet fame inflation discount from overlap set."""
    merged = base_df.copy()
    merged["cal_quality"] = cal_df["quality_score"].values
    merged["inflation"] = merged["quality_score"] - merged["cal_quality"]

    if "poet_name" not in merged.columns:
        return {}

    poet_inflation = (
        merged.groupby("poet_name")["inflation"]
        .agg(["mean", "count"])
        .sort_values("mean", ascending=False)
    )
    # Only apply discount to top 20 most-inflated poets with enough samples
    top_inflated = poet_inflation[poet_inflation["count"] >= 3].head(20)
    return {poet: float(row["mean"]) for poet, row in top_inflated.iterrows() if row["mean"] > 0}


def compute_era_adjustment(base_df: pd.DataFrame, cal_df: pd.DataFrame) -> dict:
    """Compute per-poem_form era adjustment from overlap set."""
    if "poem_form" not in base_df.columns:
        return {}

    merged = base_df.copy()
    merged["cal_quality"] = cal_df["quality_score"].values
    merged["diff"] = merged["quality_score"] - merged["cal_quality"]

    form_adj = merged.groupby("poem_form")["diff"].mean()
    return {int(k): float(v) for k, v in form_adj.items() if pd.notna(k)}


def apply_calibration(all_base: pd.DataFrame, overlap_ids: set,
                      cal_overlap: pd.DataFrame, dim_cal: dict,
                      fame_discount: dict, era_adj: dict) -> pd.DataFrame:
    """Apply calibration to all base scores."""
    result = all_base.copy()

    for dim in config.SCORE_DIMENSIONS:
        bias = dim_cal[dim]["bias"]
        scale = dim_cal[dim]["scale"]
        result[dim] = (result[dim].astype(float) - bias) * scale

    # Apply fame discount
    if fame_discount and "poet_name" in result.columns:
        for poet, discount in fame_discount.items():
            mask = result["poet_name"] == poet
            for dim in config.SCORE_DIMENSIONS:
                result.loc[mask, dim] = result.loc[mask, dim] - discount / len(config.SCORE_DIMENSIONS)

    # Apply era adjustment
    if era_adj and "poem_form" in result.columns:
        for form, adj in era_adj.items():
            mask = result["poem_form"] == form
            for dim in config.SCORE_DIMENSIONS:
                result.loc[mask, dim] = result.loc[mask, dim] - adj / len(config.SCORE_DIMENSIONS)

    # Clip to [0, 100]
    for dim in config.SCORE_DIMENSIONS:
        result[dim] = result[dim].clip(0, 100).round().astype(int)

    # For overlap poems, use calibration scores directly
    if not cal_overlap.empty:
        cal_indexed = cal_overlap.set_index("poem_id")
        for idx, row in result.iterrows():
            pid = row["poem_id"]
            if pid in overlap_ids and pid in cal_indexed.index:
                cal_row = cal_indexed.loc[pid]
                if isinstance(cal_row, pd.DataFrame):
                    cal_row = cal_row.iloc[0]
                for dim in config.SCORE_DIMENSIONS:
                    result.at[idx, dim] = int(cal_row[dim])

    # Recompute quality_score
    result["quality_score"] = result[config.SCORE_DIMENSIONS].mean(axis=1).round().astype(int)

    return result


def print_validation(base_overlap: pd.DataFrame, cal_overlap: pd.DataFrame,
                     dim_cal: dict, fame_discount: dict, era_adj: dict):
    """Print validation metrics."""
    print("\n=== Calibration Validation ===\n")

    # Per-dimension correlation and bias
    print("Dimension  | Bias    | Scale  | Pearson r")
    print("-" * 50)
    for dim in config.SCORE_DIMENSIONS:
        bias = dim_cal[dim]["bias"]
        scale = dim_cal[dim]["scale"]
        base_vals = base_overlap[dim].astype(float).values
        cal_vals = cal_overlap[dim].astype(float).values
        if len(base_vals) > 1 and np.std(base_vals) > 0 and np.std(cal_vals) > 0:
            r = float(np.corrcoef(base_vals, cal_vals)[0, 1])
        else:
            r = float("nan")
        print(f"{dim:<10} | {bias:+6.1f} | {scale:5.2f} | {r:.3f}")

    # Overall correlation
    base_q = base_overlap["quality_score"].astype(float).values
    cal_q = cal_overlap["quality_score"].astype(float).values
    if len(base_q) > 1 and np.std(base_q) > 0 and np.std(cal_q) > 0:
        overall_r = float(np.corrcoef(base_q, cal_q)[0, 1])
    else:
        overall_r = float("nan")
    print(f"\nOverall quality_score Pearson r: {overall_r:.3f}")

    # Top 10 biggest disagreements
    diffs = pd.DataFrame({
        "poem_id": base_overlap["poem_id"].values,
        "base_score": base_q,
        "cal_score": cal_q,
        "diff": base_q - cal_q,
    })
    diffs["abs_diff"] = diffs["diff"].abs()
    top_disagree = diffs.nlargest(10, "abs_diff")
    print("\nTop 10 biggest disagreements:")
    for _, row in top_disagree.iterrows():
        print(f"  {row['poem_id']}: base={row['base_score']:.0f} cal={row['cal_score']:.0f} diff={row['diff']:+.0f}")

    # Fame discount
    if fame_discount:
        print(f"\nFame discount (top {len(fame_discount)} inflated poets):")
        for poet, discount in sorted(fame_discount.items(), key=lambda x: -x[1])[:10]:
            print(f"  {poet}: {discount:+.1f}")

    # Era adjustment
    if era_adj:
        print("\nEra adjustment by poem_form:")
        for form, adj in sorted(era_adj.items()):
            label = config.POEM_FORM_MAP.get(form, str(form))
            print(f"  {label} (form={form}): {adj:+.1f}")


def main():
    args = parse_args()

    # Load scores
    base_all = pd.read_parquet(args.base_scores)
    cal_all = pd.read_parquet(args.calibration_scores)
    print(f"Base scores: {len(base_all)} poems")
    print(f"Calibration scores: {len(cal_all)} poems")

    # Ensure poem_id is string
    base_all["poem_id"] = base_all["poem_id"].astype(str)
    cal_all["poem_id"] = cal_all["poem_id"].astype(str)

    # Find overlap
    overlap_ids = set(base_all["poem_id"]) & set(cal_all["poem_id"])
    print(f"Overlap: {len(overlap_ids)} poems")

    if len(overlap_ids) < 10:
        print("Error: Too few overlapping poems for calibration (need at least 10)")
        return

    # Get overlap subsets, aligned by poem_id
    base_overlap = base_all[base_all["poem_id"].isin(overlap_ids)].sort_values("poem_id").reset_index(drop=True)
    cal_overlap = cal_all[cal_all["poem_id"].isin(overlap_ids)].sort_values("poem_id").reset_index(drop=True)

    # Compute calibration parameters
    dim_cal = compute_dimension_calibration(base_overlap, cal_overlap)
    fame_discount = compute_fame_discount(base_overlap, cal_overlap)
    era_adj = compute_era_adjustment(base_overlap, cal_overlap)

    # Print validation
    print_validation(base_overlap, cal_overlap, dim_cal, fame_discount, era_adj)

    # Apply calibration to all base scores
    calibrated = apply_calibration(base_all, overlap_ids, cal_overlap, dim_cal, fame_discount, era_adj)

    # Save
    calibrated.to_parquet(args.output, index=False)
    print(f"\nCalibrated scores saved to: {args.output}")
    print(f"  Total poems: {len(calibrated)}")
    print(f"  Score range: {calibrated['quality_score'].min()} - {calibrated['quality_score'].max()}")
    print(f"  Mean score: {calibrated['quality_score'].mean():.1f}")


if __name__ == "__main__":
    main()
