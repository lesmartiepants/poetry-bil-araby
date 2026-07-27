"""Unit tests for the v3 distillation changes to the categorization pipeline.

Covers the three things the distillation actually changed:
  * caps tightened to <= 2 per dimension (config),
  * the confidence-floor filter (config.apply_confidence_floor, used by import),
  * prompt / seed consistency with the taxonomy.

Import-light on purpose: everything under test lives in `config`, which imports
no pandas / psycopg / litellm at module load, so this runs anywhere Python does.

Run with pytest:      pytest poetry_quality_and_curation/categorization/test_distillation.py
or standalone:        python poetry_quality_and_curation/categorization/test_distillation.py
"""
import io
import contextlib
import sys
from pathlib import Path

# Allow `python path/to/test_distillation.py` (script dir, not repo root, is on
# sys.path in that mode). pytest / `python -m` don't need this, but it's cheap.
_REPO_ROOT = Path(__file__).resolve().parents[2]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from poetry_quality_and_curation.categorization import config as c


# -- caps + required/optional contract --------------------------------------

def test_caps_are_two_per_dimension():
    for dim in ("mood", "topic", "motif"):
        assert c.MAX_LABELS_PER_DIM[dim] == 2, f"{dim} cap should be 2"
    # a hypothetical new dimension also defaults to 2, not the old 4
    assert c.MAX_LABELS_PER_DIM["___new___"] == 2


def test_required_optional_contract():
    assert c.DIMENSION_MIN_LABELS["mood"] >= 1
    assert c.DIMENSION_MIN_LABELS["topic"] >= 1
    assert c.DIMENSION_MIN_LABELS["motif"] == 0  # motif is optional by design


def test_ceiling_is_six_total():
    total = sum(c.MAX_LABELS_PER_DIM[d] for d in ("mood", "topic", "motif"))
    assert total == 6, "distilled poem should cap at 6 labels total"


# -- confidence floor --------------------------------------------------------

def test_confidence_floor_in_range():
    assert 0 < c.CONFIDENCE_FLOOR <= 100


def test_floor_drops_weak_labels():
    dim_lists = {
        "mood": ["nostalgia", "amorous"],
        "topic": ["love", "honor-pride"],
        "motif": ["desert-ruins", "sword-battle"],
    }
    conf = {"nostalgia": 90, "amorous": 50, "love": 90,
            "honor-pride": 55, "desert-ruins": 92, "sword-battle": 60}
    out = c.apply_confidence_floor(dim_lists, conf, "nostalgia", floor=65)
    assert out == {"mood": ["nostalgia"], "topic": ["love"], "motif": ["desert-ruins"]}


def test_floor_keeps_mood_primary_even_if_below():
    out = c.apply_confidence_floor({"mood": ["grief"]}, {"grief": 40}, "grief", floor=65)
    assert out["mood"] == ["grief"], "mood_primary must survive the floor"


def test_floor_keeps_missing_confidence():
    # a label with no confidence is ambiguous -> kept, not dropped
    out = c.apply_confidence_floor({"topic": ["love"]}, {}, None, floor=65)
    assert out["topic"] == ["love"]


def test_floor_does_not_mutate_input():
    dim_lists = {"mood": ["grief", "joy"]}
    conf = {"grief": 90, "joy": 10}
    c.apply_confidence_floor(dim_lists, conf, "grief", floor=65)
    assert dim_lists == {"mood": ["grief", "joy"]}, "input must be untouched"


# -- prompt reflects the distillation ---------------------------------------

def test_prompt_mentions_rationale_and_floor():
    p = c.CLASSIFICATION_PROMPT
    assert "rationale" in p
    assert str(c.CONFIDENCE_FLOOR) in p


def test_prompt_lists_every_synonym_group_member():
    p = c.CLASSIFICATION_PROMPT
    for dim, groups in c.SYNONYM_GROUPS.items():
        for group in groups:
            for key in group:
                assert key in p, f"synonym key {key} missing from prompt"


def test_prompt_is_taxonomy_driven():
    # every vocab key should appear (prompt is built from DIMENSIONS, not hand-typed)
    p = c.CLASSIFICATION_PROMPT
    for dim, spec in c.DIMENSIONS.items():
        for key, _ar, _en in spec["values"]:
            assert key in p, f"{dim}/{key} missing from prompt"


# -- taxonomy + seed consistency --------------------------------------------

def test_validate_taxonomy_passes():
    c.validate_taxonomy()  # raises on drift


def test_versions_bumped():
    assert c.TAXONOMY_VERSION == "3"
    assert c.PROMPT_VERSION and isinstance(c.PROMPT_VERSION, str)


def test_default_model_is_3_6_flash():
    assert c.DEFAULT_GEMINI_MODEL.endswith("gemini-3.6-flash")


def _seed_text():
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        c.print_seed_sql()
    return buf.getvalue()


def test_seed_covers_full_taxonomy():
    seed = _seed_text()
    # 3 dimensions, 44 values, 7 families all present
    for dim in c.DIMENSIONS:
        assert f"'{dim}'" in seed
    n_values = sum(len(s["values"]) for s in c.DIMENSIONS.values())
    assert n_values == 44
    for dim, spec in c.DIMENSIONS.items():
        for key, _ar, _en in spec["values"]:
            assert f"'{key}'" in seed, f"value {key} missing from seed"
    assert seed.count("INSERT INTO category_families") == len(c.FAMILIES) == 7


def test_seed_sets_min_max_matching_config():
    seed = _seed_text()
    for dim in ("mood", "topic", "motif"):
        line = (f"UPDATE category_dimensions SET "
                f"min_labels = {c.DIMENSION_MIN_LABELS.get(dim, 0)}, "
                f"max_labels = {c.MAX_LABELS_PER_DIM[dim]} WHERE key = '{dim}';")
        assert line in seed, f"seed missing min/max line for {dim}"


if __name__ == "__main__":
    # Standalone runner so this works without pytest installed.
    fns = [(n, f) for n, f in sorted(globals().items())
           if n.startswith("test_") and callable(f)]
    failed = 0
    for name, fn in fns:
        try:
            fn()
            print(f"  PASS  {name}")
        except AssertionError as e:
            failed += 1
            print(f"  FAIL  {name}: {e}")
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"  ERROR {name}: {type(e).__name__}: {e}")
    print(f"\n{'OK' if failed == 0 else 'FAILED'} — {len(fns) - failed}/{len(fns)} passed.")
    raise SystemExit(1 if failed else 0)
