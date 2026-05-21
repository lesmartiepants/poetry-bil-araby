import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/inspect-0-initial.png', fullPage: true });

// Dump all buttons with their aria-labels and text
const buttons = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('button')).map(b => ({
    text: b.textContent?.trim().slice(0, 50),
    ariaLabel: b.getAttribute('aria-label'),
    dataTestId: b.getAttribute('data-testid'),
    className: b.className?.slice(0, 80),
    id: b.id
  }));
});
console.log('=== BUTTONS ===');
console.log(JSON.stringify(buttons, null, 2));

// Check for relevant data attrs
const highlights = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-highlight-style]')).map(el => ({
    tag: el.tagName,
    attr: el.getAttribute('data-highlight-style'),
    text: el.textContent?.trim().slice(0, 30)
  }));
});
console.log('\n=== data-highlight-style elements ===');
console.log(JSON.stringify(highlights, null, 2));

const containers = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-poem-container]')).map(el => ({
    tag: el.tagName,
    className: el.className?.slice(0, 100)
  }));
});
console.log('\n=== data-poem-container elements ===');
console.log(JSON.stringify(containers, null, 2));

const strips = await page.evaluate(() => {
  return Array.from(document.querySelectorAll('[data-testid]')).map(el => ({
    testid: el.getAttribute('data-testid'),
    visible: el.offsetParent !== null,
    tag: el.tagName
  }));
});
console.log('\n=== data-testid elements ===');
console.log(JSON.stringify(strips, null, 2));

// Check page title / main headings to confirm app loaded
const heading = await page.evaluate(() => document.querySelector('h1, h2, h3')?.textContent?.trim().slice(0, 100));
console.log('\n=== First heading ===', heading);

await browser.close();
