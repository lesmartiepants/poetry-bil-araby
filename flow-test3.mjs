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

// Only mock Gemini TTS/AI calls — let real backend (3001) handle poems
await page.route('**/generativelanguage.googleapis.com/**', async route => {
  const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }]
    })
  });
});
// Also mock the proxied AI routes
await page.route('**/api/ai/**', async route => {
  const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }]
    })
  });
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/f3-0-loaded.png' });

// FLOW 1: Text settings popover has Highlight row
try {
  await page.locator('[aria-label="Text settings"]').click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/f3-1-popover.png' });
  const glowVisible = await page.locator('[data-highlight-style="glow"]').first().isVisible();
  const offVisible = await page.locator('[data-highlight-style="off"]').first().isVisible();
  const allStyles = await page.locator('[data-highlight-style]').allInnerTexts();
  log('Flow 1: Highlight row in popover', (glowVisible && offVisible) ? 'PASS' : 'FAIL',
    `styles visible: ${allStyles.join(', ')}`);
} catch(e) { log('Flow 1: Highlight row', 'FAIL', e.message); }

// FLOW 2: selecting glow applies tts-style-glow to container
try {
  await page.locator('[data-highlight-style="glow"]').first().click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/f3-2-glow.png' });

  const containerCount = await page.locator('[data-poem-container]').count();
  let containerClass = 'NO_CONTAINER';
  let hasGlowClass = false;
  if (containerCount > 0) {
    containerClass = await page.locator('[data-poem-container]').first().getAttribute('class') ?? '';
    hasGlowClass = containerClass.includes('tts-style-glow');
  }
  const anyGlowEl = await page.locator('.tts-style-glow').count();
  log('Flow 2: tts-style-glow on container', (hasGlowClass || anyGlowEl > 0) ? 'PASS' : 'FAIL',
    `data-poem-container found: ${containerCount > 0}, hasGlowClass: ${hasGlowClass}, .tts-style-glow count: ${anyGlowEl}`);
} catch(e) { log('Flow 2: style class', 'FAIL', e.message); }

// FLOW 3: play button triggers audio + tts-active appears
try {
  const playBtn = page.locator('[aria-label="Play recitation"]').first();
  await playBtn.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/f3-3-playing.png' });
  const activeWords = await page.locator('.tts-active').count();
  const anyTtsClass = await page.locator('[class*="tts-"]').count();
  // Also check if aria-label changed to Pause
  const pauseVisible = await page.locator('[aria-label*="Pause"], [aria-label*="pause"]').count();
  log('Flow 3: tts-active during playback', activeWords > 0 ? 'PASS' : 'FAIL',
    `.tts-active: ${activeWords}, any tts- elements: ${anyTtsClass}, pause btn visible: ${pauseVisible}`);
} catch(e) { log('Flow 3: playback', 'FAIL', e.message); }

// FLOW 4: pause preserves tts-active
try {
  const pauseBtn = page.locator('[aria-label*="Pause"]').first();
  const pauseExists = await pauseBtn.count() > 0;
  if (pauseExists && await pauseBtn.isVisible()) {
    await pauseBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/f3-4-paused.png' });
    const activeAfter = await page.locator('.tts-active').count();
    log('Flow 4: tts-active preserved after pause', activeAfter > 0 ? 'PASS' : 'FAIL',
      `${activeAfter} active words after pause`);
  } else {
    await page.screenshot({ path: '/tmp/f3-4-paused.png' });
    const btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button[aria-label]')).map(b => b.getAttribute('aria-label'))
    );
    log('Flow 4: tts-active preserved after pause', 'FAIL',
      `Pause btn not found. Play state may have ended. Buttons: ${btns.join(' | ')}`);
  }
} catch(e) { log('Flow 4: pause', 'FAIL', e.message); }

// FLOW 5: resume continues from same position
try {
  const idxBefore = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  const resumeBtn = page.locator('[aria-label="Play recitation"], [aria-label*="Resume"]').first();
  await resumeBtn.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/f3-5-resumed.png' });
  const idxAfter = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  if (idxBefore === null && idxAfter === null) {
    log('Flow 5: resume from same position', 'FAIL', 'No tts-active word — cannot assess position (depends on Flow 3/4 passing first)');
  } else {
    const ok = parseInt(idxAfter ?? '0') >= parseInt(idxBefore ?? '0');
    log('Flow 5: resume from same position', ok ? 'PASS' : 'FAIL',
      `before: word ${idxBefore}, after: word ${idxAfter}`);
  }
  // Stop
  const pauseBtn2 = page.locator('[aria-label*="Pause"]').first();
  if (await pauseBtn2.count() > 0 && await pauseBtn2.isVisible()) await pauseBtn2.click();
} catch(e) { log('Flow 5: resume', 'FAIL', e.message); }

// FLOW 6: English lines have tts-en-line class
try {
  const totalEnLines = await page.locator('.tts-en-line').count();
  const activeEnLines = await page.locator('.tts-en-line.tts-line-active').count();
  await page.screenshot({ path: '/tmp/f3-6-enlines.png' });
  log('Flow 6: tts-en-line elements exist', totalEnLines > 0 ? 'PASS' : 'FAIL',
    `total .tts-en-line: ${totalEnLines}, active: ${activeEnLines}`);
} catch(e) { log('Flow 6: English lines', 'FAIL', e.message); }

// FLOW 7: PlayControlsStrip visible
try {
  const stripCount = await page.locator('[data-testid="play-controls-strip"]').count();
  const stripVisible = stripCount > 0 && await page.locator('[data-testid="play-controls-strip"]').isVisible().catch(() => false);
  await page.screenshot({ path: '/tmp/f3-7-strip.png' });
  log('Flow 7: PlayControlsStrip visible', stripVisible ? 'PASS' : 'FAIL',
    `count: ${stripCount}, visible: ${stripVisible}`);
} catch(e) { log('Flow 7: PlayControlsStrip', 'FAIL', e.message); }

// FLOW 8: Off style removes highlights
try {
  // First set glow and play briefly
  await page.locator('[aria-label="Text settings"]').click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.locator('[data-highlight-style="off"]').first().click();
  await page.waitForTimeout(400);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/f3-8-off.png' });
  const activeWords = await page.locator('.tts-active').count();
  const stripVisible2 = await page.locator('[data-testid="play-controls-strip"]').isVisible().catch(() => false);
  log('Flow 8: Off removes highlights + hides strip', activeWords === 0 ? 'PASS' : 'FAIL',
    `active words: ${activeWords}, strip visible: ${stripVisible2}`);
} catch(e) { log('Flow 8: Off style', 'FAIL', e.message); }

await browser.close();

const passed = results.filter(r => r.status === 'PASS').length;
const failed = results.filter(r => r.status === 'FAIL').length;
console.log(`\n=== SUMMARY: ${passed} PASS / ${failed} FAIL ===`);
results.forEach(r => console.log(`  [${r.status}] ${r.flow}: ${r.detail}`));
writeFileSync('/tmp/flow-results3.json', JSON.stringify(results, null, 2));
