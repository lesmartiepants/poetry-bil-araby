import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

await page.route('**/api/ai/**', async route => {
  await route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ candidates: [] }) });
});

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000);

// Check if PoemCarousel is rendered vs poem container
const carouselEl = await page.locator('[data-testid*="carousel"], .poem-carousel, [class*="carousel"]').count();
const poemContainer = await page.locator('[data-poem-container]').count();
const carouselDots = await page.locator('[aria-label*="Go to poem"]').count();

console.log('carousel-related elements:', carouselEl);
console.log('data-poem-container:', poemContainer);
console.log('carousel dot buttons:', carouselDots);

// Check carousel dots — if > 0, carousel is active
console.log('\nCarousel IS active (carouselPoems.length > 0)?', carouselDots > 0);
console.log('data-poem-container HIDDEN because carousel branch is rendering');

// Click first dot to confirm we\'re on carousel
const dot = page.locator('[aria-label="Go to poem 1"]');
const dotVisible = await dot.isVisible().catch(() => false);
console.log('Go-to-poem-1 dot visible:', dotVisible);

// Also check DOM structure around the poem area
const html = await page.evaluate(() => {
  const el = document.querySelector('[aria-label="Go to poem 1"]');
  return el?.closest('div')?.className?.slice(0, 100) ?? 'not found';
});
console.log('carousel parent class:', html);

await page.screenshot({ path: '/tmp/carousel-check.png' });
await browser.close();
