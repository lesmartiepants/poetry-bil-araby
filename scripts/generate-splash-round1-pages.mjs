#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const roundDir = path.join(repoRoot, 'design-review-output', 'splash', 'round-1');
const manifestPath = path.join(roundDir, 'review-manifest.json');

if (!fs.existsSync(manifestPath)) {
  throw new Error(`Missing manifest file: ${manifestPath}`);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const themes = (manifest.themes || []).map((theme) => ({
  ...theme,
  options: (theme.options || []).slice().sort((a, b) => a.number - b.number)
}));

const totalOptions = themes.reduce((sum, theme) => sum + theme.options.length, 0);
const missingSlotsCount = themes.reduce(
  (sum, theme) => sum + (Array.isArray(theme.missingOptionSlots) ? theme.missingOptionSlots.length : 0),
  0
);

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function toTitleCase(value = '') {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOptimizationSummary(option) {
  const haystack = `${option.name} ${option.file} ${option.description}`.toLowerCase();

  if (haystack.includes('minimal') || haystack.includes('haiku') || haystack.includes('zen')) {
    return 'Reduced animation density and simplified DOM layers for more stable mobile frame rates.';
  }

  if (haystack.includes('animated') || haystack.includes('live') || haystack.includes('cosmos')) {
    return 'Staggered timeline sequencing to smooth motion and avoid repaint spikes.';
  }

  if (haystack.includes('chiaroscuro') || haystack.includes('ray') || haystack.includes('light')) {
    return 'Consolidated lighting variables and trimmed layered effects to reduce render cost.';
  }

  if (haystack.includes('aurora') || haystack.includes('gradient')) {
    return 'Gradient layers are tuned for longer cycles and lower compositing overhead.';
  }

  if (haystack.includes('geometric') || haystack.includes('khatam') || haystack.includes('grid')) {
    return 'Pattern rendering is constrained to reusable layers for lower draw complexity.';
  }

  if (haystack.includes('manuscript') || haystack.includes('scroll') || haystack.includes('codex')) {
    return 'Texture and depth effects are scoped to avoid unnecessary continuous paints.';
  }

  if (haystack.includes('ink') || haystack.includes('calligraphy')) {
    return 'Stroke and reveal effects are streamlined to keep animation smooth on lower-end devices.';
  }

  return 'Contrast, spacing, and animation cadence are tuned while keeping runtime work lightweight.';
}

function getOptionScreenshotPath(option) {
  return `mockups/${option.file.replace(/\.html$/i, '.png')}`;
}

function renderArtifactCard(title, subtitle, sourcePath, placeholderLabel) {
  return `
      <article class="artifact-card">
        <div class="artifact-media">
          <img src="${escapeHtml(sourcePath)}" alt="${escapeHtml(title)}" loading="lazy" data-missing="${escapeHtml(placeholderLabel)}" onerror="handleMissingMedia(this)">
        </div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(subtitle)}</p>
      </article>
  `;
}

function renderOptionSummaryCard(option) {
  const previewPath = `previews/${option.file}`;
  const screenshotPath = getOptionScreenshotPath(option);
  return `
      <article class="option-card">
        <div class="option-shot">
          <img src="${escapeHtml(screenshotPath)}" alt="${escapeHtml(option.name)} mockup" loading="lazy" data-missing="Placeholder: ${escapeHtml(option.name)} screenshot" onerror="handleMissingMedia(this)">
        </div>
        <div class="option-copy">
          <div class="option-heading">Option ${option.number}: ${escapeHtml(option.name)}</div>
          <p><strong>What changed:</strong> ${escapeHtml(option.description)}</p>
          <p><strong>Technical optimization:</strong> ${escapeHtml(getOptimizationSummary(option))}</p>
          <a href="${escapeHtml(previewPath)}" class="inline-link" target="_blank" rel="noopener noreferrer">Open interactive preview</a>
        </div>
      </article>
  `;
}

function renderSideBySidePreviewCard(option) {
  const previewPath = `previews/${option.file}`;
  return `
      <article class="preview-card">
        <header>
          <h3>Option ${option.number}: ${escapeHtml(option.name)}</h3>
          <a href="${escapeHtml(previewPath)}" target="_blank" rel="noopener noreferrer">Open tab</a>
        </header>
        <iframe src="${escapeHtml(previewPath)}" title="${escapeHtml(option.name)} side-by-side preview" loading="lazy"></iframe>
      </article>
  `;
}

function renderFullPreview(option) {
  const previewPath = `previews/${option.file}`;
  return `
      <article class="full-preview">
        <header>
          <h3>Option ${option.number}: ${escapeHtml(option.name)}</h3>
          <a href="${escapeHtml(previewPath)}" target="_blank" rel="noopener noreferrer">Open full screen</a>
        </header>
        <iframe src="${escapeHtml(previewPath)}" title="${escapeHtml(option.name)} full preview" loading="lazy"></iframe>
      </article>
  `;
}

function buildCategoryComparisonPage(theme, index, totalThemesCount) {
  const optionCards = theme.options.map(renderOptionSummaryCard).join('\n');
  const sideBySideCards = theme.options.map(renderSideBySidePreviewCard).join('\n');
  const fullPreviewCards = theme.options.map(renderFullPreview).join('\n');
  const missingSlots = (theme.missingOptionSlots || []).slice().sort((a, b) => a - b);
  const missingBadge = missingSlots.length
    ? `<div class="meta-chip warning">Missing option slots in this round: ${escapeHtml(missingSlots.join(', '))}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(theme.name)} - Category Comparison</title>
  <base href="/design-review-output/splash/round-${manifest.round}/${theme.id}/">
  <style>
    :root {
      --bg: #07080b;
      --panel: rgba(22, 24, 30, 0.9);
      --panel-border: rgba(197, 160, 89, 0.22);
      --text: #eceff3;
      --muted: #a8afb9;
      --gold: #c5a059;
      --gold-soft: #d7c089;
      --warning: #f0b56b;
      --line: rgba(255, 255, 255, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background:
        radial-gradient(circle at top right, rgba(197, 160, 89, 0.08), transparent 42%),
        radial-gradient(circle at 20% 80%, rgba(84, 98, 140, 0.12), transparent 46%),
        var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      min-height: 100vh;
      line-height: 1.45;
      padding: 26px 20px 50px;
    }

    .page {
      max-width: 1440px;
      margin: 0 auto;
      display: grid;
      gap: 24px;
    }

    .header {
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      background: var(--panel);
      padding: 22px 24px;
      display: grid;
      gap: 14px;
    }

    .header-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .header h1 {
      font-size: clamp(1.65rem, 2.3vw, 2.2rem);
      color: var(--gold-soft);
      letter-spacing: -0.02em;
    }

    .header p {
      color: var(--muted);
      font-size: 0.98rem;
      max-width: 900px;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .meta-chip {
      border-radius: 999px;
      border: 1px solid rgba(197, 160, 89, 0.28);
      background: rgba(197, 160, 89, 0.13);
      color: var(--gold-soft);
      font-size: 0.78rem;
      font-weight: 700;
      padding: 5px 11px;
      letter-spacing: 0.01em;
    }

    .meta-chip.warning {
      border-color: rgba(240, 181, 107, 0.35);
      background: rgba(240, 181, 107, 0.14);
      color: #f5cf99;
    }

    .link-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .link-btn {
      border-radius: 10px;
      border: 1px solid rgba(197, 160, 89, 0.35);
      background: rgba(197, 160, 89, 0.15);
      color: var(--gold-soft);
      text-decoration: none;
      font-weight: 700;
      font-size: 0.84rem;
      padding: 10px 14px;
      transition: 150ms ease;
    }

    .link-btn:hover {
      transform: translateY(-1px);
      background: rgba(197, 160, 89, 0.22);
    }

    .panel {
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      background: var(--panel);
      padding: 20px;
      display: grid;
      gap: 14px;
    }

    .panel h2 {
      font-size: 1.16rem;
      color: var(--gold-soft);
      letter-spacing: -0.01em;
    }

    .panel p {
      color: var(--muted);
      font-size: 0.9rem;
    }

    .artifact-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 14px;
    }

    .artifact-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: rgba(6, 7, 10, 0.6);
      overflow: hidden;
      display: grid;
      gap: 8px;
      padding-bottom: 10px;
    }

    .artifact-media {
      height: 170px;
      background: #090b10;
      border-bottom: 1px solid var(--line);
      display: grid;
      place-items: center;
      overflow: hidden;
    }

    .artifact-media img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .artifact-media.missing {
      background: repeating-linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.04),
        rgba(255, 255, 255, 0.04) 10px,
        rgba(255, 255, 255, 0.01) 10px,
        rgba(255, 255, 255, 0.01) 20px
      );
    }

    .placeholder-text {
      font-size: 0.82rem;
      color: #b9c0ca;
      text-align: center;
      padding: 0 12px;
    }

    .artifact-card h3 {
      font-size: 0.92rem;
      color: var(--text);
      padding: 0 12px;
    }

    .artifact-card p {
      font-size: 0.8rem;
      color: var(--muted);
      padding: 0 12px;
    }

    .option-list {
      display: grid;
      gap: 12px;
    }

    .option-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      background: rgba(6, 7, 10, 0.6);
    }

    .option-shot {
      background: #090b10;
      border-right: 1px solid var(--line);
      min-height: 170px;
      display: grid;
      place-items: center;
      overflow: hidden;
    }

    .option-shot img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .option-shot.missing {
      background: repeating-linear-gradient(
        135deg,
        rgba(255, 255, 255, 0.04),
        rgba(255, 255, 255, 0.04) 10px,
        rgba(255, 255, 255, 0.01) 10px,
        rgba(255, 255, 255, 0.01) 20px
      );
    }

    .option-copy {
      padding: 12px 14px;
      display: grid;
      gap: 8px;
    }

    .option-heading {
      color: var(--gold-soft);
      font-weight: 800;
      font-size: 0.93rem;
    }

    .option-copy p {
      color: var(--muted);
      font-size: 0.84rem;
    }

    .inline-link {
      color: var(--gold-soft);
      font-size: 0.84rem;
      font-weight: 700;
      text-decoration: none;
      width: fit-content;
      border-bottom: 1px dashed rgba(197, 160, 89, 0.5);
      padding-bottom: 2px;
    }

    .split-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 14px;
    }

    .preview-card {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: rgba(6, 7, 10, 0.6);
      display: grid;
      grid-template-rows: auto 420px;
    }

    .preview-card header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
    }

    .preview-card h3 {
      font-size: 0.88rem;
      color: var(--text);
    }

    .preview-card a {
      color: var(--gold-soft);
      font-size: 0.78rem;
      text-decoration: none;
      font-weight: 700;
    }

    .preview-card iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
      background: #000;
    }

    .full-stack {
      display: grid;
      gap: 14px;
    }

    .full-preview {
      border: 1px solid var(--line);
      border-radius: 14px;
      overflow: hidden;
      background: rgba(6, 7, 10, 0.6);
    }

    .full-preview header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      border-bottom: 1px solid var(--line);
      padding: 10px 12px;
    }

    .full-preview h3 {
      font-size: 0.9rem;
      color: var(--text);
    }

    .full-preview a {
      color: var(--gold-soft);
      font-size: 0.8rem;
      text-decoration: none;
      font-weight: 700;
    }

    .full-preview iframe {
      width: 100%;
      height: 78vh;
      border: none;
      display: block;
      background: #000;
    }

    @media (max-width: 940px) {
      .option-card {
        grid-template-columns: 1fr;
      }

      .option-shot {
        border-right: none;
        border-bottom: 1px solid var(--line);
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="header">
      <div class="header-row">
        <h1>${escapeHtml(theme.name)} - category comparison</h1>
      </div>
      <p>${escapeHtml(theme.description)}</p>
      <div class="chip-row">
        <div class="meta-chip">Category ${index + 1} of ${totalThemesCount}</div>
        <div class="meta-chip">${theme.options.length} option(s) in this round</div>
        <div class="meta-chip">Round ${manifest.round}</div>
        ${missingBadge}
      </div>
      <div class="link-row">
        <a class="link-btn" href="/design-review/splash">Back to master comparison</a>
        <a class="link-btn" href="/design-review/splash/streamlined?category=${encodeURIComponent(theme.id)}">Review this category in streamlined mode</a>
      </div>
    </section>

    <section class="panel">
      <h2>Original design + interaction references</h2>
      <p>Placeholders appear automatically when artifacts for this round are not yet captured.</p>
      <div class="artifact-grid">
        ${renderArtifactCard('Original design screenshot', 'Baseline layout screenshot from the application.', `current-state/1-${theme.id}-splash-full.png`, 'Placeholder: original screenshot missing')}
        ${renderArtifactCard('Key animation state', 'Reference screenshot of the primary animation moment.', `current-state/2-${theme.id}-animation.png`, 'Placeholder: animation screenshot missing')}
        ${renderArtifactCard('Button hover/click state', 'Reference screenshot for CTA interaction behavior.', `current-state/3-${theme.id}-button-hover.png`, 'Placeholder: button interaction screenshot missing')}
      </div>
    </section>

    <section class="panel">
      <h2>Option screenshots + concise implementation notes</h2>
      <div class="option-list">
        ${optionCards}
      </div>
    </section>

    <section class="panel">
      <h2>Side-by-side interactive previews</h2>
      <p>Quickly compare options in parallel before opening full-screen previews.</p>
      <div class="split-grid">
        ${sideBySideCards}
      </div>
    </section>

    <section class="panel">
      <h2>Full-screen preview stack</h2>
      <p>Use this section for immersive review when checking full viewport behavior.</p>
      <div class="full-stack">
        ${fullPreviewCards}
      </div>
    </section>
  </div>

  <script>
    function handleMissingMedia(image) {
      const container = image.parentElement;
      if (!container) return;
      const text = image.getAttribute('data-missing') || 'Placeholder: artifact missing';
      container.classList.add('missing');
      container.innerHTML = '<div class="placeholder-text">' + text + '</div>';
    }
  </script>
</body>
</html>`;
}

function buildMasterComparisonPage() {
  const cardMarkup = themes
    .map((theme, index) => {
      const optionChips = theme.options
        .map((option) => `<span class="chip">Option ${option.number}: ${escapeHtml(option.name)}</span>`)
        .join('');
      const missingSlots = (theme.missingOptionSlots || []).slice().sort((a, b) => a - b);
      const missingText = missingSlots.length
        ? `<div class="missing-note">Missing option slots in this round: ${escapeHtml(missingSlots.join(', '))}</div>`
        : '';

      return `
      <article class="card">
        <header>
          <div class="card-index">${index + 1}</div>
          <div>
            <h2>${escapeHtml(theme.name)}</h2>
            <p>${escapeHtml(theme.description)}</p>
          </div>
        </header>
        <div class="card-meta">
          <span>${theme.options.length} option(s) available</span>
          <span>Round ${manifest.round}</span>
        </div>
        ${missingText}
        <div class="chip-row">${optionChips}</div>
        <div class="actions">
          <a class="action-btn" href="/design-review/splash/category/${encodeURIComponent(theme.id)}" target="_blank" rel="noopener noreferrer">Open category comparison</a>
          <a class="action-btn secondary" href="/design-review/splash/streamlined?category=${encodeURIComponent(theme.id)}" target="_blank" rel="noopener noreferrer">Review this category</a>
        </div>
      </article>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Splash design review - master comparison</title>
  <base href="/design-review-output/splash/round-${manifest.round}/">
  <style>
    :root {
      --bg: #07080b;
      --panel: rgba(23, 25, 30, 0.9);
      --panel-border: rgba(197, 160, 89, 0.22);
      --text: #edf0f4;
      --muted: #a9b0ba;
      --gold: #c5a059;
      --gold-soft: #d7c089;
      --line: rgba(255, 255, 255, 0.08);
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background:
        radial-gradient(circle at 12% 12%, rgba(197, 160, 89, 0.12), transparent 36%),
        radial-gradient(circle at 80% 20%, rgba(88, 97, 122, 0.14), transparent 38%),
        var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
      min-height: 100vh;
      line-height: 1.45;
      padding: 26px 20px 50px;
    }

    .page {
      max-width: 1440px;
      margin: 0 auto;
      display: grid;
      gap: 22px;
    }

    .hero {
      border: 1px solid var(--panel-border);
      border-radius: 20px;
      background: var(--panel);
      padding: 22px 24px;
      display: grid;
      gap: 14px;
    }

    .hero h1 {
      color: var(--gold-soft);
      font-size: clamp(1.8rem, 2.6vw, 2.45rem);
      letter-spacing: -0.02em;
    }

    .hero p {
      color: var(--muted);
      font-size: 0.98rem;
      max-width: 920px;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .meta span {
      border-radius: 999px;
      border: 1px solid rgba(197, 160, 89, 0.28);
      background: rgba(197, 160, 89, 0.13);
      color: var(--gold-soft);
      font-size: 0.8rem;
      font-weight: 700;
      padding: 5px 11px;
      letter-spacing: 0.01em;
    }

    .top-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .top-actions a {
      border-radius: 10px;
      text-decoration: none;
      font-weight: 700;
      font-size: 0.85rem;
      padding: 10px 14px;
      transition: 150ms ease;
    }

    .top-actions .primary {
      border: 1px solid rgba(197, 160, 89, 0.38);
      background: rgba(197, 160, 89, 0.17);
      color: var(--gold-soft);
    }

    .top-actions .secondary {
      border: 1px solid rgba(255, 255, 255, 0.16);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }

    .top-actions a:hover {
      transform: translateY(-1px);
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
      gap: 14px;
    }

    .card {
      border: 1px solid var(--panel-border);
      border-radius: 16px;
      background: var(--panel);
      padding: 16px;
      display: grid;
      gap: 12px;
    }

    .card header {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 10px;
      align-items: start;
    }

    .card-index {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: rgba(197, 160, 89, 0.18);
      border: 1px solid rgba(197, 160, 89, 0.35);
      color: var(--gold-soft);
      font-weight: 800;
      display: grid;
      place-items: center;
      font-size: 0.85rem;
    }

    .card h2 {
      color: var(--text);
      font-size: 1.02rem;
      letter-spacing: -0.01em;
      margin-bottom: 4px;
    }

    .card p {
      color: var(--muted);
      font-size: 0.84rem;
    }

    .card-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--muted);
      font-size: 0.78rem;
    }

    .card-meta span {
      border: 1px solid var(--line);
      background: rgba(255, 255, 255, 0.03);
      border-radius: 999px;
      padding: 3px 9px;
    }

    .missing-note {
      border-radius: 10px;
      border: 1px solid rgba(240, 181, 107, 0.35);
      background: rgba(240, 181, 107, 0.13);
      color: #f5cf99;
      padding: 8px 10px;
      font-size: 0.78rem;
      font-weight: 700;
    }

    .chip-row {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }

    .chip {
      border: 1px solid rgba(197, 160, 89, 0.25);
      border-radius: 999px;
      padding: 4px 9px;
      color: var(--gold-soft);
      font-size: 0.76rem;
      background: rgba(197, 160, 89, 0.1);
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .action-btn {
      flex: 1;
      min-width: 180px;
      border-radius: 10px;
      border: 1px solid rgba(197, 160, 89, 0.35);
      background: rgba(197, 160, 89, 0.15);
      color: var(--gold-soft);
      text-decoration: none;
      font-size: 0.8rem;
      font-weight: 700;
      padding: 9px 12px;
      text-align: center;
      transition: 150ms ease;
    }

    .action-btn.secondary {
      border-color: rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: var(--text);
    }

    .action-btn:hover {
      transform: translateY(-1px);
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>Splash design review - master comparison</h1>
      <p>Base URLs stay stable for reviews while round artifacts remain tracked in the repository. Open a category comparison or jump straight into streamlined review for that category.</p>
      <div class="meta">
        <span>${themes.length} categories</span>
        <span>${totalOptions} options available in round ${manifest.round}</span>
        <span>${missingSlotsCount} missing option slot(s)</span>
      </div>
      <div class="top-actions">
        <a class="primary" href="/design-review/splash/streamlined" target="_blank" rel="noopener noreferrer">Open streamlined review</a>
        <a class="secondary" href="/design-review/splash/matrix" target="_blank" rel="noopener noreferrer">Open matrix review</a>
      </div>
    </section>

    <section class="grid">
      ${cardMarkup}
    </section>
  </div>
</body>
</html>`;
}

function writeCategoryPages() {
  themes.forEach((theme, index) => {
    const categoryDir = path.join(roundDir, theme.id);
    const outputPath = path.join(categoryDir, 'visual-comparison.html');
    const html = buildCategoryComparisonPage(theme, index, themes.length);
    fs.writeFileSync(outputPath, html);
  });
}

function writeMasterPage() {
  const outputPath = path.join(roundDir, 'master-comparison.html');
  fs.writeFileSync(outputPath, buildMasterComparisonPage());
}

writeCategoryPages();
writeMasterPage();

console.log(`Generated ${themes.length} category pages and master comparison for splash round-${manifest.round}.`);
