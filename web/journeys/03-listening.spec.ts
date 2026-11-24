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

  test('3.8 a recitation that won’t load offers Try again', async ({ page }) => {
    await fresh(page, { 'mock.ttsFail': '1' });
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: /LISTEN/ }).click();
    await expect(page.getByRole('button', { name: /The recitation won’t load/ })).toBeVisible();
  });
});
