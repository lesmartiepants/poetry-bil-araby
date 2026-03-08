"""Generate an HTML chart comparing DSPy optimization results across models.

Reads Haiku and Sonnet history JSON files and produces a self-contained HTML
file with dual-model comparison charts, prompt progression analysis, and
per-dimension breakdowns.

Charts:
  1. Trial Score Progression (MIPROv2 best-so-far score over trials)
  2. Per-Dimension Eval MAE (baseline vs optimized, grouped bars)
  3. Optimized Eval MAE Head-to-Head (Haiku vs Sonnet)
  4. Prompt Instruction Comparison (baseline vs optimized, side-by-side)
  5. Per-Poem Error Table (eval set)
  6. Key Findings & Analysis summary

Usage:
    python -m poetry_quality_and_curation.retriever_and_quality_curator.plot_optimization
    python -m poetry_quality_and_curation.retriever_and_quality_curator.plot_optimization --haiku data/dspy_haiku_history.json --sonnet data/dspy_sonnet_history.json
"""
import argparse
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DIMS = ["sound", "imagery", "emotion", "language", "cultural"]


def parse_args():
    p = argparse.ArgumentParser(description="Plot DSPy optimization results (dual-model comparison)")
    p.add_argument("--haiku", type=str,
                   default=str(DATA_DIR / "dspy_haiku_history.json"),
                   help="Haiku history JSON path")
    p.add_argument("--sonnet", type=str,
                   default=str(DATA_DIR / "dspy_sonnet_history.json"),
                   help="Sonnet history JSON path")
    p.add_argument("--output", type=str,
                   default=str(DATA_DIR / "dspy_optimization_chart.html"),
                   help="Output HTML path")
    return p.parse_args()


def load_history(path: str) -> dict | None:
    """Load a history JSON file, returning None if it doesn't exist."""
    p = Path(path)
    if not p.exists():
        return None
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _extract_trial_scores(h: dict) -> list[float]:
    """Extract trial scores from prompt_progression or iterations."""
    # MIPROv2 format: prompt_progression has trial/score entries
    prog = h.get("prompt_progression", [])
    if prog and all("score" in p for p in prog):
        return [p["score"] for p in prog]

    # Iteration format: iterations with eval_mae
    iters = h.get("iterations", [])
    scores = []
    for it in iters:
        eval_mae = it.get("eval_mae", {})
        mae = eval_mae.get("mae_overall")
        if mae is not None:
            scores.append(round((1.0 - mae / 100.0) * 100.0, 2))
    return scores


def _extract_best_so_far(scores: list[float]) -> list[float]:
    """Convert trial scores to running-best series."""
    best = []
    current_best = 0
    for s in scores:
        current_best = max(current_best, s)
        best.append(current_best)
    return best


def _get_eval_baseline(h: dict) -> dict:
    """Get baseline eval MAE from history (handles old and new formats)."""
    return h.get("baseline_eval_mae", h.get("val_baseline", h.get("baseline", {})))


def _get_eval_optimized(h: dict) -> dict:
    """Get optimized eval MAE from history (handles old and new formats)."""
    return h.get("optimized_eval_mae", h.get("val_optimized", h.get("optimized", {})))


def _model_stat_cards(label: str, h: dict, color_class: str) -> str:
    """Generate stat cards for one model."""
    n_poems = h.get("num_examples", 0)
    train_size = h.get("train_size", 0)
    eval_size = h.get("eval_size", h.get("val_size", 0))
    num_demos = h.get("num_demos", 0)
    elapsed = h.get("elapsed_seconds", 0)
    optimizer = h.get("optimizer", "?")
    num_trials = h.get("num_trials", 0)

    baseline_eval = _get_eval_baseline(h)
    optimized_eval = _get_eval_optimized(h)
    b_mae = baseline_eval.get("mae_overall", 0)
    o_mae = optimized_eval.get("mae_overall", 0)
    improvement = b_mae - o_mae
    pct = (improvement / b_mae * 100) if b_mae else 0

    improved = improvement > 0.05
    val_class = "good" if improved else ("bad" if improvement < -0.05 else "neutral")

    cards = f"""
    <div class="model-header {color_class}">{label} ({n_poems} poems: {train_size} train / {eval_size} eval, {optimizer}, {num_trials} trials)</div>
    <div class="stats-row">
        <div class="stat-card">
            <div class="stat-label">Baseline Eval MAE</div>
            <div class="stat-value neutral">{b_mae:.2f}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Optimized Eval MAE</div>
            <div class="stat-value {val_class}">{o_mae:.2f}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Improvement</div>
            <div class="stat-value {val_class}">{improvement:+.2f} ({pct:+.1f}%)</div>
        </div>"""
    if num_demos > 0:
        cards += f"""
        <div class="stat-card">
            <div class="stat-label">Few-Shot Demos</div>
            <div class="stat-value">{num_demos}</div>
        </div>"""
    cards += f"""
        <div class="stat-card">
            <div class="stat-label">Time</div>
            <div class="stat-value" style="font-size:1.2rem">{elapsed/60:.1f}m</div>
        </div>
    </div>"""
    return cards


def _build_findings_html(haiku: dict | None, sonnet: dict | None) -> str:
    """Build a Key Findings section with analysis of the optimization results."""
    findings = []

    for name, h, color in [("Haiku", haiku, "#f472b6"), ("Sonnet", sonnet, "#60a5fa")]:
        if not h:
            continue
        b = _get_eval_baseline(h)
        o = _get_eval_optimized(h)
        b_mae = b.get("mae_overall", 0)
        o_mae = o.get("mae_overall", 0)
        diff = b_mae - o_mae

        # Per-dimension analysis
        dim_changes = []
        for d in DIMS:
            bd = b.get(f"mae_{d}", 0)
            od = o.get(f"mae_{d}", 0)
            dim_changes.append((d, bd, od, bd - od))

        improved_dims = [dc for dc in dim_changes if dc[3] > 0.1]
        worsened_dims = [dc for dc in dim_changes if dc[3] < -0.1]

        finding = f'<div class="finding-card"><h3 style="color:{color}">{name}</h3>'
        if diff > 0.05:
            finding += f'<p class="finding-good">Eval MAE improved by {diff:.2f} points ({diff/b_mae*100:.1f}%)</p>'
        elif diff < -0.05:
            finding += f'<p class="finding-bad">Eval MAE worsened by {abs(diff):.2f} points ({abs(diff)/b_mae*100:.1f}%) -- possible overfitting to training set</p>'
        else:
            finding += f'<p class="finding-neutral">Eval MAE essentially unchanged ({diff:+.2f})</p>'

        if improved_dims:
            finding += '<p class="finding-detail">Improved dimensions: '
            finding += ', '.join(f'{d} ({v:+.1f})' for d, _, _, v in improved_dims)
            finding += '</p>'
        if worsened_dims:
            finding += '<p class="finding-detail">Worsened dimensions: '
            finding += ', '.join(f'{d} ({v:+.1f})' for d, _, _, v in worsened_dims)
            finding += '</p>'

        # Demos info
        num_demos = h.get("num_demos", 0)
        if num_demos:
            finding += f'<p class="finding-detail">Optimized prompt uses {num_demos} few-shot demonstration poems</p>'

        finding += '</div>'
        findings.append(finding)

    # Overall analysis
    overall = '<div class="finding-card"><h3 style="color:#94a3b8">Overall Analysis</h3>'
    if haiku and sonnet:
        hb = _get_eval_baseline(haiku).get("mae_overall", 0)
        ho = _get_eval_optimized(haiku).get("mae_overall", 0)
        sb = _get_eval_baseline(sonnet).get("mae_overall", 0)
        so = _get_eval_optimized(sonnet).get("mae_overall", 0)

        overall += f'<p class="finding-detail">Sonnet baseline MAE ({sb:.2f}) is {"lower" if sb < hb else "higher"} than Haiku ({hb:.2f}), '
        overall += f'confirming Sonnet scores closer to Opus ground truth</p>'

        overall += '<p class="finding-detail">Both models were optimized with MIPROv2 using the same 240-poem Opus ground truth dataset. '
        overall += 'The Arabic scoring prompt was crafted specifically for Arabic poetry evaluation across 5 dimensions (sound, imagery, emotion, language, cultural)</p>'

        h_improved = hb - ho > 0.05
        s_improved = sb - so > 0.05
        if not h_improved and not s_improved:
            overall += '<p class="finding-detail">Neither model showed significant eval-set improvement from prompt optimization, '
            overall += 'suggesting the baseline Arabic rubric prompt is already near-optimal for these models. '
            overall += 'The optimized instructions are more detailed but may overfit to training poems rather than generalizing to the eval set.</p>'
    overall += '</div>'
    findings.append(overall)

    return '\n'.join(findings)


def _build_prompt_comparison_html(haiku: dict | None, sonnet: dict | None) -> str:
    """Build side-by-side prompt comparison section."""
    sections = []
    for name, h, color in [("Haiku", haiku, "#f472b6"), ("Sonnet", sonnet, "#60a5fa")]:
        if not h:
            continue
        baseline = h.get("baseline_instructions", "")
        optimized = h.get("optimized_instructions", "")
        if not baseline and not optimized:
            continue

        b_esc = baseline.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        o_esc = optimized.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

        b_len = len(baseline)
        o_len = len(optimized)
        ratio = o_len / b_len if b_len else 0

        sections.append(f"""
        <div class="section">
            <h2 style="color:{color}">{name} Prompt Evolution</h2>
            <p class="prompt-meta">Baseline: {b_len} chars | Optimized: {o_len} chars ({ratio:.1f}x {'longer' if ratio > 1 else 'shorter'})</p>
            <div class="prompt-grid">
                <div class="prompt-col">
                    <div class="prompt-label">Baseline Prompt</div>
                    <pre class="instructions" dir="rtl">{b_esc}</pre>
                </div>
                <div class="prompt-col">
                    <div class="prompt-label">Optimized Prompt (MIPROv2)</div>
                    <pre class="instructions" dir="rtl">{o_esc}</pre>
                </div>
            </div>
        </div>""")
    return '\n'.join(sections)


def generate_html(haiku: dict | None, sonnet: dict | None) -> str:
    """Generate a self-contained HTML chart comparing both models."""
    models = {}
    if haiku:
        models["haiku"] = haiku
    if sonnet:
        models["sonnet"] = sonnet

    if not models:
        return "<html><body><h1>No data found</h1></body></html>"

    # --- Data prep for JS ---
    dim_labels_js = json.dumps(DIMS)

    # Per-dim eval MAE for bar charts
    haiku_baseline_dims = json.dumps([_get_eval_baseline(haiku).get(f"mae_{d}", 0) for d in DIMS] if haiku else [])
    haiku_optimized_dims = json.dumps([_get_eval_optimized(haiku).get(f"mae_{d}", 0) for d in DIMS] if haiku else [])
    sonnet_baseline_dims = json.dumps([_get_eval_baseline(sonnet).get(f"mae_{d}", 0) for d in DIMS] if sonnet else [])
    sonnet_optimized_dims = json.dumps([_get_eval_optimized(sonnet).get(f"mae_{d}", 0) for d in DIMS] if sonnet else [])

    # Trial scores for convergence chart
    haiku_trial_scores = json.dumps(_extract_trial_scores(haiku) if haiku else [])
    sonnet_trial_scores = json.dumps(_extract_trial_scores(sonnet) if sonnet else [])
    haiku_best_so_far = json.dumps(_extract_best_so_far(_extract_trial_scores(haiku)) if haiku else [])
    sonnet_best_so_far = json.dumps(_extract_best_so_far(_extract_trial_scores(sonnet)) if sonnet else [])

    # Baseline reference values
    haiku_baseline_mae = _get_eval_baseline(haiku).get("mae_overall", 0) if haiku else 0
    sonnet_baseline_mae = _get_eval_baseline(sonnet).get("mae_overall", 0) if sonnet else 0
    # Convert to DSPy score space for annotation on trial chart
    haiku_baseline_score = round((1.0 - haiku_baseline_mae / 100.0) * 100.0, 2)
    sonnet_baseline_score = round((1.0 - sonnet_baseline_mae / 100.0) * 100.0, 2)

    # Per-poem details
    def poem_table_data(h):
        if not h:
            return [], []
        details = h.get("poem_details", [])
        labels = [p.get("poem_text_prefix", "")[:40].replace("\n", " ").replace("\r", " ") for p in details]
        errors = []
        for p in details:
            row = {}
            for d in DIMS:
                row[f"{d}_b"] = p.get(f"{d}_baseline_err", 0)
                row[f"{d}_o"] = p.get(f"{d}_optimized_err", 0)
            errors.append(row)
        return labels, errors

    haiku_poem_labels, haiku_poem_errors = poem_table_data(haiku)
    sonnet_poem_labels, sonnet_poem_errors = poem_table_data(sonnet)

    # --- Stat cards ---
    stat_cards_html = ""
    if haiku:
        stat_cards_html += _model_stat_cards("Haiku", haiku, "haiku-color")
    if sonnet:
        stat_cards_html += _model_stat_cards("Sonnet", sonnet, "sonnet-color")

    # --- Key findings ---
    findings_html = _build_findings_html(haiku, sonnet)

    # --- Prompt comparison ---
    prompt_comparison_html = _build_prompt_comparison_html(haiku, sonnet)

    has_haiku = "true" if haiku else "false"
    has_sonnet = "true" if sonnet else "false"

    html = f"""<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DSPy Prompt Optimization -- Model Comparison</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.1.0/dist/chartjs-plugin-annotation.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            padding: 2rem;
            max-width: 1400px;
            margin: 0 auto;
        }}
        h1 {{ font-size: 1.8rem; margin-bottom: 0.5rem; color: #f1f5f9; }}
        h2 {{ font-size: 1.3rem; margin-bottom: 1rem; color: #cbd5e1; }}
        h3 {{ font-size: 1.1rem; margin-bottom: 0.5rem; }}
        .subtitle {{ color: #94a3b8; margin-bottom: 2rem; }}
        .model-header {{
            font-size: 1.2rem;
            font-weight: 700;
            padding: 0.5rem 0;
            margin-top: 1rem;
            border-bottom: 2px solid;
        }}
        .haiku-color {{ color: #f472b6; border-color: #f472b6; }}
        .sonnet-color {{ color: #60a5fa; border-color: #60a5fa; }}
        .stats-row {{
            display: flex;
            gap: 1rem;
            flex-wrap: wrap;
            margin: 1rem 0 1.5rem 0;
        }}
        .stat-card {{
            background: #1e293b;
            border-radius: 12px;
            padding: 1rem 1.2rem;
            min-width: 140px;
            flex: 1;
        }}
        .stat-label {{ font-size: 0.8rem; color: #94a3b8; margin-bottom: 0.3rem; }}
        .stat-value {{ font-size: 1.6rem; font-weight: 700; }}
        .stat-value.good {{ color: #4ade80; }}
        .stat-value.neutral {{ color: #fbbf24; }}
        .stat-value.bad {{ color: #f87171; }}
        .section {{
            background: #1e293b;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 2rem;
        }}
        .chart-container {{
            position: relative;
            height: 400px;
            width: 100%;
        }}
        .chart-container.tall {{
            height: 500px;
        }}
        .grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        @media (max-width: 900px) {{
            .grid {{ grid-template-columns: 1fr; }}
        }}
        .instructions {{
            background: #0f172a;
            padding: 1rem;
            border-radius: 8px;
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 0.85rem;
            line-height: 1.6;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Amiri', 'Noto Sans Arabic', serif;
        }}
        .prompt-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }}
        @media (max-width: 900px) {{
            .prompt-grid {{ grid-template-columns: 1fr; }}
        }}
        .prompt-col {{ flex: 1; }}
        .prompt-label {{
            font-size: 0.85rem;
            font-weight: 600;
            color: #94a3b8;
            margin-bottom: 0.5rem;
            padding-bottom: 0.25rem;
            border-bottom: 1px solid #334155;
        }}
        .prompt-meta {{
            color: #64748b;
            font-size: 0.8rem;
            margin-bottom: 1rem;
        }}
        .finding-card {{
            background: #1e293b;
            border-radius: 12px;
            padding: 1.2rem;
            margin-bottom: 1rem;
        }}
        .finding-good {{ color: #4ade80; font-weight: 600; margin: 0.3rem 0; }}
        .finding-bad {{ color: #f87171; font-weight: 600; margin: 0.3rem 0; }}
        .finding-neutral {{ color: #fbbf24; font-weight: 600; margin: 0.3rem 0; }}
        .finding-detail {{ color: #cbd5e1; font-size: 0.9rem; margin: 0.3rem 0; line-height: 1.5; }}
        table {{ width: 100%; border-collapse: collapse; font-size: 0.8rem; }}
        th, td {{ padding: 0.4rem 0.6rem; text-align: center; border-bottom: 1px solid #334155; }}
        th {{ color: #94a3b8; font-weight: 600; }}
        td.better {{ color: #4ade80; }}
        td.worse {{ color: #f87171; }}
    </style>
</head>
<body>
    <h1>DSPy Prompt Optimization -- Dual-Model Comparison</h1>
    <p class="subtitle">MIPROv2 optimization of Arabic poetry scoring prompts for Haiku & Sonnet, validated against 240-poem Opus ground truth</p>

    {stat_cards_html}

    <!-- Key Findings -->
    <div class="section">
        <h2>Key Findings</h2>
        {findings_html}
    </div>

    <!-- Trial Score Progression (full width) -->
    <div class="section">
        <h2>MIPROv2 Trial Score Progression (higher = better)</h2>
        <p class="prompt-meta">Each trial tests a different instruction + few-shot demo combination. Score = 1 - (MAE/100). Dashed line = running best.</p>
        <div class="chart-container tall">
            <canvas id="trialChart"></canvas>
        </div>
    </div>

    <div class="grid">
        <div class="section">
            <h2>Per-Dimension Eval MAE: Baseline vs Optimized</h2>
            <div class="chart-container">
                <canvas id="dimChart"></canvas>
            </div>
        </div>
        <div class="section">
            <h2>Optimized Eval MAE by Dimension (Head-to-Head)</h2>
            <div class="chart-container">
                <canvas id="h2hOptChart"></canvas>
            </div>
        </div>
    </div>

    <!-- Prompt comparison -->
    {prompt_comparison_html}

    <div id="poemTableSection"></div>

    <script>
    const hasHaiku = {has_haiku};
    const hasSonnet = {has_sonnet};
    const dims = {dim_labels_js};

    const haikuBaselineDims = {haiku_baseline_dims};
    const haikuOptimizedDims = {haiku_optimized_dims};
    const sonnetBaselineDims = {sonnet_baseline_dims};
    const sonnetOptimizedDims = {sonnet_optimized_dims};

    // Trial scores
    const haikuTrialScores = {haiku_trial_scores};
    const sonnetTrialScores = {sonnet_trial_scores};
    const haikuBestSoFar = {haiku_best_so_far};
    const sonnetBestSoFar = {sonnet_best_so_far};

    // Baseline reference scores
    const haikuBaselineScore = {haiku_baseline_score};
    const sonnetBaselineScore = {sonnet_baseline_score};

    const haikuPoemLabels = {json.dumps(haiku_poem_labels)};
    const haikuPoemErrors = {json.dumps(haiku_poem_errors)};
    const sonnetPoemLabels = {json.dumps(sonnet_poem_labels)};
    const sonnetPoemErrors = {json.dumps(sonnet_poem_errors)};

    const chartDefaults = {{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {{ legend: {{ labels: {{ color: '#e2e8f0' }} }} }},
    }};
    const axisStyle = {{ grid: {{ color: '#334155' }}, ticks: {{ color: '#94a3b8' }} }};

    // -- Chart 1: Trial score progression --
    const trialDatasets = [];
    const trialAnnotations = {{}};

    const maxTrials = Math.max(haikuTrialScores.length, sonnetTrialScores.length);
    const trialLabels = Array.from({{length: maxTrials}}, (_, i) => 'Trial ' + (i + 1));

    if (hasHaiku && haikuTrialScores.length > 0) {{
        trialDatasets.push({{
            label: 'Haiku Trial Score',
            data: haikuTrialScores,
            borderColor: 'rgba(244, 114, 182, 0.5)',
            backgroundColor: 'rgba(244, 114, 182, 0.15)',
            pointRadius: 5,
            pointBackgroundColor: 'rgba(244, 114, 182, 0.8)',
            borderWidth: 1,
            fill: false,
            tension: 0,
            type: 'line',
        }});
        trialDatasets.push({{
            label: 'Haiku Best So Far',
            data: haikuBestSoFar,
            borderColor: 'rgba(244, 114, 182, 1)',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.2,
        }});
        trialAnnotations.haikuBaseline = {{
            type: 'line',
            yMin: haikuBaselineScore,
            yMax: haikuBaselineScore,
            borderColor: 'rgba(244, 114, 182, 0.3)',
            borderWidth: 2,
            borderDash: [10, 5],
            label: {{
                display: true,
                content: 'Haiku baseline (' + haikuBaselineScore.toFixed(1) + ')',
                position: 'start',
                color: 'rgba(244, 114, 182, 0.6)',
                font: {{ size: 10 }},
            }},
        }};
    }}

    if (hasSonnet && sonnetTrialScores.length > 0) {{
        trialDatasets.push({{
            label: 'Sonnet Trial Score',
            data: sonnetTrialScores,
            borderColor: 'rgba(96, 165, 250, 0.5)',
            backgroundColor: 'rgba(96, 165, 250, 0.15)',
            pointRadius: 5,
            pointBackgroundColor: 'rgba(96, 165, 250, 0.8)',
            borderWidth: 1,
            fill: false,
            tension: 0,
            type: 'line',
        }});
        trialDatasets.push({{
            label: 'Sonnet Best So Far',
            data: sonnetBestSoFar,
            borderColor: 'rgba(96, 165, 250, 1)',
            borderWidth: 2.5,
            borderDash: [6, 3],
            pointRadius: 0,
            fill: false,
            tension: 0.2,
        }});
        trialAnnotations.sonnetBaseline = {{
            type: 'line',
            yMin: sonnetBaselineScore,
            yMax: sonnetBaselineScore,
            borderColor: 'rgba(96, 165, 250, 0.3)',
            borderWidth: 2,
            borderDash: [10, 5],
            label: {{
                display: true,
                content: 'Sonnet baseline (' + sonnetBaselineScore.toFixed(1) + ')',
                position: 'end',
                color: 'rgba(96, 165, 250, 0.6)',
                font: {{ size: 10 }},
            }},
        }};
    }}

    if (trialDatasets.length > 0) {{
        new Chart(document.getElementById('trialChart'), {{
            type: 'line',
            data: {{ labels: trialLabels, datasets: trialDatasets }},
            options: {{
                ...chartDefaults,
                plugins: {{
                    ...chartDefaults.plugins,
                    annotation: {{ annotations: trialAnnotations }},
                    tooltip: {{
                        callbacks: {{
                            afterLabel: function(ctx) {{
                                const mae = ((1 - ctx.parsed.y / 100) * 100).toFixed(2);
                                return 'MAE: ' + mae;
                            }}
                        }}
                    }},
                }},
                scales: {{
                    y: {{
                        title: {{ display: true, text: 'Score (1 - MAE/100) x 100', color: '#94a3b8' }},
                        ...axisStyle,
                    }},
                    x: {{
                        title: {{ display: true, text: 'Trial', color: '#94a3b8' }},
                        ...axisStyle,
                        grid: {{ display: false }},
                    }},
                }},
            }},
        }});
    }} else {{
        const container = document.getElementById('trialChart').parentElement;
        const msg = document.createElement('p');
        msg.style.cssText = 'color:#94a3b8;text-align:center;padding:2rem;';
        msg.textContent = 'No trial progression data available. Run optimization with MIPROv2 first.';
        container.replaceChildren(msg);
    }}

    // -- Chart 2: Per-dimension grouped bar (baseline + optimized, eval set) --
    const dimDatasets = [];
    if (hasHaiku) {{
        dimDatasets.push({{
            label: 'Haiku Baseline',
            data: haikuBaselineDims,
            backgroundColor: 'rgba(244, 114, 182, 0.4)',
            borderColor: 'rgba(244, 114, 182, 0.8)',
            borderWidth: 1,
        }});
        dimDatasets.push({{
            label: 'Haiku Optimized',
            data: haikuOptimizedDims,
            backgroundColor: 'rgba(244, 114, 182, 0.85)',
            borderColor: 'rgba(244, 114, 182, 1)',
            borderWidth: 1,
        }});
    }}
    if (hasSonnet) {{
        dimDatasets.push({{
            label: 'Sonnet Baseline',
            data: sonnetBaselineDims,
            backgroundColor: 'rgba(96, 165, 250, 0.4)',
            borderColor: 'rgba(96, 165, 250, 0.8)',
            borderWidth: 1,
        }});
        dimDatasets.push({{
            label: 'Sonnet Optimized',
            data: sonnetOptimizedDims,
            backgroundColor: 'rgba(96, 165, 250, 0.85)',
            borderColor: 'rgba(96, 165, 250, 1)',
            borderWidth: 1,
        }});
    }}
    new Chart(document.getElementById('dimChart'), {{
        type: 'bar',
        data: {{ labels: dims, datasets: dimDatasets }},
        options: {{
            ...chartDefaults,
            scales: {{
                y: {{ beginAtZero: true, title: {{ display: true, text: 'Eval MAE (lower = better)', color: '#94a3b8' }}, ...axisStyle }},
                x: {{ ...axisStyle, grid: {{ display: false }} }},
            }},
        }},
    }});

    // -- Chart 3: Head-to-head optimized eval MAE --
    const h2hOptDatasets = [];
    if (hasHaiku) {{
        h2hOptDatasets.push({{
            label: 'Haiku',
            data: haikuOptimizedDims,
            backgroundColor: 'rgba(244, 114, 182, 0.7)',
            borderColor: 'rgba(244, 114, 182, 1)',
            borderWidth: 1,
        }});
    }}
    if (hasSonnet) {{
        h2hOptDatasets.push({{
            label: 'Sonnet',
            data: sonnetOptimizedDims,
            backgroundColor: 'rgba(96, 165, 250, 0.7)',
            borderColor: 'rgba(96, 165, 250, 1)',
            borderWidth: 1,
        }});
    }}
    new Chart(document.getElementById('h2hOptChart'), {{
        type: 'bar',
        data: {{ labels: dims, datasets: h2hOptDatasets }},
        options: {{
            ...chartDefaults,
            scales: {{
                y: {{ beginAtZero: true, title: {{ display: true, text: 'Optimized Eval MAE (lower = better)', color: '#94a3b8' }}, ...axisStyle }},
                x: {{ ...axisStyle, grid: {{ display: false }} }},
            }},
        }},
    }});

    // -- Per-poem error table --
    const section = document.getElementById('poemTableSection');
    const poemData = [
        {{ name: 'Haiku', labels: haikuPoemLabels, errors: haikuPoemErrors, color: '#f472b6' }},
        {{ name: 'Sonnet', labels: sonnetPoemLabels, errors: sonnetPoemErrors, color: '#60a5fa' }},
    ];

    poemData.forEach(model => {{
        if (model.labels.length === 0) return;
        const wrapper = document.createElement('div');
        wrapper.className = 'section';

        const title = document.createElement('h2');
        title.textContent = model.name + ' Per-Poem Error Breakdown (Eval Set)';
        wrapper.appendChild(title);

        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        const headers = ['Poem'];
        dims.forEach(d => {{ headers.push(d + ' (B)'); headers.push(d + ' (O)'); }});
        headers.push('Avg B', 'Avg O');
        headers.forEach(h => {{
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        }});
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let i = 0; i < model.labels.length; i++) {{
            const row = document.createElement('tr');
            const labelCell = document.createElement('td');
            labelCell.style.cssText = 'text-align:left;direction:rtl;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
            labelCell.textContent = model.labels[i];
            row.appendChild(labelCell);

            let baseSum = 0, optSum = 0;
            const errs = model.errors[i];
            dims.forEach(d => {{
                const bErr = errs[d + '_b'] || 0;
                const oErr = errs[d + '_o'] || 0;
                baseSum += bErr;
                optSum += oErr;

                const bCell = document.createElement('td');
                bCell.className = bErr <= oErr ? 'better' : 'worse';
                bCell.textContent = bErr;
                row.appendChild(bCell);

                const oCell = document.createElement('td');
                oCell.className = oErr <= bErr ? 'better' : 'worse';
                oCell.textContent = oErr;
                row.appendChild(oCell);
            }});

            const avgBCell = document.createElement('td');
            avgBCell.textContent = (baseSum / dims.length).toFixed(1);
            row.appendChild(avgBCell);

            const avgOCell = document.createElement('td');
            avgOCell.textContent = (optSum / dims.length).toFixed(1);
            row.appendChild(avgOCell);

            tbody.appendChild(row);
        }}
        table.appendChild(tbody);
        wrapper.appendChild(table);
        section.appendChild(wrapper);
    }});
    </script>
</body>
</html>"""
    return html


def main():
    args = parse_args()

    haiku = load_history(args.haiku)
    sonnet = load_history(args.sonnet)

    if not haiku and not sonnet:
        print("ERROR: No history files found.")
        print(f"  Haiku:  {args.haiku}")
        print(f"  Sonnet: {args.sonnet}")
        print("Run optimize_prompt.py --model haiku/sonnet first.")
        return

    found = []
    if haiku:
        found.append(f"Haiku ({args.haiku})")
    if sonnet:
        found.append(f"Sonnet ({args.sonnet})")
    print(f"Loaded: {', '.join(found)}")

    html = generate_html(haiku, sonnet)
    output_path = Path(args.output)
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(html)

    print(f"Chart saved to {output_path}")
    print(f"Open in browser: file://{output_path.resolve()}")


if __name__ == "__main__":
    main()
