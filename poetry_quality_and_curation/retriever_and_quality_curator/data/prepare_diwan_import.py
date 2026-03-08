#!/usr/bin/env python3
"""Prepare 4,425 Diwan poems for database import.

Fixes all data quality gaps: poet names, themes, meters, era codes,
quality subscores, and diacritized content. Outputs diwan_import_ready.parquet.
"""

import json
import sys
from pathlib import Path

import pandas as pd

# Allow imports from the parent package
_PARENT = Path(__file__).resolve().parent.parent
if str(_PARENT.parent) not in sys.path:
    sys.path.insert(0, str(_PARENT.parent.parent))

from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import (
    normalize_arabic,
    strip_diacritics,
)
from poetry_quality_and_curation.retriever_and_quality_curator.config import (
    METER_MAP,
    SCORE_DIMENSIONS,
    THEME_MAP,
)

DATA_DIR = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Mapping tables
# ---------------------------------------------------------------------------

# Map variant poet names -> canonical form (applied after normalize_arabic,
# which already maps أ->ا, so all أبو variants become ابو).
# Additional merges found during data inspection:
POET_DEDUP_MAP = {
    "ابو الطيب المتنبي": "المتنبي",
    # ابوالعلاء (no space) -> ابو العلاء (with space)
    "ابوالعلاء المعري": "ابو العلاء المعري",
    # taa marbuta variants
    "ابن نباته المصري": "ابن نباتة المصري",
    "ابن خفاجه": "ابن خفاجة",
}

THEME_NORM_MAP = {
    "سياسة": "سياسية",
    "وطنية": "وطن",
    "متنوع": "غير مصنف",
    "عام": "غير مصنف",
    "": "غير مصنف",
}

DIWAN_ERA_MAP = {
    0: 3,    # unknown -> متأخر
    1: 5,    # جاهلي
    2: 1,    # إسلامي -> صدر الإسلام
    3: 4,    # أموي
    4: 2,    # عباسي
    5: 7,    # أندلسي
    6: 8,    # مملوكي
    7: 6,    # أيوبي
    8: 3,    # عثماني -> متأخر
    9: 3,    # حديث -> متأخر
    10: 3,   # معاصر -> متأخر
    11: 3,   # unknown -> متأخر
    12: 3,   # متأخر
}

ANONYMOUS = "مجهول"


def _normalize_poet(name: str) -> str:
    """Strip diacritics, normalize arabic, collapse whitespace."""
    name = strip_diacritics(name)
    name = normalize_arabic(name)
    return name.strip()


def main():
    print("=" * 60)
    print("  Diwan Import Preparation")
    print("=" * 60)

    # ------------------------------------------------------------------
    # Step 1: Load diwan poems from scores
    # ------------------------------------------------------------------
    scores = pd.read_parquet(DATA_DIR / "scores_final_v8.parquet")
    df = scores[scores["poem_id"].str.startswith("diwan_")].copy()
    print(f"\n[1] Loaded {len(df)} diwan poems from scores_final_v8.parquet")

    # ------------------------------------------------------------------
    # Step 2: Fix "_" poet names from raw CSV
    # ------------------------------------------------------------------
    raw = pd.read_csv(DATA_DIR / "diwan_raw.csv", encoding="utf-16", sep="\t")
    raw = raw.rename(columns={"poet_name": "raw_poet_name"})

    # Build numeric id column for joining
    df["_num_id"] = df["poem_id"].str.replace("diwan_", "", regex=False).astype(int)
    raw_lookup = raw[["poem_id", "raw_poet_name", "poet_era", "them", "main_meter"]].copy()
    raw_lookup = raw_lookup.rename(columns={"poem_id": "_num_id"})

    df = df.merge(raw_lookup, on="_num_id", how="left")

    # Replace underscore poet names with raw poet names
    mask_underscore = df["poet_name"] == "_"
    n_underscore = mask_underscore.sum()
    recovered = mask_underscore & df["raw_poet_name"].notna() & (df["raw_poet_name"] != "_")
    df.loc[recovered, "poet_name"] = df.loc[recovered, "raw_poet_name"]
    n_recovered = recovered.sum()

    # Remaining underscores or empty -> anonymous
    still_bad = (df["poet_name"] == "_") | df["poet_name"].isna() | (df["poet_name"].str.strip() == "")
    df.loc[still_bad, "poet_name"] = ANONYMOUS
    n_anonymous = still_bad.sum()

    print(f"[2] Underscore poets: {n_underscore} | recovered: {n_recovered} | set anonymous: {n_anonymous}")

    # ------------------------------------------------------------------
    # Step 3 & 4: Normalize and dedup poet names
    # ------------------------------------------------------------------
    df["poet_name"] = df["poet_name"].apply(_normalize_poet)

    # Apply dedup map
    df["poet_name"] = df["poet_name"].replace(POET_DEDUP_MAP)

    unique_poets = df["poet_name"].nunique()
    print(f"[3] Normalized poet names. Unique poets: {unique_poets}")

    # ------------------------------------------------------------------
    # Step 5: Join metadata from diwan_processed.parquet
    # ------------------------------------------------------------------
    dp = pd.read_parquet(DATA_DIR / "diwan_processed.parquet")
    meta = dp[["poem_id", "theme", "meter", "poem_form"]].copy()
    meta = meta.rename(columns={
        "theme": "dp_theme",
        "meter": "dp_meter",
        "poem_form": "dp_poem_form",
    })
    df = df.merge(meta, on="poem_id", how="left")
    print(f"[5] Joined metadata from diwan_processed.parquet")

    # ------------------------------------------------------------------
    # Step 6: Resolve themes
    # ------------------------------------------------------------------
    # Start with diwan_processed theme (text)
    df["theme"] = df["dp_theme"].fillna("")

    # For empty themes, try raw CSV numeric code
    empty_theme_mask = df["theme"] == ""
    raw_theme_available = empty_theme_mask & df["them"].notna() & (df["them"] != 0)
    df.loc[raw_theme_available, "theme"] = df.loc[raw_theme_available, "them"].astype(int).map(THEME_MAP)

    # Apply normalization map
    df["theme"] = df["theme"].fillna("").replace(THEME_NORM_MAP)

    # Remaining empty -> unclassified
    df.loc[df["theme"] == "", "theme"] = "غير مصنف"

    theme_dist = df["theme"].value_counts()
    print(f"[6] Resolved themes. Distribution:")
    for t, c in theme_dist.head(10).items():
        print(f"     {t}: {c}")
    if len(theme_dist) > 10:
        print(f"     ... and {len(theme_dist) - 10} more")

    # ------------------------------------------------------------------
    # Step 7: Resolve meters
    # ------------------------------------------------------------------
    df["meter"] = df["dp_meter"].fillna("")

    # For empty meters, try raw CSV numeric code
    empty_meter_mask = df["meter"] == ""
    raw_meter_available = empty_meter_mask & df["main_meter"].notna() & (df["main_meter"] != 0)
    df.loc[raw_meter_available, "meter"] = df.loc[raw_meter_available, "main_meter"].astype(int).map(METER_MAP)

    # Fill remaining
    df["meter"] = df["meter"].fillna("غير مصنف")
    df.loc[df["meter"] == "", "meter"] = "غير مصنف"

    meter_dist = df["meter"].value_counts()
    print(f"[7] Resolved meters. Distribution:")
    for m, c in meter_dist.head(10).items():
        print(f"     {m}: {c}")

    # ------------------------------------------------------------------
    # Step 8: Map era codes
    # ------------------------------------------------------------------
    df["era_id"] = df["poet_era"].fillna(0).astype(int).map(DIWAN_ERA_MAP).fillna(3).astype(int)

    era_dist = df["era_id"].value_counts().sort_index()
    print(f"[8] Mapped era codes. Distribution:")
    for e, c in era_dist.items():
        print(f"     era_id {e}: {c}")

    # ------------------------------------------------------------------
    # Step 9: Build quality_subscores JSONB
    # ------------------------------------------------------------------
    def build_subscores(row):
        return json.dumps(
            {dim: int(row[dim]) for dim in SCORE_DIMENSIONS},
            ensure_ascii=False,
        )

    df["quality_subscores"] = df.apply(build_subscores, axis=1)
    print(f"[9] Built quality_subscores for {len(df)} poems")

    # ------------------------------------------------------------------
    # Step 10: Set diacritized_content
    # ------------------------------------------------------------------
    df["diacritized_content"] = df["content"]
    print(f"[10] Set diacritized_content = content")

    # ------------------------------------------------------------------
    # Step 11: Validate
    # ------------------------------------------------------------------
    required = ["title", "content", "poet_name", "theme", "meter", "quality_score", "diacritized_content"]
    errors = []

    for col in required:
        nulls = df[col].isna().sum()
        empties = (df[col].astype(str).str.strip() == "").sum()
        if nulls > 0 or empties > 0:
            errors.append(f"  {col}: {nulls} nulls, {empties} empties")

    # Validate JSON
    bad_json = 0
    for val in df["quality_subscores"]:
        try:
            parsed = json.loads(val)
            assert all(d in parsed for d in SCORE_DIMENSIONS)
        except (json.JSONDecodeError, AssertionError):
            bad_json += 1
    if bad_json > 0:
        errors.append(f"  quality_subscores: {bad_json} invalid JSON")

    # Validate line count (>= 4 verse lines)
    from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import count_lines

    short_poems = (df["content"].apply(count_lines) < 4).sum()
    if short_poems > 0:
        print(f"  WARNING: {short_poems} poems have < 4 verse lines (keeping them -- already scored)")

    if errors:
        print(f"\n[11] VALIDATION ERRORS:")
        for e in errors:
            print(e)
        sys.exit(1)
    else:
        print(f"[11] Validation passed: all required fields present, all JSON valid")

    # ------------------------------------------------------------------
    # Step 12: Output
    # ------------------------------------------------------------------
    output_cols = [
        "poem_id", "title", "content", "poet_name", "theme", "meter",
        "era_id", "quality_score", "quality_subscores", "diacritized_content",
        "dp_poem_form",
    ]
    out = df[output_cols].copy()
    out = out.rename(columns={"dp_poem_form": "poem_form"})

    # Map poem_form: 0 -> unset (classical default), 1 -> عمودي, 2 -> حر
    poem_form_map = {0: "عمودي", 1: "عمودي", 2: "حر"}
    out["poem_form"] = out["poem_form"].fillna(0).astype(int).map(poem_form_map).fillna("عمودي")

    out_path = DATA_DIR / "diwan_import_ready.parquet"
    out.to_parquet(out_path, index=False)

    print(f"\n{'=' * 60}")
    print(f"  OUTPUT: {out_path}")
    print(f"  Total poems: {len(out)}")
    print(f"  Unique poets: {out['poet_name'].nunique()}")
    print(f"  Unique themes: {out['theme'].nunique()}")
    print(f"  Unique meters: {out['meter'].nunique()}")
    print(f"  Era distribution: {out['era_id'].value_counts().sort_index().to_dict()}")
    print(f"  Poem form distribution: {out['poem_form'].value_counts().to_dict()}")
    print(f"  Quality score range: {out['quality_score'].min()} - {out['quality_score'].max()}")
    print(f"  Quality score mean: {out['quality_score'].mean():.1f}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
