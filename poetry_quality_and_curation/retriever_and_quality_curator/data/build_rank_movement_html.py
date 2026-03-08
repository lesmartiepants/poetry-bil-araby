"""Build HTML visualization showing score evolution across pipeline versions.

Shows:
1. Before/after score distributions (histograms)
2. Scatter plot of old vs new scores
3. Biggest movers table (gainers and losers)
4. Canon poem scores highlighted
5. Example poems from each score band with excerpts
6. DSPy optimization results (when available)
7. Three-way comparison: v5 (Haiku) -> v7 (Tiered+Remap) -> v8 (DSPy-Calibrated)

Output: data/poem_rank_movement.html
"""
import json
import html as html_lib
from pathlib import Path

import pandas as pd
import numpy as np

DATA_DIR = Path(__file__).resolve().parent

# Try v8 first, fall back to v7
V8_PATH = DATA_DIR / "scores_final_v8.parquet"
V7_PATH = DATA_DIR / "scores_final_merged_v7.parquet"
MERGED_PATH = V8_PATH if V8_PATH.exists() else V7_PATH
HAIKU_PATH = DATA_DIR / "scores_recalibrated_v5.parquet"  # original baseline for comparison
CONTENT_PATH = DATA_DIR / "final_selection_v4.parquet"
CANON_PATH = DATA_DIR / "canon_poems.json"
OUTPUT_PATH = DATA_DIR / "poem_rank_movement.html"

# DSPy optimization logs (for reporting panel)
SIMBA_HAIKU_LOG = DATA_DIR / "dspy_simba_haiku_log.json"
SIMBA_SONNET_LOG = DATA_DIR / "dspy_simba_sonnet_log.json"
MIPRO_HAIKU_LOG = DATA_DIR / "dspy_haiku_history.json"
MIPRO_SONNET_LOG = DATA_DIR / "dspy_sonnet_history.json"


def escape(text):
    """HTML-escape text."""
    if not isinstance(text, str):
        return str(text)
    return html_lib.escape(text)


def truncate_content(content, max_lines=4):
    """Get first N lines of poem content."""
    if not content:
        return ""
    if '*' in str(content):
        lines = [l.strip() for l in str(content).split('*') if l.strip()]
    else:
        lines = [l.strip() for l in str(content).split('\n') if l.strip()]
    shown = lines[:max_lines]
    result = '\n'.join(shown)
    if len(lines) > max_lines:
        result += f"\n... ({len(lines) - max_lines} more lines)"
    return result


def build_histogram_data(scores, bins=30, lo=0, hi=100):
    """Build histogram bin data."""
    counts, edges = np.histogram(scores, bins=bins, range=(lo, hi))
    return [{"x": float(edges[i]), "w": float(edges[i+1] - edges[i]),
             "y": int(counts[i])} for i in range(len(counts))]


def load_optimization_logs():
    """Load DSPy optimization logs for reporting."""
    logs = {}
    for label, path in [
        ("simba_haiku", SIMBA_HAIKU_LOG),
        ("simba_sonnet", SIMBA_SONNET_LOG),
        ("mipro_haiku", MIPRO_HAIKU_LOG),
        ("mipro_sonnet", MIPRO_SONNET_LOG),
    ]:
        if path.exists():
            try:
                with open(path) as f:
                    logs[label] = json.load(f)
            except (json.JSONDecodeError, KeyError):
                pass
    return logs


def main():
    version = "v8" if V8_PATH.exists() else "v7"
    print(f"Building rank movement HTML visualization ({version})...")

    # Load optimization logs
    opt_logs = load_optimization_logs()

    # Load data
    merged = pd.read_parquet(MERGED_PATH)
    merged["poem_id"] = merged["poem_id"].astype(str)
    haiku = pd.read_parquet(HAIKU_PATH)
    haiku["poem_id"] = haiku["poem_id"].astype(str)
    content_df = pd.read_parquet(CONTENT_PATH)
    content_df["poem_id"] = content_df["poem_id"].astype(str)

    # Also load v7 for three-way comparison if we're on v8
    v7_df = None
    if version == "v8" and V7_PATH.exists():
        v7_df = pd.read_parquet(V7_PATH)
        v7_df["poem_id"] = v7_df["poem_id"].astype(str)

    with open(CANON_PATH) as f:
        canon = json.load(f)
    canon_by_id = {str(p["matched_id"]): p for p in canon if p.get("found") and p.get("matched_id")}

    # Join haiku scores for comparison
    haiku_scores = haiku[["poem_id", "quality_score"]].drop_duplicates("poem_id").rename(columns={"quality_score": "haiku_score"})
    df = merged.copy()
    if "haiku_score" not in df.columns:
        haiku_map = haiku_scores.set_index("poem_id")["haiku_score"]
        df["haiku_score"] = df["poem_id"].map(haiku_map)
    df["haiku_score"] = df["haiku_score"].fillna(df["quality_score"])

    # Compute change
    df["score_change"] = df["quality_score"] - df["haiku_score"]

    # Join content for display
    content_cols = ["poem_id", "title", "content", "poet_name"]
    available_cols = [c for c in content_cols if c in content_df.columns]
    content_dedup = content_df[available_cols].drop_duplicates("poem_id")
    df = df.merge(content_dedup, on="poem_id", how="left", suffixes=("", "_content"))

    # Mark canon
    df["is_canon"] = df["poem_id"].isin(canon_by_id)
    df["canon_title"] = df["poem_id"].map(lambda x: canon_by_id.get(x, {}).get("canon_title", ""))
    df["fame_tier"] = df["poem_id"].map(lambda x: canon_by_id.get(x, {}).get("fame_tier", 0))

    # Stats
    before_stats = {
        "mean": float(df["haiku_score"].mean()),
        "std": float(df["haiku_score"].std()),
        "min": float(df["haiku_score"].min()),
        "max": float(df["haiku_score"].max()),
    }
    after_stats = {
        "mean": float(df["quality_score"].mean()),
        "std": float(df["quality_score"].std()),
        "min": float(df["quality_score"].min()),
        "max": float(df["quality_score"].max()),
    }

    # Histogram data
    before_hist = build_histogram_data(df["haiku_score"].values, bins=40)
    after_hist = build_histogram_data(df["quality_score"].values, bins=40)

    # Scatter data (sample 1000 for performance)
    sample = df.sample(min(1000, len(df)), random_state=42)
    scatter_data = [
        {"x": float(r["haiku_score"]), "y": float(r["quality_score"]),
         "canon": bool(r["is_canon"]),
         "tier": str(r.get("scoring_tier", "haiku")),
         "id": str(r["poem_id"])}
        for _, r in sample.iterrows()
    ]

    # Canon scatter (all canon poems)
    canon_scatter = []
    for _, r in df[df["is_canon"]].iterrows():
        canon_scatter.append({
            "x": float(r["haiku_score"]), "y": float(r["quality_score"]),
            "title": str(r.get("canon_title", r.get("title", "?")))[:30],
            "poet": str(canon_by_id.get(r["poem_id"], {}).get("poet", ""))[:20],
            "tier": int(r["fame_tier"]),
        })

    # Biggest movers
    gainers = df.nlargest(15, "score_change")
    losers = df.nsmallest(15, "score_change")

    gainers_data = []
    for _, r in gainers.iterrows():
        title = str(r.get("title", ""))[:40] if pd.notna(r.get("title")) else ""
        poet = str(r.get("poet_name", ""))[:20] if pd.notna(r.get("poet_name")) else ""
        excerpt = truncate_content(r.get("content", ""), 3)
        gainers_data.append({
            "id": str(r["poem_id"]),
            "title": title,
            "poet": poet,
            "before": float(r["haiku_score"]),
            "after": float(r["quality_score"]),
            "change": float(r["score_change"]),
            "tier": str(r.get("scoring_tier", "")),
            "excerpt": excerpt,
            "canon": bool(r["is_canon"]),
        })

    losers_data = []
    for _, r in losers.iterrows():
        title = str(r.get("title", ""))[:40] if pd.notna(r.get("title")) else ""
        poet = str(r.get("poet_name", ""))[:20] if pd.notna(r.get("poet_name")) else ""
        excerpt = truncate_content(r.get("content", ""), 3)
        losers_data.append({
            "id": str(r["poem_id"]),
            "title": title,
            "poet": poet,
            "before": float(r["haiku_score"]),
            "after": float(r["quality_score"]),
            "change": float(r["score_change"]),
            "tier": str(r.get("scoring_tier", "")),
            "excerpt": excerpt,
            "canon": bool(r["is_canon"]),
        })

    # Band examples (pick 3 poems from each score band)
    bands = [
        ("0-50: Flat/Broken", 0, 50),
        ("50-65: Below Average", 50, 65),
        ("65-75: Decent", 65, 75),
        ("75-82: Good", 75, 82),
        ("82-89: Excellent", 82, 89),
        ("90-100: Masterpiece", 90, 100),
    ]
    band_examples = []
    for label, lo, hi in bands:
        band_df = df[(df["quality_score"] >= lo) & (df["quality_score"] < hi)]
        count = len(band_df)
        examples = []
        for _, r in band_df.sample(min(3, len(band_df)), random_state=42).iterrows():
            title = str(r.get("title", ""))[:40] if pd.notna(r.get("title")) else ""
            poet = str(r.get("poet_name", ""))[:20] if pd.notna(r.get("poet_name")) else ""
            excerpt = truncate_content(r.get("content", ""), 4)
            examples.append({
                "id": str(r["poem_id"]),
                "title": title,
                "poet": poet,
                "score": float(r["quality_score"]),
                "excerpt": excerpt,
            })
        band_examples.append({"label": label, "count": count, "examples": examples})

    # Tier distribution
    tier_dist = {}
    for tier, count in df.get("scoring_tier", pd.Series(dtype=str)).value_counts().items():
        tier_dist[str(tier)] = int(count)

    # Build optimization panel data
    opt_panel_data = []
    for key, label in [("simba_haiku", "SIMBA Haiku"), ("simba_sonnet", "SIMBA Sonnet"),
                        ("mipro_haiku", "MIPROv2 Haiku"), ("mipro_sonnet", "MIPROv2 Sonnet")]:
        if key in opt_logs:
            log = opt_logs[key]
            baseline = log.get("baseline", log.get("baseline_eval_mae", {}))
            optimized = log.get("optimized_test", log.get("optimized_full_test", {}))
            # Handle different log formats
            b_mae = baseline.get("mae_overall", baseline.get("mae_overall", "?"))
            o_mae = optimized.get("mae_overall", "?") if optimized else "?"
            b_r = baseline.get("r_overall", "?")
            o_r = optimized.get("r_overall", "?") if optimized else "?"
            opt_panel_data.append({
                "label": label,
                "baseline_mae": b_mae,
                "optimized_mae": o_mae,
                "baseline_r": b_r,
                "optimized_r": o_r,
                "time": log.get("compile_time_sec", "?"),
            })

    # Build v7 comparison data if available
    v7_hist = None
    v7_stats = None
    if v7_df is not None:
        v7_map = v7_df.set_index("poem_id")["quality_score"]
        merged["v7_score"] = merged["poem_id"].map(v7_map)
        v7_hist = build_histogram_data(v7_df["quality_score"].dropna().values, bins=40)
        v7_stats = {
            "mean": float(v7_df["quality_score"].mean()),
            "std": float(v7_df["quality_score"].std()),
            "min": float(v7_df["quality_score"].min()),
            "max": float(v7_df["quality_score"].max()),
        }

    subtitle_text = {
        "v8": "DSPy-calibrated scoring: SIMBA-optimized Haiku + Sonnet + Canon boost",
        "v7": "Tiered re-scoring: Opus (top 500) + Sonnet (top 2000) + Haiku (rest) + Canon boost",
    }[version]

    # Build HTML
    html = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Arabic Poetry Score Analysis ({version.upper()})</title>
<style>
:root {{
    --bg: #0f172a;
    --card: #1e293b;
    --border: #334155;
    --text: #e2e8f0;
    --muted: #94a3b8;
    --accent: #38bdf8;
    --green: #4ade80;
    --red: #f87171;
    --gold: #fbbf24;
    --purple: #a78bfa;
}}
* {{ margin: 0; padding: 0; box-sizing: border-box; }}
body {{
    font-family: 'Segoe UI', Tahoma, sans-serif;
    background: var(--bg);
    color: var(--text);
    padding: 2rem;
    line-height: 1.6;
}}
h1 {{ color: var(--accent); font-size: 1.8rem; margin-bottom: 0.5rem; }}
h2 {{ color: var(--gold); font-size: 1.3rem; margin: 2rem 0 1rem; }}
h3 {{ color: var(--accent); font-size: 1.1rem; margin: 1rem 0 0.5rem; }}
.subtitle {{ color: var(--muted); margin-bottom: 2rem; }}
.grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; }}
.card {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1.5rem;
}}
.stat {{ font-size: 2rem; font-weight: bold; color: var(--accent); }}
.stat-label {{ color: var(--muted); font-size: 0.85rem; }}
canvas {{ max-width: 100%; background: var(--card); border-radius: 12px; border: 1px solid var(--border); }}
table {{
    width: 100%;
    border-collapse: collapse;
    font-size: 0.9rem;
}}
th {{ background: var(--card); color: var(--gold); padding: 0.5rem; text-align: right; border-bottom: 2px solid var(--border); }}
td {{ padding: 0.5rem; border-bottom: 1px solid var(--border); }}
tr:hover {{ background: rgba(56, 189, 248, 0.05); }}
.change-pos {{ color: var(--green); font-weight: bold; }}
.change-neg {{ color: var(--red); font-weight: bold; }}
.canon-badge {{ background: var(--gold); color: #000; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.75rem; }}
.tier-opus {{ color: var(--purple); }}
.tier-sonnet {{ color: var(--accent); }}
.tier-haiku {{ color: var(--muted); }}
.excerpt {{
    font-family: 'Amiri', 'Times New Roman', serif;
    font-size: 0.95rem;
    color: var(--muted);
    white-space: pre-line;
    direction: rtl;
    text-align: right;
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(0,0,0,0.2);
    border-radius: 6px;
    max-height: 120px;
    overflow: hidden;
}}
.band-card {{
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 1rem;
    margin-bottom: 1rem;
}}
.band-header {{
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
}}
.band-count {{ color: var(--muted); font-size: 0.85rem; }}
.example-row {{
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
    margin-top: 0.5rem;
}}
.example-card {{
    background: rgba(0,0,0,0.2);
    border-radius: 8px;
    padding: 0.75rem;
}}
.score-badge {{
    display: inline-block;
    padding: 0.1rem 0.5rem;
    border-radius: 4px;
    font-weight: bold;
    font-size: 0.85rem;
}}
.score-high {{ background: rgba(74, 222, 128, 0.2); color: var(--green); }}
.score-mid {{ background: rgba(56, 189, 248, 0.2); color: var(--accent); }}
.score-low {{ background: rgba(248, 113, 113, 0.2); color: var(--red); }}
</style>
<link href="https://fonts.googleapis.com/css2?family=Amiri&display=swap" rel="stylesheet">
</head>
<body>

<h1>Arabic Poetry Score Analysis ({version.upper()})</h1>
<p class="subtitle">{subtitle_text}</p>

<!-- DSPy Optimization Results -->
{'<h2>DSPy Optimization Results</h2><div class="grid">' + ''.join(f"""<div class="card">
    <div class="stat-label">{d['label']}</div>
    <div style="display:flex;gap:1rem;align-items:baseline">
        <div><span class="stat-label">MAE</span> <span style="color:var(--muted)">{d['baseline_mae']}</span> → <span style="color:var(--green);font-weight:bold">{d['optimized_mae']}</span></div>
        <div><span class="stat-label">r</span> <span style="color:var(--muted)">{d['baseline_r']}</span> → <span style="color:var(--green);font-weight:bold">{d['optimized_r']}</span></div>
    </div>
    <div class="stat-label" style="margin-top:0.3rem">Time: {d['time']}s</div>
</div>""" for d in opt_panel_data) + '</div>' if opt_panel_data else ''}

<!-- Summary Stats -->
<div class="grid">
    <div class="card">
        <div class="stat-label">v5: Haiku Baseline</div>
        <div class="stat">{before_stats['mean']:.1f}</div>
        <div class="stat-label">Mean score (std: {before_stats['std']:.1f}, range: {before_stats['min']:.0f}-{before_stats['max']:.0f})</div>
    </div>
    {'<div class="card"><div class="stat-label">v7: Tiered + Remap</div><div class="stat">' + f"{v7_stats['mean']:.1f}" + '</div><div class="stat-label">Mean score (std: ' + f"{v7_stats['std']:.1f}" + ', range: ' + f"{v7_stats['min']:.0f}-{v7_stats['max']:.0f}" + ')</div></div>' if v7_stats else ''}
    <div class="card">
        <div class="stat-label">{version.upper()}: Current</div>
        <div class="stat">{after_stats['mean']:.1f}</div>
        <div class="stat-label">Mean score (std: {after_stats['std']:.1f}, range: {after_stats['min']:.0f}-{after_stats['max']:.0f})</div>
    </div>
    <div class="card">
        <div class="stat-label">Score Spread (v5 → {version})</div>
        <div class="stat">{after_stats['std'] - before_stats['std']:+.1f}</div>
        <div class="stat-label">Standard deviation change</div>
    </div>
    <div class="card">
        <div class="stat-label">Scoring Tiers</div>
        <div style="font-size:0.9rem">
            {''.join(f'<div><span class="tier-{k.split("+")[0]}">{k}</span>: {v}</div>' for k, v in sorted(tier_dist.items()))}
        </div>
    </div>
</div>

<!-- Histograms -->
<h2>Score Distributions</h2>
<div class="grid">
    <div class="card">
        <h3>v5: Haiku Baseline</h3>
        <canvas id="histBefore" width="500" height="250"></canvas>
    </div>
    {'<div class="card"><h3>v7: Tiered + Quantile Remap</h3><canvas id="histV7" width="500" height="250"></canvas></div>' if v7_hist else ''}
    <div class="card">
        <h3>{version.upper()}: Current Scores</h3>
        <canvas id="histAfter" width="500" height="250"></canvas>
    </div>
</div>

<!-- Scatter Plot -->
<h2>Score Movement: Old vs New</h2>
<div class="card">
    <canvas id="scatter" width="800" height="500"></canvas>
    <p style="color:var(--muted);font-size:0.85rem;margin-top:0.5rem">
        Points above the diagonal gained score; below lost score.
        <span style="color:var(--gold)">Gold stars = canon poems</span>.
        <span class="tier-opus">Purple = Opus</span>,
        <span class="tier-sonnet">Blue = Sonnet</span>,
        <span class="tier-haiku">Gray = Haiku</span>.
    </p>
</div>

<!-- Canon Poems -->
<h2>Canon Poem Scores</h2>
<div class="card" style="overflow-x:auto">
    <table>
        <thead>
            <tr>
                <th>Tier</th>
                <th>Title</th>
                <th>Poet</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
            </tr>
        </thead>
        <tbody id="canonTable"></tbody>
    </table>
</div>

<!-- Biggest Gainers -->
<h2>Biggest Score Gainers</h2>
<div class="card" style="overflow-x:auto">
    <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>Poet</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
                <th>Tier</th>
                <th>Excerpt</th>
            </tr>
        </thead>
        <tbody id="gainersTable"></tbody>
    </table>
</div>

<!-- Biggest Losers -->
<h2>Biggest Score Drops</h2>
<div class="card" style="overflow-x:auto">
    <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>Poet</th>
                <th>Before</th>
                <th>After</th>
                <th>Change</th>
                <th>Tier</th>
                <th>Excerpt</th>
            </tr>
        </thead>
        <tbody id="losersTable"></tbody>
    </table>
</div>

<!-- Band Examples -->
<h2>Example Poems by Score Band</h2>
<div id="bandExamples"></div>

<script>
const beforeHist = {json.dumps(before_hist)};
const v7Hist = {json.dumps(v7_hist) if v7_hist else 'null'};
const afterHist = {json.dumps(after_hist)};
const scatterData = {json.dumps(scatter_data)};
const canonScatter = {json.dumps(canon_scatter)};
const gainers = {json.dumps(gainers_data)};
const losers = {json.dumps(losers_data)};
const bandExamples = {json.dumps(band_examples, ensure_ascii=False)};

// Histogram drawing
function drawHistogram(canvasId, data, color) {{
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const pad = {{t: 20, r: 20, b: 40, l: 50}};
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    const maxY = Math.max(...data.map(d => d.y));

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let x = 0; x <= 100; x += 20) {{
        const px = pad.l + (x / 100) * pw;
        ctx.fillText(x, px, h - pad.b + 15);
    }}
    ctx.textAlign = 'right';
    for (let y = 0; y <= maxY; y += Math.ceil(maxY / 5)) {{
        const py = h - pad.b - (y / maxY) * ph;
        ctx.fillText(y, pad.l - 5, py + 4);
    }}

    // Bars
    data.forEach(d => {{
        const bx = pad.l + (d.x / 100) * pw;
        const bw = (d.w / 100) * pw;
        const bh = (d.y / maxY) * ph;
        const by = h - pad.b - bh;
        ctx.fillStyle = color;
        ctx.fillRect(bx, by, bw - 1, bh);
    }});
}}

// Scatter plot
function drawScatter() {{
    const canvas = document.getElementById('scatter');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const pad = {{t: 20, r: 20, b: 50, l: 60}};
    const pw = w - pad.l - pad.r, ph = h - pad.t - pad.b;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, w, h);

    // Axes
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.l, pad.t);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, h - pad.b);
    ctx.stroke();

    // Diagonal line (no change)
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(pad.l, h - pad.b);
    ctx.lineTo(w - pad.r, pad.t);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    for (let x = 0; x <= 100; x += 10) {{
        const px = pad.l + (x / 100) * pw;
        ctx.fillText(x, px, h - pad.b + 15);
    }}
    ctx.fillText('Before (Haiku)', pad.l + pw/2, h - 5);

    ctx.save();
    ctx.translate(12, pad.t + ph/2);
    ctx.rotate(-Math.PI/2);
    ctx.textAlign = 'center';
    ctx.fillText('After (Tiered)', 0, 0);
    ctx.restore();

    ctx.textAlign = 'right';
    for (let y = 0; y <= 100; y += 10) {{
        const py = h - pad.b - (y / 100) * ph;
        ctx.fillText(y, pad.l - 5, py + 4);
    }}

    // Regular points
    const tierColors = {{opus: '#a78bfa', sonnet: '#38bdf8', haiku: '#64748b'}};
    scatterData.filter(d => !d.canon).forEach(d => {{
        const px = pad.l + (d.x / 100) * pw;
        const py = h - pad.b - (d.y / 100) * ph;
        const baseColor = d.tier.includes('opus') ? tierColors.opus :
                          d.tier.includes('sonnet') ? tierColors.sonnet : tierColors.haiku;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
    }});
    ctx.globalAlpha = 1;

    // Canon points (gold stars)
    canonScatter.forEach(d => {{
        const px = pad.l + (d.x / 100) * pw;
        const py = h - pad.b - (d.y / 100) * ph;
        ctx.fillStyle = '#fbbf24';
        ctx.font = d.tier === 1 ? '14px sans-serif' : '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('★', px, py + 4);
    }});
}}

// Tables
function buildMoversTable(containerId, data) {{
    const tbody = document.getElementById(containerId);
    data.forEach(d => {{
        const changeClass = d.change >= 0 ? 'change-pos' : 'change-neg';
        const changeSign = d.change >= 0 ? '+' : '';
        const canonBadge = d.canon ? ' <span class="canon-badge">Canon</span>' : '';
        const tierClass = d.tier.includes('opus') ? 'tier-opus' :
                          d.tier.includes('sonnet') ? 'tier-sonnet' : 'tier-haiku';
        tbody.innerHTML += `<tr>
            <td>${{d.title}}${{canonBadge}}</td>
            <td>${{d.poet}}</td>
            <td>${{d.before.toFixed(0)}}</td>
            <td>${{d.after.toFixed(0)}}</td>
            <td class="${{changeClass}}">${{changeSign}}${{d.change.toFixed(0)}}</td>
            <td class="${{tierClass}}">${{d.tier}}</td>
            <td><div class="excerpt">${{d.excerpt}}</div></td>
        </tr>`;
    }});
}}

function buildCanonTable() {{
    const tbody = document.getElementById('canonTable');
    canonScatter.sort((a, b) => b.y - a.y);
    canonScatter.forEach(d => {{
        const change = d.y - d.x;
        const changeClass = change >= 0 ? 'change-pos' : 'change-neg';
        const changeSign = change >= 0 ? '+' : '';
        tbody.innerHTML += `<tr>
            <td><span class="canon-badge">T${{d.tier}}</span></td>
            <td>${{d.title}}</td>
            <td>${{d.poet}}</td>
            <td>${{d.x.toFixed(0)}}</td>
            <td>${{d.y.toFixed(0)}}</td>
            <td class="${{changeClass}}">${{changeSign}}${{change.toFixed(0)}}</td>
        </tr>`;
    }});
}}

function buildBandExamples() {{
    const container = document.getElementById('bandExamples');
    const scoreColors = {{
        '90-100': 'score-high', '82-89': 'score-high',
        '75-82': 'score-mid', '65-75': 'score-mid',
        '50-65': 'score-low', '0-50': 'score-low',
    }};
    bandExamples.forEach(band => {{
        const range = band.label.split(':')[0].trim();
        const colorClass = Object.entries(scoreColors).find(([k]) => range.startsWith(k.split('-')[0]))?.[1] || 'score-mid';
        let html = `<div class="band-card">
            <div class="band-header">
                <h3>${{band.label}}</h3>
                <span class="band-count">${{band.count}} poems</span>
            </div>
            <div class="example-row">`;
        band.examples.forEach(ex => {{
            html += `<div class="example-card">
                <div><span class="score-badge ${{colorClass}}">${{ex.score.toFixed(0)}}</span>
                <strong>${{ex.title}}</strong> — ${{ex.poet}}</div>
                <div class="excerpt">${{ex.excerpt}}</div>
            </div>`;
        }});
        html += `</div></div>`;
        container.innerHTML += html;
    }});
}}

// Render
drawHistogram('histBefore', beforeHist, 'rgba(148, 163, 184, 0.6)');
if (v7Hist && document.getElementById('histV7')) drawHistogram('histV7', v7Hist, 'rgba(167, 139, 250, 0.6)');
drawHistogram('histAfter', afterHist, 'rgba(56, 189, 248, 0.6)');
drawScatter();
buildMoversTable('gainersTable', gainers);
buildMoversTable('losersTable', losers);
buildCanonTable();
buildBandExamples();
</script>

</body>
</html>"""

    with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
        f.write(html)

    print(f"Written to {OUTPUT_PATH}")
    print(f"  Total poems: {len(df)}")
    print(f"  Canon poems shown: {len(canon_scatter)}")
    print(f"  Score bands: {len(band_examples)}")


if __name__ == "__main__":
    main()
