import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5174';
const results = [];

function log(flow, status, detail) {
  results.push({ flow, status, detail });
  console.log(`[${status}] ${flow}: ${detail}`);
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.route('**/api/ai/**', async route => {
  const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }] })
  });
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// ── FLOW 1: Aa popover has Highlight row ──────────────────────────────────────
try {
  await page.locator('[aria-label="Text settings"]').click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/final-1-popover.png' });
  const allStyles = await page.locator('[data-highlight-style]').allInnerTexts();
  const glowOk = allStyles.some(t => t.toLowerCase().includes('glow'));
  const offOk  = allStyles.some(t => t.toLowerCase().includes('off'));
  log('Flow 1: popover has highlight row', (glowOk && offOk) ? 'PASS' : 'FAIL',
    `buttons: ${allStyles.join(', ')}`);
} catch(e) { log('Flow 1', 'FAIL', e.message); }

// ── Select GLOW — required for flows 2, 6, 7 ─────────────────────────────────
await page.locator('[data-highlight-style="glow"]').first().click();
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

// ── FLOW 2: container gets tts-style-glow ────────────────────────────────────
try {
  await page.screenshot({ path: '/tmp/final-2-glow-applied.png' });
  const containerCount = await page.locator('[data-poem-container]').count();
  const cls = containerCount > 0
    ? (await page.locator('[data-poem-container]').first().getAttribute('class') ?? '')
    : 'NO_CONTAINER';
  const hasGlow = cls.includes('tts-style-glow');
  log('Flow 2: container gets tts-style-glow', hasGlow ? 'PASS' : 'FAIL',
    `data-poem-container found: ${containerCount > 0}, class: ${cls.slice(0, 80)}`);
} catch(e) { log('Flow 2', 'FAIL', e.message); }

// ── FLOW 3: play → tts-active (AudioContext gated in headless) ────────────────
try {
  await page.locator('[aria-label="Play recitation"]').first().click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/final-3-playing.png' });
  const activeWords = await page.locator('.tts-active').count();
  const ttsWords = await page.locator('[class*="tts-word"]').count();
  // AudioContext is blocked in headless — accept ttsWords > 0 as evidence words are rendered
  const audioLogs = await page.evaluate(() => {
    // Check if AudioContext failed (headless limitation)
    return window.__ttsPlaying ?? null;
  });
  log('Flow 3: tts-active during playback', activeWords > 0 ? 'PASS' : 'FAIL',
    `.tts-active: ${activeWords}, tts-word elements: ${ttsWords}, NOTE: AudioContext blocked in headless (autoplay policy)`);
} catch(e) { log('Flow 3', 'FAIL', e.message); }

// ── FLOW 4: pause preserves highlight ────────────────────────────────────────
try {
  const pauseBtn = page.locator('[aria-label*="Pause"]').first();
  if (await pauseBtn.count() > 0 && await pauseBtn.isVisible()) {
    await pauseBtn.click({ timeout: 3000 });
    await page.waitForTimeout(500);
    const active = await page.locator('.tts-active').count();
    await page.screenshot({ path: '/tmp/final-4-paused.png' });
    log('Flow 4: tts-active preserved after pause', active > 0 ? 'PASS' : 'FAIL',
      `${active} active words after pause`);
  } else {
    await page.screenshot({ path: '/tmp/final-4-paused.png' });
    log('Flow 4: tts-active preserved after pause', 'FAIL',
      'No Pause button — playback never started (AudioContext blocked in headless)');
  }
} catch(e) { log('Flow 4', 'FAIL', e.message); }

// ── FLOW 5: resume from same position ────────────────────────────────────────
try {
  const idxBefore = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  const playBtn2 = page.locator('[aria-label="Play recitation"]').first();
  await playBtn2.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  const idxAfter = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  if (idxBefore === null) {
    log('Flow 5: resume from same position', 'FAIL', 'Cannot assess — no tts-active word (AudioContext blocked in headless)');
  } else {
    const ok = parseInt(idxAfter ?? '0') >= parseInt(idxBefore ?? '0');
    log('Flow 5: resume from same position', ok ? 'PASS' : 'FAIL',
      `word before pause: ${idxBefore}, after resume: ${idxAfter}`);
  }
  const pb2 = page.locator('[aria-label*="Pause"]').first();
  if (await pb2.count() > 0 && await pb2.isVisible()) await pb2.click();
} catch(e) { log('Flow 5', 'FAIL', e.message); }

// ── FLOW 6: English lines have tts-en-line ───────────────────────────────────
try {
  await page.screenshot({ path: '/tmp/final-6-enlines.png' });
  const total = await page.locator('.tts-en-line').count();
  const active = await page.locator('.tts-en-line.tts-line-active').count();
  // Also check showTranslation toggle
  const showTransBtn = await page.locator('button:has-text("Translation"), [aria-label*="Translation"]').count();
  log('Flow 6: .tts-en-line elements exist', total > 0 ? 'PASS' : 'FAIL',
    `total .tts-en-line: ${total}, active: ${active}, showTranslation toggle buttons: ${showTransBtn}`);
} catch(e) { log('Flow 6', 'FAIL', e.message); }

// ── FLOW 7: PlayControlsStrip visible ────────────────────────────────────────
try {
  await page.screenshot({ path: '/tmp/final-7-strip.png' });
  const count = await page.locator('[data-testid="play-controls-strip"]').count();
  const visible = count > 0 && await page.locator('[data-testid="play-controls-strip"]').isVisible();
  log('Flow 7: PlayControlsStrip visible', visible ? 'PASS' : 'FAIL',
    `count: ${count}, visible: ${visible}`);
} catch(e) { log('Flow 7', 'FAIL', e.message); }

// ── FLOW 8: Off style hides strip + clears active ────────────────────────────
try {
  await page.locator('[aria-label="Text settings"]').click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.locator('[data-highlight-style="off"]').first().click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/final-8-off.png' });
  const activeWords = await page.locator('.tts-active').count();
  const stripVisible = await page.locator('[data-testid="play-controls-strip"]').isVisible().catch(() => false);
  // data-poem-container should still exist but without tts-style-* class
  const containerCls = await page.locator('[data-poem-container]').first().getAttribute('class').catch(() => 'NOT_FOUND');
  log('Flow 8: Off hides strip + removes tts classes', (!stripVisible && activeWords === 0) ? 'PASS' : 'FAIL',
    `active words: ${activeWords}, strip visible: ${stripVisible}, container class: ${containerCls?.slice(0,60)}`);
} catch(e) { log('Flow 8', 'FAIL', e.message); }

await browser.close();

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`\n=== SUMMARY: ${passed} PASS / ${failed} FAIL ===`);
results.forEach(r => console.log(`  [${r.status}] ${r.flow}: ${r.detail}`));
writeFileSync('/tmp/flow-results-final.json', JSON.stringify(results, null, 2));
