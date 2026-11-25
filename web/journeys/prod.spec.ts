// @prod smoke: the deployed /new against the production API and database.
// Run: npm run test:prod   (PROD_URL=… for a preview). Never part of the mock or live runs.
//
// READ-ONLY BY CONSTRUCTION. Every request the page makes goes through `guard`:
//   - anything but GET/HEAD/OPTIONS is aborted (no keeps, lists, settings, reads, bug reports);
//   - the two GETs that can write are aborted too: /api/v2/poems/:id/ai (generates and stores AI text
//     when it's missing) and /api/v2/tonight (stores today's pick when none is set).
// Set PROD_ALLOW_CACHE_FILL=1 to let those two through (they only ever fill a cache row).
// Signed-in steps (keep, lists, settings) are deliberately absent: they would write per-user rows.
import { expect, test, type Page } from '@playwright/test';
import { fresh } from './helpers';

const ALLOW_FILL = process.env.PROD_ALLOW_CACHE_FILL === '1';
const WRITES_ON_GET = /\/api\/v2\/(poems\/[^/]+\/ai|tonight)(\?|$)/;
const blocked: string[] = [];

async function guard(page: Page) {
  await page.route('**/*', (route) => {
    const req = route.request();
    const readOnly = ['GET', 'HEAD', 'OPTIONS'].includes(req.method());
    if (!readOnly || (!ALLOW_FILL && WRITES_ON_GET.test(req.url()))) {
      blocked.push(`${req.method()} ${req.url()}`);
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

/** The API origin the deployed app talks to, read from its own first /api/v2 request. */
async function apiOrigin(page: Page): Promise<string> {
  const req = await page.waitForRequest((r) => r.url().includes('/api/v2/'));
  return new URL(req.url()).origin;
}

test.beforeEach(async ({ page }) => {
  await guard(page);
  await fresh(page);
});
test.afterAll(() => {
  if (blocked.length) console.log(`@prod guard blocked ${blocked.length} request(s):\n  ${[...new Set(blocked)].join('\n  ')}`);
});

test.describe('@prod the deployed app, read-only', () => {
  test('@prod 4.1 Explore shows the poet of the week, feelings, bands and eras from the database', async ({ page }) => {
    await page.goto('./explore');
    await expect(page.getByText('POET OF THE WEEK')).toBeVisible();
    await expect(page.locator('a[href*="/explore/feeling/"]').nth(2)).toBeVisible();
    await expect(page.locator('a[href*="/explore/difficulty/"]')).toHaveCount(3);
    await expect(page.locator('.era-card').first()).toBeVisible();
  });

  test('@prod 4.4 → 2.1 a feeling lists poems and one opens with its Arabic and the dock', async ({ page }) => {
    await page.goto('./explore');
    await page.locator('a[href*="/explore/feeling/"]').first().click();
    await page.locator('.list-row').first().click();
    await expect(page).toHaveURL(/\/p\//);
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
    await expect(page.locator('[data-line="0"]')).toContainText(/[؀-ۿ]/);
  });

  test('@prod 4.7 each difficulty band has poems', async ({ page }) => {
    for (const band of ['gentle', 'measured', 'demanding']) {
      await page.goto(`./explore/difficulty/${band}`);
      await expect(page.locator('.list-row').first()).toBeVisible();
    }
  });

  test('@prod 4.2 → 5.1 a poet from All poets opens a page of their poems', async ({ page }) => {
    await page.goto('./explore/poets');
    await page.locator('.poet-line').first().click();
    await expect(page.locator('.poet-poem').first()).toBeVisible();
  });

  // Checked on the poet of the week: in Nov 2026, 539 of 966 poets still had no bio (Gemini fill not run).
  test('@prod 4.1 → 5.3 the poet of the week has a bio on the poet tab', async ({ page }) => {
    await page.goto('./explore');
    await page.locator('.potw').click();
    await expect(page.locator('.poet-poem').first()).toBeVisible();
    await page.getByRole('radio', { name: 'THE POET' }).click();
    await expect(page.locator('.poet-poem')).toHaveCount(0);
    await expect(page.locator('.poet-bio__lead')).toHaveText(/\w{3}/);
  });

  test('@prod 2.17 a poem ends with three doors, and a door opens its poem', async ({ page }) => {
    await page.goto('./explore/difficulty/gentle');
    await page.locator('.list-row').first().click();
    const doors = page.getByRole('region', { name: 'Where the guide would take you next' }).locator('.door-card');
    await expect(doors).toHaveCount(3);
    await expect(doors.locator('.door-card__title')).toHaveCount(3);
    await expect(doors.locator('.door-card__connection')).toHaveCount(3);
    const here = page.url();
    await doors.first().click();
    await expect(page).not.toHaveURL(here);
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('@prod 2.11 an unknown poem says the link leads nowhere', async ({ page }) => {
    await page.goto('./p/999999999');
    await expect(page.getByRole('alert')).toContainText('This link leads nowhere');
  });

  test('@prod 11.2 an Arabic word finds poems or lines; 11.3 nonsense offers the closest', async ({ page }) => {
    await page.goto('./search');
    const box = page.getByRole('textbox', { name: /Search/ });
    await box.fill('الليل');
    await expect(page.getByText(/^(POEMS|LINES)$/).first()).toBeVisible();
    await box.fill('zzqqxx');
    await expect(page.getByText('Closest matches:')).toBeVisible();
  });

  test('@prod 10.1 → 10.2 a published collection opens with its poems in order', async ({ page }) => {
    await page.goto('./explore/collections');
    const cards = page.locator('a.coll-card');
    await page.waitForLoadState('networkidle');
    test.skip((await cards.count()) === 0, 'No published collections in production yet (editorial seed pending)');
    await cards.first().click();
    await expect(page.locator('.coll-row').first()).toContainText('01');
  });

  test('@prod 7.11 the server renders a share card as a 1080 × 1350 PNG', async ({ page, request }) => {
    const origin = apiOrigin(page);
    await page.goto('./explore');
    const api = await origin;
    const poem = await (await request.get(`${api}/api/v2/poems/next`)).json();
    const res = await request.get(`${api}/api/v2/poems/${poem.id}/card.png?en=1`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
    const png = await res.body();
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([1080, 1350]);
  });

  test('@prod 9.4 Tonight shows one poem with its reason', async ({ page }) => {
    test.skip(!ALLOW_FILL, 'Tonight may store today’s pick; set PROD_ALLOW_CACHE_FILL=1 to include it');
    await page.goto('./journey');
    await expect(page.getByRole('link', { name: 'Enter the poem' })).toBeVisible();
  });
});
