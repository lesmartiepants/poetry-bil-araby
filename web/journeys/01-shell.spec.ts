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

  test('1.5 Report a bug sends the description and the timeline to the bug-report endpoint', async ({ page }) => {
    let sent: { description?: string; logs?: unknown[]; appState?: { app?: string } } | null = null;
    // Answered here, so no GitHub issue is ever filed from a test run.
    await page.route('**/api/bug-reports', async (route) => {
      sent = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: '{"ok":true}' });
    });
    await fresh(page);
    await page.goto('./explore');
    await page.getByTestId('edge-tab').click();
    await page.getByRole('dialog', { name: 'Developer panel' }).getByRole('button', { name: 'REPORT A BUG' }).click();
    const form = page.getByRole('dialog', { name: 'Report a bug' });
    await expect(form.getByRole('button', { name: 'Send report' })).toBeDisabled();
    await form.getByRole('textbox', { name: 'What happened' }).fill('The poet of the week did not load');
    await form.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Bug reported. Thank you.' })).toBeVisible();
    expect(sent).toMatchObject({ description: 'The poet of the week did not load', appState: { app: 'web/new' } });
    expect(Array.isArray(sent!.logs)).toBe(true);
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

  test('1.7 on a poem, long-press the dock or the mark hides and shows the edge tab, with a toast', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    const hold = async (name: string) => {
      const box = (await page.getByRole('navigation', { name }).or(page.getByRole('button', { name })).first().boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(800);
      await page.mouse.up();
    };
    await expect(page.locator('.door-card')).toHaveCount(3); // the page has its full height
    await expect(page.getByTestId('edge-tab')).toBeVisible();
    await hold('Poem actions');
    await expect(page.getByTestId('edge-tab')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Developer tab hidden');
    // Scrolled, the dock folds into the mark; it does the same.
    await page.evaluate(() => window.scrollTo(0, (document.documentElement.scrollHeight - innerHeight) / 2));
    await hold('Actions');
    await expect(page.getByTestId('edge-tab')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Developer tab shown');
    await expect(page.getByRole('menu', { name: 'Actions' })).toHaveCount(0); // the press didn't also tap
  });
});
