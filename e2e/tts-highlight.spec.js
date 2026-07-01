import { test, expect } from '@playwright/test';

/**
 * TTS Word-Highlight Reader — E2E Tests (sparkler-reader redesign)
 *
 * The redesign moved things around: the highlight "Read Along" style picker lives in the
 * TextSettingsPill popover (aria "Text and background settings"); the active tts-style class is
 * applied to the reader's sparkler stage ([data-testid="sparkler-stage"]) rather than a separate
 * poem-container; the standalone PlayControlsStrip is no longer rendered (it returns null when
 * highlightStyle==='none' and isn't mounted in the app); and playback is driven by the reader's
 * Listen action (aria "Start recitation") which morphs into a transport (Play/Pause). Audio is
 * mocked (silent PCM16).
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

  // Companion poems — keep the feed to just the initial poem for determinism.
  await page.route('**/api/poems/by-poet/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
  );

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
              parts: [{ inlineData: { mimeType: 'audio/L16;rate=24000', data: silentB64 } }],
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
  // Reader boots directly (no splash). Wait for the sparkler stage.
  await page
    .locator('[data-testid="sparkler-stage"]')
    .first()
    .waitFor({ state: 'visible', timeout: 10000 });
}

async function openTextSettings(page) {
  const settingsBtn = page.locator('button[aria-label="Text and background settings"]');
  await settingsBtn.waitFor({ state: 'visible', timeout: 5000 });
  await settingsBtn.click();
}

async function selectHighlightStyle(page, style) {
  // The "Read Along" highlight row is inside the text settings popover.
  // style: 'glow' | 'underline' | 'pill' | 'focus-blur' | 'off'
  const btn = page.locator(`button[data-highlight-style="${style}"]`);
  await btn.waitFor({ state: 'visible', timeout: 5000 });
  await btn.click();
}

const activeStage = (page) => page.locator('[data-testid="sparkler-stage"]').first();

test.describe('TTS Word-Highlight Reader', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
    });
    await setupMocks(page);
    await loadApp(page);
  });

  // Flow 1: Open Aa popover → find the "Read Along" highlight row → select Glow → close
  test('can select Glow highlight style from text settings popover', async ({ page }) => {
    await openTextSettings(page);

    // "Read Along" section heading should be visible inside the popover.
    await expect(page.locator('text=Read Along').first()).toBeVisible({ timeout: 5000 });

    const glowBtn = page.locator('button[data-highlight-style="glow"]');
    await expect(glowBtn).toBeVisible({ timeout: 5000 });
    await glowBtn.click();

    await page.keyboard.press('Escape');
  });

  // Flow 2: The active sparkler stage gets the tts-style-glow class after selecting Glow.
  test('sparkler stage has tts-style-glow class when Glow is selected', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await expect(activeStage(page)).toHaveClass(/tts-style-glow/, { timeout: 5000 });
  });

  // Flow 3: Selecting each word-level style applies the matching tts-style-* class.
  test('selecting underline applies tts-style-underline to the stage', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'underline');
    await page.keyboard.press('Escape');

    await expect(activeStage(page)).toHaveClass(/tts-style-underline/, { timeout: 5000 });
  });

  // Flow 4: Pressing Listen morphs the pill into the playback transport (prev / play-pause / next).
  test('Listen morphs the pill into the playback transport', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    const listenBtn = page.locator('button[aria-label="Start recitation"]');
    await expect(listenBtn).toBeVisible({ timeout: 10000 });
    await listenBtn.click();

    // The transport group appears (holds Previous verse / Play|Pause|Preparing audio / Next verse).
    const transport = page.locator('[role="group"][aria-label="Playback controls"]');
    await expect(transport).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button[aria-label="Previous verse"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Next verse"]')).toBeVisible();
  });

  // Flow 5: Listen fires the TTS request without crashing the reader.
  test('Listen triggers a TTS request', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    let ttsRequested = false;
    page.on('request', (req) => {
      if (
        req.url().includes('/api/ai/') &&
        req.url().includes('generateContent') &&
        !req.url().includes('stream')
      ) {
        ttsRequested = true;
      }
    });

    const listenBtn = page.locator('button[aria-label="Start recitation"]');
    await listenBtn.click({ timeout: 10000 });
    await page.waitForTimeout(3000);
    expect(ttsRequested).toBe(true);
    // Reader still intact.
    await expect(activeStage(page)).toBeVisible();
  });

  // Flow 6: The reader exposes addressable word spans for the highlight pipeline.
  test('verse words are individually addressable for highlighting', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    // HighlightedVerse renders .tts-word spans with data-word-index — the target of tts-active.
    const words = page.locator('.tts-word[data-word-index]');
    await expect(words.first()).toBeVisible({ timeout: 5000 });
    expect(await words.count()).toBeGreaterThan(0);
  });

  // Flow 7: The legacy PlayControlsStrip is no longer rendered (Listen lives in the reader).
  test('the legacy play-controls strip is not rendered', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await expect(page.locator('[data-testid="play-controls-strip"]')).toHaveCount(0);
  });

  // Flow 8: Switching to Off removes the tts-style class from the stage.
  test('switching to Off removes the highlight style class', async ({ page }) => {
    await openTextSettings(page);
    await selectHighlightStyle(page, 'glow');
    await page.keyboard.press('Escape');

    await expect(activeStage(page)).toHaveClass(/tts-style-glow/, { timeout: 5000 });

    await openTextSettings(page);
    await selectHighlightStyle(page, 'off');
    await page.keyboard.press('Escape');

    await expect(activeStage(page)).not.toHaveClass(/tts-style-glow/);
    await expect(activeStage(page)).not.toHaveClass(/tts-style-underline/);
    await expect(activeStage(page)).not.toHaveClass(/tts-style-pill/);
    await expect(activeStage(page)).not.toHaveClass(/tts-style-focus-blur/);
  });
});
