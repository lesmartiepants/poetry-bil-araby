#!/usr/bin/env python3
"""Generate self-contained interactive HTML report: translation comparison.

Produces a single HTML file with all data embedded as JSON.
Dark theme matching the existing curation pipeline report.

Usage:
    python -m poetry_quality_and_curation.translation_and_insight_optimizer.05_generate_report
"""
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

_project_root = Path(__file__).resolve().parent.parent.parent
if str(_project_root) not in sys.path:
    sys.path.insert(0, str(_project_root))

from poetry_quality_and_curation.translation_and_insight_optimizer.config import (
    ALL_DIMENSIONS,
    DATA_DIR,
    INSIGHT_DIMENSIONS,
    TRANSLATION_DIMENSIONS,
    compute_composites,
)

OUTPUT = DATA_DIR / "translation_comparison_report.html"

TIER_SLUGS = {
    "opus": "openai_bedrock-opus-46",
    "sonnet": "openai_bedrock-sonnet-46",
    "haiku": "openai_bedrock-haiku-45",
}

TIER_LABELS = {
    "opus": "Opus 4.6",
    "sonnet": "Sonnet 4.6",
    "haiku": "Haiku 4.5",
}


def score_color(s):
    """Color for an absolute score (0-100)."""
    if s >= 80:
        return "#4CAF50"
    if s >= 70:
        return "#8BC34A"
    if s >= 60:
        return "#FFC107"
    if s >= 50:
        return "#FF9800"
    return "#F44336"


def diff_color(d):
    """Color for a difference value."""
    d = abs(d)
    if d <= 10:
        return "#4CAF50"
    if d <= 20:
        return "#FFC107"
    return "#F44336"


def ai_badge_color(score):
    """Color for AI detection badge."""
    if score >= 80:
        return "#4CAF50"
    if score >= 60:
        return "#FFC107"
    return "#F44336"


def ai_badge_label(score):
    """Label for AI detection badge."""
    if score >= 80:
        return "Human-like"
    if score >= 60:
        return "Mixed"
    return "AI-detected"


def load_all_data() -> dict:
    """Load scored translations, comparison stats, and winners for all available tiers."""
    data = {"tiers": {}, "stats": None, "optimizer": None}

    # Load scored translations per tier
    for tier, slug in TIER_SLUGS.items():
        path = DATA_DIR / f"scores_translations_{slug}.parquet"
        if path.exists():
            df = pd.read_parquet(path)
            df["poem_id"] = df["poem_id"].astype(str)
            # Compute composites for each row
            composites = []
            for _, row in df.iterrows():
                c = compute_composites(row.to_dict())
                composites.append(c)
            comp_df = pd.DataFrame(composites)
            for col in comp_df.columns:
                df[col] = comp_df[col].values
            data["tiers"][tier] = df
            print(f"  [loaded] {tier}: {len(df)} rows")

    # Load comparison stats
    stats_path = DATA_DIR / "comparison_stats.json"
    if stats_path.exists():
        data["stats"] = json.loads(stats_path.read_text(encoding="utf-8"))
        print(f"  [loaded] comparison_stats.json")

    # Load optimizer results if present
    for opt_name in ["mipro", "simba", "bootstrap"]:
        opt_path = DATA_DIR / f"optimizer_{opt_name}_results.json"
        if opt_path.exists():
            if data["optimizer"] is None:
                data["optimizer"] = {}
            data["optimizer"][opt_name] = json.loads(opt_path.read_text(encoding="utf-8"))
            print(f"  [loaded] optimizer_{opt_name}_results.json")

    return data


def prepare_embedded_data(data: dict) -> str:
    """Convert loaded data to a JSON string for embedding in HTML."""
    embedded = {"tiers": {}, "stats": data["stats"], "optimizer": data["optimizer"]}

    for tier, df in data["tiers"].items():
        records = []
        for _, row in df.iterrows():
            record = {}
            for col in df.columns:
                val = row[col]
                if pd.isna(val):
                    record[col] = None
                elif hasattr(val, "item"):
                    record[col] = val.item()
                else:
                    record[col] = val
            records.append(record)
        embedded["tiers"][tier] = records

    return json.dumps(embedded, ensure_ascii=False, default=str)


def build_summary_section(data: dict) -> str:
    """Build the summary dashboard HTML."""
    stats = data.get("stats")
    cards = ""

    for tier, df in data["tiers"].items():
        label = TIER_LABELS.get(tier, tier)
        n = len(df)
        mean_overall = df["overall_composite"].mean() if "overall_composite" in df.columns else 0
        mean_trans = df["translation_composite"].mean() if "translation_composite" in df.columns else 0
        mean_insight = df["insight_composite"].mean() if "insight_composite" in df.columns else 0
        mean_ai = df["ai_detection_score"].mean() if "ai_detection_score" in df.columns else 0

        # Check if we have comparison data
        delta_html = ""
        if stats and tier in stats.get("tiers", {}):
            tier_stats = stats["tiers"][tier]
            overall = tier_stats.get("overall", {})
            improvement = overall.get("mean_improvement", 0)
            win_rate = overall.get("win_rate", 0)
            if improvement != 0:
                delta_html = f"""
                <div class="stat-delta">
                    <span style="color:{score_color(win_rate)}">Win rate: {win_rate:.0f}%</span>
                    <span style="color:{'#4CAF50' if improvement > 0 else '#F44336'}">{improvement:+.1f} avg improvement</span>
                </div>"""

        cards += f"""
        <div class="stat-box">
            <div class="model">{label}</div>
            <div class="val">{mean_overall:.1f}</div>
            <div class="label">{n} poems</div>
            <div class="stat-breakdown">
                <span>Translation: {mean_trans:.1f}</span>
                <span>Insight: {mean_insight:.1f}</span>
                <span>AI: {mean_ai:.0f}</span>
            </div>
            {delta_html}
        </div>"""

    return f"""
    <div class="section">
        <h2>1. Summary Dashboard</h2>
        <div class="stats-grid">{cards}</div>
    </div>"""


def build_poem_cards_section(data: dict) -> str:
    """Build side-by-side poem comparison cards."""
    # Collect all unique poem IDs across tiers
    all_poems = {}
    for tier, df in data["tiers"].items():
        for _, row in df.iterrows():
            pid = row["poem_id"]
            if pid not in all_poems:
                all_poems[pid] = {}
            all_poems[pid][tier] = row

    cards = ""
    for pid, tier_rows in sorted(all_poems.items()):
        # Get poem text from any available tier
        sample = next(iter(tier_rows.values()))
        arabic = sample.get("arabic_text", "") or ""
        poet = sample.get("poet", "") or sample.get("poet_name", "") or ""
        era = sample.get("era", "") or ""
        theme = sample.get("theme", "") or ""

        # Build variant sections
        variants_html = ""
        for tier in ["opus", "sonnet", "haiku"]:
            if tier not in tier_rows:
                continue
            row = tier_rows[tier]
            label = TIER_LABELS.get(tier, tier)

            # Translation text
            synth_text = row.get("synthesized_translation", "") or row.get("translation", "") or ""
            baseline_text = row.get("baseline_translation", "") or ""

            overall = row.get("overall_composite", 0) or 0
            ai_score = row.get("ai_detection_score", 0) or 0

            # Score bars
            dim_bars = ""
            for dim in ALL_DIMENSIONS:
                val = row.get(dim)
                if val is None or (isinstance(val, float) and pd.isna(val)):
                    continue
                val = float(val)
                dim_bars += f"""
                <div class="dim-row">
                    <span class="dim-label">{dim.replace('_', ' ').title()}</span>
                    <div class="dim-track"><div class="dim-fill" style="width:{val}%;background:{score_color(val)}"></div></div>
                    <span class="dim-score" style="color:{score_color(val)}">{val:.0f}</span>
                </div>"""

            # AI detection badge
            badge_c = ai_badge_color(ai_score)
            badge_l = ai_badge_label(ai_score)

            # Expert breakdown (expandable)
            expert_html = ""
            for expert in ["bridge", "scholar", "craftsperson"]:
                expert_text = row.get(f"{expert}_translation", "")
                if expert_text:
                    expert_html += f"""
                    <details class="expert-detail">
                        <summary>{expert.title()} Expert</summary>
                        <pre class="expert-text">{_escape(str(expert_text))}</pre>
                    </details>"""

            # Insight comparison (expandable)
            insight_html = ""
            depth_new = row.get("depth", "") or row.get("the_depth", "") or ""
            author_new = row.get("author", "") or row.get("the_author", "") or ""
            depth_old = row.get("baseline_depth", "") or ""
            author_old = row.get("baseline_author", "") or ""

            if depth_new or author_new:
                insight_html = f"""
                <details class="insight-detail">
                    <summary>Insight Comparison (THE DEPTH / THE AUTHOR)</summary>
                    <div class="insight-grid">
                        <div class="insight-col">
                            <h5>New (Synthesized)</h5>
                            <div class="insight-section"><strong>THE DEPTH:</strong> {_escape(str(depth_new))}</div>
                            <div class="insight-section"><strong>THE AUTHOR:</strong> {_escape(str(author_new))}</div>
                        </div>
                        <div class="insight-col">
                            <h5>Old (Baseline)</h5>
                            <div class="insight-section"><strong>THE DEPTH:</strong> {_escape(str(depth_old))}</div>
                            <div class="insight-section"><strong>THE AUTHOR:</strong> {_escape(str(author_old))}</div>
                        </div>
                    </div>
                </details>"""

            variants_html += f"""
            <div class="variant-card" data-tier="{tier}">
                <div class="variant-header">
                    <span class="variant-label">{label}</span>
                    <span class="variant-score" style="color:{score_color(overall)}">{overall:.1f}</span>
                    <span class="ai-badge" style="background:{badge_c};color:#000">{badge_l} ({ai_score:.0f})</span>
                </div>
                <div class="translation-area">
                    <div class="translation-block">
                        <h5>Synthesized Translation</h5>
                        <pre class="translation-text">{_escape(str(synth_text))}</pre>
                    </div>
                    {"<div class='translation-block baseline'><h5>Baseline Translation</h5><pre class='translation-text'>" + _escape(str(baseline_text)) + "</pre></div>" if baseline_text else ""}
                </div>
                <div class="score-heatmap">{dim_bars}</div>
                {expert_html}
                {insight_html}
            </div>"""

        # Arabic text display
        arabic_lines = arabic.strip().split("\n") if arabic else []
        arabic_html = ""
        for line in arabic_lines[:10]:
            parts = line.split("*")
            if len(parts) == 2:
                arabic_html += (
                    f'<div class="verse"><span class="h1">{_escape(parts[0].strip())}</span>'
                    f' <span class="sep">&#10022;</span> '
                    f'<span class="h2">{_escape(parts[1].strip())}</span></div>'
                )
            else:
                arabic_html += f'<div class="verse">{_escape(line.strip())}</div>'
        if len(arabic_lines) > 10:
            arabic_html += '<div class="verse" style="color:#5A5040">...</div>'

        # Filter attributes
        filter_attrs = f'data-era="{_escape(str(era))}" data-theme="{_escape(str(theme))}" data-poet="{_escape(str(poet))}"'

        cards += f"""
        <div class="poem-card" {filter_attrs} data-poem-id="{pid}">
            <div class="poem-header">
                <div class="poem-meta">
                    <span class="poem-id">#{pid}</span>
                    <span class="poem-poet">{_escape(str(poet))}</span>
                    {f'<span class="poem-era">{_escape(str(era))}</span>' if era else ""}
                    {f'<span class="poem-theme">{_escape(str(theme))}</span>' if theme else ""}
                </div>
            </div>
            <div class="arabic-section">{arabic_html}</div>
            <div class="variants-container">{variants_html}</div>
        </div>"""

    return f"""
    <div class="section">
        <h2>2. Poem Comparison Cards</h2>
        <div class="filter-controls">
            <input type="text" id="searchInput" placeholder="Search by poet, era, theme, or poem ID..." class="filter-input">
            <select id="tierFilter" class="filter-select">
                <option value="all">All Models</option>
                <option value="opus">Opus</option>
                <option value="sonnet">Sonnet</option>
                <option value="haiku">Haiku</option>
            </select>
            <select id="scoreFilter" class="filter-select">
                <option value="all">All Scores</option>
                <option value="80">80+ (Excellent)</option>
                <option value="70">70+ (Good)</option>
                <option value="60">60+ (Fair)</option>
                <option value="50">Below 60</option>
            </select>
        </div>
        <div id="poemCards">{cards}</div>
    </div>"""


def build_optimizer_section(data: dict) -> str:
    """Build optimizer comparison tab if data exists."""
    if not data.get("optimizer"):
        return ""

    rows = ""
    for opt_name, opt_data in data["optimizer"].items():
        best_score = opt_data.get("best_score", "N/A")
        trials = opt_data.get("num_trials", "N/A")
        status = opt_data.get("status", "unknown")
        rows += f"""
        <tr>
            <td>{opt_name.upper()}</td>
            <td style="color:{score_color(best_score) if isinstance(best_score, (int, float)) else '#8a8070'}">{best_score}</td>
            <td>{trials}</td>
            <td>{status}</td>
        </tr>"""

    return f"""
    <div class="section">
        <h2>3. Optimizer Comparison</h2>
        <table class="optimizer-table">
            <tr><th>Optimizer</th><th>Best Score</th><th>Trials</th><th>Status</th></tr>
            {rows}
        </table>
    </div>"""


def _escape(s: str) -> str:
    """Escape HTML special characters."""
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def build_html(data: dict) -> str:
    """Assemble the full HTML report."""
    report_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    embedded_json = prepare_embedded_data(data)

    summary = build_summary_section(data)
    poem_cards = build_poem_cards_section(data)
    optimizer = build_optimizer_section(data)

    total_poems = sum(len(df) for df in data["tiers"].values())
    tier_summary = " / ".join(
        f"{len(df)} {TIER_LABELS[t]}" for t, df in data["tiers"].items()
    )

    return f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Translation Quality Comparison Report</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700&display=swap');
*,*::before,*::after{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Tajawal',sans-serif;background:#0d0d0d;color:#e8e0d0;line-height:1.7}}
.container{{max-width:1200px;margin:0 auto;padding:40px 24px}}
header{{text-align:center;padding:50px 0 30px;border-bottom:1px solid #2a2520;margin-bottom:40px}}
header h1{{font-family:'Amiri',serif;font-size:2.2rem;color:#d4a574;margin-bottom:8px}}
header .sub{{color:#8a8070;font-size:0.95rem}}
.section{{margin-bottom:50px}}
.section h2{{font-family:'Amiri',serif;font-size:1.5rem;color:#d4a574;border-bottom:1px solid #2a2520;padding-bottom:8px;margin-bottom:20px}}
/* Summary grid */
.stats-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:30px}}
.stat-box{{background:#141210;border:1px solid #2a2520;border-radius:8px;padding:20px;text-align:center}}
.stat-box .model{{font-size:0.85rem;color:#8a8070;margin-bottom:8px;font-family:monospace}}
.stat-box .val{{font-size:2.4rem;font-weight:700;color:#d4a574}}
.stat-box .label{{font-size:0.8rem;color:#6a6050;margin-top:4px}}
.stat-breakdown{{display:flex;justify-content:center;gap:16px;margin-top:12px;font-size:0.8rem;color:#8a8070}}
.stat-delta{{margin-top:8px;display:flex;flex-direction:column;gap:4px;font-size:0.82rem}}
/* Filter controls */
.filter-controls{{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}}
.filter-input{{flex:1;min-width:200px;padding:10px 16px;background:#141210;border:1px solid #2a2520;border-radius:6px;color:#e8e0d0;font-size:0.9rem;font-family:'Tajawal',sans-serif}}
.filter-input::placeholder{{color:#5a5040}}
.filter-select{{padding:10px 16px;background:#141210;border:1px solid #2a2520;border-radius:6px;color:#e8e0d0;font-size:0.9rem;font-family:'Tajawal',sans-serif;cursor:pointer}}
/* Poem cards */
.poem-card{{background:#141210;border:1px solid #2a2520;border-radius:10px;margin-bottom:24px;overflow:hidden}}
.poem-header{{padding:16px 20px;border-bottom:1px solid #1e1a16;display:flex;align-items:center;gap:12px;flex-wrap:wrap}}
.poem-meta{{display:flex;align-items:center;gap:12px;flex-wrap:wrap}}
.poem-id{{font-family:monospace;color:#6a6050;font-size:0.8rem}}
.poem-poet{{font-family:'Amiri',serif;color:#d4a574;font-size:1.1rem}}
.poem-era,.poem-theme{{font-size:0.8rem;padding:2px 10px;border-radius:12px;background:#1e1a16;color:#8a8070}}
.arabic-section{{padding:16px 20px;border-bottom:1px solid #1e1a16;direction:rtl;text-align:center}}
.verse{{font-family:'Amiri',serif;font-size:1.05rem;line-height:2;color:#d8d0c0;margin-bottom:4px}}
.sep{{color:#d4a574;margin:0 6px;font-size:0.6rem}}
.variants-container{{padding:16px 20px}}
/* Variant cards */
.variant-card{{background:#0f0e0c;border:1px solid #1e1a16;border-radius:8px;padding:16px;margin-bottom:12px}}
.variant-header{{display:flex;align-items:center;gap:12px;margin-bottom:12px;flex-wrap:wrap}}
.variant-label{{font-weight:700;color:#c0b090;font-size:0.9rem}}
.variant-score{{font-size:1.3rem;font-weight:700}}
.ai-badge{{padding:2px 10px;border-radius:12px;font-size:0.75rem;font-weight:700}}
.translation-area{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px}}
.translation-block{{background:#161310;border:1px solid #1e1a16;border-radius:6px;padding:12px}}
.translation-block.baseline{{border-color:#2a2520}}
.translation-block h5{{color:#8a8070;font-size:0.8rem;margin-bottom:8px}}
.translation-text{{font-size:0.88rem;color:#d8d0c0;white-space:pre-wrap;word-wrap:break-word;font-family:'Tajawal',sans-serif;line-height:1.8;margin:0}}
/* Score heatmap */
.score-heatmap{{margin:12px 0}}
.dim-row{{display:flex;align-items:center;gap:8px;margin-bottom:4px}}
.dim-label{{min-width:140px;font-size:0.8rem;color:#8a8070;text-transform:capitalize}}
.dim-track{{flex:1;height:16px;background:#1a1714;border-radius:3px;overflow:hidden;border:1px solid #2a2520}}
.dim-fill{{height:100%;border-radius:3px;transition:width 0.3s}}
.dim-score{{min-width:30px;font-weight:700;font-size:0.8rem;text-align:right}}
/* Expert / Insight expandable */
details{{margin-top:8px}}
summary{{cursor:pointer;color:#d4a574;font-size:0.85rem;padding:6px 0}}
summary:hover{{color:#e8c090}}
.expert-text{{font-size:0.85rem;color:#b0a890;white-space:pre-wrap;word-wrap:break-word;font-family:'Tajawal',sans-serif;line-height:1.7;padding:10px;background:#161310;border-radius:4px;margin-top:8px}}
.insight-grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:8px}}
.insight-col h5{{color:#8a8070;font-size:0.8rem;margin-bottom:8px}}
.insight-section{{font-size:0.85rem;color:#b0a890;line-height:1.7;margin-bottom:8px;padding:10px;background:#161310;border-radius:4px}}
.insight-section strong{{color:#c0b090}}
/* Optimizer table */
.optimizer-table{{width:100%;border-collapse:collapse;margin-top:16px}}
.optimizer-table th{{text-align:left;padding:10px 16px;background:#161310;color:#d4a574;font-size:0.85rem;border-bottom:2px solid #2a2520}}
.optimizer-table td{{padding:10px 16px;border-bottom:1px solid #1e1a16;font-size:0.9rem}}
/* Language toggle */
.lang-toggle{{position:fixed;top:16px;right:16px;z-index:1000;display:flex;gap:0;border-radius:8px;overflow:hidden;border:1px solid #2a2520;background:#161310;box-shadow:0 4px 12px rgba(0,0,0,0.4)}}
.lang-btn{{padding:8px 16px;font-size:0.82rem;font-weight:600;border:none;cursor:pointer;background:#161310;color:#8a8070;transition:all 0.2s}}
.lang-btn:hover{{background:#1e1a16;color:#c0b090}}
.lang-btn.active{{background:#d4a574;color:#0d0d0d}}
footer{{text-align:center;padding:30px 0;border-top:1px solid #2a2520;margin-top:30px;font-size:0.8rem;color:#4a4030}}
.hidden{{display:none!important}}
@media(max-width:768px){{
    .stats-grid{{grid-template-columns:1fr}}
    .translation-area{{grid-template-columns:1fr}}
    .insight-grid{{grid-template-columns:1fr}}
    .filter-controls{{flex-direction:column}}
    .lang-toggle{{top:auto;bottom:16px;right:50%;transform:translateX(50%)}}
}}
</style>
</head>
<body>
<div class="lang-toggle">
    <button class="lang-btn" data-lang="ar">عربي</button>
    <button class="lang-btn active" data-lang="en">English</button>
    <button class="lang-btn" data-lang="both">Both</button>
</div>
<div class="container">
<header>
    <h1>Translation &amp; Insight Quality Report</h1>
    <div class="sub"><strong>{total_poems}</strong> scored translations ({tier_summary}) &bull; {report_date}</div>
</header>

{summary}
{poem_cards}
{optimizer}

<footer>Generated by Translation &amp; Insight Quality Optimizer &bull; {report_date}</footer>
</div>

<script>
// Embedded data
const REPORT_DATA = {embedded_json};

// Filter logic
(function() {{
    const searchInput = document.getElementById('searchInput');
    const tierFilter = document.getElementById('tierFilter');
    const scoreFilter = document.getElementById('scoreFilter');
    const cards = document.querySelectorAll('.poem-card');

    function applyFilters() {{
        const query = (searchInput ? searchInput.value : '').toLowerCase();
        const tier = tierFilter ? tierFilter.value : 'all';
        const minScore = scoreFilter ? scoreFilter.value : 'all';

        cards.forEach(card => {{
            const poet = (card.dataset.poet || '').toLowerCase();
            const era = (card.dataset.era || '').toLowerCase();
            const theme = (card.dataset.theme || '').toLowerCase();
            const pid = (card.dataset.poemId || '').toLowerCase();

            // Text search
            const matchesSearch = !query || poet.includes(query) || era.includes(query) || theme.includes(query) || pid.includes(query);

            // Tier filter: show/hide variant cards within the poem card
            const variantCards = card.querySelectorAll('.variant-card');
            let anyVisible = false;
            variantCards.forEach(vc => {{
                if (tier === 'all' || vc.dataset.tier === tier) {{
                    vc.classList.remove('hidden');
                    anyVisible = true;
                }} else {{
                    vc.classList.add('hidden');
                }}
            }});

            // Score filter
            let matchesScore = true;
            if (minScore !== 'all') {{
                const threshold = parseInt(minScore);
                const scoreEls = card.querySelectorAll('.variant-score');
                if (threshold < 60) {{
                    // Show only below 60
                    matchesScore = Array.from(scoreEls).some(el => parseFloat(el.textContent) < 60);
                }} else {{
                    matchesScore = Array.from(scoreEls).some(el => parseFloat(el.textContent) >= threshold);
                }}
            }}

            card.classList.toggle('hidden', !(matchesSearch && anyVisible && matchesScore));
        }});
    }}

    if (searchInput) searchInput.addEventListener('input', applyFilters);
    if (tierFilter) tierFilter.addEventListener('change', applyFilters);
    if (scoreFilter) scoreFilter.addEventListener('change', applyFilters);

    // Language toggle
    const langBtns = document.querySelectorAll('.lang-btn');
    langBtns.forEach(btn => {{
        btn.addEventListener('click', () => {{
            langBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const lang = btn.dataset.lang;
            const arabicSections = document.querySelectorAll('.arabic-section');
            const translationBlocks = document.querySelectorAll('.translation-block');
            if (lang === 'ar') {{
                arabicSections.forEach(s => s.classList.remove('hidden'));
                translationBlocks.forEach(s => s.classList.add('hidden'));
            }} else if (lang === 'en') {{
                arabicSections.forEach(s => s.classList.add('hidden'));
                translationBlocks.forEach(s => s.classList.remove('hidden'));
            }} else {{
                arabicSections.forEach(s => s.classList.remove('hidden'));
                translationBlocks.forEach(s => s.classList.remove('hidden'));
            }}
        }});
    }});
}})();
</script>
</body>
</html>"""


def main():
    print("=" * 60)
    print("STEP 5: GENERATE HTML REPORT")
    print("=" * 60)

    data = load_all_data()

    if not data["tiers"]:
        print("ERROR: No scored translation data found. Run steps 02-04 first.")
        sys.exit(1)

    html = build_html(data)
    OUTPUT.write_text(html, encoding="utf-8")
    size_kb = OUTPUT.stat().st_size / 1024
    print(f"\n[saved] {OUTPUT}")
    print(f"  File size: {size_kb:.1f} KB")
    print(f"  Tiers: {list(data['tiers'].keys())}")
    print(f"  Total poems: {sum(len(df) for df in data['tiers'].values())}")
    if data["optimizer"]:
        print(f"  Optimizer data: {list(data['optimizer'].keys())}")
    print("\n[done] Report generated.")


if __name__ == "__main__":
    main()
