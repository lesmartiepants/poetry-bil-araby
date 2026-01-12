import { test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'desktop', width: 1440, height: 900 },
];

const MOCKUPS = [
  { file: 'option-i-heavy-frame-inline-category.html', name: 'I-Heavy-Inline' },
  { file: 'option-j-heavy-frame-icon-only-category.html', name: 'J-Heavy-IconOnly' },
  { file: 'option-k-heavy-frame-book-category.html', name: 'K-Heavy-Book' },
];

test.describe('Final Design Mockup Screenshots', () => {
  for (const mockup of MOCKUPS) {
    for (const viewport of VIEWPORTS) {
      test(`Option ${mockup.name} - ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`file:///Users/sfarage/Github/personal/poetry-bil-araby-ui-ux/mockups/${mockup.file}`);
        await page.waitForTimeout(600); // Let icons load
        await page.screenshot({
          path: `screenshots/mockup-option-${mockup.name.toLowerCase()}-${viewport.name}.png`,
          fullPage: false
        });
      });
    }
  }
});
