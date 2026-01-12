---
applyTo: "e2e/**/*.spec.js"
---

# E2E Test Instructions (Playwright)

## Testing Framework

- **Playwright** for E2E testing
- Two test suites:
  - `app.spec.js` - Core functionality tests
  - `ui-ux.spec.js` - Design quality and accessibility (23 tests × 6 devices = 138 executions)

## Running Tests

```bash
npm run test:e2e         # CI: Chrome only, Local: all browsers
npm run test:e2e:ui      # UI/UX tests only
npm run test:e2e:headed  # With visible browser
npm run test:e2e:debug   # Debug mode with inspector
npm run test:e2e:report  # View HTML report
npm run test:e2e:full    # Full device matrix (6 browsers)
```

## Test Structure

```javascript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should do something specific', async ({ page }) => {
    // Arrange, Act, Assert
  });
});
```

## Best Practices

### Page Navigation
- Always start with `page.goto('/')`
- Wait for `domcontentloaded` (not `networkidle` - it's slow)
- Wait for specific elements instead of arbitrary timeouts

```javascript
// ✅ Good - wait for specific element
await page.waitForSelector('text=بالعربي');

// ❌ Bad - network idle is slow
await page.goto('/', { waitUntil: 'networkidle' });

// ❌ Bad - arbitrary timeout
await page.waitForTimeout(1000);
```

### Element Selectors

Prefer selectors in this order:
1. User-facing text: `page.getByText('العنوان')`
2. ARIA role: `page.getByRole('button', { name: 'Play' })`
3. Test IDs: `page.getByTestId('poem-title')` (last resort)

```javascript
// ✅ Best - text content
await page.getByText('بالعربي').click();

// ✅ Good - accessible role
await page.getByRole('button', { name: /play/i }).click();

// ⚠️ OK - CSS selector (when needed)
await page.locator('.poem-container').first().click();
```

### User Interactions

```javascript
// Clicking
await page.getByRole('button', { name: 'Next' }).click();

// Typing
await page.fill('input[type="text"]', 'search query');

// Keyboard navigation
await page.keyboard.press('ArrowRight');
await page.keyboard.press('Enter');

// Hover
await page.hover('.tooltip-trigger');
```

### Assertions

```javascript
// Visibility
await expect(page.getByText('العنوان')).toBeVisible();

// Count
await expect(page.locator('.poem-card')).toHaveCount(3);

// Text content
await expect(page.locator('h1')).toHaveText('بالعربي');

// URL
await expect(page).toHaveURL(/poetry/);

// Screenshot comparison (use sparingly)
await expect(page).toHaveScreenshot('homepage.png');
```

### Async/Await
- All Playwright actions are async - always use `await`
- Chain actions when possible for readability

```javascript
// ✅ Good - clear sequential actions
await page.goto('/');
await page.getByRole('button', { name: 'Next' }).click();
await expect(page.getByText('Poem 2')).toBeVisible();
```

## Device Testing

### Device Matrix
- **Desktop:** Chrome, Firefox, Safari (webkit)
- **Mobile:** Pixel 5, iPhone 12
- **Tablet:** iPad Pro

### CI vs Local
- **CI:** Chrome Desktop + Chrome Mobile (2 configs)
- **Local:** Full matrix (6 configs)
- Use `npm run test:e2e:full` for comprehensive local testing

### Device-Specific Tests
```javascript
test.describe('Mobile specific', () => {
  test.use({ 
    viewport: { width: 375, height: 667 },
    isMobile: true 
  });

  test('should show mobile menu', async ({ page }) => {
    // Mobile-specific test
  });
});
```

## UI/UX Testing

### Design Quality Checks
- Typography: Check font families (Amiri, Tajawal)
- Spacing: Verify consistent padding/margins
- Colors: Theme consistency (dark/light modes)
- Responsiveness: Test across viewport sizes

### Accessibility
- Keyboard navigation
- ARIA labels and roles
- Screen reader compatibility
- Color contrast ratios
- Focus indicators

```javascript
test('should have accessible navigation', async ({ page }) => {
  await page.goto('/');
  
  // Keyboard navigation
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluate(() => 
    document.activeElement.tagName
  );
  expect(focusedElement).toBe('BUTTON');
  
  // ARIA labels
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const ariaLabel = await button.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  }
});
```

### Arabic Typography
- Always test with actual Arabic content
- Verify RTL (right-to-left) layout
- Check font rendering across browsers
- Test bi-directional text handling

## Performance Considerations

### Timeouts
- Default timeout: 30 seconds (Playwright default)
- CI may have stricter timeouts
- Set custom timeout only when necessary:

```javascript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // Test implementation
});
```

### Parallelization
- Tests run in parallel by default
- Use `test.describe.serial()` for dependent tests (avoid when possible)
- Each test gets fresh browser context (isolated)

### Screenshots and Videos
- Captured automatically on failure
- Available in `test-results/` and `playwright-report/`
- Videos disabled by default (enable in config if needed)

## Common Patterns

### Testing Audio Playback
```javascript
test('should play audio when clicked', async ({ page }) => {
  await page.goto('/');
  
  const playButton = page.getByRole('button', { name: /play/i });
  await playButton.click();
  
  // Check for playing state
  await expect(playButton).toHaveAttribute('aria-pressed', 'true');
});
```

### Testing Theme Toggle
```javascript
test('should toggle theme', async ({ page }) => {
  await page.goto('/');
  
  const themeButton = page.getByRole('button', { name: /theme/i });
  const initialClass = await page.locator('body').getAttribute('class');
  
  await themeButton.click();
  
  const newClass = await page.locator('body').getAttribute('class');
  expect(newClass).not.toBe(initialClass);
});
```

### Testing Filters
```javascript
test('should filter poems by poet', async ({ page }) => {
  await page.goto('/');
  
  const filterSelect = page.getByRole('combobox', { name: /poet/i });
  await filterSelect.selectOption('نزار قباني');
  
  await expect(page.locator('.poem-card')).toHaveCount(3);
  await expect(page.getByText('نزار قباني')).toBeVisible();
});
```

## Debugging

### Debug Mode
```bash
npm run test:e2e:debug    # Opens Playwright Inspector
```

### Console Logs
```javascript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

### Pause Execution
```javascript
await page.pause(); // Opens inspector at this point
```

### Screenshots
```javascript
await page.screenshot({ path: 'debug.png' });
```

## CI Considerations

- Browser matrix reduced in CI (Chrome only)
- Tests run headless in CI
- Screenshots/videos captured on failure
- Check `playwright.config.js` for CI-specific settings
- `process.env.CI` detected automatically
