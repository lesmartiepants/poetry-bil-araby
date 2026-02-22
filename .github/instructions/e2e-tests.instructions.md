---
applyTo: "e2e/**/*.spec.js"
---

# E2E Tests (Playwright)

**Suites:** `app.spec.js` (core), `database-integration.spec.js` (DB mode), `ui-ux.spec.js` (design/a11y)
**Run:** `npm run test:e2e` (CI: Chrome only), `npm run test:e2e:full` (6 browsers locally)

## Structure

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded'); // NOT networkidle
  });

  test('should do something', async ({ page }) => {
    await page.getByText('بالعربي').click();
    await expect(page.getByText('العنوان')).toBeVisible();
  });
});
```

## Best Practices

**Navigation:**
- Wait for `domcontentloaded` (networkidle is slow)
- Wait for specific elements, not arbitrary timeouts

**Selectors (priority):**
1. `page.getByText('text')` (user-facing)
2. `page.getByRole('button', { name: /play/i })` (accessible)
3. `page.getByTestId('id')` (last resort)

**Assertions:**
```javascript
await expect(page.getByText('text')).toBeVisible();
await expect(page.locator('.class')).toHaveCount(3);
await expect(page).toHaveURL(/pattern/);
```

**Devices:** Desktop (Chrome, Firefox, Safari), Mobile (Pixel 5, iPhone 12), Tablet (iPad Pro)
**CI:** 2 configs (Chrome Desktop/Mobile), Local: 6 configs

## Database Integration

```javascript
test('should fetch from database', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /database/i }).click();
  await expect(page.getByText(/العنوان/)).toBeVisible({ timeout: 5000 });
});
```

**CI:** PostgreSQL service in Docker, frontend → localhost:3001 API

## Debugging

```bash
npm run test:e2e:debug    # Playwright Inspector
npm run test:e2e:headed   # Visible browser
```

```javascript
await page.pause();                        // Opens inspector
await page.screenshot({ path: 'debug.png' });
```

## Arabic Testing

- Use actual Arabic content
- Verify RTL layout (`dir="rtl"`)
- Test fonts across browsers (Amiri, Tajawal)

**Timeouts:** Default 30s, CI may be stricter
