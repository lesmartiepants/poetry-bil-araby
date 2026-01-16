/**
 * Visual Test: WalkthroughGuideInk Redesign
 *
 * Verifies the redesigned ink walkthrough component:
 * - Ink diffusion background animations
 * - Brush stroke progress indicator (3 strokes)
 * - Floating ink particles
 * - Traditional calligraphy aesthetic
 * - Smooth step transitions
 */

import { test, expect } from '@playwright/test';

test.describe('WalkthroughGuideInk Redesign', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate directly to ink walkthrough (skip splash, show walkthrough, use ink mockup)
    await page.goto('http://localhost:5179/?skipSplash=true&showWalkthrough=true&mockup=ink', {
      waitUntil: 'domcontentloaded'
    });

    // Wait for walkthrough to appear
    await page.waitForTimeout(500);
  });

  test('should render all 3 steps with ink animations (dark mode)', async ({ page }) => {
    // Capture Step 1 - Navigate & Discover
    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step1-dark.png',
      fullPage: true
    });

    // Verify ink diffusion SVG exists
    const inkSvg = page.locator('svg').filter({ has: page.locator('circle[fill*="inkCloud"]') });
    await expect(inkSvg).toBeVisible();

    // Verify floating ink particles
    const particles = page.locator('ellipse[filter*="particleBlur"]');
    await expect(particles.first()).toBeVisible();

    // Verify brush stroke progress indicator
    const brushStrokes = page.locator('svg path[stroke-dasharray="62"]');
    await expect(brushStrokes).toHaveCount(3);

    // Click "Continue" to Step 2
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(800); // Wait for animation

    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step2-dark.png',
      fullPage: true
    });

    // Verify step 2 title
    await expect(page.getByText('Play & Listen')).toBeVisible();
    await expect(page.getByText('شغل واستمع')).toBeVisible();

    // Click "Continue" to Step 3
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step3-dark.png',
      fullPage: true
    });

    // Verify step 3 title
    await expect(page.getByText('Seek Insights')).toBeVisible();
    await expect(page.getByText('اطلب البصيرة')).toBeVisible();
  });

  test('should render in light mode with proper ink colors', async ({ page }) => {
    // Navigate to light mode version
    await page.goto('http://localhost:5179/?skipSplash=true&showWalkthrough=true&mockup=ink&theme=light', {
      waitUntil: 'domcontentloaded'
    });
    await page.waitForTimeout(500);

    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step1-light.png',
      fullPage: true
    });

    // Verify light mode styling
    const cardBg = page.locator('div[class*="bg-white/90"]');
    await expect(cardBg).toBeVisible();

    // Navigate through all steps in light mode
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step2-light.png',
      fullPage: true
    });

    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(800);

    await page.screenshot({
      path: 'e2e/screenshots/ink-walkthrough-step3-light.png',
      fullPage: true
    });
  });

  test('should support step navigation via dots', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Verify 3 navigation dots exist
    const dots = page.locator('button[aria-label*="Go to step"]');
    await expect(dots).toHaveCount(3);

    // Click on step 3 directly
    await dots.nth(2).click();
    await page.waitForTimeout(800);

    // Verify we're on step 3
    await expect(page.getByText('Seek Insights')).toBeVisible();

    // Click on step 1
    await dots.nth(0).click();
    await page.waitForTimeout(800);

    // Verify we're back on step 1
    await expect(page.getByText('Navigate & Discover')).toBeVisible();
  });

  test('should have proper brush stroke progress animation', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Step 1: Only first brush stroke should be active
    const brushStrokes = page.locator('svg path[stroke-dasharray="62"]');

    // Check initial state (step 0)
    const firstStroke = brushStrokes.nth(0);
    await expect(firstStroke).toHaveAttribute('stroke-dashoffset', '0');

    // Move to step 2
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(1000);

    // Second stroke should now be active
    const secondStroke = brushStrokes.nth(1);
    await expect(secondStroke).toHaveAttribute('stroke-dashoffset', '0');

    // Move to step 3
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(1000);

    // All three strokes should be active
    const thirdStroke = brushStrokes.nth(2);
    await expect(thirdStroke).toHaveAttribute('stroke-dashoffset', '0');
  });

  test('should close walkthrough on final step', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Navigate to final step
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: /Continue|استمر/i }).click();
    await page.waitForTimeout(500);

    // Final button should say "Begin Exploring" / "ابدأ الاستكشاف"
    const finalButton = page.getByRole('button', { name: /Begin Exploring|ابدأ الاستكشاف/i });
    await expect(finalButton).toBeVisible();

    // Click to close walkthrough
    await finalButton.click();
    await page.waitForTimeout(1000);

    // Verify main app is visible (poem content)
    await expect(page.locator('text=بالعربي').first()).toBeVisible();
  });

  test('should have WCAG compliant touch targets', async ({ page }) => {
    await page.waitForTimeout(1000);

    // Check all interactive elements meet 44x44 minimum
    const buttons = page.locator('button[style*="minHeight"]');

    for (let i = 0; i < await buttons.count(); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();

      if (box) {
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
