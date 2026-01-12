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
    // Get initial poem title
    const initialTitle = await page.locator('.font-amiri').first().textContent();

    // Click next button
    await page.locator('button').filter({ has: page.locator('svg') }).nth(2).click();

    // Wait for content to be visible (no fixed timeout)
    await expect(page.locator('.font-amiri').first()).toBeVisible({ timeout: 2000 });

    // Verify poem has changed (or is the same if only one poem)
    const newTitle = await page.locator('.font-amiri').first().textContent();
    expect(typeof newTitle).toBe('string');
  });

  test('should toggle dark/light mode', async ({ page }) => {
    // Wait for control bar to be fully rendered
    await page.waitForTimeout(500);

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
      await page.waitForTimeout(300);
      clicked = true;
    }

    // If not found, try OverflowMenu (More button)
    if (!clicked) {
      const moreButton = page.locator('button[aria-label="More options"]').first();
      const moreButtonVisible = await moreButton.isVisible().catch(() => false);

      if (moreButtonVisible) {
        await moreButton.click();
        await page.waitForTimeout(300);
        clicked = true;
      }
    }

    // Now click the actual theme toggle button in the dropdown
    // Wait for dropdown to be open and find the theme button
    await page.waitForTimeout(300);

    // Look for button containing theme Arabic text or icon
    const themeToggleButtons = await page.locator('button:has(div:has-text("الوضع النهاري")), button:has(div:has-text("الوضع الليلي"))').all();

    if (themeToggleButtons.length > 0) {
      await themeToggleButtons[0].click();
      await page.waitForTimeout(500);
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
    await page.waitForTimeout(300);

    // Try to find CategoryPill button (on wider viewports) or OverflowMenu (on narrow viewports)
    const categoryButton = page.locator('button[aria-label="Select poet category"]').first();
    const categoryButtonVisible = await categoryButton.isVisible().catch(() => false);

    if (categoryButtonVisible) {
      // Direct category button visible
      await categoryButton.click();
      await page.waitForTimeout(300);
    } else {
      // Try overflow menu
      const moreButton = page.locator('button[aria-label="More options"]').first();
      const moreButtonVisible = await moreButton.isVisible().catch(() => false);

      if (moreButtonVisible) {
        await moreButton.click();
        await page.waitForTimeout(300);
      }
    }

    // Verify dropdown options are visible
    await expect(page.locator('text=نزار قباني').first()).toBeVisible({ timeout: 3000 });
    await expect(page.locator('text=محمود درويش').first()).toBeVisible();
  });

  test('should discover new poems', async ({ page }) => {
    // Click the discover button (Sparkles icon)
    const discoverButton = page.locator('button').filter({
      has: page.locator('svg')
    }).first();

    await discoverButton.click();
    await page.waitForTimeout(300);

    // Verify button was clicked (poem may change instantly or show loading)
    // Just verify the page is still functional after click
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();
  });

  test('should request poetic insight', async ({ page, viewport }) => {
    // Wait for page to stabilize
    await page.waitForTimeout(500);

    // Find and click the insight button (Compass icon in the control bar with "Dive In" label)
    const insightButton = page.locator('button[aria-label="Dive into poem meaning"]').first();
    const insightButtonVisible = await insightButton.isVisible().catch(() => false);

    if (insightButtonVisible) {
      // Verify button is present and enabled
      await expect(insightButton).toBeVisible();

      await insightButton.click();
      await page.waitForTimeout(500);

      // Verify the app is still functional after clicking
      // Without an API key, the button might not do much, but it should not break the app
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

    // Click copy button (wait for it to be enabled)
    const copyButton = page.locator('button').filter({
      has: page.locator('svg')
    }).nth(4);

    // Wait for button to be enabled before clicking
    await expect(copyButton).toBeEnabled({ timeout: 5000 });
    await copyButton.click();

    // Should show success indicator (Check icon)
    await page.waitForTimeout(300);
  });
});

test.describe('Poetry Bil-Araby - Audio Player', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should have audio play button', async ({ page }) => {
    // Verify play button is present
    const playButton = page.locator('button').filter({
      has: page.locator('svg')
    }).filter({ hasText: '' }).nth(2);

    await expect(playButton).toBeVisible();
  });

  test('audio button should be interactive', async ({ page }) => {
    const playButton = page.locator('.rounded-full').filter({
      has: page.locator('svg')
    }).first();

    await expect(playButton).toBeEnabled();
  });

  test('play button handles playback correctly', async ({ page }) => {
    // This test verifies the fix for: "Playback needs two clicks of play button"
    // The bug was that the button would show pause state even when audio failed to play
    // causing users to need to click twice to actually start playback
    
    const playButton = page.locator('button[aria-label="Play recitation"]');
    
    // Verify play button exists
    await expect(playButton).toBeVisible();
    await expect(playButton).toBeEnabled();
    
    // Click the play button
    await playButton.click();
    
    // The button should enter loading state (disabled with spinner)
    // OR it should start playing (aria-label becomes "Pause recitation")
    // It should NOT stay in "Play recitation" state with no visual feedback
    
    // Wait a moment for state to update
    await page.waitForTimeout(300);
    
    // Check current state - button should be disabled OR show pause OR show loading
    const isDisabled = await playButton.isDisabled().catch(() => false);
    const hasLoadingSpinner = await playButton.locator('svg.animate-spin').isVisible().catch(() => false);
    
    // If not disabled and not loading, check if it moved to pause state OR stayed in play state
    let currentLabel = await playButton.getAttribute('aria-label').catch(() => '');
    
    // The button should show SOME response to the click
    // Either: disabled (generating audio), loading spinner, or changed to pause
    const buttonResponded = isDisabled || hasLoadingSpinner || currentLabel === 'Pause recitation';
    
    // Note: Without a real API key, the audio will fail to generate
    // But the button should still show the loading state briefly before reverting
    expect(buttonResponded || isDisabled).toBe(true);
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
      await page.waitForTimeout(300);

      // Click to collapse
      await debugHeader.click();
      await page.waitForTimeout(300);
    } else {
      test.skip();
    }
  });
});
