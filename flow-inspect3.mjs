import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Mock all backend calls
await page.route('**/api/**', async route => {
  const url = route.request().url();
  if (url.includes('/api/poems/random') || url.includes('/api/poems/by-poet')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 123, poet: 'Test Poet', title: 'Test Poem', arabic_text: 'الحمد لله\nرب العالمين', english_text: 'Praise be\nto God' }) });
  } else if (url.includes('/api/health')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', count: 100 }) });
  } else if (url.includes('/api/ai/') || url.includes('/api/poets')) {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ candidates: [] }) });
  } else {
    await route.continue();
  }
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Click "Text settings" button
await page.locator('[aria-label="Text settings"]').click();
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/text-settings-popover.png', fullPage: true });

const popoverHtml = await page.evaluate(() => {
  // Find any open popover/panel
  const all = Array.from(document.querySelectorAll('[role="dialog"], [data-radix-popper-content-wrapper], .popover, [aria-expanded="true"]'));
  return all.map(el => el.outerHTML.slice(0, 500));
});
console.log('=== POPOVER HTML ===');
popoverHtml.forEach(h => console.log(h, '\n---'));

// Dump all currently visible buttons
const visible = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button'))
    .filter(b => b.offsetParent !== null)
    .map(b => ({
      text: b.textContent?.trim().slice(0, 60),
      ariaLabel: b.getAttribute('aria-label'),
      dataTestId: b.getAttribute('data-testid'),
      dataAttr: Array.from(b.attributes).filter(a => a.name.startsWith('data-')).map(a => `${a.name}="${a.value}"`).join(' ')
    }));
});
console.log('\n=== VISIBLE BUTTONS AFTER CLICK ===');
visible.forEach((b, i) => console.log(i, JSON.stringify(b)));

// Dump all visible text content near the opened area
const allText = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('*'))
    .filter(el => el.offsetParent !== null && el.childElementCount === 0 && el.textContent?.trim().length > 0)
    .map(el => el.textContent?.trim().slice(0, 80))
    .filter(Boolean)
    .slice(0, 60);
});
console.log('\n=== VISIBLE TEXT NODES ===');
allText.forEach(t => console.log(JSON.stringify(t)));

await browser.close();
