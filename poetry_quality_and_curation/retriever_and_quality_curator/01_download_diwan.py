#!/usr/bin/env python3
"""Download, parse, and pre-filter the NoorBayan/Diwan Arabic poetry dataset.

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.01_download_diwan [--output PATH] [--skip-db-dedup] [--force]

The Diwan dataset (~400k poems) is distributed as a RAR/CSV archive.
This script downloads the dataset, parses the TSV, applies quality filters,
and saves the result as a Parquet file for downstream scoring.

Source: https://github.com/NoorBayan/Diwan
Zenodo: https://doi.org/10.5281/zenodo.14648391
"""

import argparse
import os
import sys
import tempfile
import urllib.request
from pathlib import Path

import pandas as pd

from poetry_quality_and_curation.retriever_and_quality_curator.config import (
    DATA_DIR,
    METER_MAP,
    POEM_FORM_MAP,
    THEME_MAP,
)
from poetry_quality_and_curation.retriever_and_quality_curator.arabic_utils import (
    compute_text_hash,
    count_lines,
    detect_repeated_lines,
    is_arabic_text,
)

# ── Download URLs (ordered by preference) ─────────────────────────
# The dataset is ~200MB+ and hosted on Google Drive / Zenodo.
# GitHub raw won't work for files this large.
ZENODO_RECORD_ID = "14648391"
ZENODO_URL = f"https://zenodo.org/records/{ZENODO_RECORD_ID}/files/Diwan.csv"
GDRIVE_FILE_ID = "1V99jHjOM-tfsDJwesBPzhkksZ7XJ91mU"
GDRIVE_URL = f"https://drive.google.com/uc?export=download&id={GDRIVE_FILE_ID}"

CACHED_FILENAME = "diwan_raw.csv"


def download_dataset(cache_dir: Path, force: bool = False) -> Path:
    """Download the Diwan dataset CSV, caching locally.

    Tries Zenodo first, then Google Drive. Returns path to local CSV.
    """
    cached_path = cache_dir / CACHED_FILENAME

    if cached_path.exists() and not force:
        size_mb = cached_path.stat().st_size / (1024 * 1024)
        print(f"[cache] Using cached file: {cached_path} ({size_mb:.1f} MB)")
        return cached_path

    cache_dir.mkdir(parents=True, exist_ok=True)

    # Try Zenodo first
    print(f"[download] Attempting Zenodo: {ZENODO_URL}")
    try:
        _download_with_progress(ZENODO_URL, cached_path)
        if cached_path.exists() and cached_path.stat().st_size > 1_000_000:
            print(f"[download] Success from Zenodo ({cached_path.stat().st_size / (1024*1024):.1f} MB)")
            return cached_path
    except Exception as e:
        print(f"[download] Zenodo failed: {e}")

    # Try Google Drive
    print(f"[download] Attempting Google Drive...")
    try:
        _download_gdrive(GDRIVE_FILE_ID, cached_path)
        if cached_path.exists() and cached_path.stat().st_size > 1_000_000:
            print(f"[download] Success from Google Drive ({cached_path.stat().st_size / (1024*1024):.1f} MB)")
            return cached_path
    except Exception as e:
        print(f"[download] Google Drive failed: {e}")

    # Manual instructions
    if not cached_path.exists() or cached_path.stat().st_size < 1_000_000:
        print("\n" + "=" * 70)
        print("AUTOMATIC DOWNLOAD FAILED")
        print("=" * 70)
        print("Please download the Diwan dataset manually:")
        print(f"  1. Visit: https://doi.org/10.5281/zenodo.{ZENODO_RECORD_ID}")
        print(f"  2. Or: https://drive.google.com/file/d/{GDRIVE_FILE_ID}/view")
        print(f"  3. Save the CSV file as: {cached_path}")
        print(f"  4. If the file is a RAR archive, extract Diwan.csv from it")
        print("  5. Re-run this script")
        print("=" * 70)
        sys.exit(1)

    return cached_path


def _download_with_progress(url: str, dest: Path) -> None:
    """Download a file with progress reporting."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as response:
        total = int(response.headers.get("Content-Length", 0))
        downloaded = 0
        chunk_size = 1024 * 1024  # 1MB chunks

        with open(dest, "wb") as f:
            while True:
                chunk = response.read(chunk_size)
                if not chunk:
                    break
                f.write(chunk)
                downloaded += len(chunk)
                if total > 0:
                    pct = (downloaded / total) * 100
                    print(f"\r[download] {downloaded / (1024*1024):.1f} / {total / (1024*1024):.1f} MB ({pct:.0f}%)", end="", flush=True)
                else:
                    print(f"\r[download] {downloaded / (1024*1024):.1f} MB", end="", flush=True)
        print()  # newline after progress


def _download_gdrive(file_id: str, dest: Path) -> None:
    """Download a file from Google Drive, handling the confirmation page for large files."""
    import http.cookiejar

    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))

    # First request to get the confirmation token
    url = f"https://drive.google.com/uc?export=download&id={file_id}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    response = opener.open(req, timeout=120)
    content_type = response.headers.get("Content-Type", "")

    if "text/html" in content_type:
        # Large file: need confirmation token
        html = response.read().decode("utf-8", errors="ignore")
        # Look for confirm token in the HTML
        import re
        match = re.search(r'confirm=([0-9A-Za-z_-]+)', html)
        if match:
            confirm_token = match.group(1)
            confirm_url = f"{url}&confirm={confirm_token}"
        else:
            # Try the UUID-based confirmation
            match = re.search(r'id="download-form" action="(.+?)"', html)
            if match:
                confirm_url = match.group(1).replace("&amp;", "&")
            else:
                # Try direct download with confirm=t
                confirm_url = f"{url}&confirm=t"

        req = urllib.request.Request(confirm_url, headers={"User-Agent": "Mozilla/5.0"})
        response = opener.open(req, timeout=300)

    total = int(response.headers.get("Content-Length", 0))
    downloaded = 0
    chunk_size = 1024 * 1024

    with open(dest, "wb") as f:
        while True:
            chunk = response.read(chunk_size)
            if not chunk:
                break
            f.write(chunk)
            downloaded += len(chunk)
            if total > 0:
                pct = (downloaded / total) * 100
                print(f"\r[download] {downloaded / (1024*1024):.1f} / {total / (1024*1024):.1f} MB ({pct:.0f}%)", end="", flush=True)
            else:
                print(f"\r[download] {downloaded / (1024*1024):.1f} MB", end="", flush=True)
    print()


def read_diwan_csv(path: Path) -> pd.DataFrame:
    """Read the Diwan CSV/TSV file, handling encoding variants.

    The original Diwan dataset uses UTF-16 encoding with tab separators.
    Some mirrors may use UTF-8.
    """
    # Try UTF-16 first (original format)
    for encoding in ["utf-16", "utf-8", "utf-8-sig", "cp1256"]:
        try:
            df = pd.read_csv(path, sep="\t", encoding=encoding, on_bad_lines="skip")
            if len(df) > 100 and len(df.columns) > 5:
                print(f"[parse] Read {len(df):,} rows with encoding={encoding}, {len(df.columns)} columns")
                print(f"[parse] Columns: {list(df.columns)}")
                return df
        except (UnicodeDecodeError, UnicodeError, pd.errors.ParserError):
            continue

    raise ValueError(f"Could not parse {path} with any known encoding")


def map_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Map Diwan column names and numeric codes to our schema.

    Diwan columns (from diwan.py):
    - poem_form (1=classical, 2=modern)
    - main_meter (numeric -> Arabic meter name)
    - them (numeric -> Arabic theme name)
    - poet_name / poet (poet name)
    - poem / content (poem text with * delimiters)
    - poem_genre, language_type, writing_style, etc.
    """
    # Identify the poem text column
    text_col = None
    for candidate in ["poem", "content", "text", "verses", "poem_text"]:
        if candidate in df.columns:
            text_col = candidate
            break
    if text_col is None:
        # Take the column with the longest average string length
        str_cols = df.select_dtypes(include=["object"]).columns
        if len(str_cols) > 0:
            avg_lens = {col: df[col].astype(str).str.len().mean() for col in str_cols}
            text_col = max(avg_lens, key=avg_lens.get)
            print(f"[map] Inferred text column: '{text_col}' (avg len {avg_lens[text_col]:.0f})")
        else:
            raise ValueError("Cannot identify poem text column")

    # Identify poet name column
    poet_col = None
    for candidate in ["poet_name", "poet", "author", "name"]:
        if candidate in df.columns:
            poet_col = candidate
            break

    # Identify title column
    title_col = None
    for candidate in ["title", "poem_title", "name"]:
        if candidate in df.columns and candidate != poet_col:
            title_col = candidate
            break

    # Build output DataFrame
    result = pd.DataFrame()
    result["poem_id"] = [f"diwan_{i}" for i in range(len(df))]

    # Title (may not exist in Diwan)
    if title_col:
        result["title"] = df[title_col].fillna("").astype(str)
    else:
        result["title"] = ""

    # Content
    result["content"] = df[text_col].fillna("").astype(str)

    # Poet name
    if poet_col:
        result["poet_name"] = df[poet_col].fillna("").astype(str)
    else:
        result["poet_name"] = ""

    # Meter: map numeric code to Arabic name
    if "main_meter" in df.columns:
        result["meter"] = df["main_meter"].map(METER_MAP).fillna("")
    elif "meter" in df.columns:
        # Already text
        result["meter"] = df["meter"].fillna("").astype(str)
    else:
        result["meter"] = ""

    # Theme: map numeric code to Arabic name
    if "them" in df.columns:
        result["theme"] = df["them"].map(THEME_MAP).fillna("")
    elif "theme" in df.columns:
        result["theme"] = df["theme"].fillna("").astype(str)
    else:
        result["theme"] = ""

    # Poem form: keep as integer (1=classical, 2=modern) for downstream classification
    if "poem_form" in df.columns:
        result["poem_form"] = pd.to_numeric(df["poem_form"], errors="coerce")
    else:
        result["poem_form"] = None

    result["source_dataset"] = "diwan"

    print(f"[map] Mapped {len(result):,} poems")
    return result


def prefilter(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Apply quality pre-filters. Returns filtered DataFrame and removal stats."""
    stats = {"input": len(df)}

    # Filter 1: Non-Arabic text
    mask_arabic = df["content"].apply(is_arabic_text)
    removed_non_arabic = (~mask_arabic).sum()
    df = df[mask_arabic].copy()
    stats["removed_non_arabic"] = int(removed_non_arabic)

    # Filter 2: Fragments < 4 lines
    line_counts = df["content"].apply(count_lines)
    mask_short = line_counts >= 4
    removed_short = (~mask_short).sum()
    df = df[mask_short].copy()
    stats["removed_short"] = int(removed_short)

    # Filter 3: Poems > 60 lines
    line_counts = df["content"].apply(count_lines)
    mask_long = line_counts <= 60
    removed_long = (~mask_long).sum()
    df = df[mask_long].copy()
    stats["removed_long"] = int(removed_long)

    # Filter 4: Repeated lines (> 30%)
    mask_repeated = ~df["content"].apply(detect_repeated_lines)
    removed_repeated = (~mask_repeated).sum()
    df = df[mask_repeated].copy()
    stats["removed_repeated"] = int(removed_repeated)

    # Filter 5: Deduplicate within Diwan by content hash
    df["content_hash"] = df["content"].apply(compute_text_hash)
    before_dedup = len(df)
    df = df.drop_duplicates(subset=["content_hash"], keep="first").copy()
    stats["removed_duplicate"] = before_dedup - len(df)

    stats["after_prefilter"] = len(df)
    return df, stats


def dedup_against_db(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove poems whose content hash already exists in the database.

    Requires DATABASE_URL environment variable.
    Returns filtered DataFrame and count of removed duplicates.
    """
    from poetry_quality_and_curation.retriever_and_quality_curator.config import get_db_connection

    print("[db-dedup] Connecting to database...")
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        # Get existing content hashes from the poems table
        # Assumes a content_hash column exists; fall back to computing from content
        try:
            cur.execute("SELECT content_hash FROM poems WHERE content_hash IS NOT NULL")
            db_hashes = {row[0] for row in cur.fetchall()}
            print(f"[db-dedup] Found {len(db_hashes):,} hashes in database")
        except Exception:
            conn.rollback()
            # Compute hashes from poem content
            print("[db-dedup] No content_hash column; computing from content...")
            cur.execute("SELECT content FROM poems")
            db_hashes = set()
            for (content,) in cur.fetchall():
                if content:
                    db_hashes.add(compute_text_hash(content))
            print(f"[db-dedup] Computed {len(db_hashes):,} hashes from database content")

        before = len(df)
        df = df[~df["content_hash"].isin(db_hashes)].copy()
        removed = before - len(df)
        print(f"[db-dedup] Removed {removed:,} duplicates found in database")
        return df, removed
    finally:
        conn.close()


def print_summary(stats: dict, db_dedup_count: int = 0) -> None:
    """Print a summary of filtering results."""
    print("\n" + "=" * 60)
    print("DIWAN PREPROCESSING SUMMARY")
    print("=" * 60)
    print(f"  Input poems:              {stats['input']:>8,}")
    print(f"  Removed (non-Arabic):     {stats['removed_non_arabic']:>8,}")
    print(f"  Removed (< 4 lines):      {stats['removed_short']:>8,}")
    print(f"  Removed (> 60 lines):     {stats['removed_long']:>8,}")
    print(f"  Removed (repeated lines): {stats['removed_repeated']:>8,}")
    print(f"  Removed (duplicates):     {stats['removed_duplicate']:>8,}")
    if db_dedup_count > 0:
        print(f"  Removed (in database):    {db_dedup_count:>8,}")
    total_removed = (
        stats["removed_non_arabic"]
        + stats["removed_short"]
        + stats["removed_long"]
        + stats["removed_repeated"]
        + stats["removed_duplicate"]
        + db_dedup_count
    )
    final = stats["input"] - total_removed
    print(f"  {'─' * 36}")
    print(f"  Final output:             {final:>8,}")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Download and preprocess the NoorBayan/Diwan Arabic poetry dataset."
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DATA_DIR / "diwan_processed.parquet",
        help="Output Parquet file path (default: poetry_quality_and_curation/retriever_and_quality_curator/data/diwan_processed.parquet)",
    )
    parser.add_argument(
        "--skip-db-dedup",
        action="store_true",
        help="Skip deduplication against the existing database",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Force re-download even if cached file exists",
    )
    args = parser.parse_args()

    # Step 1: Download
    print("[step 1/4] Downloading Diwan dataset...")
    csv_path = download_dataset(DATA_DIR, force=args.force)

    # Step 2: Parse
    print("\n[step 2/4] Parsing dataset...")
    raw_df = read_diwan_csv(csv_path)
    df = map_columns(raw_df)

    # Step 3: Pre-filter
    print("\n[step 3/4] Applying quality filters...")
    df, stats = prefilter(df)

    # Step 4: Database deduplication
    db_dedup_count = 0
    if not args.skip_db_dedup and os.environ.get("DATABASE_URL"):
        print("\n[step 4/4] Deduplicating against database...")
        df, db_dedup_count = dedup_against_db(df)
    elif not args.skip_db_dedup:
        print("\n[step 4/4] Skipping DB dedup (DATABASE_URL not set)")
    else:
        print("\n[step 4/4] Skipping DB dedup (--skip-db-dedup)")

    # Save output
    args.output.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(args.output, index=False, engine="pyarrow")
    size_mb = args.output.stat().st_size / (1024 * 1024)
    print(f"\n[save] Written to {args.output} ({size_mb:.1f} MB)")

    # Summary
    print_summary(stats, db_dedup_count)


if __name__ == "__main__":
    main()
