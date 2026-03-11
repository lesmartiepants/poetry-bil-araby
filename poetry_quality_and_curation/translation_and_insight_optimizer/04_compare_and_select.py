#!/usr/bin/env python3
"""Statistical comparison and winner selection: synthesized vs baseline translations.

Loads scored translations, performs paired comparison across tiers and models,
computes win rates, effect sizes, cross-model correlation, and failure analysis.

Usage:
    # Compare for a single tier
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.04_compare_and_select --tier opus

    # Compare across all tiers
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.04_compare_and_select --tier all
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from poetry_quality_and_curation.translation_and_insight_optimizer.config import (
    ALL_DIMENSIONS,
    DATA_DIR,
    TRANSLATION_DIMENSIONS,
    INSIGHT_DIMENSIONS,
    compute_composites,
)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Compare synthesized vs baseline translations and select winners."
    )
    parser.add_argument(
        "--tier",
        choices=["opus", "sonnet", "haiku", "all"],
        default="all",
        help="Which tier(s) to compare (default: all)",
    )
    return parser.parse_args()


# -- Slug mapping for parquet file names --
TIER_SLUGS = {
    "opus": "openai_bedrock-opus-46",
    "sonnet": "openai_bedrock-sonnet-46",
    "haiku": "openai_bedrock-haiku-45",
}


def load_scores(tier: str) -> pd.DataFrame | None:
    """Load scored translations parquet for a tier. Returns None if file missing."""
    slug = TIER_SLUGS[tier]
    path = DATA_DIR / f"scores_translations_{slug}.parquet"
    if not path.exists():
        print(f"  [skip] {path.name} not found")
        return None
    df = pd.read_parquet(path)
    df["poem_id"] = df["poem_id"].astype(str)
    return df


def cohens_d(group_a: np.ndarray, group_b: np.ndarray) -> float:
    """Compute Cohen's d effect size for paired samples."""
    diff = group_a - group_b
    if diff.std() == 0:
        return 0.0
    return float(diff.mean() / diff.std())


def paired_comparison(df: pd.DataFrame, dimensions: list[str]) -> dict:
    """Run paired comparison between synthesized and baseline variants.

    Expects the dataframe to have columns: variant ('synthesized'|'baseline'),
    poem_id, and the dimension score columns.
    """
    if "variant" not in df.columns:
        # If no variant column, all rows are treated as synthesized (no baseline yet)
        return {"error": "No variant column found; cannot compare without baseline data."}

    synth = df[df["variant"] == "synthesized"].set_index("poem_id")
    base = df[df["variant"] == "baseline"].set_index("poem_id")

    # Intersect on shared poem IDs
    shared_ids = sorted(set(synth.index) & set(base.index))
    if not shared_ids:
        return {"error": "No shared poem IDs between synthesized and baseline."}

    synth = synth.loc[shared_ids]
    base = base.loc[shared_ids]

    results = {"n_poems": len(shared_ids), "dimensions": {}}

    for dim in dimensions:
        if dim not in synth.columns or dim not in base.columns:
            continue
        s_vals = synth[dim].astype(float).values
        b_vals = base[dim].astype(float).values

        wins = int((s_vals > b_vals).sum())
        ties = int((s_vals == b_vals).sum())
        losses = int((s_vals < b_vals).sum())

        win_rate = wins / len(shared_ids) * 100
        mean_improvement = float(np.mean(s_vals - b_vals))
        d = cohens_d(s_vals, b_vals)

        # Wilcoxon signed-rank test (non-parametric paired test)
        try:
            stat, p_value = stats.wilcoxon(s_vals, b_vals, alternative="greater")
            p_value = float(p_value)
        except ValueError:
            # All differences are zero
            p_value = 1.0

        results["dimensions"][dim] = {
            "win_rate": round(win_rate, 1),
            "wins": wins,
            "ties": ties,
            "losses": losses,
            "mean_improvement": round(mean_improvement, 2),
            "cohens_d": round(d, 3),
            "p_value": round(p_value, 4),
        }

    # Overall composite comparison
    synth_composites = [compute_composites(synth.loc[pid].to_dict()) for pid in shared_ids]
    base_composites = [compute_composites(base.loc[pid].to_dict()) for pid in shared_ids]

    s_overall = np.array([c["overall_composite"] for c in synth_composites])
    b_overall = np.array([c["overall_composite"] for c in base_composites])

    results["overall"] = {
        "synth_mean": round(float(s_overall.mean()), 2),
        "baseline_mean": round(float(b_overall.mean()), 2),
        "mean_improvement": round(float(np.mean(s_overall - b_overall)), 2),
        "win_rate": round(float((s_overall > b_overall).sum() / len(shared_ids) * 100), 1),
        "cohens_d": round(cohens_d(s_overall, b_overall), 3),
    }

    return results


def cross_model_correlation(tier_data: dict[str, pd.DataFrame]) -> dict:
    """Compute rank correlation between model judges on shared poems.

    Returns Spearman rho between each pair of models for overall quality score.
    """
    models = sorted(tier_data.keys())
    if len(models) < 2:
        return {}

    correlations = {}
    for i, m1 in enumerate(models):
        for m2 in models[i + 1 :]:
            df1 = tier_data[m1].set_index("poem_id")
            df2 = tier_data[m2].set_index("poem_id")
            shared = sorted(set(df1.index) & set(df2.index))
            if len(shared) < 3:
                continue

            # Use overall_composite if available, else compute from dimensions
            if "overall_composite" in df1.columns and "overall_composite" in df2.columns:
                v1 = df1.loc[shared, "overall_composite"].astype(float).values
                v2 = df2.loc[shared, "overall_composite"].astype(float).values
            else:
                # Compute composites on the fly
                v1 = np.array([
                    compute_composites(df1.loc[pid].to_dict())["overall_composite"]
                    for pid in shared
                ])
                v2 = np.array([
                    compute_composites(df2.loc[pid].to_dict())["overall_composite"]
                    for pid in shared
                ])

            rho, p = stats.spearmanr(v1, v2)
            correlations[f"{m1}_vs_{m2}"] = {
                "spearman_rho": round(float(rho), 3),
                "p_value": round(float(p), 4),
                "n_shared": len(shared),
            }

    return correlations


def cross_tier_analysis(tier_data: dict[str, pd.DataFrame]) -> dict:
    """Analyze cost vs quality tradeoffs across tiers.

    E.g. does Haiku multi-expert come close to Sonnet baseline quality?
    """
    analysis = {}
    for tier_name, df in tier_data.items():
        scores = []
        for _, row in df.iterrows():
            c = compute_composites(row.to_dict())
            scores.append(c["overall_composite"])
        scores = np.array(scores)
        analysis[tier_name] = {
            "n_poems": len(df),
            "mean_overall": round(float(scores.mean()), 2),
            "std_overall": round(float(scores.std()), 2),
            "median_overall": round(float(np.median(scores)), 2),
            "p25": round(float(np.percentile(scores, 25)), 2),
            "p75": round(float(np.percentile(scores, 75)), 2),
        }

    # Pairwise differences
    tiers = sorted(analysis.keys())
    for i, t1 in enumerate(tiers):
        for t2 in tiers[i + 1 :]:
            diff = analysis[t1]["mean_overall"] - analysis[t2]["mean_overall"]
            analysis[f"{t1}_vs_{t2}_delta"] = round(diff, 2)

    return analysis


def failure_analysis(df: pd.DataFrame) -> list[dict]:
    """Identify poems where baseline outperformed synthesized."""
    if "variant" not in df.columns:
        return []

    synth = df[df["variant"] == "synthesized"].set_index("poem_id")
    base = df[df["variant"] == "baseline"].set_index("poem_id")
    shared_ids = sorted(set(synth.index) & set(base.index))

    failures = []
    for pid in shared_ids:
        s_scores = synth.loc[pid]
        b_scores = base.loc[pid]
        s_comp = compute_composites(s_scores.to_dict())["overall_composite"]
        b_comp = compute_composites(b_scores.to_dict())["overall_composite"]

        if b_comp > s_comp:
            # Find which dimensions the baseline won on
            dim_losses = {}
            for dim in ALL_DIMENSIONS:
                if dim in s_scores and dim in b_scores:
                    s_val = float(s_scores[dim])
                    b_val = float(b_scores[dim])
                    if b_val > s_val:
                        dim_losses[dim] = round(b_val - s_val, 1)

            failures.append({
                "poem_id": pid,
                "synth_overall": round(s_comp, 2),
                "baseline_overall": round(b_comp, 2),
                "margin": round(b_comp - s_comp, 2),
                "dimensions_lost": dim_losses,
            })

    # Sort by margin descending (worst failures first)
    failures.sort(key=lambda x: x["margin"], reverse=True)
    return failures


def build_winners(df: pd.DataFrame, tier: str) -> pd.DataFrame:
    """Build a winners dataframe: poem_id, winning_variant, margin."""
    if "variant" not in df.columns:
        # No baseline to compare, all are winners by default
        return pd.DataFrame({
            "poem_id": df["poem_id"].unique(),
            "winning_variant": "synthesized",
            "margin": 0.0,
            "tier": tier,
        })

    synth = df[df["variant"] == "synthesized"].set_index("poem_id")
    base = df[df["variant"] == "baseline"].set_index("poem_id")
    shared_ids = sorted(set(synth.index) & set(base.index))

    rows = []
    for pid in shared_ids:
        s_comp = compute_composites(synth.loc[pid].to_dict())["overall_composite"]
        b_comp = compute_composites(base.loc[pid].to_dict())["overall_composite"]
        if s_comp >= b_comp:
            rows.append({"poem_id": pid, "winning_variant": "synthesized", "margin": round(s_comp - b_comp, 2)})
        else:
            rows.append({"poem_id": pid, "winning_variant": "baseline", "margin": round(b_comp - s_comp, 2)})

    winners = pd.DataFrame(rows)
    winners["tier"] = tier
    return winners


def main():
    args = parse_args()

    tiers_to_process = ["opus", "sonnet", "haiku"] if args.tier == "all" else [args.tier]

    print("=" * 60)
    print("STEP 4: COMPARE AND SELECT WINNERS")
    print("=" * 60)

    # Load all available data
    tier_data: dict[str, pd.DataFrame] = {}
    for tier in tiers_to_process:
        df = load_scores(tier)
        if df is not None:
            tier_data[tier] = df
            print(f"  [loaded] {tier}: {len(df)} rows")

    if not tier_data:
        print("ERROR: No scored data found. Run 03_score_translations first.")
        sys.exit(1)

    comparison_stats: dict = {"tiers": {}, "cross_model": {}, "cross_tier": {}, "failures": {}}
    all_winners: list[pd.DataFrame] = []

    # Per-tier paired comparison
    for tier, df in tier_data.items():
        print(f"\n--- {tier.upper()} tier ---")
        result = paired_comparison(df, ALL_DIMENSIONS)
        comparison_stats["tiers"][tier] = result

        if "error" in result:
            print(f"  {result['error']}")
        else:
            overall = result.get("overall", {})
            print(f"  Poems compared:    {result['n_poems']}")
            print(f"  Synth mean:        {overall.get('synth_mean', 'N/A')}")
            print(f"  Baseline mean:     {overall.get('baseline_mean', 'N/A')}")
            print(f"  Win rate (overall): {overall.get('win_rate', 'N/A')}%")
            print(f"  Cohen's d:         {overall.get('cohens_d', 'N/A')}")

            # Dimension-level summary
            print(f"\n  {'Dimension':<25} {'Win%':>6} {'Improv':>8} {'d':>7}")
            print(f"  {'─' * 48}")
            for dim, vals in result["dimensions"].items():
                print(f"  {dim:<25} {vals['win_rate']:>5.1f}% {vals['mean_improvement']:>+7.2f} {vals['cohens_d']:>7.3f}")

        # Failure analysis
        failures = failure_analysis(df)
        if failures:
            comparison_stats["failures"][tier] = failures
            print(f"\n  Failures (baseline > synthesized): {len(failures)}")
            for f in failures[:5]:
                print(f"    poem {f['poem_id']}: baseline won by {f['margin']:.1f} on {list(f['dimensions_lost'].keys())}")

        # Build winners
        winners = build_winners(df, tier)
        all_winners.append(winners)

    # Cross-model correlation
    print("\n--- Cross-Model Correlation ---")
    correlation = cross_model_correlation(tier_data)
    comparison_stats["cross_model"] = correlation
    for pair, vals in correlation.items():
        print(f"  {pair}: rho={vals['spearman_rho']:.3f} (p={vals['p_value']:.4f}, n={vals['n_shared']})")

    if not correlation:
        print("  Not enough shared data across models for correlation.")

    # Cross-tier analysis
    print("\n--- Cross-Tier Analysis (Cost vs Quality) ---")
    cross_tier = cross_tier_analysis(tier_data)
    comparison_stats["cross_tier"] = cross_tier
    for key, val in cross_tier.items():
        if isinstance(val, dict):
            print(f"  {key}: mean={val['mean_overall']:.1f} std={val['std_overall']:.1f} n={val['n_poems']}")
        else:
            print(f"  {key}: {val}")

    # Write outputs
    stats_path = DATA_DIR / "comparison_stats.json"
    stats_path.write_text(json.dumps(comparison_stats, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n[saved] {stats_path} ({stats_path.stat().st_size / 1024:.1f} KB)")

    if all_winners:
        winners_df = pd.concat(all_winners, ignore_index=True)
        for tier in tiers_to_process:
            tier_winners = winners_df[winners_df["tier"] == tier]
            if not tier_winners.empty:
                out_path = DATA_DIR / f"winners_{tier}.parquet"
                tier_winners.to_parquet(out_path, index=False)
                synth_wins = (tier_winners["winning_variant"] == "synthesized").sum()
                print(f"[saved] {out_path.name}: {len(tier_winners)} poems, {synth_wins} synthesized wins")

    print("\n[done] Comparison complete.")


if __name__ == "__main__":
    main()
