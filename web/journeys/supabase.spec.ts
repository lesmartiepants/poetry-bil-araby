// @live @supabase journeys: per-user data through a real Supabase (auth, RLS,
// triggers). Needs `supabase start` and the API on the same database:
//   scripts/live-supabase.sh   (sets it all up and runs these)
import { expect, test, type Browser, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { openYourPoems } from './helpers';

const supabaseURL = process.env.VITE_SUPABASE_URL ?? '';
const KEY = process.env.VITE_SUPABASE_ANON_KEY ?? '';
test.skip(!supabaseURL || !KEY, 'Supabase not configured');

type Session = Record<string, unknown>;
const sessionKey = supabaseURL ? `sb-${new URL(supabaseURL).hostname.split('.')[0]}-auth-token` : '';
const rootHtml = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
async function newUser(): Promise<Session> {
  const email = `reader+${Date.now()}${Math.floor(Math.random() * 1e6)}@example.test`;
  const res = await fetch(`${supabaseURL}/auth/v1/signup`, {
    method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'correct-horse-battery-staple' }),
  });
  const s = await res.json();
  if (!s.access_token) throw new Error(`signup failed: ${JSON.stringify(s).slice(0, 200)}`);
  return s;
}
/** A browser session signed in as `user`, with nothing else on the device. */
async function as(browser: Browser, user: Session): Promise<Page> {
  const baseURL = test.info().project.use.baseURL!;
  const ctx = await browser.newContext({
    baseURL, viewport: { width: 390, height: 844 },
    storageState: {
      cookies: [],
      origins: [{
        origin: new URL(baseURL).origin,
        localStorage: [{ name: 'welcomed', value: 'true' }, { name: sessionKey, value: JSON.stringify(user) }],
      }],
    },
  });
  await ctx.addInitScript(() => sessionStorage.setItem('splashed', '1'));
  return ctx.newPage();
}

async function guest(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('splashed', '1');
    localStorage.setItem('welcomed', 'true');
  });
}

async function asUserStorage(page: Page, main: Session, previous: Session) {
  await guest(page);
  await page.goto('./you', { waitUntil: 'domcontentloaded' });
  await page.evaluate(({ key, current, old }) => {
    localStorage.setItem(key, JSON.stringify(current));
    localStorage.setItem('pba-auth', JSON.stringify(old));
  }, { key: sessionKey, current: main, old: previous });
}

// Substitute only the provider round trip. The returned session and subsequent
// token validation, persistence, and per-user writes use real local Supabase.
async function stubGoogle(page: Page, session: Session, cancelFirst = false) {
  let calls = 0;
  await page.route((url) => url.pathname === '/' && (url.searchParams.has('code') || url.searchParams.has('error')),
    (route) => route.fulfill({ contentType: 'text/html', body: rootHtml }));
  await page.route(/\/auth\/v1\/token\?grant_type=pkce/, async (route) => {
    expect(route.request().postDataJSON().auth_code).toBe('test-google-code');
    expect(route.request().postDataJSON().code_verifier).toBeTruthy();
    await route.fulfill({ json: session });
  });
  await page.route(/\/auth\/v1\/authorize\?/, async (route) => {
    const request = new URL(route.request().url());
    expect(request.searchParams.get('provider')).toBe('google');
    expect(request.searchParams.get('code_challenge_method')).toBe('s256');
    expect(request.searchParams.get('code_challenge')).toBeTruthy();
    const callback = new URL(request.searchParams.get('redirect_to')!);
    expect(callback.origin).toBe(new URL(page.url()).origin);
    expect(callback.pathname).toBe('/');
    calls++;
    if (cancelFirst && calls === 1) callback.searchParams.set('error', 'access_denied');
    else callback.searchParams.set('code', 'test-google-code');
    await route.fulfill({ status: 302, headers: { location: callback.toString() } });
  });
  return () => calls;
}

test.describe('@live @supabase Google callback', () => {
  test('@live @supabase returns to the poem, handles cancellation, and keeps the poem once on retry', async ({ page }) => {
    const user = await newUser();
    await guest(page);
    const calls = await stubGoogle(page, user, true);
    let writes = 0;
    page.on('request', (r) => {
      if (r.method() === 'POST' && r.url().includes('/rest/v1/saved_poems')) writes++;
    });
    await page.goto('./p/24?from=qa');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByRole('dialog', { name: 'Sign in' }).getByRole('alert')).toContainText('Sign-in didn’t finish');
    await expect(page).toHaveURL(/\/new\/p\/24\?from=qa$/);
    expect(writes).toBe(0);
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kept in Favorites' })).toBeVisible();
    await expect(page).toHaveURL(/\/new\/p\/24\?from=qa$/);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Kept. Tap to remove', exact: true })).toBeVisible();
    expect(calls()).toBe(2);
    expect(writes).toBe(1);
  });

  test('@live @supabase resumes a follow after Google and shows follows without keeps', async ({ page }) => {
    const user = await newUser();
    await guest(page);
    await stubGoogle(page, user);
    await page.goto('./poet/test-poet-eight');
    await page.getByRole('button', { name: 'Follow', exact: true }).click();
    await page.getByRole('button', { name: 'Continue with Google' }).click();
    await expect(page.getByRole('button', { name: 'Following' })).toBeVisible();
    await expect(page).toHaveURL(/\/new\/poet\/test-poet-eight$/);
    await page.goto('./library');
    await expect(page.getByText('POETS YOU FOLLOW · 1')).toBeVisible();
    await page.goto('./poet/test-poet-eight');
    await page.getByRole('button', { name: 'Following' }).click();
    await expect(page.getByRole('button', { name: 'Follow', exact: true })).toBeVisible();
    await page.goto('./library');
    await expect(page.getByText('Nothing kept yet')).toBeVisible();
  });

  test('@live @supabase uses a main-app session and retires the old separate new-app key', async ({ page }) => {
    const mainSession = await newUser();
    const previousNewAppSession = await newUser();
    await asUserStorage(page, mainSession, previousNewAppSession);
    await page.goto('./you');
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    expect(await page.evaluate((key) => ({
      user: JSON.parse(localStorage.getItem(key) ?? '{}').user?.id,
      old: localStorage.getItem('pba-auth') !== null,
    }), sessionKey)).toEqual({ user: (mainSession.user as { id: string }).id, old: false });
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: /^Sign in/ })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: /^Sign in/ })).toBeVisible();
  });

  for (const entry of ['you', 'library']) {
    test(`@live @supabase Google can return to ${entry} on desktop`, async ({ page }) => {
      const user = await newUser();
      await page.setViewportSize({ width: 1280, height: 900 });
      await guest(page);
      await stubGoogle(page, user);
      await page.goto('./' + entry);
      await page.getByRole('button', { name: /^Sign in/ }).click();
      await page.getByRole('button', { name: 'Continue with Google' }).click();
      await expect(page.getByRole('dialog', { name: 'Sign in' })).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp('/new/' + entry + '$'));
      await page.goto('./you');
      await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    });
  }
});

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
    await expect(other.locator('.poem-tile').first()).toBeVisible();
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
    await other.goto('./you/appearance');
    await expect(other.locator('html')).toHaveAttribute('data-page', 'parchment');
    await expect(other.getByRole('radio', { name: /NASKH/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('@live @supabase 8.5 following a poet shows in the Library, with poems read', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    // Act once the reader's follows have loaded from Supabase; a click before that raced the
    // session and the follows refetch (flaked once in CI).
    const follows = page.waitForResponse((r) => r.url().includes('/rpc/followed_poet_slugs') && r.ok());
    await page.goto('./poet/test-poet-eight');
    await follows;
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
    await page.getByRole('link', { name: /HEAVEN 1/ }).last().click();
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Heaven 1 complete' }).click();
    await expect(page.getByText(/Heaven one/)).toBeVisible();
    const other = await as(browser, user);
    await other.goto('./journey/fixture-journey');
    await expect(other.getByText('JOURNEY · 1 OF 3 READ')).toBeVisible();
    const stranger = await as(browser, await newUser());
    await stranger.goto('./journey/fixture-journey');
    await expect(stranger.getByText('JOURNEY · 0 OF 3 READ')).toBeVisible();
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
    await openYourPoems(page);
    await page.getByRole('button', { name: 'SELECT' }).click();
    await page.locator('[role=checkbox]').first().click();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 removed' })).toBeVisible();
    const other = await as(browser, user);
    await other.goto('./library');
    await expect(other.getByText('Nothing kept yet')).toBeVisible();
  });

  test('@live @supabase bookmarks sync without keeps and clear from the Library on sign-out', async ({ browser }) => {
    const user = await newUser();
    const page = await as(browser, user);
    for (const path of ['collection/fixture-collection', 'journey/fixture-journey']) {
      await page.goto('./' + path);
      await page.getByRole('button', { name: 'Save', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Saved', exact: true })).toHaveAttribute('aria-pressed', 'true');
    }
    await page.goto('./library');
    await expect(page.getByText('COLLECTIONS · 2 SAVED')).toBeVisible();
    await expect(page.getByRole('link', { name: /Fixture collection/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Fixture journey/ })).toBeVisible();

    const other = await as(browser, user);
    await other.goto('./library');
    await expect(other.getByText('COLLECTIONS · 2 SAVED')).toBeVisible();
    await other.getByRole('link', { name: /Fixture collection/ }).click();
    await other.getByRole('button', { name: 'Saved' }).click();
    await expect(other.getByRole('button', { name: 'Save', exact: true })).toBeVisible();
    await other.goto('./library');
    await expect(other.getByText('COLLECTIONS · 1 SAVED')).toBeVisible();

    // Sign out and navigate client-side so a hard reload cannot hide stale React Query data.
    await other.getByRole('link', { name: 'You', exact: true }).click();
    await other.getByRole('button', { name: 'Sign out' }).click();
    await expect(other.getByRole('button', { name: /^Sign in/ })).toBeVisible();
    await other.getByRole('link', { name: 'Library', exact: true }).click();
    await expect(other.getByRole('button', { name: 'Sign in to keep poems' })).toBeVisible();
    await expect(other.getByRole('link', { name: /Fixture journey/ })).toHaveCount(0);

    const stranger = await as(browser, await newUser());
    await stranger.goto('./library');
    await expect(stranger.getByText('Nothing kept yet')).toBeVisible();
  });

});
