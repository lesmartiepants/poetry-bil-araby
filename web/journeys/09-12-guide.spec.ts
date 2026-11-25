import { expect, test } from '@playwright/test';
import { fresh } from './helpers';

test.describe('Areas 9–12 · First run, journeys, collections, search, You', () => {
  test('9.1–9.4 a new reader goes from Welcome to how they read, then Tonight greets them, then the poem', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('splashed', '1'); });
    await page.goto('./');
    await expect(page).toHaveURL(/welcome/);
    await page.getByRole('textbox', { name: 'Your name' }).fill('Siraj');
    await page.getByRole('button', { name: 'Continue' }).click();
    // 9.2: the guide uses the name, and each way of reading shows a sample
    await expect(page.getByText('SIRAJ, HOW WOULD YOU LIKE TO READ?')).toBeVisible();
    await page.getByRole('radio', { name: /With sounds/ }).click();
    await expect(page.getByRole('radio', { name: /With sounds/ })).toHaveAttribute('aria-checked', 'true');
    await page.getByRole('button', { name: 'BEGIN WITH TONIGHT’S POEM' }).click();
    // 9.3: Tonight greets the new reader, then opens their first poem
    await expect(page.getByText('WELCOME, SIRAJ · YOUR FIRST POEM')).toBeVisible();
    await page.getByRole('link', { name: 'Enter the poem' }).click();
    await expect(page.getByRole('heading', { name: 'أمرُّ على الديار' })).toBeVisible();
    // Afterwards Tonight is the ordinary daily pick again
    await page.goto('./journey');
    await expect(page.getByText(/HEAVEN 3 OF YOUR FIRST SEVEN/)).toBeVisible();
  });

  test('9.8 reading the last step completes the journey and offers the next one', async ({ page }) => {
    await fresh(page, { 'mock.progress': JSON.stringify([{ slug: 'your-first-seven', position: 6, saved: true }]) });
    await page.goto('./journey/your-first-seven');
    await expect(page.getByText('JOURNEY · 6 OF 7 READ')).toBeVisible();
    await page.getByRole('link', { name: /HEAVEN 7/ }).last().click();
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Heaven 7 complete' }).click();
    await expect(page.getByRole('heading', { name: 'All seven, complete.' })).toBeVisible();
    await expect(page.getByText('YOUR NEXT JOURNEY')).toBeVisible();
    await page.getByRole('link', { name: /Home/ }).click();
    await expect(page).toHaveURL(/journey\/home/);
  });

  test('9.6–9.7 reading a journey step to its end completes it and shows the next', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey/your-first-seven');
    await expect(page.getByText('JOURNEY · 2 OF 7 READ')).toBeVisible();
    await page.getByRole('link', { name: /HEAVEN 3/ }).last().click();
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Heaven 3 complete' }).click();
    await expect(page.getByText(/Heaven three, grief\./)).toBeVisible();
    await expect(page.getByText('THE NEXT HEAVEN')).toBeVisible();
    await page.goto('./journey/your-first-seven');
    await expect(page.getByText('JOURNEY · 3 OF 7 READ')).toBeVisible();
  });

  test('9.5 Pathways shows the doors of the last poem finished, and none before the first', async ({ page }) => {
    await fresh(page);
    await page.goto('./journey');
    await expect(page.getByText(/A poem about loving a place/)).toBeVisible(); // Tonight settled: an earlier click hits a detached tab
    await page.getByRole('radio', { name: 'PATHWAYS' }).click();
    await expect(page.getByRole('link', { name: /Your first seven/ })).toBeVisible();
    await expect(page.getByText(/FROM YOUR LAST POEM/)).toHaveCount(0);
    await page.goto('./p/qadhan');
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await expect(page.locator('.door-card')).toHaveCount(3);
    await page.goto('./journey');
    await expect(page.getByText(/A poem about loving a place/)).toBeVisible(); // Tonight settled: an earlier click hits a detached tab
    await page.getByRole('radio', { name: 'PATHWAYS' }).click();
    const last = page.getByRole('region', { name: 'From your last poem' });
    await expect(last.getByText('FROM YOUR LAST POEM · A MOTE IN YOUR EYE')).toBeVisible();
    await expect(last.locator('.door-card')).toHaveCount(3);
  });

  test('2.18 Tonight’s poem, read to the end, offers three doors with reasons, or enough for tonight', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/qadhan?from=tonight');
    await page.getByTestId('read-sentinel').scrollIntoViewIfNeeded();
    await page.getByRole('link', { name: 'Tonight’s poem, finished' }).click();
    await expect(page.getByRole('heading', { name: 'You finished A mote in your eye.' })).toBeVisible();
    await expect(page.getByText('The guide would take you to one of these next.')).toBeVisible();
    const doors = page.locator('.door-card--finished');
    await expect(doors).toHaveCount(3);
    await expect(doors.first().locator('.door-card__sub')).not.toBeEmpty();
    await page.getByRole('button', { name: 'ENOUGH FOR TONIGHT' }).click();
    await expect(page).toHaveURL(/\/journey$/);
  });

  test('10.2 a collection can be saved and continued', async ({ page }) => {
    await fresh(page);
    await page.goto('./collection/women-who-wrote-the-canon');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: 'Saved' })).toBeVisible();
    await page.getByRole('link', { name: /POEM 01/ }).click();
    await expect(page.getByRole('navigation', { name: 'Poem actions' })).toBeVisible();
  });

  test('11.2 a half-remembered line finds its poem; 11.3 nothing found shows the closest', async ({ page }) => {
    await fresh(page);
    await page.goto('./search');
    await page.getByRole('textbox', { name: /Search/ }).fill('الديار');
    await expect(page.locator('.search-section', { hasText: 'LINES' })).toBeVisible();
    await page.getByRole('textbox', { name: /Search/ }).fill('zzzz');
    await expect(page.getByText('CLOSEST MATCHES:')).toBeVisible();
  });

  test('12.5 the guide’s difficulty uses the same bands as Explore', async ({ page }) => {
    await fresh(page);
    await page.goto('./you/guide');
    await page.getByRole('radio', { name: 'GENTLE' }).click();
    await page.goto('./you');
    await expect(page.getByText(/gentle/)).toBeVisible();
  });

  test('12.7 the translation choice is previewed on a real line', async ({ page }) => {
    await fresh(page);
    await page.goto('./you/translation');
    const preview = page.getByLabel('Preview');
    await expect(preview).toContainText('I pass by the dwellings');
    await page.getByRole('radio', { name: 'SOUNDS' }).click();
    await expect(preview).toContainText('amurru');
    await page.getByRole('radio', { name: 'NOTHING' }).click();
    await expect(preview).not.toContainText('I pass by the dwellings');
    await expect(preview).not.toContainText('amurru');
  });

  test('12.8 deleting the account asks first', async ({ page }) => {
    await fresh(page, { 'mock.account': JSON.stringify({ signedIn: true, provider: 'apple' }) });
    await page.goto('./you');
    await page.getByRole('button', { name: 'Delete account' }).click();
    await expect(page.getByRole('dialog', { name: 'Delete account' })).toContainText('can’t be undone');
    await page.getByRole('button', { name: 'KEEP MY ACCOUNT' }).click();
    await expect(page.getByText('Signed in with Apple')).toBeVisible();
  });
});
