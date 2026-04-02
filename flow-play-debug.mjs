import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const networkRequests = [];
page.on('request', req => {
  if (!req.url().includes('localhost:5174') || req.url().includes('/api/')) {
    networkRequests.push({ method: req.method(), url: req.url() });
  }
});

const consoleLogs = [];
page.on('console', msg => {
  consoleLogs.push({ type: msg.type(), text: msg.text() });
});

// Mock Gemini + proxied AI calls
await page.route('**/generativelanguage.googleapis.com/**', async route => {
  console.log('INTERCEPTED GEMINI:', route.request().url());
  const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }] })
  });
});
await page.route('**/api/ai/**', async route => {
  console.log('INTERCEPTED API/AI:', route.request().url());
  const fakeBase64 = 'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: fakeBase64, mimeType: 'audio/wav' } }] } }] })
  });
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

console.log('\n=== CLICKING PLAY ===');
const playBtn = page.locator('[aria-label="Play recitation"]').first();
await playBtn.click({ timeout: 5000 });

// Poll for 6 seconds watching for state changes
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(500);
  const btnLabels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button[aria-label]')).map(b => b.getAttribute('aria-label'))
  );
  const activeTts = await page.locator('.tts-active').count();
  const ttsClasses = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[class*="tts-"]')).map(el => ({ tag: el.tagName, cls: el.className.slice(0,60) }))
  );
  console.log(`t=${(i+1)*0.5}s | tts-active: ${activeTts} | tts-* els: ${ttsClasses.length} | play-related btns: ${btnLabels.filter(l => l?.toLowerCase().includes('play') || l?.toLowerCase().includes('pause') || l?.toLowerCase().includes('recit')).join(', ')}`);
  if (ttsClasses.length > 0) {
    console.log('TTS classes found:', JSON.stringify(ttsClasses.slice(0,5)));
    break;
  }
}

await page.screenshot({ path: '/tmp/play-debug-final.png' });

console.log('\n=== NETWORK REQUESTS (non-frontend) ===');
networkRequests.forEach(r => console.log(r.method, r.url));

console.log('\n=== CONSOLE LOGS (TTS/Audio related) ===');
consoleLogs
  .filter(l => l.text.toLowerCase().includes('tts') || l.text.toLowerCase().includes('audio') || l.text.toLowerCase().includes('play') || l.text.toLowerCase().includes('word') || l.text.toLowerCase().includes('highlight'))
  .forEach(l => console.log(`[${l.type}]`, l.text.slice(0, 200)));

await browser.close();
