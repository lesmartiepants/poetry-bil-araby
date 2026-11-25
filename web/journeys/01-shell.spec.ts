import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test.describe('Area 1 · Shell and developer panel', () => {
  test('1.1 the splash shows on first open, then the app', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => { localStorage.setItem('welcomed', 'true'); sessionStorage.clear(); });
    await page.goto('./explore');
    await expect(page.getByRole('img', { name: 'Poetry in Arabic' })).toBeVisible();
    await expect(page.getByText('POET OF THE WEEK')).toBeVisible();
  });

  test('every tab is reachable from the tab bar', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    for (const [tab, text] of [['Journey', 'TONIGHT'], ['Library', 'Your diwan'], ['You', 'READING'], ['Explore', 'POET OF THE WEEK']] as const) {
      await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: tab }).click();
      await expect(page.getByText(text).first()).toBeVisible();
    }
  });

  test('1.3 a server error turns the edge tab red with a count; 1.4 the timeline shows it', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await expect(page.getByTestId('edge-tab')).toBeVisible();
    await page.evaluate(() => fetch('/api/definitely-missing-route').catch(() => {}));
    await expect(page.getByTestId('edge-tab')).toHaveClass(/edge-tab--error/);
    await page.getByTestId('edge-tab').click();
    await expect(page.getByRole('dialog', { name: 'Developer panel' }).getByText('/api/definitely-missing-route')).toBeVisible();
  });

  test('1.6 long-press the tab bar hides and shows the edge tab', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    const bar = page.getByTestId('tabbar');
    const box = (await bar.boundingBox())!;
    const press = async () => { await page.mouse.move(box.x + 10, box.y + box.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); };
    await press();
    await expect(page.getByTestId('edge-tab')).toHaveCount(0);
    await press();
    await expect(page.getByTestId('edge-tab')).toBeVisible();
  });
});
