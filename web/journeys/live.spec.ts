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

  test('@live 2.17 with the guide live, every poem ends with three doors that have reasons', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/24');
    const doors = page.getByRole('region', { name: 'Where the guide goes next' }).locator('.door');
    await expect(doors).toHaveCount(3);
    await doors.first().click();
    await expect(page).not.toHaveURL(/\/p\/24$/);
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

test.describe('@live V3 against the real API', () => {
  test('@live 9.4 Tonight is the same pick for everyone and names its journey step', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey');
    await expect(page.getByText('HEAVEN 1 OF 3 · FIXTURE JOURNEY')).toBeVisible();
    await expect(page.getByText('A fixture reason for tonight.')).toBeVisible();
    await page.getByRole('link', { name: 'Read tonight’s poem' }).click();
    await expect(page.getByText('A second line made for testing')).toBeVisible();
  });

  test('@live 9.5–9.6 Pathways lists the published journeys and opens one', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey');
    await page.getByRole('radio', { name: 'PATHWAYS' }).click();
    await page.getByRole('link', { name: /Fixture journey/ }).click();
    await expect(page.getByRole('heading', { name: 'Fixture journey' })).toBeVisible();
    await expect(page.getByText('0 of 3')).toBeVisible();
  });

  test('@live 10.2 a collection lists its poems in order', async ({ page }) => {
    await fresh(page);
    await page.goto('./collection/fixture-collection');
    await expect(page.getByText('POEM 1', { exact: true })).toBeVisible();
    await expect(page.getByText('POEM 2', { exact: true })).toBeVisible();
  });

  test('@live 5.3 the poet tab shows where to find the poet', async ({ page }) => {
    await fresh(page);
    await page.goto('./poet/test-poet-five/about');
    await expect(page.getByText(/FIND TEST POET FIVE IN/)).toBeVisible();
    await expect(page.getByRole('link', { name: /Fixture journey/ })).toBeVisible();
  });

  test('@live 11.2 a line search ignores vowel marks; 11.3 nothing found offers the closest', async ({ page }) => {
    await fresh(page);
    await page.goto('./search');
    await page.getByRole('textbox', { name: /Search/ }).fill('الحنين');
    await expect(page.getByText('LINES')).toBeVisible();
    await page.getByRole('textbox', { name: /Search/ }).fill('zzzz');
    await expect(page.getByText('CLOSEST MATCHES:')).toBeVisible();
  });
});
