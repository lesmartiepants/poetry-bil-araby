import { test, expect } from '@playwright/test';

/**
 * Manual investigation script to capture app behavior
 * Takes screenshots at each step to diagnose issues
 */

test.describe('Issue Investigation - Manual Walkthrough', () => {
  test('Step 1: Load app WITHOUT skipSplash', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'investigation-screenshots/01-initial-load-with-splash.png', fullPage: true });
    console.log('Screenshot 1: Initial load WITH splash screen');

    // Check what overlays exist
    const overlays = await page.locator('.fixed.inset-0').count();
    console.log(`Found ${overlays} fixed overlay elements`);
  });

  test('Step 2: Load app WITH skipSplash', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'investigation-screenshots/02-load-with-skipSplash.png', fullPage: true });
    console.log('Screenshot 2: Load WITH ?skipSplash=true');

    // Check for blocking overlays
    const overlays = await page.locator('.fixed.inset-0').count();
    console.log(`Found ${overlays} fixed overlay elements with skipSplash`);

    // Check all z-50 elements
    const z50Elements = await page.locator('[class*="z-50"]').count();
    console.log(`Found ${z50Elements} z-50 elements`);

    // List all z-50 elements
    const z50Classes = await page.locator('[class*="z-50"]').evaluateAll(els =>
      els.map(el => ({ tag: el.tagName, classes: el.className }))
    );
    console.log('Z-50 elements:', JSON.stringify(z50Classes, null, 2));
  });

  test('Step 3: Check buttons visibility and state', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find all buttons
    const buttons = await page.locator('button').all();
    console.log(`Found ${buttons.length} buttons`);

    // Check each button
    for (let i = 0; i < Math.min(buttons.length, 10); i++) {
      const button = buttons[i];
      const isVisible = await button.isVisible();
      const isEnabled = await button.isEnabled();
      const text = await button.textContent();
      console.log(`Button ${i}: visible=${isVisible}, enabled=${isEnabled}, text="${text?.substring(0, 30)}"`);
    }

    await page.screenshot({ path: 'investigation-screenshots/03-buttons-state.png', fullPage: true });
  });

  test('Step 4: Test theme toggle', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Get HTML element class before
    const htmlBefore = await page.locator('html').getAttribute('class');
    console.log('HTML class BEFORE theme toggle:', htmlBefore);

    await page.screenshot({ path: 'investigation-screenshots/04a-before-theme-toggle.png', fullPage: true });

    // Try to find and click theme button
    // Look for Moon or Sun icon
    const themeButtons = await page.locator('button:has(svg)').all();
    console.log(`Found ${themeButtons.length} buttons with SVG icons`);

    // Try clicking last button (usually theme toggle)
    if (themeButtons.length > 0) {
      try {
        await themeButtons[themeButtons.length - 1].click({ timeout: 2000 });
        await page.waitForTimeout(500);

        const htmlAfter = await page.locator('html').getAttribute('class');
        console.log('HTML class AFTER theme toggle:', htmlAfter);

        await page.screenshot({ path: 'investigation-screenshots/04b-after-theme-toggle.png', fullPage: true });
      } catch (e) {
        console.log('Could not click theme button:', e.message);
        await page.screenshot({ path: 'investigation-screenshots/04c-theme-toggle-error.png', fullPage: true });
      }
    }
  });

  test('Step 5: Test copy button', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find copy button (scope to footer to avoid debug panel buttons)
    const copyButton = page.locator('footer button').filter({ has: page.locator('svg') }).nth(4);

    const exists = await copyButton.count() > 0;
    console.log('Copy button exists:', exists);

    if (exists) {
      const isVisible = await copyButton.isVisible();
      const isEnabled = await copyButton.isEnabled();
      console.log('Copy button visible:', isVisible);
      console.log('Copy button enabled:', isEnabled);

      await page.screenshot({ path: 'investigation-screenshots/05-copy-button-state.png', fullPage: true });
    }
  });

  test('Step 6: Test audio button', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Find audio/play button (large rounded button in footer)
    const playButton = page.locator('footer button.rounded-full').first();

    const exists = await playButton.count() > 0;
    console.log('Play button exists:', exists);

    if (exists) {
      const isVisible = await playButton.isVisible();
      const isEnabled = await playButton.isEnabled();
      console.log('Play button visible:', isVisible);
      console.log('Play button enabled:', isEnabled);

      await page.screenshot({ path: 'investigation-screenshots/06-audio-button-state.png', fullPage: true });
    }
  });

  test('Step 7: Check for walkthrough guide', async ({ page }) => {
    await page.goto('/?skipSplash=true');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check if walkthrough is showing
    const walkthroughText = await page.locator('text=/Welcome to Poetry/i').count();
    console.log('Walkthrough visible:', walkthroughText > 0);

    // Check for any modal/overlay
    const modalOverlay = await page.locator('.fixed.inset-0.z-50').count();
    console.log('Modal overlays with z-50:', modalOverlay);

    await page.screenshot({ path: 'investigation-screenshots/07-check-walkthrough.png', fullPage: true });
  });
});
