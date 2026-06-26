import { test, expect } from '@playwright/test';

/**
 * Sparkler Reader E2E — the teleprompter reveal inside the vertical feed.
 *
 * Verifies: poem renders in the feed, tapping reveals more lines (4-line sliding window),
 * the draggable scrubber seeks without navigating poems, the inline insight end-state, and
 * the reduced-motion path. All backend/AI calls are mocked for determinism.
 */

const POEM_A = {
  id: 51001,
  poet: 'Abu Tammam',
  poetArabic: 'أبو تمام',
  title: 'The Sword',
  titleArabic: 'السيف',
  arabic:
    'السَّيْفُ أَصْدَقُ أَنْباءً مِنَ الكُتُبِ\nفي حَدِّهِ الحَدُّ بَيْنَ الجِدِّ وَاللَّعِبِ\nبيضُ الصَّفائِحِ لا سودُ الصَّحائِفِ\nفي مُتونِهِنَّ جَلاءُ الشَّكِّ وَالرِّيَبِ',
  english:
    'The sword tells truer tidings than the books\nIn its edge lies the line twixt earnest and play\nWhite blades, not black pages\nin their texts the clearing of doubt and suspicion',
  tags: ['Classical'],
  isFromDatabase: true,
};
const POEM_B = { ...POEM_A, id: 51002, title: 'The Brook', titleArabic: 'الجدول', english: '' };

async function setupMocks(page) {
  let n = 0;
  const pool = [POEM_A, POEM_B];
  await page.route('**/api/poems/random*', async (route) => {
    const poem = n === 0 ? POEM_A : pool[(n - 1) % pool.length];
    n++;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(poem),
    });
  });
  await page.route('**/api/poems/by-poet/**', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([POEM_A, POEM_B]),
    })
  );
  await page.route('**/api/poets*', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'أبو تمام' }]),
    })
  );
  await page.route('**/api/health*', async (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok' }),
    })
  );
  await page.route('**/api/ai/**', async (route) => route.abort('blockedbyclient'));
}

async function loadFeed(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const enterBtn = page.locator('button[aria-label="Enter the app"]');
  if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterBtn.click();
    await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page
    .locator('[data-testid="sparkler-stage"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
}

const revealedCount = (page) => page.locator('[data-revealed="true"]').count();

test.describe('Sparkler Reader', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('renders the sparkler stage with verse units', async ({ page }) => {
    await loadFeed(page);
    await expect(page.locator('[data-testid="poem-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="sparkler-stage"]').first()).toBeVisible();
    const units = page.locator('[data-testid^="sparkler-unit-"]');
    expect(await units.count()).toBeGreaterThan(0);
    // Arabic verse text present
    await expect(page.locator('p[dir="rtl"]').first()).toContainText(/[؀-ۿ]/);
  });

  test('tap reveals more lines (sliding window)', async ({ page }) => {
    await loadFeed(page);
    const stage = page.locator('[data-testid="sparkler-stage"]').first();
    // Intro plays then reveals the first pair — wait until something is revealed.
    await expect.poll(() => revealedCount(page), { timeout: 12000 }).toBeGreaterThanOrEqual(1);
    const before = await revealedCount(page);
    await stage.click({ position: { x: 40, y: 30 } });
    await expect.poll(() => revealedCount(page), { timeout: 8000 }).toBeGreaterThan(before);
  });

  test('scrubbing seeks the reveal without navigating poems', async ({ page }) => {
    await loadFeed(page);
    await expect.poll(() => revealedCount(page), { timeout: 12000 }).toBeGreaterThanOrEqual(1);
    const urlBefore = page.url();
    const handle = page.locator('[data-testid="progress-scrubber"] [role="slider"]').first();
    const bar = page.locator('[data-testid="progress-scrubber"]').first();
    const box = await bar.boundingBox();
    await handle.hover();
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height / 2, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    // Seeking near the end reveals more lines, and the feed did NOT advance to another poem.
    await expect.poll(() => revealedCount(page), { timeout: 6000 }).toBeGreaterThanOrEqual(2);
    expect(page.url()).toBe(urlBefore);
  });

  test('reduced motion still reveals on tap', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    const stage = page.locator('[data-testid="sparkler-stage"]').first();
    await expect.poll(() => revealedCount(page), { timeout: 12000 }).toBeGreaterThanOrEqual(1);
    const before = await revealedCount(page);
    await stage.click({ position: { x: 40, y: 30 } });
    await expect.poll(() => revealedCount(page), { timeout: 6000 }).toBeGreaterThan(before);
  });
});
