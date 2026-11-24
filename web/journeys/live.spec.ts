// @live journeys: the same flows against server.js and a seeded Postgres,
// for the domains already live in core/sources.ts. Run: npm run test:journeys:live
import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test.describe('@live V1 against the real API', () => {
  test('@live 4.1 Explore shows the poet of the week, feelings and difficulty bands from the database', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await expect(page.getByText('A fixture poet of the week.')).toBeVisible();
    await expect(page.getByRole('link', { name: /Nostalgia/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gentle/ })).toBeVisible();
  });

  test('@live 4.4 a feeling lists its poems and opens one in the reader', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore/feeling/nostalgia');
    await expect(page.getByRole('heading', { name: 'Nostalgia' })).toBeVisible();
    await page.locator('.list-row').first().click();
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('@live 4.7 each difficulty band has poems', async ({ page }) => {
    await fresh(page);
    for (const band of ['gentle', 'measured', 'demanding']) {
      await page.goto(`./explore/difficulty/${band}`);
      await expect(page.locator('.list-row').first()).toBeVisible();
    }
  });

  test('@live 2.1 + 2.5 a poem with its translation, and its stored explanation', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    await expect(page.getByText('A second line made for testing')).toBeVisible();
    await page.getByRole('button', { name: 'Insights' }).click();
    await expect(page.getByRole('dialog', { name: 'Insights' }).getByText('A fixture explanation')).toBeVisible();
  });

  test('@live 2.7 next poem draws a different poem from the server', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    await page.getByRole('button', { name: /Next poem/ }).click();
    await expect(page).not.toHaveURL(/\/p\/24$/);
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('@live 2.11 an unknown poem id says the link leads nowhere', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/999999');
    await expect(page.getByRole('alert')).toContainText('This link leads nowhere');
  });

  test('@live 5.1 a poet page lists the poet’s poems', async ({ page }) => {
    await fresh(page);
    await page.goto('./poet/test-poet-five');
    await expect(page.getByRole('heading', { name: 'شاعرة الاختبار الخامسة' })).toBeVisible();
    await expect(page.locator('.list-row').first()).toBeVisible();
    await expect(page.getByText(/NAJD/)).toBeVisible();
  });
});
