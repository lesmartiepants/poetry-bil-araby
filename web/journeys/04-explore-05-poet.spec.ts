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

  test('5.1 every poet in Explore opens a page of their poems; 5.3 the poet tab shows the bio', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await page.getByRole('link', { name: /Al-Khansa ·/ }).click();
    await expect(page.getByRole('heading', { name: 'الخنساء' })).toBeVisible();
    await expect(page.getByText('A mote in your eye')).toBeVisible();
    await page.getByRole('radio', { name: 'THE POET' }).click();
    await expect(page.getByText(/greatest elegist/)).toBeVisible();
  });
});
