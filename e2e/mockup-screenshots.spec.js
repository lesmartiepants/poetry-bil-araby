import { test } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

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
        // Try multiple potential mockup locations relative to the project
        const possiblePaths = [
          path.resolve(process.cwd(), '../poetry-bil-araby-ui-ux/mockups', mockup.file),
          path.resolve(process.cwd(), '../poetry-bil-araby-ui-ux/src/mockups', mockup.file),
          path.resolve(process.cwd(), 'mockups', mockup.file),
          path.resolve(process.cwd(), 'e2e/mockups', mockup.file),
          // Check in the UI/UX working directory
          path.resolve('/Users/sfarage/Github/personal/poetry-bil-araby-ui-ux/mockups', mockup.file),
          path.resolve('/Users/sfarage/Github/personal/poetry-bil-araby-ui-ux/src/mockups', mockup.file),
        ];

        let mockupPath = null;
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            mockupPath = testPath;
            break;
          }
        }

        // Skip if mockup file doesn't exist (these are optional design reference screenshots)
        if (!mockupPath) {
          test.skip(true, 'Mockup file not found - skipping optional design screenshot test');
          return;
        }

        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto(`file://${mockupPath}`);
        await page.waitForTimeout(600); // Let icons load
        await page.screenshot({
          path: `screenshots/mockup-option-${mockup.name.toLowerCase()}-${viewport.name}.png`,
          fullPage: false
        });
      });
    }
  }
});
