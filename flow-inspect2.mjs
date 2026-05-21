import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Mock all backend calls to avoid CORS issues
await page.route('**/api/**', async route => {
  const url = route.request().url();
  if (url.includes('/api/poems/random') || url.includes('/api/poems/by-poet') || url.includes('/api/poems/search')) {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: 123, poet: 'Test Poet', title: 'Test Poem',
        arabic_text: 'الحمد لله رب العالمين\nالرحمن الرحيم',
        english_text: 'Praise be to God\nThe Merciful'
      })
    });
  } else if (url.includes('/api/health')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', count: 100 }) });
  } else if (url.includes('/api/ai/')) {
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
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/inspect-loaded.png', fullPage: true });

// Dump all buttons
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    text: b.textContent?.trim().slice(0, 50),
    ariaLabel: b.getAttribute('aria-label'),
    dataTestId: b.getAttribute('data-testid'),
    className: b.className?.slice(0, 60),
    visible: b.offsetParent !== null
  }));
});
console.log('=== BUTTONS ===');
buttons.forEach((b, i) => console.log(i, JSON.stringify(b)));

// Check for Aa-related content
const aaContent = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  return all.filter(el => el.textContent?.trim() === 'Aa').map(el => ({
    tag: el.tagName,
    className: el.className?.slice?.(0, 60),
    ariaLabel: el.getAttribute?.('aria-label')
  }));
});
console.log('\n=== Aa elements ===');
console.log(JSON.stringify(aaContent, null, 2));

// All data attrs
const dataAttrs = await page.evaluate(() => {
  const result = {};
  document.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-')) {
        if (!result[attr.name]) result[attr.name] = [];
        result[attr.name].push({ tag: el.tagName, value: attr.value, text: el.textContent?.trim().slice(0, 30) });
      }
    });
  });
  return result;
});
console.log('\n=== data-* attributes ===');
Object.entries(dataAttrs).forEach(([k, v]) => console.log(k, '->', JSON.stringify(v.slice(0, 3))));

await browser.close();
