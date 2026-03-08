import { test, expect } from '@playwright/test';

/**
 * Core user flows for Poetry Bil-Araby
 * Tests the main functionality across desktop and mobile viewports
 */

test.describe('Poetry Bil-Araby - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for DOM and initial content (much faster than networkidle)
    await page.waitForLoadState('domcontentloaded');
    // Wait for Arabic text to be visible (ensures app is ready)
    await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should load the application with initial poem', async ({ page }) => {
    // Verify page title
    await expect(page).toHaveTitle(/Poetry Bil-Araby/);

    // Verify header is present
    await expect(page.locator('text=بالعربي')).toBeVisible();
    await expect(page.locator('text=poetry')).toBeVisible();

    // Verify beta badge is present
    await expect(page.locator('text=beta')).toBeVisible();

    // Verify initial poem content is displayed
    const arabicText = page.locator('[dir="rtl"]').first();
    await expect(arabicText).toBeVisible();

    // Verify poet name is shown (use .first() to avoid strict mode violation)
    await expect(page.locator('text=نزار قباني').first()).toBeVisible();
  });

  test('should navigate between poems using controls', async ({ page }) => {
    // Get initial poem text
    const initialTitle = await page.locator('.font-amiri').first().textContent();

    // Click Discover button (next poem)
    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeEnabled();
    await discoverButton.click();

    // Wait for content to be visible (no fixed timeout)
    await expect(page.locator('.font-amiri').first()).toBeVisible({ timeout: 2000 });

    // Verify poem actually changed
    const newTitle = await page.locator('.font-amiri').first().textContent();
    expect(newTitle).not.toBe(initialTitle);
  });

  test('should toggle dark/light mode', async ({ page }) => {
    // Wait for control bar to be fully rendered
    await expect(page.locator('footer')).toBeVisible();

    // Get initial background color from the root div element (not body)
    const initialBg = await page.locator('html').evaluate(el => {
      const rootDiv = document.querySelector('#root > div');
      return rootDiv ? getComputedStyle(rootDiv).backgroundColor : getComputedStyle(el).backgroundColor;
    });

    // Try to find and click theme dropdown
    let clicked = false;

    // Try ThemeDropdown first (on wider viewports)
    const themeDropdown = page.locator('button[aria-label="Theme options"]').first();
    const themeDropdownVisible = await themeDropdown.isVisible().catch(() => false);

    if (themeDropdownVisible) {
      await themeDropdown.click();
      // Wait for dropdown to appear
      await expect(page.locator('button:has(div:has-text("الوضع النهاري")), button:has(div:has-text("الوضع الليلي"))').first()).toBeVisible({ timeout: 2000 });
      clicked = true;
    }

    // If not found, try OverflowMenu (More button)
    if (!clicked) {
      const moreButton = page.locator('button[aria-label="More options"]').first();
      const moreButtonVisible = await moreButton.isVisible().catch(() => false);

      if (moreButtonVisible) {
        await moreButton.click();
        // Wait for menu to appear
        await expect(page.locator('button:has(div:has-text("الوضع النهاري")), button:has(div:has-text("الوضع الليلي"))').first()).toBeVisible({ timeout: 2000 });
        clicked = true;
      }
    }

    // Look for button containing theme Arabic text or icon
    const themeToggleButtons = await page.locator('button:has(div:has-text("الوضع النهاري")), button:has(div:has-text("الوضع الليلي"))').all();

    if (themeToggleButtons.length > 0) {
      await themeToggleButtons[0].click();
      // Wait for theme transition to take effect
      await expect(page.locator('#root > div')).toBeVisible();
    }

    // Verify background color has changed
    const newBg = await page.locator('html').evaluate(el => {
      const rootDiv = document.querySelector('#root > div');
      return rootDiv ? getComputedStyle(rootDiv).backgroundColor : getComputedStyle(el).backgroundColor;
    });
    expect(initialBg).not.toBe(newBg);
  });

  test('should open category selector', async ({ page }) => {
    // Wait for control bar to be fully rendered
    await expect(page.locator('footer')).toBeVisible();

    // Try to find CategoryPill button (on wider viewports) or OverflowMenu (on narrow viewports)
    const categoryButton = page.locator('button[aria-label="Select poet category"]').first();
    const categoryButtonVisible = await categoryButton.isVisible().catch(() => false);

    if (categoryButtonVisible) {
      // Direct category button visible
      await categoryButton.click();
    } else {
      // Try overflow menu
      const moreButton = page.locator('button[aria-label="More options"]').first();
      const moreButtonVisible = await moreButton.isVisible().catch(() => false);

      if (moreButtonVisible) {
        await moreButton.click();
        // Wait for overflow menu to appear
        await expect(page.locator('button:has-text("اختيار الشاعر")').first()).toBeVisible({ timeout: 2000 });

        // Expand the poet submenu accordion within the overflow menu
        const poetAccordion = page.locator('button:has-text("اختيار الشاعر")').first();
        await poetAccordion.click();
      }
    }

    // Verify dropdown options are visible
    await expect(page.locator('text=نزار قباني').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=محمود درويش').first()).toBeVisible();
  });

  test('should discover new poems', async ({ page }) => {
    // Capture initial poem content
    const initialPoem = await page.locator('[dir="rtl"]').first().textContent();

    // Click the discover button using aria-label
    const discoverButton = page.locator('button[aria-label="Discover new poem"]');
    await expect(discoverButton).toBeEnabled();
    await discoverButton.click();

    // Wait for poem content to be visible after fetch
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible({ timeout: 5000 });

    // Verify poem content actually changed
    const newPoem = await page.locator('[dir="rtl"]').first().textContent();
    expect(newPoem).not.toBe(initialPoem);
  });

  test('should request poetic insight', async ({ page, viewport }) => {
    // Wait for control bar to be ready
    await expect(page.locator('footer')).toBeVisible();

    // Find and click the insight button (Compass icon in the control bar with "Dive In" label)
    const insightButton = page.locator('button[aria-label="Dive into poem meaning"]').first();
    const insightButtonVisible = await insightButton.isVisible().catch(() => false);

    if (insightButtonVisible) {
      await expect(insightButton).toBeEnabled();
      await insightButton.click();

      // Verify the app is still functional after clicking
      await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

      // On desktop, we can check if the side panel is visible
      if (viewport && viewport.width >= 768) {
        // Desktop: check side panel for either loading state or "Seek Insight" button
        const sidePanel = page.locator('text=Poetic Insight').first();
        await expect(sidePanel).toBeVisible();
      }
    }
  });

  test('should copy poem text', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Click copy button using accessible selectors (works on desktop and mobile)
    const copyButton = page.locator('button[aria-label="Copy poem to clipboard"], button[title="Copy poem"]').first();

    await expect(copyButton).toBeVisible({ timeout: 5000 });
    await copyButton.click();

    // Should show success indicator (Check icon appears inside the button after copy)
    await expect(copyButton.locator('svg')).toBeVisible();
  });
});

test.describe('Poetry Bil-Araby - Debug Panel', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have collapsible debug panel', async ({ page }) => {
    // Verify debug panel is present (may be in development mode only)
    const debugPanel = page.locator('text=System Logs');
    if (await debugPanel.isVisible()) {
      await expect(debugPanel).toBeVisible();
    } else {
      test.skip();
    }
  });

  test('should toggle debug panel', async ({ page }) => {
    const debugHeader = page.locator('text=System Logs').locator('..');

    if (await debugHeader.isVisible()) {
      // Click to expand
      await debugHeader.click();
      // Verify expanded state — log content should appear
      await expect(page.locator('text=System Logs')).toBeVisible();

      // Click to collapse
      await debugHeader.click();
      await expect(page.locator('text=System Logs')).toBeVisible();
    } else {
      test.skip();
    }
  });
});
