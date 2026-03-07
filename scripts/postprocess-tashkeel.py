#!/usr/bin/env python3
"""Post-process diacritized poems to fix known Mishkal issues.

Applies built-in fixes and extensible learned rules to improve tashkeel quality.
Each rule runs as a separate pass with progress output and checkpoint saves.
Re-runnable: running again after adding new rules applies only new fixes.

Usage:
    python scripts/postprocess-tashkeel.py
    python scripts/postprocess-tashkeel.py --input poems_diacritized_complete.parquet
    python scripts/postprocess-tashkeel.py --dry-run
    python scripts/postprocess-tashkeel.py --workers 4  # parallel line-ending fix
"""
import json
import re
import sys
import time
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

try:
    import pandas as pd
except ImportError:
    print("Error: pandas not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

try:
    import pyarabic.araby as araby
except ImportError:
    print("Error: pyarabic not installed. Run: pip install -r scripts/requirements-diacritize.txt")
    sys.exit(1)

DATA_DIR = Path(__file__).parent / "diacritize-data"
DEFAULT_INPUT = DATA_DIR / "poems_diacritized_complete.parquet"
DEFAULT_OUTPUT = DATA_DIR / "poems_diacritized_final.parquet"
CHECKPOINT_DIR = DATA_DIR / "postprocess-checkpoints"
FIX_LOG = DATA_DIR / "postprocess-log.json"

# Arabic constants
TASHKEEL_PATTERN = re.compile("[\u064B-\u0652]")
DUPLICATE_MARKS = re.compile(r"([\u064B-\u0652])\1+")
ARABIC_LETTER = re.compile("[\u0621-\u064A]")
TASHKEEL_CHARS = "\u064B\u064C\u064D\u064E\u064F\u0650\u0651\u0652"
HEMISTICH_SEP = "*"


# ── Progress bar ─────────────────────────────────────────────────────

def progress_bar(current, total, prefix="", width=40):
    pct = current / total if total > 0 else 0
    filled = int(width * pct)
    bar = "█" * filled + "░" * (width - filled)
    sys.stdout.write(f"\r  {prefix} |{bar}| {current}/{total} ({pct*100:.1f}%)")
    sys.stdout.flush()
    if current == total:
        print()


# ── Built-in fixes ───────────────────────────────────────────────────

def fix_normalize_whitespace(text):
    """Strip and collapse double spaces."""
    text = text.strip()
    text = re.sub(r"  +", " ", text)
    return text


def fix_deduplicate_marks(text):
    """Remove consecutive duplicate tashkeel marks."""
    return DUPLICATE_MARKS.sub(r"\1", text)


def _find_unmarked_endings(poem_text):
    """Extract last words from hemistichs that lack ending tashkeel.
    Returns list of (line_idx, part_idx, last_word) tuples."""
    unmarked = []
    lines = poem_text.split("\n")
    for li, line in enumerate(lines):
        parts = line.split(HEMISTICH_SEP)
        for pi, part in enumerate(parts):
            stripped_part = part.strip()
            if not stripped_part:
                continue
            # Find last Arabic letter
            last_letter_idx = -1
            for i in range(len(stripped_part) - 1, -1, -1):
                if ARABIC_LETTER.match(stripped_part[i]):
                    last_letter_idx = i
                    break
            if last_letter_idx == -1:
                continue
            # Check if already marked
            has_mark = False
            if (last_letter_idx + 1 < len(stripped_part)
                    and stripped_part[last_letter_idx + 1] in TASHKEEL_CHARS):
                has_mark = True
            if (last_letter_idx + 2 < len(stripped_part)
                    and stripped_part[last_letter_idx + 1] == "\u0651"
                    and stripped_part[last_letter_idx + 2] in TASHKEEL_CHARS):
                has_mark = True
            if has_mark:
                continue
            # Extract last word
            bare = araby.strip_tashkeel(stripped_part)
            words = bare.split()
            if words and ARABIC_LETTER.search(words[-1]):
                unmarked.append((li, pi, words[-1]))
    return unmarked


def _worker_init_postprocess():
    """Each worker creates its own Mishkal instance."""
    import mishkal.tashkeel
    global _pp_vocalizer
    _pp_vocalizer = mishkal.tashkeel.TashkeelClass()
    _pp_vocalizer.set_limit(100000)


def _diacritize_word(word):
    """Diacritize a single word and extract ending marks."""
    try:
        result = _pp_vocalizer.tashkeel(word).strip()
        if not result:
            return word, ""
        end_marks = ""
        for ch in reversed(result):
            if ch in TASHKEEL_CHARS:
                end_marks = ch + end_marks
            else:
                break
        return word, end_marks
    except Exception:
        return word, ""


def fix_line_ending_tashkeel_parallel(df, workers=4):
    """Fix unmarked hemistich endings using parallel Mishkal workers.

    Instead of processing poem-by-poem (slow), this:
    1. Extracts all unique unmarked last-words across all poems
    2. Diacritizes them in parallel via ProcessPoolExecutor
    3. Applies the results back to the poems
    """
    print("  Phase 1: Scanning for unmarked hemistich endings...")
    # Collect all unmarked endings and build a word -> mark lookup
    unique_words = set()
    poem_endings = {}  # poem_idx -> [(line_idx, part_idx, last_word)]

    total = len(df)
    for idx in range(total):
        text = df.iloc[idx]["diacritized_content"]
        endings = _find_unmarked_endings(text)
        if endings:
            poem_endings[idx] = endings
            for _, _, word in endings:
                unique_words.add(word)
        if (idx + 1) % 5000 == 0 or idx + 1 == total:
            progress_bar(idx + 1, total, "Scanning")

    print(f"  Found {len(unique_words)} unique unmarked words across "
          f"{len(poem_endings)} poems")

    if not unique_words:
        return df, 0

    # Phase 2: Diacritize unique words in parallel
    print(f"  Phase 2: Diacritizing {len(unique_words)} unique words with {workers} workers...")
    word_marks = {}
    words_list = list(unique_words)
    completed = 0

    with ProcessPoolExecutor(max_workers=workers, initializer=_worker_init_postprocess) as pool:
        futures = {pool.submit(_diacritize_word, w): w for w in words_list}
        for future in as_completed(futures):
            word, marks = future.result()
            if marks:
                word_marks[word] = marks
            completed += 1
            if completed % 500 == 0 or completed == len(words_list):
                progress_bar(completed, len(words_list), "Diacritizing")

    print(f"  Got marks for {len(word_marks)}/{len(unique_words)} words")

    # Phase 3: Apply marks back to poems
    print("  Phase 3: Applying fixes...")
    fix_count = 0
    poem_idxs = list(poem_endings.keys())
    for progress_i, idx in enumerate(poem_idxs):
        text = df.iloc[idx]["diacritized_content"]
        lines = text.split("\n")
        changed = False

        for li, pi, last_word in poem_endings[idx]:
            marks = word_marks.get(last_word)
            if not marks:
                continue
            parts = lines[li].split(HEMISTICH_SEP)
            if pi >= len(parts):
                continue
            part = parts[pi]
            stripped_part = part.strip()
            # Find last Arabic letter again
            last_letter_idx = -1
            for i in range(len(stripped_part) - 1, -1, -1):
                if ARABIC_LETTER.match(stripped_part[i]):
                    last_letter_idx = i
                    break
            if last_letter_idx == -1:
                continue
            # Insert marks
            new_part = (stripped_part[:last_letter_idx + 1]
                       + marks
                       + stripped_part[last_letter_idx + 1:])
            leading = len(part) - len(part.lstrip())
            new_part = part[:leading] + new_part
            parts[pi] = new_part
            lines[li] = HEMISTICH_SEP.join(parts)
            changed = True

        if changed:
            df.at[df.index[idx], "diacritized_content"] = "\n".join(lines)
            fix_count += 1

        if (progress_i + 1) % 5000 == 0 or progress_i + 1 == len(poem_idxs):
            progress_bar(progress_i + 1, len(poem_idxs), "Applying")

    return df, fix_count


# ── Rule registry ────────────────────────────────────────────────────

# Simple rules (applied per-poem, fast)
SIMPLE_RULES = [
    {
        "name": "normalize_whitespace",
        "description": "Strip and collapse double spaces",
        "apply": fix_normalize_whitespace,
    },
    {
        "name": "deduplicate_marks",
        "description": "Remove consecutive duplicate tashkeel marks",
        "apply": fix_deduplicate_marks,
    },
]

# ── Learned rule functions (arabic-review-agent) ────────────────────

def fix_impossible_hamza_sukun(text):
    """Remove impossible kasra+sukun on hamza letters (إِْ -> إِ, أَْ -> أَ).

    Mishkal produces إِْذَا, إِْنَّ, أَْنَّ etc. where a sukun follows a short
    vowel on a hamza-bearing letter.  This is phonologically impossible.
    Detected in 22.1% of poems (113 occurrences across 45/204 poems).
    """
    # إ with kasra then sukun
    text = text.replace("\u0625\u0650\u0652", "\u0625\u0650")
    # أ with fatha then sukun
    text = text.replace("\u0623\u064E\u0652", "\u0623\u064E")
    return text


# Precompile regex for function-word spurious shadda
_FUNC_WORD_SHADDA_MAP = {
    # على: remove shadda on lam (عَلَّى -> عَلَى, عَلَّيْ -> عَلَيْ)
    re.compile(r"\bعَلَّ([ىي])"): r"عَلَ\1",
    # لم: remove shadda on meem when standalone (لَمَّ + space -> لَمْ + space)
    re.compile(r"\bلَمَّ(\s)"): r"لَمْ\1",
    # قد: remove shadda on dal (قَدٍّ, قَدِّ, قَدَّ, قُدَّ etc.)
    re.compile(r"\b(قَ|قُ)دّ"): r"\1دْ",
    # كما: remove shadda/tanween on meem (كَمَّا, كَمًّا -> كَمَا)
    re.compile(r"\bكَمَّا"): "كَمَا",
    re.compile(r"\bكَمًّا"): "كَمَا",
    # حين: remove shadda (حَيَّنَ, حَيِّنَّ, حِيَنَّ -> حِينَ)
    re.compile(r"\bحَيَّنَ"): "حِينَ",
    re.compile(r"\bحَيِّنَّ"): "حِينَ",
    re.compile(r"\bحِيَنَّ"): "حِينَ",
}


def fix_spurious_shadda_function_words(text):
    """Remove spurious shadda from common function words.

    Mishkal adds shadda to function words that should never have it:
    على (11.9% of occurrences), لم (9.6%), قد (9.8%), كما (12.8%), حين (20%).
    Detected in 14.2% of poems (29/204).
    """
    for pattern, replacement in _FUNC_WORD_SHADDA_MAP.items():
        text = pattern.sub(replacement, text)
    return text


# Regex for ya-possessive nisba corruption
# In Mishkal output, the order is often ya + vowel/tanween + shadda (not ya + shadda + vowel)
# So we match: ي + optional vowel/tanween + shadda + optional trailing marks
_YA_NISBA_RE = re.compile(
    r"([\u0621-\u064A][\u064B-\u0652]*"              # at least one Arabic letter + marks
    r"(?:[\u0621-\u064A][\u064B-\u0652]*)*)"          # more letters + marks (greedy, captures word)
    r"(\u064A)"                                        # ya
    r"([\u064B-\u0650]?)"                              # optional vowel/tanween BEFORE shadda
    r"\u0651"                                          # shadda
    r"([\u064B-\u0650]*)"                              # optional trailing marks
    r"(?=\s|$|\*)"                                     # word boundary
)

# Words where ya+shadda is LEGITIMATE (nisba adjectives, proper names, etc.)
_LEGITIMATE_YA_SHADDA = {
    "النبي", "نبي", "حي", "الحي", "ربي", "الزكي",
    "عربي", "أعرابي", "قوي", "الصبي", "صبي",
    "نبوي", "دنيوي", "سماوي", "علي",
}


def fix_ya_possessive_nisba(text):
    """Fix possessive ya corrupted to nisba (doubled ya with shadda).

    Mishkal converts first-person possessive ي to يّ (with shadda and often
    tanween).  Examples: قَلْبِيٌّ -> قَلْبِي, مِنِّيُّ -> مِنِّي.
    Detected in 55.4% of poems (113/204), ~493 word occurrences.
    """
    def _replace_ya(match):
        full = match.group(0)
        # Check the bare form against legitimacy list
        bare = TASHKEEL_PATTERN.sub("", full)
        if bare in _LEGITIMATE_YA_SHADDA:
            return full
        # Remove shadda from ya and strip trailing tanween/vowels added by corruption
        word_part = match.group(1)   # everything before ya
        return word_part + "\u064A"  # word + ya (no shadda, no tanween)

    return _YA_NISBA_RE.sub(_replace_ya, text)


def fix_alif_lam_article(text):
    """Fix corrupted alif-lam article (اُلْ -> الْ).

    Mishkal sometimes produces اُلْ (with damma on alef and sukun on lam)
    instead of the proper definite article.  Example: واُلْصُفَا -> والصُّفَا.
    Detected in 5 poems, 20 occurrences.
    """
    # Replace اُلْ with الْ
    text = text.replace("\u0627\u064F\u0644\u0652", "\u0627\u0644\u0652")
    return text


# Sun letters for assimilation
_SUN_LETTERS = set("تثدذرزسشصضطظنل")
_SUN_ASSIMILATION_RE = re.compile(
    r"\u0627\u0644\u0652"   # alif + lam + sukun
    r"([\u062A\u062B\u062F\u0630\u0631\u0632\u0633\u0634\u0635\u0636\u0637\u0638\u0646\u0644])"
    r"(?!\u0651)"           # NOT already followed by shadda
)


def fix_sun_letter_assimilation(text):
    """Add missing shadda for sun letter assimilation (idgham shamsi).

    When ال is followed by a sun letter, the lam assimilates and the sun letter
    should carry shadda.  Mishkal sometimes leaves الْ + sun letter without
    shadda.  Detected: 231 missing out of 1571 sun-letter article occurrences.
    """
    # Use a lambda to build the replacement with actual Unicode chars
    return _SUN_ASSIMILATION_RE.sub(
        lambda m: "\u0627\u0644" + m.group(1) + "\u0651",
        text
    )


# Learned rules (populated by Arabic quality review agent)
LEARNED_RULES = [
    {
        "name": "impossible_hamza_sukun",
        "description": "Remove impossible kasra+sukun combo on hamza (إِْ->إِ). Affects 22% of poems.",
        "apply": fix_impossible_hamza_sukun,
        "source": "arabic-review-agent",
        "confidence": 0.95,
    },
    {
        "name": "spurious_shadda_function_words",
        "description": "Remove spurious shadda from على, لم, قد, كما, حين. Affects 14% of poems.",
        "apply": fix_spurious_shadda_function_words,
        "source": "arabic-review-agent",
        "confidence": 0.90,
    },
    {
        "name": "ya_possessive_nisba",
        "description": "Fix possessive ya corrupted to nisba (قَلْبِيٌّ->قَلْبِي). Affects 55% of poems.",
        "apply": fix_ya_possessive_nisba,
        "source": "arabic-review-agent",
        "confidence": 0.85,
    },
    {
        "name": "alif_lam_article",
        "description": "Fix corrupted alif-lam article (اُلْ->الْ). Affects ~5 poems.",
        "apply": fix_alif_lam_article,
        "source": "arabic-review-agent",
        "confidence": 0.92,
    },
    {
        "name": "sun_letter_assimilation",
        "description": "Add missing shadda for sun letter assimilation. 231 missing instances.",
        "apply": fix_sun_letter_assimilation,
        "source": "arabic-review-agent",
        "confidence": 0.88,
    },
]


# ── Main post-processing logic ───────────────────────────────────────

def postprocess(input_path, output_path, dry_run=False, workers=4):
    """Apply all rules to diacritized poems, one pass per rule with checkpoints."""
    df = pd.read_parquet(input_path)
    total = len(df)
    print(f"Loaded {total} poems from {input_path}")

    CHECKPOINT_DIR.mkdir(parents=True, exist_ok=True)
    fix_counts = {}
    start_time = time.time()

    # Pass 1: Simple rules (fast, per-poem)
    all_simple = SIMPLE_RULES + LEARNED_RULES
    for rule in all_simple:
        rule_name = rule["name"]
        print(f"\n--- Rule: {rule_name} ---")
        print(f"  {rule['description']}")
        count = 0
        rule_start = time.time()

        for idx in range(total):
            original = df.iloc[idx]["diacritized_content"]
            fixed = rule["apply"](original)
            if fixed != original:
                count += 1
                if not dry_run:
                    df.at[df.index[idx], "diacritized_content"] = fixed
            if (idx + 1) % 5000 == 0 or idx + 1 == total:
                progress_bar(idx + 1, total, rule_name[:20])

        fix_counts[rule_name] = count
        elapsed = time.time() - rule_start
        print(f"  Fixed {count} poems in {elapsed:.1f}s")

        # Checkpoint after each rule
        if not dry_run:
            ckpt = CHECKPOINT_DIR / f"after_{rule_name}.parquet"
            df.to_parquet(ckpt, index=False)
            print(f"  Checkpoint: {ckpt}")

    # Pass 2: Line-ending tashkeel (parallel, heavy)
    print(f"\n--- Rule: line_ending_tashkeel ---")
    print(f"  Add tashkeel to unmarked hemistich-ending consonants (parallel)")
    rule_start = time.time()

    if not dry_run:
        df, le_count = fix_line_ending_tashkeel_parallel(df, workers=workers)
    else:
        # Dry run: just count
        le_count = 0
        for idx in range(total):
            endings = _find_unmarked_endings(df.iloc[idx]["diacritized_content"])
            if endings:
                le_count += 1
            if (idx + 1) % 5000 == 0 or idx + 1 == total:
                progress_bar(idx + 1, total, "line_ending(dry)")

    fix_counts["line_ending_tashkeel"] = le_count
    elapsed = time.time() - rule_start
    print(f"  Fixed {le_count} poems in {elapsed:.1f}s")

    if not dry_run:
        ckpt = CHECKPOINT_DIR / "after_line_ending_tashkeel.parquet"
        df.to_parquet(ckpt, index=False)
        print(f"  Checkpoint: {ckpt}")

    # Summary
    total_changed = sum(fix_counts.values())
    total_elapsed = time.time() - start_time
    print(f"\n{'='*60}")
    print(f"POST-PROCESSING SUMMARY")
    print(f"{'='*60}")
    print(f"Total poems: {total}")
    print(f"Total elapsed: {total_elapsed:.1f}s")
    print(f"\nFix counts by rule:")
    for name, count in fix_counts.items():
        print(f"  {name}: {count} poems")

    # Write output
    if not dry_run:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        df.to_parquet(output_path, index=False)
        print(f"\nOutput: {output_path}")
    else:
        print(f"\n[DRY RUN] No files written.")

    # Write fix log
    log = {
        "total_poems": total,
        "fix_counts": fix_counts,
        "rules_applied": list(fix_counts.keys()),
        "elapsed_sec": round(total_elapsed, 1),
        "dry_run": dry_run,
    }
    FIX_LOG.parent.mkdir(parents=True, exist_ok=True)
    FIX_LOG.write_text(json.dumps(log, indent=2))
    print(f"Fix log: {FIX_LOG}")

    return log


def main():
    parser = argparse.ArgumentParser(
        description="Post-process diacritized poems to fix known Mishkal issues"
    )
    parser.add_argument("--input", type=str, default=str(DEFAULT_INPUT),
                        help=f"Input parquet (default: {DEFAULT_INPUT})")
    parser.add_argument("--output", type=str, default=str(DEFAULT_OUTPUT),
                        help=f"Output parquet (default: {DEFAULT_OUTPUT})")
    parser.add_argument("--dry-run", action="store_true",
                        help="Preview changes without saving")
    parser.add_argument("--workers", type=int, default=4,
                        help="Workers for parallel line-ending fix (default: 4)")
    args = parser.parse_args()

    postprocess(args.input, args.output, args.dry_run, args.workers)


if __name__ == "__main__":
    main()
