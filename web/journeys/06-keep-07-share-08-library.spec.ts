import { expect, test } from '@playwright/test';
import { fresh, openYourPoems, signedIn } from './helpers';

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

  // V2.1 done when: a poem kept in two lists shows in both; deleting one list leaves it in the other;
  // taking it out of Favorites leaves it kept.
  test('6.4 a poem in two lists shows in both; out of Favorites it stays kept; deleting a list leaves it kept', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('button', { name: 'CHANGE' }).click();
    await page.getByRole('button', { name: 'New list' }).click();
    await page.getByRole('textbox', { name: 'List name' }).fill('Longing for home');
    await page.getByRole('button', { name: 'Create and add this poem' }).click();
    await expect(page.getByRole('button', { name: 'Done · in 2 lists' })).toBeVisible();

    const poemIn = async (list: string) => {
      await page.goto('./library/lists');
      await page.getByRole('link', { name: new RegExp(list) }).click();
      await expect(page.getByRole('heading', { name: list })).toBeVisible();
      return page.getByRole('link', { name: /I pass by the dwellings/ });
    };
    await expect(await poemIn('Longing for home')).toBeVisible();
    await expect(await poemIn('Favorites')).toBeVisible();

    // Out of Favorites: the lists sheet opens from CHANGE on the Kept toast.
    await page.goto('./p/qadhan');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('button', { name: 'CHANGE' }).click();
    await page.getByRole('checkbox', { name: /Favorites/ }).click();
    await expect(page.getByRole('checkbox', { name: /Favorites/ })).toHaveAttribute('aria-checked', 'false');
    await page.getByRole('button', { name: /^Done · in 0 lists/ }).click();
    await expect(await poemIn('Favorites')).toBeVisible(); // amurru is still there
    await expect(page.getByRole('link', { name: /A mote in your eye/ })).toHaveCount(0);
    await page.goto('./library');
    await openYourPoems(page);
    await expect(page.getByRole('link', { name: /A mote in your eye/ })).toBeVisible();

    await page.goto('./library/lists');
    await page.getByRole('button', { name: 'Options for Longing for home' }).click();
    await page.getByRole('button', { name: 'Delete list' }).click();
    await page.getByRole('button', { name: 'DELETE LIST' }).click();
    await expect(await poemIn('Favorites')).toBeVisible();
  });

  test('8.4 List deleted · UNDO brings the list back with its poems', async ({ page }) => {
    await fresh(page, signedIn);
    await page.goto('./p/amurru');
    await page.getByRole('button', { name: 'Keep' }).click();
    await page.getByRole('button', { name: 'CHANGE' }).click();
    await page.getByRole('button', { name: 'New list' }).click();
    await page.getByRole('textbox', { name: 'List name' }).fill('To read aloud');
    await page.getByRole('button', { name: 'Create and add this poem' }).click();
    await page.goto('./library/lists');
    await page.getByRole('button', { name: 'Options for To read aloud' }).click();
    await page.getByRole('button', { name: 'Delete list' }).click();
    await page.getByRole('button', { name: 'DELETE LIST' }).click();
    const toast = page.getByRole('status').filter({ hasText: 'List deleted' });
    await expect(toast).toBeVisible();
    await toast.getByRole('button', { name: 'UNDO' }).click();
    await page.getByRole('link', { name: /To read aloud/ }).click();
    await expect(page.getByRole('link', { name: /I pass by the dwellings/ })).toBeVisible();
  });

  test('8.6–8.9 your poems group by poet, feeling and era; the sort label switches to English order', async ({ page }) => {
    await fresh(page, signedIn);
    for (const p of ['amurru', 'qadhan', 'al-khayl']) { await page.goto(`./p/${p}`); await page.getByRole('button', { name: 'Keep' }).click(); await page.waitForTimeout(300); }
    await page.goto('./library');
    await openYourPoems(page);
    const poets = page.locator('.poet-group__name');
    await expect(poets).toHaveText([/Al-Khansa/, /Majnun Layla/, /Al-Mutanabbi/]); // Arabic order: خ ق م
    await page.getByRole('button', { name: 'ARABIC A–Z' }).click();
    await expect(poets).toHaveText([/Al-Khansa/, /Al-Mutanabbi/, /Majnun Layla/]);
    const heads = page.locator('.t-eyebrow.mt-8');
    await page.getByRole('button', { name: 'BY FEELING' }).click();
    await expect(heads).toHaveText(['grief', 'longing', 'pride']);
    await page.getByRole('button', { name: 'BY ERA' }).click();
    await expect(heads).toHaveText(['abbasid', 'pre-islamic', 'umayyad']);
    await expect(page.getByRole('link', { name: /The horses and the night/ })).toBeVisible();
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
    await openYourPoems(page);
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

  test('8.6 Your poems by poet files poets in Arabic letter order; the A–Z rail jumps to a letter', async ({ page }) => {
    await fresh(page, { ...signedIn, 'mock.keeps': JSON.stringify(['87201', '1001', '1002', '1003', '1004', '1006']) });
    await page.goto('./library');
    await openYourPoems(page);
    // Dictionary order: "ال" and vowel marks are ignored (Al-Khansa files under خ, after Al-Sayyab under ب).
    const names = page.locator('.poet-group__name');
    await expect(names).toHaveText([/Abu Firas/, /Imru/, /Al-Sayyab/, /Al-Khansa/, /Majnun/, /Kaʿb/]);
    // The rail jumps to a letter, and to the next one with poets when that letter has none.
    await page.getByRole('navigation', { name: 'Jump to an Arabic letter' }).getByRole('button', { name: 'Jump to ك' }).click();
    await expect(page.getByRole('navigation', { name: 'Jump to an Arabic letter' })).toBeVisible();
    await expect(page.locator('.poet-group', { hasText: 'Kaʿb' })).toBeInViewport();
    // English order is plain A–Z with an A–Z rail.
    await page.getByRole('button', { name: 'ARABIC A–Z' }).click();
    await expect(names).toHaveText([/Abu Firas/, /Al-Khansa/, /Al-Sayyab/, /Imru/, /Kaʿb/, /Majnun/]);
    await expect(page.getByRole('navigation', { name: 'Jump to a letter' }).getByRole('button')).toHaveCount(26);
  });
});
