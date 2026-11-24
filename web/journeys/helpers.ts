import type { Page } from '@playwright/test';

/** A fresh reader: no saved state, splash already seen, first run done. */
export async function fresh(page: Page, local: Record<string, string> = {}) {
  await page.goto('./');
  await page.evaluate((l) => {
    localStorage.clear();
    sessionStorage.setItem('splashed', '1');
    localStorage.setItem('welcomed', 'true');
    for (const [k, v] of Object.entries(l)) localStorage.setItem(k, v);
  }, local);
}
export const signedIn = { 'mock.account': JSON.stringify({ signedIn: true, provider: 'apple' }) };

/** Aa lives in the fan (2.3): scroll so the dock folds, open the mark, choose Text. */
export async function openAa(page: Page) {
  await page.getByRole('navigation', { name: 'Poem actions' }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.getByRole('button', { name: 'Actions' }).click();
  await page.getByRole('menuitem', { name: 'Text' }).click();
}
