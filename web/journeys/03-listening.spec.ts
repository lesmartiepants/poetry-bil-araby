import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test.describe('Area 3 · Listening', () => {
  test('3.1 Listen turns the dock into the player and the glow advances', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    const player = page.getByRole('navigation', { name: 'Now playing' });
    await expect(player.getByText('LINE 1 OF 4')).toBeVisible();
    await expect(page.locator('.word--now')).toHaveCount(1, { timeout: 3000 });
    await expect(player.getByText('LINE 2 OF 4')).toBeVisible({ timeout: 6000 });
  });

  test('3.3 switching voice restarts the current line and becomes the default', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await page.getByRole('button', { name: /ZEPHYR/ }).click();
    const sheet = page.getByRole('dialog', { name: 'Choose a voice' });
    await expect(sheet.getByRole('radiogroup', { name: 'Male voices', exact: true }).getByRole('radio')).toHaveCount(8);
    await sheet.getByRole('radio', { name: /Orus/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: /ORUS/ })).toBeVisible();
    await page.goto('./you/reciter');
    await expect(page.getByRole('radio', { name: /Orus/ })).toHaveAttribute('aria-checked', 'true');
  });

  test('3.7 tapping a verse while listening offers Play from here', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await page.locator("[data-line='3'] [data-word='0']").click();
    await page.getByRole('button', { name: 'Play from here' }).click();
    await expect(page.getByRole('navigation', { name: 'Now playing' }).getByText('LINE 4 OF 4')).toBeVisible();
  });

  test('3.10 without word timings the verse is highlighted instead of words', async ({ page }) => {
    await fresh(page, { 'mock.noTimings': '1' });
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await expect(page.locator('.verse--active')).toHaveCount(1, { timeout: 3000 });
    await page.waitForTimeout(800);
    await expect(page.locator('.word--now')).toHaveCount(0);
  });

  test('3.11 a voice that fails keeps the current one and says so', async ({ page }) => {
    await fresh(page, { 'mock.failVoice': 'Leda' });
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await page.getByRole('button', { name: /ZEPHYR/ }).click();
    await page.getByRole('dialog', { name: 'Choose a voice' }).getByRole('radio', { name: /Leda/ }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'Leda isn’t available now. Still reciting in Zephyr.' })).toBeVisible();
  });

  test('3.4–3.6 scrolling shrinks the player to a pill; the fan shows Pause and the recitation keeps going', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await expect(page.locator('.word--now')).toHaveCount(1, { timeout: 3000 });
    await page.evaluate(() => window.scrollTo(0, 600));
    const pill = page.getByRole('navigation', { name: 'Now playing' });
    await expect(pill).toHaveClass(/player--pill/);
    await expect(pill.getByRole('button', { name: 'Pause' })).toBeVisible();
    await pill.getByRole('button', { name: 'More actions' }).click();
    await expect(page.getByRole('menu', { name: 'Actions' }).getByRole('menuitem', { name: 'Pause' })).toBeVisible();
    await page.getByRole('button', { name: 'Close actions' }).click();
    await expect(pill.getByText(/LINE 2 OF 4/)).toBeVisible({ timeout: 6000 });
  });

  test('3.9 a recitation that stalls says where it stopped and resumes from there', async ({ page }) => {
    await fresh(page, { 'mock.stall': '1' });
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    const notice = page.getByRole('alert').filter({ hasText: 'The recitation stopped. Resume from line 2.' });
    await expect(notice).toBeVisible({ timeout: 6000 });
    await notice.getByRole('button', { name: 'RESUME' }).click();
    await expect(notice).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Now playing' }).getByText('LINE 3 OF 4')).toBeVisible({ timeout: 6000 });
  });

  test('3.8 a recitation that won’t load offers Try again', async ({ page }) => {
    await fresh(page, { 'mock.ttsFail': '1' });
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await expect(page.getByRole('button', { name: /The recitation won’t load/ })).toBeVisible();
  });
});
