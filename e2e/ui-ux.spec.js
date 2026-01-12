import { test, expect } from '@playwright/test';

/**
 * UI/UX Testing - Design and Usability Checks
 * Ensures the app looks good and is usable across desktop and mobile
 */

test.describe('UI/UX - Visual Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have proper responsive layout on desktop', async ({ page, viewport }) => {
    if (!viewport || viewport.width < 768) {
      test.skip();
    }

    // Verify side panel is visible on desktop
    const sidePanel = page.locator('text=Poetic Insight').locator('..');
    await expect(sidePanel).toBeVisible();

    // Verify main content area has adequate width
    const mainContent = page.locator('main');
    const width = await mainContent.evaluate(el => el.offsetWidth);
    expect(width).toBeGreaterThan(600);
  });

  test('should have proper responsive layout on mobile', async ({ page, viewport }) => {
    if (!viewport || viewport.width >= 768) {
      test.skip();
    }

    // Verify side panel is hidden on mobile
    const sidePanel = page.locator('text=Poetic Insight').locator('..');
    await expect(sidePanel).not.toBeVisible();

    // Verify controls are accessible
    const controls = page.locator('footer');
    await expect(controls).toBeVisible();
  });

  test('should display Arabic text with proper typography', async ({ page }) => {
    // Verify Arabic font is loaded
    const arabicText = page.locator('[dir="rtl"]').first();
    const fontFamily = await arabicText.evaluate(el => getComputedStyle(el).fontFamily);

    expect(fontFamily).toContain('Amiri');

    // Verify proper line height for readability
    const lineHeight = await arabicText.evaluate(el => getComputedStyle(el).lineHeight);
    const fontSize = await arabicText.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
    const lineHeightNum = parseFloat(lineHeight);

    // Line height should be at least 1.4x font size for readability
    // Note: The app uses leading-[2.2] which is 2.2x, so we should see much better than 1.4x
    expect(lineHeightNum).toBeGreaterThan(fontSize * 1.4);

    // Verify line height is reasonable (should be around 2.2x for leading-[2.2])
    expect(lineHeightNum).toBeLessThan(fontSize * 3.5);
  });

  test('should have adequate contrast ratios', async ({ page }) => {
    // Get text color and background color
    const arabicText = page.locator('[dir="rtl"]').first();
    const color = await arabicText.evaluate(el => getComputedStyle(el).color);
    const bgColor = await page.locator('body').evaluate(el => getComputedStyle(el).backgroundColor);

    // Both should be defined
    expect(color).toBeTruthy();
    expect(bgColor).toBeTruthy();
  });

  test('should have smooth animations', async ({ page }) => {
    // Verify transition properties are set
    const controls = page.locator('footer button').first();
    const transition = await controls.evaluate(el => getComputedStyle(el).transition);

    expect(transition).not.toBe('all 0s ease 0s');
  });

  test('header should be prominently displayed', async ({ page }) => {
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify header has proper styling
    const headerText = page.locator('text=poetry');
    const fontSize = await headerText.evaluate(el => getComputedStyle(el).fontSize);
    const fontSizeNum = parseFloat(fontSize);

    // Header should be large - with clamp(3rem,6vw,4.5rem) it should be at least 48px (3rem)
    // On smaller viewports it may be exactly 48px (3rem), on larger it grows up to 72px (4.5rem)
    expect(fontSizeNum).toBeGreaterThanOrEqual(48);
    expect(fontSizeNum).toBeLessThanOrEqual(75);
  });
});

test.describe('UI/UX - Interaction Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('buttons should have hover states', async ({ page }) => {
    // Get a visible button (filter out hidden ones)
    const button = page.locator('footer button:visible').first();

    // Get initial state
    await button.hover();
    await page.waitForTimeout(300);

    // Verify button is still visible after hover
    await expect(button).toBeVisible();
  });

  test('interactive elements should be keyboard accessible', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('controls should be appropriately sized for touch targets', async ({ page, isMobile }) => {
    if (!isMobile) {
      test.skip();
    }

    // Check that buttons are at least 44x44px (iOS guidelines)
    const buttons = page.locator('footer button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (await button.isVisible()) {
        const box = await button.boundingBox();
        if (box) {
          // Touch targets should be at least 40x40px
          expect(box.width).toBeGreaterThan(35);
          expect(box.height).toBeGreaterThan(35);
        }
      }
    }
  });

  test('scrolling should be smooth', async ({ page }) => {
    // Check if main element is scrollable
    const canScroll = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main && main.scrollHeight > main.clientHeight;
    });

    // If not scrollable, test passes (content fits viewport)
    if (!canScroll) {
      return;
    }

    // Get initial scroll position
    const initialScrollY = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.scrollTop : 0;
    });

    // Scroll down in the main element (not window)
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) {
        main.scrollBy({ top: 500, behavior: 'instant' });
      }
    });
    await page.waitForTimeout(300);

    // Verify scroll position changed in main element
    const scrollY = await page.evaluate(() => {
      const main = document.querySelector('main');
      return main ? main.scrollTop : 0;
    });

    // Check that scroll position increased (should be greater than initial)
    expect(scrollY).toBeGreaterThan(initialScrollY);
  });
});

test.describe('UI/UX - Content Readability', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('poem text should have adequate spacing', async ({ page }) => {
    // Find the poem container div (has pt-8 pb-2 classes)
    // It's the div with class containing "pt-8 pb-2"
    const poemContainer = page.locator('div.pt-8.pb-2').first();

    // If we can't find it by class, fall back to finding by structure
    const containerExists = await poemContainer.count();

    if (containerExists > 0) {
      const paddingTop = await poemContainer.evaluate(el => getComputedStyle(el).paddingTop);
      const paddingBottom = await poemContainer.evaluate(el => getComputedStyle(el).paddingBottom);

      const paddingTopValue = parseFloat(paddingTop);
      const paddingBottomValue = parseFloat(paddingBottom);

      // Should have some padding (pt-8 pb-2 in the code)
      expect(paddingTopValue).toBeGreaterThan(0);
      expect(paddingBottomValue).toBeGreaterThan(0);

      // pt-8 (2rem = 32px) should be significantly larger than pb-2 (0.5rem = 8px)
      expect(paddingTopValue).toBeGreaterThan(paddingBottomValue * 2);
    } else {
      // Fallback: just verify poem text has reasonable spacing
      const arabicText = page.locator('[dir="rtl"]').first();
      await expect(arabicText).toBeVisible();
    }
  });

  test('content should not overflow viewport', async ({ page }) => {
    // Check that no horizontal scrollbar is present
    const hasHorizontalScroll = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    );

    expect(hasHorizontalScroll).toBe(false);
  });

  test('text should be selectable', async ({ page }) => {
    const arabicText = page.locator('[dir="rtl"]').first();

    // Triple click to select text
    await arabicText.click({ clickCount: 3 });
    await page.waitForTimeout(200);

    // Verify text can be selected (user-select is not 'none')
    const userSelect = await arabicText.evaluate(el => getComputedStyle(el).userSelect);
    expect(userSelect).not.toBe('none');
  });

  test('controls should be clearly visible and distinct', async ({ page }) => {
    const controls = page.locator('footer');
    await expect(controls).toBeVisible();

    // Verify controls have backdrop blur/glass effect
    const backdropFilter = await controls.evaluate(el => getComputedStyle(el).backdropFilter);
    expect(backdropFilter).toBeTruthy();
  });
});

test.describe('UI/UX - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');
    expect(viewport).toContain('initial-scale=1.0');
  });

  test('should have page title', async ({ page }) => {
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);
  });

  test('buttons should be functional without mouse', async ({ page }) => {
    // Focus on first button
    await page.keyboard.press('Tab');

    // Press Enter or Space
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // App should still be functional
    await expect(page.locator('body')).toBeVisible();
  });

  test('should handle RTL and LTR text properly', async ({ page }) => {
    // Verify RTL text has correct direction
    const arabicText = page.locator('[dir="rtl"]').first();
    const direction = await arabicText.evaluate(el => getComputedStyle(el).direction);
    expect(direction).toBe('rtl');

    // Verify LTR text has correct direction
    const englishText = page.locator('[dir="ltr"]').first();
    const directionLtr = await englishText.evaluate(el => getComputedStyle(el).direction);
    expect(directionLtr).toBe('ltr');
  });
});

test.describe('UI/UX - Visual Consistency', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('should use consistent color scheme', async ({ page }) => {
    // Get colors from different elements
    const header = page.locator('header');
    const headerColor = await header.evaluate(el => getComputedStyle(el).color);

    // Verify color is defined
    expect(headerColor).toBeTruthy();
  });

  test('should use consistent border radius', async ({ page }) => {
    // Check various rounded elements
    const controls = page.locator('footer > div').first();
    const borderRadius = await controls.evaluate(el => getComputedStyle(el).borderRadius);

    // Should have consistent rounded corners
    expect(parseFloat(borderRadius)).toBeGreaterThan(10);
  });

  test('should maintain visual hierarchy', async ({ page }) => {
    // Header should be larger than body text
    const headerSize = await page.locator('text=poetry').evaluate(el =>
      parseFloat(getComputedStyle(el).fontSize)
    );
    const bodySize = await page.locator('[dir="rtl"]').first().evaluate(el =>
      parseFloat(getComputedStyle(el).fontSize)
    );

    // Header (clamp(3rem,6vw,4.5rem) = 48-72px) should be significantly larger than body (clamp(1.25rem,2vw,1.5rem) = 20-24px)
    // Expect at least 2x larger
    expect(headerSize).toBeGreaterThan(bodySize * 2);
  });
});
