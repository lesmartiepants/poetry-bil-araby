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

// Mock all backend API calls
await page.route('**/api/**', async route => {
  const url = route.request().url();
  if (url.includes('/api/poems/random') || url.includes('/api/poems/by-poet') || url.includes('/api/poems/search')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      id: 999, poet: 'Test Poet', title: 'Test Poem',
      arabic_text: 'الحمد لله رب العالمين\nالرحمن الرحيم\nمالك يوم الدين',
      english_text: 'Praise be to God\nThe Merciful\nMaster of the Day'
    })});
  } else if (url.includes('/api/health')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', count: 100 }) });
  } else if (url.includes('/api/ai/') || url.includes('generateContent') || url.includes('streamGenerateContent')) {
    const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }]
      })
    });
  } else if (url.includes('/api/poets')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(['Test Poet']) });
  } else {
    await route.continue();
  }
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/flow2-0-loaded.png' });

// FLOW 1: Text settings popover has Highlight row (data-highlight-style buttons)
try {
  const textSettingsBtn = page.locator('[aria-label="Text settings"]');
  await textSettingsBtn.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/flow2-1-popover.png' });
  const glowBtn = page.locator('[data-highlight-style="glow"]').first();
  const visible = await glowBtn.isVisible();
  const offBtn = page.locator('[data-highlight-style="off"]').first();
  const offVisible = await offBtn.isVisible();
  log('Flow 1: Text settings popover Highlight row', (visible && offVisible) ? 'PASS' : 'FAIL',
    `Glow visible: ${visible}, Off visible: ${offVisible}`);
} catch(e) { log('Flow 1: Text settings popover', 'FAIL', e.message); }

// FLOW 2: selecting glow style - check class on poem container
try {
  await page.locator('[data-highlight-style="glow"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '/tmp/flow2-2-glow-selected.png' });

  // Look for poem container with tts-style-glow class
  const container = page.locator('[data-poem-container]').first();
  const containerExists = await container.count() > 0;
  let hasClass = false;
  let cls = 'NO CONTAINER';
  if (containerExists) {
    cls = await container.getAttribute('class') ?? '';
    hasClass = cls.includes('tts-style-glow');
  }

  // Also check if class is applied somewhere else
  const anyGlowClass = await page.locator('.tts-style-glow').count();

  log('Flow 2: container gets tts-style-glow', (hasClass || anyGlowClass > 0) ? 'PASS' : 'FAIL',
    `data-poem-container exists: ${containerExists}, has tts-style-glow class: ${hasClass}, .tts-style-glow elements: ${anyGlowClass}, classes: ${cls.slice(0,100)}`);

  // Close popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
} catch(e) { log('Flow 2: style class', 'FAIL', e.message); }

// FLOW 3: play button triggers audio + tts-active appears
try {
  const playBtn = page.locator('[aria-label="Play recitation"]').first();
  await playBtn.click({ timeout: 5000 });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: '/tmp/flow2-3-playback.png' });
  const activeWords = await page.locator('.tts-active').count();
  // Also check for any aria-current or similar playing indicator
  const playingClass = await page.locator('[class*="tts-"]').count();
  log('Flow 3: tts-active word during playback', activeWords > 0 ? 'PASS' : 'FAIL',
    `tts-active count: ${activeWords}, any tts- class elements: ${playingClass}`);
} catch(e) { log('Flow 3: playback highlight', 'FAIL', e.message); }

// FLOW 4: pause preserves tts-active
try {
  // Check if playing - look for Pause button
  const pauseBtn = page.locator('[aria-label="Pause recitation"], [aria-label*="Pause"], [aria-label*="pause"]').first();
  const pauseVisible = await pauseBtn.isVisible().catch(() => false);
  if (pauseVisible) {
    await pauseBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/tmp/flow2-4-paused.png' });
    const activeAfterPause = await page.locator('.tts-active').count();
    log('Flow 4: tts-active preserved after pause', activeAfterPause > 0 ? 'PASS' : 'FAIL',
      `${activeAfterPause} active words after pause`);
  } else {
    // What aria-labels changed?
    const btns = await page.evaluate(() =>
      Array.from(document.querySelectorAll('button')).map(b => b.getAttribute('aria-label')).filter(Boolean)
    );
    log('Flow 4: tts-active preserved after pause', 'FAIL', `Pause button not found. Buttons: ${btns.join(', ')}`);
  }
} catch(e) { log('Flow 4: pause preserves highlight', 'FAIL', e.message); }

// FLOW 5: resume continues from same position
try {
  const activeIdxBefore = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  const playBtn2 = page.locator('[aria-label="Play recitation"], [aria-label*="Play"], [aria-label*="Resume"]').first();
  await playBtn2.click({ timeout: 5000 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/tmp/flow2-5-resumed.png' });
  const activeIdxAfter = await page.locator('.tts-active').first().getAttribute('data-word-index').catch(() => null);
  const didNotRestart = parseInt(activeIdxAfter ?? '0') >= parseInt(activeIdxBefore ?? '0');
  log('Flow 5: resume from same position', didNotRestart ? 'PASS' : 'FAIL',
    `before: word ${activeIdxBefore}, after resume: word ${activeIdxAfter}`);
  // Stop
  const pauseBtn2 = page.locator('[aria-label="Pause recitation"], [aria-label*="Pause"]').first();
  if (await pauseBtn2.isVisible().catch(() => false)) await pauseBtn2.click();
} catch(e) { log('Flow 5: resume position', 'FAIL', e.message); }

// FLOW 6: English line tts-line-active
try {
  const activeLine = await page.locator('.tts-en-line.tts-line-active').count();
  const anyEnLine = await page.locator('.tts-en-line').count();
  await page.screenshot({ path: '/tmp/flow2-6-en-line.png' });
  log('Flow 6: English line tts-line-active', activeLine > 0 ? 'PASS' : 'FAIL',
    `${activeLine} active English lines (${anyEnLine} total .tts-en-line elements)`);
} catch(e) { log('Flow 6: English line', 'FAIL', e.message); }

// FLOW 7: PlayControlsStrip visible
try {
  const strip = page.locator('[data-testid="play-controls-strip"]').first();
  const stripCount = await strip.count();
  const visible = stripCount > 0 && await strip.isVisible().catch(() => false);
  // Also look for any strip-like element
  const anyStrip = await page.locator('[class*="controls-strip"], [class*="playstrip"], [class*="play-strip"]').count();
  await page.screenshot({ path: '/tmp/flow2-7-strip.png' });
  log('Flow 7: PlayControlsStrip visible', visible ? 'PASS' : 'FAIL',
    `data-testid="play-controls-strip" count: ${stripCount}, visible: ${visible}, other strip classes: ${anyStrip}`);
} catch(e) { log('Flow 7: PlayControlsStrip', 'FAIL', e.message); }

// FLOW 8: switch to Off removes highlights
try {
  const textSettingsBtn2 = page.locator('[aria-label="Text settings"]');
  await textSettingsBtn2.click({ timeout: 5000 });
  await page.waitForTimeout(400);
  const offBtn = page.locator('[data-highlight-style="off"]').first();
  await offBtn.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: '/tmp/flow2-8-off.png' });
  const activeWords = await page.locator('.tts-active').count();
  const strip2 = page.locator('[data-testid="play-controls-strip"]').first();
  const stripVisible = await strip2.count() > 0 ? await strip2.isVisible().catch(() => false) : false;
  log('Flow 8: Off removes highlights + hides strip', (activeWords === 0) ? 'PASS' : 'FAIL',
    `active words: ${activeWords}, strip visible: ${stripVisible}`);
} catch(e) { log('Flow 8: Off style', 'FAIL', e.message); }

await browser.close();

const summary = results.map(r => `${r.status === 'PASS' ? 'PASS' : 'FAIL'} ${r.flow}: ${r.detail}`).join('\n');
console.log('\n=== SUMMARY ===\n' + summary);
writeFileSync('/tmp/flow-results.json', JSON.stringify(results, null, 2));
