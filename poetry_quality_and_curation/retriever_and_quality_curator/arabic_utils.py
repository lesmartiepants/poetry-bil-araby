"""Arabic text processing utilities for the curation pipeline."""
import re
import hashlib
import unicodedata

# Unicode ranges for Arabic characters
_ARABIC_RANGE = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]')

# Tashkeel (diacritical marks) pattern
_TASHKEEL = re.compile(r'[\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]')

# Tatweel (kashida) character
_TATWEEL = '\u0640'

# Alef variants mapping
_ALEF_VARIANTS = {
    '\u0622': '\u0627',  # ALEF WITH MADDA ABOVE -> ALEF
    '\u0623': '\u0627',  # ALEF WITH HAMZA ABOVE -> ALEF
    '\u0625': '\u0627',  # ALEF WITH HAMZA BELOW -> ALEF
    '\u0671': '\u0627',  # ALEF WASLA -> ALEF
}

# Hamza normalization
_HAMZA_MAP = {
    '\u0624': '\u0648',  # WAW WITH HAMZA -> WAW
    '\u0626': '\u064A',  # YEH WITH HAMZA -> YEH
}

# Zero-width characters to strip
_ZERO_WIDTH = re.compile(r'[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]')


def normalize_arabic(text: str) -> str:
    """Normalize Arabic text: unify alef variants, remove tatweel, strip zero-width chars."""
    if not text:
        return ""
    # Strip zero-width characters
    text = _ZERO_WIDTH.sub('', text)
    # Remove tatweel
    text = text.replace(_TATWEEL, '')
    # Normalize alef variants
    for variant, replacement in _ALEF_VARIANTS.items():
        text = text.replace(variant, replacement)
    # Normalize hamza on carriers
    for variant, replacement in _HAMZA_MAP.items():
        text = text.replace(variant, replacement)
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def strip_diacritics(text: str) -> str:
    """Remove all Arabic diacritical marks (tashkeel) from text."""
    if not text:
        return ""
    return _TASHKEEL.sub('', text)


def compute_text_hash(text: str) -> str:
    """Compute SHA-256 hash of normalized, diacritic-stripped text for deduplication."""
    normalized = normalize_arabic(strip_diacritics(text.strip()))
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()


def count_lines(content: str) -> int:
    """Count lines in poem content. Handles both * delimiter (DB format) and newlines."""
    if not content:
        return 0
    # Try * delimiter first (DB storage format)
    if '*' in content:
        lines = [l.strip() for l in content.split('*') if l.strip()]
    else:
        lines = [l.strip() for l in content.split('\n') if l.strip()]
    return len(lines)


def detect_repeated_lines(content: str, threshold: float = 0.3) -> bool:
    """Return True if more than `threshold` fraction of lines are repeated."""
    if not content:
        return False
    if '*' in content:
        lines = [l.strip() for l in content.split('*') if l.strip()]
    else:
        lines = [l.strip() for l in content.split('\n') if l.strip()]
    if len(lines) < 2:
        return False
    # Normalize lines for comparison
    normalized = [normalize_arabic(strip_diacritics(l)) for l in lines]
    unique = set(normalized)
    repeated_fraction = 1 - (len(unique) / len(normalized))
    return repeated_fraction > threshold


def is_arabic_text(text: str) -> bool:
    """Check if text is predominantly Arabic (>50% Arabic characters)."""
    if not text:
        return False
    chars = [c for c in text if not c.isspace() and c not in '.,;:!?*()-[]{}0123456789']
    if not chars:
        return False
    arabic_count = sum(1 for c in chars if _ARABIC_RANGE.match(c))
    return (arabic_count / len(chars)) > 0.5


def format_for_scoring(poem_id: str, title: str, content: str, poet_name: str = "") -> str:
    """Format a poem for submission to the scoring API."""
    # Convert * delimiters to newlines for readability
    if '*' in content:
        lines = [l.strip() for l in content.split('*') if l.strip()]
    else:
        lines = [l.strip() for l in content.split('\n') if l.strip()]

    formatted_lines = '\n'.join(f"  {i+1}. {line}" for i, line in enumerate(lines))

    parts = [f"[قصيدة: {poem_id}]"]
    if title:
        parts.append(f"العنوان: {title}")
    if poet_name:
        parts.append(f"الشاعر: {poet_name}")
    parts.append(f"الأبيات:\n{formatted_lines}")

    return '\n'.join(parts)
