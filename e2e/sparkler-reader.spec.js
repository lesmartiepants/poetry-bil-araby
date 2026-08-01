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
  // poemStore's getInitialPoems() populates the very first poem synchronously at module
  // init — before any network request fires — by picking a uniformly random entry from the
  // bundled src/data/seed-poems.json (~500 real poems of varying length), unless
  // localStorage.qafiyah_nextPoem is present. None of the routes below intercept that: the
  // sparkler stage's *first* poem never comes from the mocked /api/poems/random fetch at all.
  // That made every run exercise the reveal engine against an arbitrary real poem instead of
  // the deterministic POEM_A/POEM_B fixtures, so tests whose assertions depend on the actual
  // reveal cadence (tap sliding-window, scrub-seek) were flaky/failing depending on which
  // random seed poem happened to load, while tests asserting only generic structure (stage
  // visible, verse units > 0) passed regardless. Seed the pre-fetched-poem slot the app already
  // checks first so the deterministic fixture is used instead of the random seed pool.
  await page.addInitScript((poem) => {
    localStorage.setItem('qafiyah_nextPoem', JSON.stringify({ poem, storedAt: Date.now() }));
  }, POEM_A);

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
    test.setTimeout(35000);
    // PoemReader's REDUCED_MOTION flag is read once at module load from matchMedia. Without this,
    // the title intro runs as a real GSAP timeline (~3s of opacity/y/scale tweens on the poem
    // meta) before calling controller.start(), which is what actually kicks off the reveal engine
    // this test exercises. In headless Chromium that timeline's rAF-driven ticker doesn't reliably
    // advance (the page never reaches `ctrl.start()` even after a 20s poll), so the test isn't
    // testing tap/reveal behavior at all — it's testing whether a background tab's GSAP ticker
    // happens to tick. Force reduced motion so the intro collapses to its synchronous path and
    // controller.start() fires immediately, same as the "reduced motion" test below.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    const stage = page.locator('[data-testid="sparkler-stage"]').first();
    await expect.poll(() => revealedCount(page), { timeout: 20000 }).toBeGreaterThanOrEqual(1);
    const before = await revealedCount(page);
    await stage.click({ position: { x: 40, y: 30 } });
    await expect.poll(() => revealedCount(page), { timeout: 8000 }).toBeGreaterThan(before);
  });

  test('scrubbing seeks the reveal without navigating poems', async ({ page }) => {
    test.setTimeout(35000);
    // See the note in the sibling "tap reveals" test above — without forcing reduced motion, the
    // real GSAP title-intro timeline never completes in headless Chromium and controller.start()
    // is never reached, so revealedCount stays 0 for the whole poll regardless of scrub behavior.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    await expect.poll(() => revealedCount(page), { timeout: 20000 }).toBeGreaterThanOrEqual(1);
    const urlBefore = page.url();
    const handle = page.locator('[data-testid="progress-scrubber"] [role="slider"]').first();
    const bar = page.locator('[data-testid="progress-scrubber"]').first();
    const box = await bar.boundingBox();
    await handle.hover();
    await page.mouse.down();
    // The scrubber is now a vertical rail on the right edge — drag DOWN (toward the
    // bottom = end of the poem), not across.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.85, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    // Seeking near the end reveals more lines, and the feed did NOT advance to another poem.
    await expect.poll(() => revealedCount(page), { timeout: 6000 }).toBeGreaterThanOrEqual(2);
    expect(page.url()).toBe(urlBefore);
  });

  test('reduced motion still reveals on tap', async ({ page }) => {
    // Reveal poll waits up to 12s; extend beyond the 10s CI per-test timeout.
    test.setTimeout(25000);
    page.on('console', (msg) => {
      console.log('BROWSER:', msg.text());
    });
    page.on('pageerror', (err) => console.log('PAGEERROR:', err));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    const stage = page.locator('[data-testid="sparkler-stage"]').first();
    await expect.poll(() => revealedCount(page), { timeout: 12000 }).toBeGreaterThanOrEqual(1);
    const before = await revealedCount(page);
    await stage.click({ position: { x: 40, y: 30 } });
    await expect.poll(() => revealedCount(page), { timeout: 6000 }).toBeGreaterThan(before);
  });
});
