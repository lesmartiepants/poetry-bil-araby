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
    const panel = page.getByRole('dialog', { name: 'Developer panel' });
    const close = panel.getByRole('button', { name: 'Close developer panel' });
    await expect(panel.getByText('/api/definitely-missing-route')).toBeVisible();
    await expect(close).not.toBeFocused();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
  });

  test('1.4 filters by source and errors, and copies the whole timeline', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/api/dev-test-*', (route) =>
      route.fulfill({ status: route.request().url().endsWith('error') ? 503 : 200, body: '{}' }));
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByTestId('reader')).toBeVisible();
    await page.evaluate(async () => {
      await fetch('/api/dev-test-success');
      await fetch('/api/dev-test-error');
    });
    const edge = page.getByTestId('edge-tab');
    await expect(edge).toHaveAccessibleName('Developer panel, 1 new error');
    const box = (await edge.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x - 30, box.y + box.height / 2, { steps: 5 });
    await page.mouse.up();
    const panel = page.getByRole('dialog', { name: 'Developer panel' });
    const started = await panel.locator('.dev-panel__start').innerText();
    const success = panel.locator('.dev-exchange').filter({ hasText: '/api/dev-test-success' });
    await expect(success.getByText('GET /api/dev-test-success', { exact: true })).toHaveCount(1);
    await expect(success.getByText('Sent', { exact: true })).toBeVisible();
    await expect(success.getByText('Reply', { exact: true })).toBeVisible();
    await expect(success.locator('time').first()).toHaveText(/^\+\d+\.\d+s$/);
    await expect(panel.getByRole('button', { name: 'Clock time' })).toHaveCount(0);

    await panel.getByRole('radio', { name: 'Front end' }).click();
    await expect(panel.getByText(/Opened poem/)).toBeVisible();
    await expect(panel.locator('.dev-exchange')).toHaveCount(0);
    await expect(panel.getByText('GET /api/dev-test-error', { exact: true })).toBeVisible();
    await expect(panel.locator('.dev-panel__start')).toHaveText(started);
    await panel.getByRole('radio', { name: 'Back end' }).click();
    await panel.getByRole('switch', { name: 'Errors only' }).click();
    await expect(panel.getByText(/api\/dev-test-error/)).toBeVisible();
    await expect(panel.getByText(/api\/dev-test-success/)).toHaveCount(0);
    await expect(panel.getByRole('combobox', { name: 'Log density' })).toHaveCount(0);
    await expect(panel.getByText('GET /api/dev-test-error', { exact: true })).toBeVisible();
    await panel.getByRole('button', { name: 'Copy log' }).click();
    await expect(panel.getByRole('button', { name: 'Copied' })).toBeVisible();
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain('Opened poem');
    expect(copied).toContain('/api/dev-test-success');
    await panel.getByRole('button', { name: 'Close developer panel' }).click();
    await expect(edge).toHaveAccessibleName('Developer panel');
  });

  test('1.4 pairs concurrent calls to the same path with their own replies', async ({ page }) => {
    let onFirstRequest: (route: import('@playwright/test').Route) => void;
    const firstRequest = new Promise<import('@playwright/test').Route>((resolve) => { onFirstRequest = resolve; });
    await page.route('**/api/dev-overlap?first', (route) => onFirstRequest(route));
    await page.route('**/api/dev-overlap?second', (route) => route.fulfill({ status: 200, body: '{}' }));
    await fresh(page);
    await page.goto('./explore');
    const first = page.evaluate(() => fetch('/api/dev-overlap?first').then((response) => response.status));
    const pending = await firstRequest;
    await page.evaluate(() => fetch('/api/dev-overlap?second').then((response) => response.status));
    await pending.fulfill({ status: 503, body: '{}' });
    await first;
    await page.getByTestId('edge-tab').click();
    const groups = page.locator('.dev-exchange').filter({ hasText: 'GET /api/dev-overlap' });
    await expect(groups).toHaveCount(2);
    await expect(groups.nth(0)).toContainText('HTTP 503');
    await expect(groups.nth(1)).toContainText('HTTP 200');
    await expect(groups.nth(0)).not.toContainText('?first');
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

  test('1.5 keeps the report draft on failure and sends only selected attachments', async ({ page }) => {
    const payloads: Record<string, unknown>[] = [];
    await page.route('**/api/bug-reports', async (route) => {
      payloads.push(route.request().postDataJSON());
      await route.fulfill({
        status: payloads.length === 1 ? 500 : 201,
        json: { success: payloads.length > 1, reportSaved: payloads.length > 2, screenshotAttached: payloads.length > 2 },
      });
    });
    await fresh(page);
    await page.goto('./p/amurru');
    await expect(page.getByTestId('reader')).toBeVisible();
    await page.getByTestId('edge-tab').click();
    await page.getByRole('button', { name: 'Report a bug' }).click();
    const report = page.getByRole('dialog', { name: 'Report a bug' });
    const description = report.getByRole('textbox', { name: 'What happened' });
    await description.fill('Playback paused');
    await report.getByRole('checkbox', { name: /recent events?/ }).uncheck();
    await report.getByRole('checkbox', { name: /device and settings/i }).uncheck();
    const screenshot = report.getByRole('checkbox', { name: /screenshot/i });
    await expect(screenshot).not.toBeChecked();
    await expect(screenshot).toHaveAccessibleName(/public issue/i);
    await screenshot.check();
    await report.getByRole('button', { name: 'Send report' }).click();
    await expect(report.getByRole('alert')).toHaveText('The report didn’t send. Try again.');
    await expect(description).toHaveValue('Playback paused');
    await report.getByRole('button', { name: 'Send report' }).click();
    await expect(report.getByRole('alert')).toContainText('couldn’t be saved');
    await expect(description).toHaveValue('Playback paused');
    await report.getByRole('button', { name: 'Send report' }).click();
    await expect(page.getByRole('status')).toHaveText('Bug reported. Thank you.');
    expect(payloads).toHaveLength(3);
    expect(payloads[2]).toMatchObject({ description: 'Playback paused', poem: { id: '87201' } });
    expect(payloads[2].shareScreenshotPublicly).toBe(true);
    expect(payloads[2].screenshot).toMatch(/^data:image\/jpeg;base64,\/9j\//);
    expect(payloads[2]).not.toHaveProperty('logs');
    expect(payloads[2]).not.toHaveProperty('appState');
    expect(payloads[2]).not.toHaveProperty('userAgent');
  });

  test('1.5 the description grows, scrolls at its cap, and keeps Send visible', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    await page.getByTestId('edge-tab').click();
    await page.getByRole('button', { name: 'Report a bug' }).click();
    const report = page.getByRole('dialog', { name: 'Report a bug' });
    const description = report.getByRole('textbox', { name: 'What happened' });
    const send = report.getByRole('button', { name: 'Send report' });
    const height = () => description.evaluate((field) => Math.round(field.getBoundingClientRect().height));
    const initialHeight = await height();
    await description.fill('The recitation stopped.\n'.repeat(6));
    const expandedHeight = await height();
    expect(expandedHeight).toBeGreaterThan(initialHeight);

    await description.fill('The recitation stopped.\n'.repeat(35));
    expect(await height()).toBeGreaterThan(expandedHeight);
    expect(await height()).toBeLessThanOrEqual(220);
    expect(await description.evaluate((field) => field.scrollHeight)).toBeGreaterThan(await height());

    await page.setViewportSize({ width: 320, height: 568 });
    await expect(send).toBeInViewport({ ratio: 1 });
    await report.getByRole('checkbox', { name: /screenshot/i }).scrollIntoViewIfNeeded();
    await expect(send).toBeInViewport({ ratio: 1 });
    await description.fill('Short again.');
    expect(await height()).toBe(initialHeight);

    // Simulate a keyboard shrinking the visual viewport independently of the layout viewport.
    await page.evaluate(() => {
      const viewport = window.visualViewport!;
      Object.defineProperties(viewport, {
        height: { configurable: true, value: 330 },
        scale: { configurable: true, value: 1 },
        offsetTop: { configurable: true, value: 0 },
      });
      viewport.dispatchEvent(new Event('resize'));
    });
    const button = (await send.boundingBox())!;
    expect(button.y + button.height).toBeLessThan(330);
  });

  test('1.6 long-press the tab bar hides and shows the edge tab', async ({ page }) => {
    await fresh(page);
    await page.goto('./explore');
    const bar = page.getByTestId('tabbar');
    const box = (await bar.boundingBox())!;
    const press = async (visible: boolean) => {
      await page.mouse.move(box.x + 10, box.y + box.height / 2);
      await page.mouse.down();
      try {
        await expect(page.getByTestId('edge-tab')).toHaveCount(visible ? 1 : 0);
      } finally {
        await page.mouse.up();
      }
    };
    await press(false);
    await press(true);
  });

  test('1.7 the reader dock and folded mark toggle the same saved edge tab', async ({ page }) => {
    await fresh(page);
    await page.goto('./p/amurru');
    const hold = async (selector: string) => {
      const box = (await page.locator(selector).boundingBox())!;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(850);
      await page.mouse.up();
    };
    await hold('.dock');
    await expect(page.getByTestId('edge-tab')).toHaveCount(0);
    await expect(page.getByRole('status')).toContainText('Developer tab hidden');
    await page.reload();
    await expect(page.getByTestId('reader')).toBeVisible();
    await expect(page.getByTestId('edge-tab')).toHaveCount(0);
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect(page.getByRole('button', { name: 'Actions' })).toBeVisible();
    await hold('.reader__mark');
    await expect(page.getByTestId('edge-tab')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('Developer tab shown');
  });
});
