/**
 * Shared E2E fixtures — one source of truth for poem mock data and the core
 * API routes every spec needs. Before this, each spec re-declared its own
 * MOCK_POEM and copy-pasted the poems/random + poets + health route handlers,
 * so a change to the poem shape silently drifted across N copies. Import from
 * here instead; add spec-specific routes (TTS, Supabase, etc.) after calling
 * setupCoreRoutes.
 */

// Mirrors the 8-field shape server.js returns (see src/test/server.test.js
// "Response Format Validation"). Keep in sync with that contract.
export const MOCK_POEM = {
  id: 50001,
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

/** 0.1s of silent 24kHz mono PCM16 as base64 — a valid TTS audio payload. */
export function silentPCM16Base64(durationSec = 0.1, sampleRate = 24000) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const bytes = new Uint8Array(numSamples * 2);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Mock the core read-only API surface (poem source, poets, health, model list).
 * Specs add their own routes for TTS / auth / insights after this.
 */
export async function setupCoreRoutes(
  page,
  { poem = MOCK_POEM, poets = [{ name: 'المتنبي' }] } = {}
) {
  await page.route('**/api/poems/random*', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(poem) })
  );
  await page.route('**/api/poets', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(poets) })
  );
  await page.route('**/api/health', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'ok', totalPoems: 84329 }),
    })
  );
  await page.route('**/api/ai/models', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ models: [] }),
    })
  );
}

/** Skip the onboarding splash so the app loads straight to a poem. */
export async function skipOnboarding(page) {
  await page.addInitScript(() => localStorage.setItem('hasSeenOnboarding', 'true'));
}

/** Navigate to the app, dismiss the enter-gate if shown, wait for a poem to render. */
export async function loadApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  const enterBtn = page.locator('button[aria-label="Enter the app"]');
  if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await enterBtn.click();
    await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
}
