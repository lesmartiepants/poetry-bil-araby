import { test, expect } from '@playwright/test';

/**
 * TTS Word-Highlight Reader — E2E Tests
 *
 * Tests the full user flow for selecting highlight styles, playing audio,
 * and verifying highlight behavior. Audio is mocked (silent PCM16).
 * Tests are written TDD-style — they will fail until the feature is built.
 */

const MOCK_POEM = {
  id: 60001,
  poet: 'al-Mutanabbi',
  poetArabic: 'المتنبي',
  title: 'On Ambition',
  titleArabic: 'في الهمة',
  arabic: 'على قدر أهل العزم تأتي العزائم\nوتأتي على قدر الكرام المكارم',
  english:
    'Resolve comes in proportion to the people of resolve\nAnd noble deeds come in proportion to the noble',
  tags: ['حكمة'],
  isFromDatabase: true,
};

async function setupMocks(page) {
  await page.route('**/api/poems/random*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_POEM),
    });
  });

  await page.route('**/api/poets', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'المتنبي' }]),
    });
  });

  await page.route('**/api/health', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', totalPoems: 84329 }),
    });
  });

  // Mock TTS endpoint — return a short silent WAV
  await page.route('**/api/ai/**/generateContent*', async (route) => {
    const url = route.request().url();
    if (url.includes('stream')) {
      await route.abort('blockedbyclient');
      return;
    }

    const silentB64 = await page.evaluate(() => {
      const numSamples = 2400; // 0.1s at 24kHz
      const bytes = new Uint8Array(numSamples * 2);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/L16;rate=24000',
                    data: silentB64,
                  },
                },
              ],
            },
          },
        ],
      }),
    });
  });

  await page.route('**/api/ai/models', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [] }),
    });
  });
}

async function loadApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const enterBtn = page.locator('button[aria-label="Enter the app"]');
  if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterBtn.click();
    await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
}

async function openTextSettings(page) {
  const settingsBtn = page.locator('button[aria-label="Text settings"]');
  await settingsBtn.waitFor({ state: 'visible', timeout: 5000 });
  await settingsBtn.click();
}

async function selectHighlightStyle(page, style) {
  // The highlight row is inside the text settings popover
  // style: 'glow' | 'underline' | 'pill' | 'focus-blur' | 'off'
  const btn = page.locator(`button[data-highlight-style="${style}"]`);
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
}

async function clickPlay(page) {
  const playBtn = page.locator('button[aria-label="Play recitation"]');
  await playBtn.waitFor({ state: 'visible', timeout: 5000 });
  await playBtn.click();
}

test.describe('TTS Word-Highlight Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await setupMocks(page);
    await loadApp(page);
  });

  // Flow 1: Open Aa popover → navigate to Highlight row → select Glow → close
  test('can select Glow highlight style from text settings popover', async ({ page }) => {
    await openTextSettings(page);

    // Highlight section heading should be visible inside popover
    const highlightHeading = page.locator('text=Highlight').first();
    await expect(highlightHeading).toBeVisible({ timeout: 5000 });

    // Glow button should exist
    const glowBtn = page.locator('button[data-highlight-style="glow"]');
    await expect(glowBtn).toBeVisible({ timeout: 5000 });

    await glowBtn.click();

    // Close popover by pressing Escape
    await page.keyboard.press('Escape');
  });

  // Flow 2: Poem container gets tts-style-glow class after selecting Glow
  test('poem container has tts-style-glow class when Glow is selected', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    // The poem container (wrapping versePairs) should have tts-style-glow class
    const poemContainer = page.locator('[data-poem-container]');
    await expect(poemContainer).toHaveClass(/tts-style-glow/, { timeout: 5000 });
  });

  // Flow 3: Play → wait → at least one .tts-active word exists
  test('playing audio creates at least one active highlighted word', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await clickPlay(page);

    // Wait for audio to load and start — then check for active word
    // We poll for a short time since the silent audio is very short
    await expect(page.locator('.tts-active').first()).toBeVisible({ timeout: 8000 });
  });

  // Flow 4: Pause → .tts-active stays (not cleared)
  test('pausing audio keeps the highlighted word visible', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await clickPlay(page);

    // Wait for at least one active word to appear
    const activeWord = page.locator('.tts-active').first();
    await activeWord.waitFor({ state: 'visible', timeout: 8000 });

    // Click pause
    const pauseBtn = page.locator('button[aria-label="Pause recitation"]');
    await pauseBtn.click();

    // Active word should still be visible after pause (position preserved)
    await expect(activeWord).toBeVisible({ timeout: 3000 });
  });

  // Flow 5: Play → Pause → Play → resumes from same position (not restart)
  test('play after pause resumes from same word position', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await clickPlay(page);

    // Wait for active word to appear
    await page.locator('.tts-active').first().waitFor({ state: 'visible', timeout: 8000 });

    // Record which word index is active
    const activeWordIndex = await page
      .locator('.tts-active')
      .first()
      .getAttribute('data-word-index');

    // Pause
    const pauseBtn = page.locator('button[aria-label="Pause recitation"]');
    await pauseBtn.click();

    // Wait a moment then play again
    await page.waitForTimeout(300);
    await clickPlay(page);

    // The resumed active word should be at or near the same index (not restart from 0)
    await page.locator('.tts-active').first().waitFor({ state: 'visible', timeout: 5000 });
    const resumedWordIndex = await page
      .locator('.tts-active')
      .first()
      .getAttribute('data-word-index');

    // On resume, the word index should be >= what it was when paused (not reset to 0)
    if (activeWordIndex !== null && resumedWordIndex !== null) {
      expect(Number(resumedWordIndex)).toBeGreaterThanOrEqual(Number(activeWordIndex));
    }
  });

  // Flow 6: English line — active verse has .tts-line-active
  test('active verse English line has tts-line-active class', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await clickPlay(page);

    // Wait for highlight to start
    await page.locator('.tts-active').first().waitFor({ state: 'visible', timeout: 8000 });

    // At least one English line should have the tts-line-active class
    await expect(page.locator('.tts-en-line.tts-line-active').first()).toBeVisible({
      timeout: 5000,
    });
  });

  // Flow 7: Play controls strip visible with prev/next/play-pause when highlight active
  test('play controls strip is visible when a highlight style is active', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    // Play controls strip should appear once highlight style is set
    const controlsStrip = page.locator('[data-testid="play-controls-strip"]');
    await expect(controlsStrip).toBeVisible({ timeout: 5000 });

    // Should contain prev, play/pause, and next buttons
    await expect(controlsStrip.locator('button[aria-label="Prev verse"]')).toBeVisible();
    await expect(controlsStrip.locator('button[aria-label="Next verse"]')).toBeVisible();
    await expect(
      controlsStrip.locator('button[aria-label="Play"], button[aria-label="Pause"]').first()
    ).toBeVisible();
  });

  // Flow 8: Switch to Off → no highlights, controls strip hidden
  test('switching to Off removes highlights and hides controls strip', async ({ page }) => {
    // First enable Glow
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    // Verify glow class is on the container
    const poemContainer = page.locator('[data-poem-container]');
    await expect(poemContainer).toHaveClass(/tts-style-glow/, { timeout: 5000 });

    // Now switch to Off
    await openTextSettings(page);
    await selectHighlightStyle(page, 'off');
    await page.keyboard.press('Escape');

    // Container should NOT have any tts-style class
    await expect(poemContainer).not.toHaveClass(/tts-style-glow/);
    await expect(poemContainer).not.toHaveClass(/tts-style-underline/);
    await expect(poemContainer).not.toHaveClass(/tts-style-pill/);
    await expect(poemContainer).not.toHaveClass(/tts-style-focus-blur/);

    // Play controls strip should be hidden
    const controlsStrip = page.locator('[data-testid="play-controls-strip"]');
    await expect(controlsStrip).not.toBeVisible();
  });
});
