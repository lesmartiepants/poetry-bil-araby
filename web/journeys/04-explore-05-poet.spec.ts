import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test.describe('Areas 4–5 · Explore and poet pages', () => {
  test('4.1 → 4.4 a feeling chip opens its shelf and a poem', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await page.getByRole('link', { name: /Longing/ }).first().click();
    await expect(page.getByRole('heading', { name: 'Longing' })).toBeVisible();
    await page.getByRole('link', { name: /I pass by the dwellings/ }).click();
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
  });

  test('4.7 a difficulty band lists its poems and hops between bands', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await page.getByRole('link', { name: /Gentle/ }).click();
    await expect(page.getByRole('heading', { name: 'Gentle' })).toBeVisible();
    await page.getByRole('link', { name: 'DEMANDING' }).click();
    await expect(page.getByRole('heading', { name: 'Demanding' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Stop, let us weep/ })).toBeVisible();
  });

  test('4.2 all poets filter by era', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/poets');
    await page.getByRole('button', { name: 'ABBASID' }).click();
    await expect(page.getByRole('link', { name: /Al-Mutanabbi/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Al-Khansa/ })).toHaveCount(0);
  });

  test('4.5 → 4.6 an era shelf opens one era', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/eras');
    await page.getByRole('link', { name: /Abbasid/ }).click();
    await expect(page.getByRole('heading', { name: 'Abbasid' })).toBeVisible();
  });

  // V1.5 done when: every browse path reaches a poem.
  const paths: [string, (p: import('@playwright/test').Page) => Promise<void>][] = [
    ['4.1 → 4.4 a feeling chip', async (p) => { await p.getByRole('link', { name: /Longing/ }).first().click(); }],
    ['4.3 → 4.4 the feeling shelves', async (p) => {
      await p.locator('a[href$="/explore/feelings"]').click();
      await p.locator('.shelf-head').filter({ hasText: /Longing/ }).click();
    }],
    ['4.5 → 4.6 the era shelves', async (p) => {
      await p.locator('a[href$="/explore/eras"]').click();
      await p.locator('.shelf-head').filter({ hasText: /Abbasid/ }).click();
    }],
    ['4.6 an era card', async (p) => { await p.locator('.era-card').filter({ hasText: /Abbasid/ }).click(); }],
    ['4.7 a difficulty band', async (p) => { await p.getByRole('link', { name: /Measured/ }).click(); }],
    ['4.2 → 5.1 all poets', async (p) => {
      await p.locator('a[href$="/explore/poets"]').click();
      await p.locator('.poet-line').filter({ hasText: 'Al-Mutanabbi' }).click();
    }],
    ['4.1 → 5.1 the poet of the week', async (p) => { await p.locator('.potw').click(); }],
  ];
  for (const [name, go] of paths) {
    test(`${name} reaches a poem`, async ({ page }) => {
      await fresh(page);
      await page.goto('./explore');
      await go(page);
      await page.locator('.list-row, .poet-poem').first().click();
      await expect(page).toHaveURL(/\/p\//);
      await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
    });
  }

  test('5.1 every poet in All poets opens their page, listing as many poems as it counts', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/poets');
    const rows = page.locator('.poet-line');
    await expect(rows.first()).toBeVisible();
    const n = await rows.count();
    expect(n).toBeGreaterThan(1);
    for (let i = 0; i < n; i++) {
      const nameAr = (await rows.nth(i).locator('.poet-line__ar').textContent())!;
      await rows.nth(i).click();
      await expect(page.getByRole('heading', { name: nameAr })).toBeVisible();
      const count = page.locator('.poet-poems__count');
      await expect(count).toBeVisible();
      const listed = await page.locator('.poet-poem').count();
      await expect(count).toContainText(`${listed} ${listed === 1 ? 'POEM' : 'POEMS'}`);
      await page.goBack();
      await expect(rows.first()).toBeVisible();
    }
  });

  test('5.1 every poet in Explore opens a page of their poems; 5.3 the poet tab shows the bio', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await page.getByRole('link', { name: /Al-Khansa ·/ }).click();
    await expect(page.getByRole('heading', { name: 'الخنساء' })).toBeVisible();
    await expect(page.getByText('A mote in your eye')).toBeVisible();
    await page.getByRole('radio', { name: 'THE POET' }).click();
    await expect(page.getByText(/greatest elegist/)).toBeVisible();
  });

  test('5.3 a poet with no bio or region yet says so, and the page still works', async ({ page }) => {
    await fresh(page);
    await page.goto('./poet/kab-ibn-zuhayr/about');
    await expect(page.getByTestId('no-bio')).toContainText('Nothing has been written about Kaʿb ibn Zuhayr');
    await expect(page.locator('.poet-hero__meta')).not.toContainText('HIJAZ');
    await expect(page.locator('.poet-hero__meta')).toContainText('D. C. 662');
  });
});
