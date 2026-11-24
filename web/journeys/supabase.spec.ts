// @live @supabase journeys: per-user data through a real Supabase (auth, RLS,
// triggers). Needs `supabase start` and the API on the same database:
//   scripts/live-supabase.sh   (sets it all up and runs these)
import { expect, test, type Browser, type Page } from '@playwright/test';

const URL = process.env.VITE_SUPABASE_URL ?? '';
const KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
test.skip(!URL || !KEY, 'Supabase not configured');

type Session = Record<string, unknown>;
async function newUser(): Promise<Session> {
  const email = `reader+${Date.now()}${Math.floor(Math.random() * 1e6)}@example.test`;
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse-battery-staple' }),
  });
  const s = await res.json();
  if (!s.access_token) throw new Error(`signup failed: ${JSON.stringify(s).slice(0, 200)}`);
  return s;
}
/** A browser session signed in as `user`, with nothing else on the device. */
async function as(browser: Browser, user: Session): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto('./');
  await page.evaluate((s) => {
    localStorage.clear();
    sessionStorage.setItem('splashed', '1');
    localStorage.setItem('welcomed', 'true');
    localStorage.setItem('pba-auth', JSON.stringify(s));
  }, user);
  return page;
}

test.describe('@live @supabase per-user data', () => {
  test('@live @supabase 6.3–6.6 keep goes to Favorites, a new list holds it, deleting the list keeps the poem, on any device', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    await page.goto('./p/24');
    await page.getByRole('button', { name: 'Keep' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kept in Favorites' })).toBeVisible();
    await page.getByRole('button', { name: 'CHANGE' }).click();
    await expect(page.getByRole('checkbox', { name: /Favorites/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'New list' }).click();
    await page.getByRole('textbox', { name: 'List name' }).fill('Longing for home');
    await page.getByRole('button', { name: 'Create and add this poem' }).click();
    await expect(page.getByRole('checkbox', { name: /Longing for home/ })).toHaveAttribute('aria-checked', 'true');

    // A second device sees the same lists, from the database.
    const other = await as(browser, user);
    await other.goto('./library/lists');
    await expect(other.getByText('Longing for home')).toBeVisible();
    await expect(other.getByLabel('Can’t be renamed or deleted')).toBeVisible();
    await other.getByRole('button', { name: 'Options for Longing for home' }).click();
    await other.getByRole('button', { name: 'Delete list' }).click();
    await other.getByRole('button', { name: 'DELETE LIST' }).click();
    await expect(other.getByText('Longing for home')).toHaveCount(0);
    await other.goto('./library');
    await expect(other.locator('.list-row').first()).toBeVisible();
  });

  test('@live @supabase 12.2 settings follow the reader to another device', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    await page.goto('./you/appearance');
    await page.getByRole('radio', { name: /PARCHMENT/ }).click();
    await page.getByRole('radio', { name: /NASKH/ }).click();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'parchment');
    await page.waitForTimeout(500);
    const other = await as(browser, user);
    await other.goto('./you');
    await expect(other.locator('html')).toHaveAttribute('data-page', 'parchment');
    await expect(other.getByText(/Naskh/)).toBeVisible();
  });

  test('@live @supabase 8.5 following a poet shows in the Library, with poems read', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    await page.goto('./poet/test-poet-eight');
    await page.getByRole('button', { name: 'Follow' }).click();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await page.goto('./p/24');
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const other = await as(browser, user);
    await other.goto('./library/poets');
    await expect(other.getByText(/Test Poet Eight/)).toBeVisible();
    await expect(other.getByText(/1 read/)).toBeVisible();
  });

  test('@live @supabase 9.6 journey progress is kept per reader', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    await page.goto('./journey/fixture-journey');
    await page.getByRole('button', { name: /I’ve read heaven 1/ }).click();
    await expect(page.getByText('HEAVEN 1 COMPLETE')).toBeVisible();
    const other = await as(browser, user);
    await other.goto('./journey/fixture-journey');
    await expect(other.getByText('1 of 3')).toBeVisible();
    const stranger = await as(browser, await newUser());
    await stranger.goto('./journey/fixture-journey');
    await expect(stranger.getByText('0 of 3')).toBeVisible();
  });

  test('@live @supabase 8.10 removing a keep removes it everywhere; another reader never sees it', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    await page.goto('./p/24');
    await page.getByRole('button', { name: 'Keep' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kept in Favorites' })).toBeVisible();
    const stranger = await as(browser, await newUser());
    await stranger.goto('./library');
    await expect(stranger.getByText('Nothing kept yet')).toBeVisible();
    await page.goto('./library');
    await page.getByRole('radio', { name: 'POEMS' }).click();
    await page.getByRole('button', { name: 'SELECT' }).click();
    await page.locator('[role=checkbox]').first().click();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 removed' })).toBeVisible();
    const other = await as(browser, user);
    await other.goto('./library');
    await expect(other.getByText('Nothing kept yet')).toBeVisible();
  });
});
