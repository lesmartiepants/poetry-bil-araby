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

/**
 * Open the Discover drawer (browse by poet + Surprise Me).
 *
 * It used to be one tap on the nav pill's Discover button. That button now opens the Category
 * Explorer, and the drawer's door is the account menu's "Explore Poets".
 */
export async function openDiscoverDrawer(page) {
  await page.locator('button[aria-label="Account menu"]').first().click();
  await page.locator('button[aria-label^="Explore poets"]').first().click();
  // Wait for the drawer to be genuinely interactive, not merely present. The account menu is a
  // Radix popover, and Radix pins `pointer-events: none` on <body> while a modal popover is open,
  // clearing it asynchronously on close. A click inside the drawer during that window lands on
  // nothing and the test then fails somewhere far away, on an assertion about the poem.
  await page
    .locator('button[aria-label="Discover new poem"]')
    .waitFor({ state: 'visible', timeout: 10000 });
  await page.waitForFunction(() => getComputedStyle(document.body).pointerEvents !== 'none');
}

/** Navigate to the app, dismiss the enter-gate if shown, wait for a poem to render. */
export async function loadApp(page) {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');
  // By testid, not by label: this button's copy has changed more than once, and each time it
  // silently stranded every test behind an undismissed splash.
  // The 8s probe is deliberate, do not trim it: the CTA stays hidden until the splash note
  // finishes its word-by-word reveal (~3.6s), so a 2s probe reports "no splash here" and walks
  // into that same stranding by another route.
  const enterBtn = page.getByTestId('splash-enter');
  if (await enterBtn.isVisible({ timeout: 8000 }).catch(() => false)) {
    await enterBtn.click();
    await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  }
  await page.locator('[dir="rtl"]').first().waitFor({ state: 'visible', timeout: 10000 });
}
