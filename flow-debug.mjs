import { chromium } from 'playwright';

const BASE = 'http://localhost:5174';
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

// Capture console errors
page.on('console', msg => console.log('CONSOLE', msg.type(), msg.text()));
page.on('pageerror', err => console.log('PAGE_ERROR', err.message));

await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));

await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('URL after nav:', page.url());

// Wait longer
await page.waitForTimeout(5000);

const bodyHtml = await page.evaluate(() => document.body.innerHTML.slice(0, 2000));
console.log('BODY HTML (first 2000):', bodyHtml);

await page.screenshot({ path: '/tmp/debug-load.png', fullPage: true });
console.log('Screenshot saved to /tmp/debug-load.png');

const allElements = await page.evaluate(() => document.querySelectorAll('*').length);
console.log('Total DOM elements:', allElements);

await browser.close();
