import { test, expect } from '@playwright/test';

/**
 * Flow Reader E2E — the scrolling poem column and the quill summon.
 *
 * Verifies: the whole poem renders as one scrollable column, the reveal is monotonic and
 * active-column-scoped, holding the quill summons the next poem (and releasing early does
 * not), and the old scrubber/tap-reveal controls are gone. All backend/AI calls are mocked
 * for determinism.
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
  await activeColumn(page).waitFor({ state: 'visible', timeout: 10000 });
}

// Every poem stays mounted and only the active one is visible, so a bare [data-testid] selector
// matches several elements and trips Playwright's strict mode. Always scope by data-active.
const activeColumn = (page) =>
  page.locator('[data-testid="poem-column"][data-active="true"]').first();

const readCount = (page) => activeColumn(page).locator('[data-read="true"]').count();
const verseCount = (page) => activeColumn(page).locator('[data-testid^="verse-unit-"]').count();

const scrollColumnToEnd = (page) =>
  page.evaluate(() => {
    const sc = document.querySelector('[data-active="true"] .pc-scroller');
    sc.scrollTop = sc.scrollHeight;
  });

const holdSeal = async (page, ms) => {
  const seal = page.locator('.seal').first();
  await seal.waitFor({ state: 'visible', timeout: 5000 });
  const box = await seal.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
};

const activeTitle = (page) => activeColumn(page).locator('.pc-ttl-ar').first().textContent();

test.describe('Flow reader', () => {
  test.beforeEach(async ({ page }) => {
    await setupMocks(page);
  });

  test('renders the whole poem as one column of verse units', async ({ page }) => {
    await loadFeed(page);
    await expect(page.locator('[data-testid="poem-feed"]')).toBeVisible();
    await expect(activeColumn(page)).toBeVisible();
    expect(await verseCount(page)).toBeGreaterThan(0);
    await expect(activeColumn(page).locator('.pc-ar').first()).toBeVisible();
  });

  test('the scroll reveal is monotonic: a read verse never returns to unread', async ({ page }) => {
    await loadFeed(page);
    expect(await readCount(page)).toBeGreaterThan(0);

    await scrollColumnToEnd(page);
    const total = await verseCount(page);
    await expect.poll(() => readCount(page), { timeout: 5000 }).toBe(total);

    // Scrolling back up must not un-reveal anything. This is the property the design rests on:
    // the reveal records where the reader has been, not where they are looking.
    await page.evaluate(() => {
      document.querySelector('[data-active="true"] .pc-scroller').scrollTop = 0;
    });
    await page.waitForTimeout(600);
    expect(await readCount(page)).toBe(total);
  });

  test('mounted but inactive poems are not pre-revealed', async ({ page }) => {
    await loadFeed(page);
    // IntersectionObserver with a non-null root measures against that root's box, not the
    // viewport, so an unscoped observer would reveal every hidden poem's first screen on mount.
    // Monotonic means that never recovers: every poem after the first would arrive undimmed.
    const inactiveRead = await page
      .locator('[data-testid="poem-column"][data-active="false"] [data-read="true"]')
      .count();
    expect(inactiveRead).toBe(0);
  });

  test('holding the quill summons the next poem', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    await scrollColumnToEnd(page);
    const before = await activeTitle(page);

    await holdSeal(page, 1100); // HOLD is 760ms; stay down past it so the charge completes

    await expect.poll(() => activeTitle(page), { timeout: 8000 }).not.toBe(before);
  });

  test('releasing the quill early summons nothing', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await loadFeed(page);
    await scrollColumnToEnd(page);
    const before = await activeTitle(page);

    await holdSeal(page, 250); // well short of the 760ms threshold

    await page.waitForTimeout(1200);
    expect(await activeTitle(page)).toBe(before);
  });

  test('the scrub rail, Next Verse and Read full poem are gone', async ({ page }) => {
    await loadFeed(page);
    await expect(page.locator('[data-testid="progress-scrubber"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Next Verse' })).toHaveCount(0);
    await expect(page.getByTestId('reader-read-full')).toHaveCount(0);
  });
});
