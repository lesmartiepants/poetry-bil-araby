import { expect, test } from '@playwright/test';
import { fresh, openAa } from './helpers';

test.describe('Area 2 · Reading', () => {
  test('2.1 a poem opens with its title, poet and verses', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
    await expect(page.getByText("I pass by the dwellings, Layla's dwellings,")).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('2.4 Aa: font, size, page and vowel marks apply live and survive a reload', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await openAa(page);
    const aa = page.getByRole('dialog', { name: 'Reading settings' });
    await aa.getByRole('radio', { name: /NASKH/ }).click();
    await aa.getByRole('radio', { name: /PARCHMENT/ }).click();
    await aa.getByRole('switch', { name: 'Vowel marks' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'parchment');
    await expect(page.getByText('امر علي الديار').or(page.getByText('أمر على الديار ديار ليلى'))).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-page', 'parchment');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--reading-font'))).toContain('Naskh');
  });

  test('2.4 show under the Arabic: Sounds swaps the English for transliteration', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await openAa(page);
    await page.getByRole('radio', { name: 'SOUNDS' }).click();
    await expect(page.getByText("I pass by the dwellings, Layla's dwellings,")).toHaveCount(0);
  });

  test('2.5 Insights opens over the poem with The meaning and The poet', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Insights' }).click();
    const s = page.getByRole('dialog', { name: 'Insights' });
    await expect(s.getByText(/kisses the walls/)).toBeVisible();
    await s.getByRole('radio', { name: 'THE POET' }).click();
    await expect(s.getByText(/Qays ibn al-Mulawwah/)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
  });

  test('2.6 tap a word shows its root and meaning in this line', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.locator("[data-line='1'] [data-word='2']").click();
    const s = page.getByRole('dialog', { name: 'Word meaning' });
    await expect(s.getByText(/^ROOT/)).toBeVisible();
    await expect(s.getByText('IN THIS LINE')).toBeVisible();
    await expect(page.locator('.word--selected')).toHaveCount(1);
  });

  test('2.7 the end of the poem offers next poem, more by the poet and more of the feeling', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    const end = page.getByRole('region', { name: 'End of poem' });
    await expect(end.getByText('More by Majnun Layla')).toBeVisible();
    await end.getByRole('button', { name: /Next poem/ }).click();
    await expect(page).not.toHaveURL(/amurru/);
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
    await page.goto('./p/amurru');
    await page.getByRole('link', { name: /More by Majnun Layla/ }).click();
    await expect(page).toHaveURL(/poet\/majnun-layla/);
  });

  test('2.2–2.3 scrolling folds the dock into the mark, which opens the fan', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.getByRole('button', { name: 'Actions' }).click();
    await expect(page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Insights' })).toBeVisible();
  });

  test('2.11 a broken link says so and offers Explore', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/no-such-poem');
    await expect(page.getByRole('alert')).toContainText('This link leads nowhere');
    await page.getByRole('button', { name: 'Go to Explore' }).click();
    await expect(page.getByText('POET OF THE WEEK')).toBeVisible();
  });
});
