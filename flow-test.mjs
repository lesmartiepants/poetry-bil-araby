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
await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));

// Mock TTS so we don't need real API quota
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

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/flow-0-loaded.png' });

// FLOW 1: Aa popover has Highlight row
try {
  const aaBtn = page.locator('button:has-text("Aa"), [aria-label*="Text"], [aria-label*="text settings"]').first();
  await aaBtn.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/flow-1-aa-popover.png' });
  const glowBtn = page.locator('[data-highlight-style="glow"]').first();
  const visible = await glowBtn.isVisible();
  log('Flow 1: Aa popover Highlight row', visible ? 'PASS' : 'FAIL', visible ? 'Glow button visible' : 'Glow button not found');
} catch(e) { log('Flow 1: Aa popover', 'FAIL', e.message); }

// FLOW 2: selecting style adds class to container
try {
  await page.locator('[data-highlight-style="glow"]').first().click();
  await page.waitForTimeout(300);
  const container = page.locator('[data-poem-container]').first();
  const cls = await container.getAttribute('class');
  const hasClass = cls?.includes('tts-style-glow');
  await page.screenshot({ path: '/tmp/flow-2-style-class.png' });
  log('Flow 2: container gets tts-style-glow', hasClass ? 'PASS' : 'FAIL', `classes: ${cls}`);
  // Close popover
  await page.keyboard.press('Escape');
} catch(e) { log('Flow 2: style class', 'FAIL', e.message); }

// FLOW 3: play button triggers audio + tts-active appears
try {
  const playBtn = page.locator('button[aria-label*="Play"], button[aria-label*="play"]').first();
  await playBtn.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/flow-3-playback.png' });
  const activeWords = await page.locator('.tts-active').count();
  log('Flow 3: tts-active word during playback', activeWords > 0 ? 'PASS' : 'FAIL', `${activeWords} active words found`);
} catch(e) { log('Flow 3: playback highlight', 'FAIL', e.message); }

// FLOW 4: pause preserves tts-active
try {
  const pauseBtn = page.locator('button[aria-label*="Pause"], button[aria-label*="pause"]').first();
  await pauseBtn.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/flow-4-paused.png' });
  const activeAfterPause = await page.locator('.tts-active').count();
  log('Flow 4: tts-active preserved after pause', activeAfterPause > 0 ? 'PASS' : 'FAIL', `${activeAfterPause} active words after pause`);
} catch(e) { log('Flow 4: pause preserves highlight', 'FAIL', e.message); }

// FLOW 5: resume continues from same position (not restart)
try {
  const activeIdxBefore = await page.locator('.tts-active').first().getAttribute('data-word-index');
  const playBtn2 = page.locator('button[aria-label*="Play"], button[aria-label*="play"]').first();
  await playBtn2.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/flow-5-resumed.png' });
  const activeIdxAfter = await page.locator('.tts-active').first().getAttribute('data-word-index');
  const didNotRestart = parseInt(activeIdxAfter ?? '0') >= parseInt(activeIdxBefore ?? '0');
  log('Flow 5: resume from same position', didNotRestart ? 'PASS' : 'FAIL', `before: word ${activeIdxBefore}, after resume: word ${activeIdxAfter}`);
  // Stop playback
  const pauseBtn2 = page.locator('button[aria-label*="Pause"]').first();
  if (await pauseBtn2.isVisible()) await pauseBtn2.click();
} catch(e) { log('Flow 5: resume position', 'FAIL', e.message); }

// FLOW 6: English line tts-line-active
try {
  const activeLine = await page.locator('.tts-en-line.tts-line-active').count();
  await page.screenshot({ path: '/tmp/flow-6-en-line.png' });
  log('Flow 6: English line tts-line-active', activeLine > 0 ? 'PASS' : 'FAIL', `${activeLine} active English lines`);
} catch(e) { log('Flow 6: English line', 'FAIL', e.message); }

// FLOW 7: PlayControlsStrip visible
try {
  const strip = page.locator('[data-testid="play-controls-strip"]').first();
  const visible = await strip.isVisible();
  await page.screenshot({ path: '/tmp/flow-7-strip.png' });
  log('Flow 7: PlayControlsStrip visible', visible ? 'PASS' : 'FAIL', visible ? 'strip found' : 'strip not found');
} catch(e) { log('Flow 7: PlayControlsStrip', 'FAIL', e.message); }

// FLOW 8: switch to Off removes highlights
try {
  const aaBtn2 = page.locator('button:has-text("Aa"), [aria-label*="Text"]').first();
  await aaBtn2.click({ timeout: 5000 });
  await page.waitForTimeout(300);
  await page.locator('[data-highlight-style="off"]').first().click();
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.screenshot({ path: '/tmp/flow-8-off.png' });
  const activeWords = await page.locator('.tts-active').count();
  const stripVisible = await page.locator('[data-testid="play-controls-strip"]').isVisible().catch(() => false);
  log('Flow 8: Off removes highlights + hides strip', (activeWords === 0 && !stripVisible) ? 'PASS' : 'FAIL',
      `active words: ${activeWords}, strip visible: ${stripVisible}`);
} catch(e) { log('Flow 8: Off style', 'FAIL', e.message); }

await browser.close();

const summary = results.map(r => `${r.status === 'PASS' ? '✅' : '❌'} ${r.flow}: ${r.detail}`).join('\n');
console.log('\n=== SUMMARY ===\n' + summary);
writeFileSync('/tmp/flow-results.json', JSON.stringify(results, null, 2));
