import { test, expect } from '@playwright/test';
import { silentPCM16Base64, setupCoreRoutes, skipOnboarding, loadApp } from './fixtures/mocks.js';

/**
 * Audio / Listen Feature Tests — Poetry Bil-Araby
 *
 * Tests the TTS audio playback pipeline: Listen button → TTS API call →
 * PCM16 decode → Tone.js Player creation → playback start.
 *
 * Headless Chromium throttles Web Audio: Tone.js cannot resume the AudioContext
 * even with --autoplay-policy set, so isPlaying never reaches true in CI (the
 * sibling tts-highlight.spec.js hits the same wall). The audible-playback path
 * is therefore verified at the UNIT level (src/test/togglePlay.test.js). What
 * IS reliably observable here is whether clicking Listen ENGAGES the pipeline:
 * the store's isGenerating flag flips and a TTS request fires. A green test
 * means the Listen action wired through to generation — not just that a
 * button exists. The store is exposed on window.__audioStore in dev builds.
 * All API calls are mocked.
 */

/** Mock the TTS generateContent endpoint with success / 429 / 500 behavior. */
async function setupTTS(page, { ttsResponse = 'success' } = {}) {
  await page.route('**/api/ai/**/generateContent*', async (route) => {
    const url = route.request().url();
    // Non-TTS AI calls (insights/streaming) — abort
    if (url.includes('stream')) {
      await route.abort('blockedbyclient');
      return;
    }

    if (ttsResponse === 'success') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  { inlineData: { mimeType: 'audio/L16;rate=24000', data: silentPCM16Base64() } },
                ],
              },
            },
          ],
        }),
      });
    } else if (ttsResponse === '429') {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Rate limited' } }),
      });
    } else {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'Server error' } }),
      });
    }
  });

  // live-tts fallback also fails for the error cases (so the app surfaces the error)
  await page.route('**/api/ai/live-tts', (route) =>
    ttsResponse === 'success'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ audioData: silentPCM16Base64() }),
        })
      : route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'live failed' }),
        })
  );
}

const isPlaying = (page) => page.evaluate(() => window.__audioStore?.getState().isPlaying === true);

// The old footer control-bar Play button is gone; the Listen control now lives in ReaderActions
// (aria-label "Start recitation"), with "Listen to poem" as an alternate label in some layouts.
// Match whichever is currently visible.
const playTrigger = (page) =>
  page
    .locator(
      'button[aria-label="Start recitation"]:visible, button[aria-label="Listen to poem"]:visible'
    )
    .first();

test.describe('Audio / Listen Feature', () => {
  test.beforeEach(async ({ page }) => {
    await skipOnboarding(page);
  });

  test('Listen button is visible with the recitation aria-label', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    await expect(playTrigger(page)).toBeVisible({ timeout: 10000 });
  });

  test('clicking Listen triggers TTS API request', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    // Start waiting BEFORE the click so we can't miss the request — deterministic instead of a
    // fixed sleep + boolean flag (which is flaky under CI load).
    const ttsRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/ai/') &&
        req.url().includes('generateContent') &&
        !req.url().includes('stream'),
      { timeout: 10000 }
    );

    await playTrigger(page).click({ timeout: 10000 });

    await ttsRequestPromise;
  });

  // ── behavioral guard — the Listen action engages generation ──
  test('clicking Listen engages the audio generation pipeline (isGenerating)', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    await playTrigger(page).click({ timeout: 10000 });

    // The reachable observable in headless: clicking Listen flips the store into the
    // generating state, proving the action wired through to the TTS pipeline. (isPlaying /
    // audible output is unit-tested instead — see file header.)
    await page.waitForFunction(() => window.__audioStore?.getState().isGenerating === true, {
      timeout: 6000,
    });
  });

  test('Listen does not crash the app on TTS error', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page, { ttsResponse: '500' });
    await loadApp(page);

    await playTrigger(page).click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // App should still be functional — Arabic text visible, and it did NOT enter the
    // playing state on failure.
    await expect(page.locator('p[dir="rtl"]').first()).toBeVisible();
    expect(await isPlaying(page)).toBe(false);
  });

  test('TTS rate limit does not crash the app', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page, { ttsResponse: '429' });
    await loadApp(page);

    await playTrigger(page).click({ timeout: 10000 });
    await page.waitForTimeout(3000);

    // A Sonner toast with the rate-limit message may or may not be visible depending on timing,
    // but the app shouldn't crash.
    await expect(page.locator('p[dir="rtl"]').first()).toBeVisible();
  });

  test('the recitation control shows the Listen label', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    await expect(page.locator('text=Listen').first()).toBeVisible({ timeout: 10000 });
  });
});
