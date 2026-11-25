import { expect, test } from '@playwright/test';
import { fresh, signedIn } from './helpers';

test.describe('Areas 10–11 · Collections and search', () => {
  // V3.3 done when: a saved collection resumes where it left off.
  test('10.2 a long collection lists five, then names who the rest reach', async ({ page }) => {
    await fresh(page, { 'mock.progress': '[]' });
    await page.goto('./collection/your-first-seven');
    await expect(page.locator('.coll-row')).toHaveCount(5);
    await page.getByRole('button', { name: /^and 2 more/ }).click();
    await expect(page.locator('.coll-row')).toHaveCount(7);
  });

  test('10.2 a saved collection resumes at the next unread poem, after a reload; 8.15 it shows in the Library', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./collection/women-who-wrote-the-canon');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    const progress = page.getByRole('progressbar', { name: 'Women who wrote the canon progress' });
    await expect(progress).toHaveAttribute('aria-valuenow', '0');

    await page.getByRole('link', { name: /POEM 01/ }).click();
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: 'Poem 1 complete' })).toBeVisible();
    // The step is recorded asynchronously at the end of the poem; wait for it before leaving.
    await page.waitForFunction(() => (JSON.parse(localStorage.getItem('mock.progress') ?? '[]') as { slug: string; position: number }[])
      .some((p) => p.slug === 'women-who-wrote-the-canon' && p.position === 1));

    await page.goto('./collection/women-who-wrote-the-canon');
    await page.reload();
    await expect(progress).toHaveAttribute('aria-valuenow', '1');
    await expect(page.getByRole('link', { name: /POEM 02/ })).toBeVisible();
    await expect(page.getByText(/· read$/)).toHaveCount(1);
    await page.getByRole('link', { name: /POEM 02/ }).click();
    await expect(page).toHaveURL(/step=2/);

    // 8.15 the Library hub lists saved collections (it needs one keep to leave its empty state).
    await page.getByRole('button', { name: 'Keep' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kept in Favorites' })).toBeVisible();
    await page.goto('./library');
    await expect(page.getByText(/COLLECTIONS · \d+ SAVED/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Women who wrote the canon/ })).toBeVisible();
  });

  test('10.1 every collection in Explore opens and lists its poems in order', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/collections');
    const cards = page.locator('a.coll-card');
    await expect(cards.first()).toBeVisible();
    const n = await cards.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      await page.goto('./explore/collections');
      await cards.nth(i).click();
      await expect(page).toHaveURL(/\/collection\//);
      await expect(page.locator('.coll-row').first()).toContainText('01');
    }
  });

  // V3.4 done when: searching a half-remembered line finds the poem.
  test('11.2 a half-remembered line without vowel marks opens its poem', async ({ page }) => {
    await fresh(page);
    await page.goto('./search');
    await page.getByRole('textbox', { name: /Search/ }).fill('ديار ليلى');
    await expect(page.locator('.search-section', { hasText: 'LINES' })).toBeVisible();
    await page.locator('a.line-hit').filter({ hasText: 'I pass by the dwellings' }).first().click();
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
  });

  test('11.1 recent searches stay on the device and can be forgotten', async ({ page }) => {
    await fresh(page);
    await page.goto('./search');
    const box = page.getByRole('textbox', { name: /Search/ });
    await box.fill('الخنساء');
    await expect(page.locator('.search-section', { hasText: 'POETS' })).toBeVisible();
    await page.reload();
    await expect(page.getByText('RECENT')).toBeVisible();
    await page.locator('.recent__q').filter({ hasText: 'الخنساء' }).click();
    await expect(box).toHaveValue('الخنساء');
    await page.getByRole('button', { name: 'Clear' }).click();
    await page.getByRole('button', { name: 'Forget الخنساء' }).click();
    await expect(page.getByText('RECENT')).toHaveCount(0);
  });

  test('11.1 search opens from Explore and from the Library, and Cancel goes back to where it began', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./explore');
    await page.goto('./search?from=library');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page).toHaveURL(/\/library$/);

    await page.goto('./explore');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.locator('.tabbar [aria-current=page]')).toHaveAttribute('aria-label', 'Explore');
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page).toHaveURL(/\/explore$/);
    await page.goto('./library');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page).toHaveURL(/\/search\?from=library/);
    await expect(page.locator('.tabbar [aria-current=page]')).toHaveAttribute('aria-label', 'Library');
    await page.getByRole('textbox', { name: /Search/ }).fill('الديار');
    await expect(page.locator('.search-section', { hasText: 'LINES' })).toBeVisible();
    await page.getByRole('button', { name: 'CANCEL' }).click();
    await expect(page).toHaveURL(/\/library$/);
  });
});
