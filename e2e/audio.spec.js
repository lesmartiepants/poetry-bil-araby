import { test, expect } from '@playwright/test';
import { silentPCM16Base64, setupCoreRoutes, skipOnboarding, loadApp } from './fixtures/mocks.js';

/**
 * Audio / Listen Feature Tests — Poetry Bil-Araby (@wf-audio-playback)
 *
 * Tests the TTS audio playback pipeline: Play button → TTS API call →
 * PCM16 decode → Tone.js Player creation → playback start.
 *
 * Headless Chromium throttles Web Audio: Tone.js cannot resume the AudioContext
 * even with --autoplay-policy set, so isPlaying never reaches true in CI (the
 * pre-existing tts-highlight.spec.js hits the same wall). The audible-playback
 * path is therefore verified at the UNIT level (src/test/togglePlay.test.js,
 * @wf-tts-fallback). What IS reliably observable here is whether clicking Listen
 * ENGAGES the pipeline: the store's isGenerating flag flips and a TTS request
 * fires. A green test means the Listen action wired through to generation — not
 * just that a button exists. The store is exposed on window.__audioStore in dev
 * builds. All API calls are mocked.
 */

/** Mock the TTS generateContent endpoint with success / 429 / 500 behavior. */
async function setupTTS(page, { ttsResponse = 'success' } = {}) {
  await page.route('**/api/ai/**/generateContent*', async (route) => {
    const url = route.request().url();
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

// The app has several play affordances across layouts. The not-playing trigger
// is "Start recitation" / "Listen to poem"; during playback a "Pause recitation"
// control appears. Match whichever is currently visible.
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

  test('Play button is visible with correct aria-label', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);
    await expect(playTrigger(page)).toBeVisible({ timeout: 5000 });
  });

  test('clicking Play triggers TTS API request', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    const reqPromise = page.waitForRequest(
      (req) =>
        req.url().includes('/api/ai/') &&
        req.url().includes('generateContent') &&
        !req.url().includes('stream'),
      { timeout: 8000 }
    );
    await playTrigger(page).click();
    expect(await reqPromise).toBeTruthy();
  });

  // ── @wf-audio-playback: behavioral guard — the Listen action engages generation ──

  test('clicking Play engages the audio generation pipeline (isGenerating)', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);

    await playTrigger(page).click();

    // The reachable observable in headless: clicking Listen flips the store into
    // the generating state, proving the action wired through to the TTS pipeline.
    // (isPlaying / audible output is unit-tested instead — see file header.)
    await page.waitForFunction(() => window.__audioStore?.getState().isGenerating === true, {
      timeout: 6000,
    });
  });

  test('Play does not crash the app on TTS error', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page, { ttsResponse: '500' });
    await loadApp(page);

    await playTrigger(page).click();
    await page.waitForTimeout(2000);
    // App still functional, and it did NOT enter the playing state on failure.
    await expect(page.locator('p[dir="rtl"]').first()).toBeVisible();
    expect(await isPlaying(page)).toBe(false);
  });

  test('Listen label is visible under the play control', async ({ page }) => {
    await setupCoreRoutes(page);
    await setupTTS(page);
    await loadApp(page);
    await expect(page.locator('text=Listen').first()).toBeVisible({ timeout: 5000 });
  });
});
