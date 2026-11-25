import { expect, test } from '@playwright/test';
import { fresh, signedIn } from './helpers';

test.describe('Areas 6–8 · Keep, share and the Library', () => {
  test('6.2 keeping while signed out asks to sign in, then keeps', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('dialog', { name: 'Sign in' }).getByRole('button', { name: 'Continue with Apple' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Kept in Favorites' })).toBeVisible();
  });

  test('6.3–6.6 keep → Change → new list with an automatic icon → delete the list keeps the poem', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('button', { name: 'CHANGE' }).click();
    await page.getByRole('button', { name: 'New list' }).click();
    await page.getByRole('textbox', { name: 'List name' }).fill('Longing for home');
    await expect(page.getByRole('radiogroup', { name: 'Icon letter' }).getByRole('radio', { name: /ل/ }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Create and add this poem' }).click();
    await expect(page.getByRole('checkbox', { name: /Longing for home/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('checkbox', { name: /Favorites/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: /^Done · in/ }).click();

    await page.goto('./library/lists');
    await page.getByRole('button', { name: 'Options for Longing for home' }).click();
    await page.getByRole('button', { name: 'Delete list' }).click();
    await page.getByRole('button', { name: 'DELETE LIST' }).click();
    await expect(page.getByText('Longing for home')).toHaveCount(0);
    await page.goto('./library');
    await expect(page.getByRole('link', { name: /I pass by the dwellings/ })).toBeVisible();
  });

  test('8.2 Favorites can’t be renamed or deleted', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.goto('./library/lists');
    await expect(page.getByLabel('Can’t be renamed or deleted')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Options for Favorites' })).toHaveCount(0);
  });

  test('8.10–8.11 select, remove, then undo', async ({ page }) => {
    await fresh(page, signedIn);
    for (const p of ['amurru', 'qadhan']) { await page.goto(`./p/${p}`); await page.getByRole('button', { name: 'Keep' }).click(); await page.waitForTimeout(300); }
    await page.goto('./library');
    await page.getByRole('radio', { name: 'POEMS' }).click();
    await page.getByRole('button', { name: 'SELECT' }).click();
    await page.getByRole('checkbox', { name: /A mote in your eye/ }).click();
    await page.getByRole('button', { name: 'Remove' }).click();
    await expect(page.getByRole('status').filter({ hasText: '1 removed' })).toBeVisible();
    await page.getByRole('button', { name: 'UNDO' }).click();
    await expect(page.getByRole('link', { name: /A mote in your eye/ })).toBeVisible();
  });

  test('7.1–7.7 share: a full-screen card, colours, choosing lines, a dedication, Copy text', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await fresh(page);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Share' }).click();
    const s = page.getByRole('dialog', { name: 'Share' });
    await expect(s.getByTestId('share-card').locator('svg')).toHaveCount(1);
    await expect(s.getByRole('radio', { name: 'WHOLE POEM · 4' })).toHaveAttribute('aria-checked', 'true');
    await s.getByRole('radio', { name: 'ivory on cobalt' }).click();
    await expect(s.getByText('IVORY ON COBALT')).toBeVisible();
    await s.getByRole('radio', { name: 'CHOOSE LINES' }).click();
    await page.getByRole('dialog', { name: 'Choose lines' }).getByRole('checkbox').nth(3).click();
    await page.getByRole('button', { name: 'DONE' }).click();
    await expect(s.getByRole('radio', { name: 'CHOSEN · 3' })).toBeVisible();
    await s.getByRole('button', { name: 'Add a dedication' }).click();
    await s.getByRole('textbox', { name: 'Dedication' }).fill('Nour');
    await s.getByRole('textbox', { name: 'Dedication' }).press('Enter');
    await expect(s.getByTestId('share-card')).toContainText('for Nour');
    await s.getByRole('button', { name: 'Copy' }).click();
    await page.getByRole('menuitem', { name: 'Copy text' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Text copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('أَمُرُّ');
  });
});
