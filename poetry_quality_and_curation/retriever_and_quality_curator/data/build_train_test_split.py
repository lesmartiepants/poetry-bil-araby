"""
Build train/test split from Opus gold labels for DSPy calibration.

Merges v1 and v2 Opus scores, averages overlapping poems, joins with
poem content, and creates a 70/30 stratified split.

Output:
  - data/dspy_train.parquet, data/dspy_test.parquet
  - data/dspy_train.json, data/dspy_test.json
"""

import os
import json
import tempfile
import shutil
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

BASE = os.path.dirname(os.path.abspath(__file__))

# ── Load data ──────────────────────────────────────────────────────────
v1 = pd.read_parquet(os.path.join(BASE, "scores_opus_top500.parquet"))
v2 = pd.read_parquet(os.path.join(BASE, "scores_opus_top500_v2.parquet"))
content = pd.read_parquet(os.path.join(BASE, "final_selection_v4.parquet"))

score_cols = ["sound", "imagery", "emotion", "language", "cultural", "quality_score"]

# ── Merge v1 and v2 ───────────────────────────────────────────────────
# Identify overlap
overlap_ids = set(v1["poem_id"]) & set(v2["poem_id"])
only_v1_ids = set(v1["poem_id"]) - overlap_ids
only_v2_ids = set(v2["poem_id"]) - overlap_ids

print(f"V1: {len(v1)}, V2: {len(v2)}")
print(f"Overlap: {len(overlap_ids)}, Only V1: {len(only_v1_ids)}, Only V2: {len(only_v2_ids)}")
print(f"Total unique: {len(overlap_ids) + len(only_v1_ids) + len(only_v2_ids)}")

# For overlapping poems, average the scores
v1_overlap = v1[v1["poem_id"].isin(overlap_ids)].set_index("poem_id")[score_cols]
v2_overlap = v2[v2["poem_id"].isin(overlap_ids)].set_index("poem_id")[score_cols]

# Align indexes and average
merged_overlap = ((v1_overlap + v2_overlap.reindex(v1_overlap.index)) / 2).round(1)
merged_overlap = merged_overlap.reset_index()

# Non-overlapping poems
v1_only = v1[v1["poem_id"].isin(only_v1_ids)][["poem_id"] + score_cols].copy()
v2_only = v2[v2["poem_id"].isin(only_v2_ids)][["poem_id"] + score_cols].copy()
# Cast to float for consistency with averaged scores
for col in score_cols:
    v1_only[col] = v1_only[col].astype(float)
    v2_only[col] = v2_only[col].astype(float)

# Combine all
all_scores = pd.concat([merged_overlap, v1_only, v2_only], ignore_index=True)
print(f"\nCombined scores: {len(all_scores)} poems")

# Rename quality_score to opus_score for clarity
all_scores = all_scores.rename(columns={"quality_score": "opus_score"})

# ── Join with content ─────────────────────────────────────────────────
content_cols = ["poem_id", "title", "content", "poet_name"]
merged = all_scores.merge(content[content_cols], on="poem_id", how="inner")
print(f"After join with content: {len(merged)} poems")

if len(merged) < len(all_scores):
    missing = set(all_scores["poem_id"]) - set(merged["poem_id"])
    print(f"WARNING: {len(missing)} poems missing from content file: {list(missing)[:5]}...")

# ── Stratified split ──────────────────────────────────────────────────
# Create score quartile bins for stratification
merged["score_quartile"] = pd.qcut(merged["opus_score"], q=4, labels=False, duplicates="drop")

print(f"\nScore quartile distribution:")
print(merged["score_quartile"].value_counts().sort_index())

train_df, test_df = train_test_split(
    merged,
    test_size=0.3,
    random_state=42,
    stratify=merged["score_quartile"],
)

# Drop the helper column
train_df = train_df.drop(columns=["score_quartile"]).reset_index(drop=True)
test_df = test_df.drop(columns=["score_quartile"]).reset_index(drop=True)

print(f"\nTrain: {len(train_df)}, Test: {len(test_df)}")

# ── Stats ─────────────────────────────────────────────────────────────
print("\n=== Train set stats ===")
print(train_df[["opus_score", "sound", "imagery", "emotion", "language", "cultural"]].describe())
print(f"\nScore distribution:")
print(f"  < 50: {(train_df['opus_score'] < 50).sum()}")
print(f"  50-70: {((train_df['opus_score'] >= 50) & (train_df['opus_score'] < 70)).sum()}")
print(f"  70-85: {((train_df['opus_score'] >= 70) & (train_df['opus_score'] < 85)).sum()}")
print(f"  85+: {(train_df['opus_score'] >= 85).sum()}")

print("\n=== Test set stats ===")
print(test_df[["opus_score", "sound", "imagery", "emotion", "language", "cultural"]].describe())
print(f"\nScore distribution:")
print(f"  < 50: {(test_df['opus_score'] < 50).sum()}")
print(f"  50-70: {((test_df['opus_score'] >= 50) & (test_df['opus_score'] < 70)).sum()}")
print(f"  70-85: {((test_df['opus_score'] >= 70) & (test_df['opus_score'] < 85)).sum()}")
print(f"  85+: {(test_df['opus_score'] >= 85).sum()}")

# Verify stratification
from scipy import stats
ks_stat, ks_p = stats.ks_2samp(train_df["opus_score"], test_df["opus_score"])
print(f"\nKS test (train vs test): stat={ks_stat:.4f}, p={ks_p:.4f}")
if ks_p > 0.05:
    print("Distributions are NOT significantly different (good stratification)")
else:
    print("WARNING: Distributions differ significantly!")

# ── Save outputs atomically ───────────────────────────────────────────
output_columns = ["poem_id", "title", "content", "poet_name", "opus_score",
                  "sound", "imagery", "emotion", "language", "cultural"]

def save_atomic_parquet(df, path):
    tmp = path + ".tmp"
    df[output_columns].to_parquet(tmp, index=False)
    os.replace(tmp, path)
    print(f"Saved: {path} ({len(df)} rows)")

def save_atomic_json(df, path):
    tmp = path + ".tmp"
    records = df[output_columns].to_dict(orient="records")
    # Convert numpy types to Python native for JSON serialization
    for r in records:
        for k, v in r.items():
            if isinstance(v, (np.integer, np.int64)):
                r[k] = int(v)
            elif isinstance(v, (np.floating, np.float64)):
                r[k] = float(v)
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)
    print(f"Saved: {path} ({len(records)} records)")

save_atomic_parquet(train_df, os.path.join(BASE, "dspy_train.parquet"))
save_atomic_parquet(test_df, os.path.join(BASE, "dspy_test.parquet"))
save_atomic_json(train_df, os.path.join(BASE, "dspy_train.json"))
save_atomic_json(test_df, os.path.join(BASE, "dspy_test.json"))

print("\nDone! All files saved successfully.")
