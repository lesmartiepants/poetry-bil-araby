# E2E Testing with Playwright

## Overview
This directory contains end-to-end tests for Poetry Bil-Araby using Playwright. Tests ensure the app functions correctly and looks great across desktop and mobile devices.

## Test Structure

### `app.spec.js`
Core functionality tests covering:
- Application loading and initial state
- Navigation between poems
- Theme toggling (dark/light mode)
- Category selection
- Poem discovery
- Audio player controls
- Copy functionality
- Debug panel interaction

### `ui-ux.spec.js`
UI/UX quality tests covering:
- **Visual Design**: Layout, typography, spacing, color schemes
- **Interaction Design**: Hover states, animations, touch targets
- **Content Readability**: Text spacing, overflow handling, RTL/LTR support
- **Accessibility**: Keyboard navigation, contrast ratios, viewport configuration
- **Visual Consistency**: Color scheme, border radius, visual hierarchy

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
```

### Run only UI/UX tests
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Debug tests interactively
```bash
npm run test:e2e:debug
```

### View test report
```bash
npm run test:e2e:report
```

## Test Configuration

Tests run across multiple viewports:
- **Desktop**: Chrome, Firefox, Safari (1920x1080)
- **Mobile**: Pixel 5, iPhone 12
- **Tablet**: iPad Pro

Configuration: `playwright.config.js`

## CI Integration

E2E tests automatically run:
- On every pull request
- Before deployment
- As part of the CI/CD pipeline

See `.github/workflows/ci.yml` for CI configuration.

## UI/UX Agent

The UI/UX Reviewer Agent (`.claude/agents/ui-ux-reviewer.md`) provides:
- Professional design review
- Accessibility auditing
- Responsive design validation
- Cross-device testing guidance

## Key Design Principles

1. **Arabic-First Typography**: Amiri and Reem Kufi fonts for authentic Arabic rendering
2. **Bilingual Harmony**: Equal visual weight for Arabic and English
3. **Glass-morphism**: Subtle backdrop blur effects
4. **Responsive Touch Targets**: Minimum 44x44px on mobile
5. **WCAG AA Compliance**: Proper contrast ratios
6. **60fps Animations**: Smooth transitions and interactions

## Debugging Failed Tests

1. Check test output for specific failures
2. View screenshots: `playwright-report/`
3. Watch failure videos: `test-results/`
4. Run in debug mode to step through tests
5. Use `--headed` to see what the browser is doing

## Writing New Tests

Follow these patterns:

```javascript
test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const element = page.locator('selector');

    // Act
    await element.click();

    // Assert
    await expect(element).toBeVisible();
  });
});
```

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors](https://playwright.dev/docs/selectors)
- [Assertions](https://playwright.dev/docs/test-assertions)
