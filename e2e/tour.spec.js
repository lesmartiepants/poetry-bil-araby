import { test, expect } from '@playwright/test';
import { TOUR_STEPS } from '../src/constants/tourSteps.js';

/**
 * Walkthrough (tour) smoke test — the anti-drift guard.
 *
 * The tour couples to the app only through `data-tour` anchors + a few modal
 * store keys. Those couplings degrade SILENTLY (a missing anchor just falls back
 * to a centered card), so this test drives the real tour end-to-end and fails
 * loudly if any of them break.
 *
 * It iterates TOUR_STEPS, so adding a feature step (a `data-tour` attr + a step
 * entry, per the recipe in tourSteps.js) automatically extends coverage here —
 * no edits to this file needed.
 *
 * Key assertions per step:
 *   1. the coachmark shows the step's title (we're really on this step), and
 *   2. every anchored step's `target` selector resolves to a REAL, visible
 *      element (this is what catches a renamed/removed control or data-tour).
 * Then it walks to completion and checks the post-tour restart entry point.
 */

// Library is conditional (only signed-in / has-saved-poems); an anonymous run
// of the tour omits it — mirror the launcher's filter.
const STEPS = TOUR_STEPS.filter((s) => !s.when);

const MOCK_POEM = {
  id: 50001,
  poet: 'أبو الطيب المتنبي',
  poetArabic: 'أبو الطيب المتنبي',
  title: 'على قدر أهل العزم',
  titleArabic: 'على قدر أهل العزم',
  arabic: 'على قَدْرِ أهلِ العَزمِ تأتي العَزائِمُ\nوتأتي على قَدْرِ الكِرامِ المَكارِمُ',
  english: '',
  tags: ['حكمة'],
  cachedTranslation: 'By the measure of the resolute come great deeds\nAnd by the measure of the noble come generous acts',
  isFromDatabase: true,
};

async function setupMocks(page) {
  await page.route('**/api/poems/random*', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_POEM) })
  );
  await page.route('**/api/poets', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'أبو الطيب المتنبي' }]) })
  );
  await page.route('**/api/health', (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', totalPoems: 84329 }) })
  );
  // Live TTS fails fast so audio never sticks in a "generating" (disabled) state
  // — keeps the Listen/Pause controls clickable for the walk.
  await page.route('**/api/ai/live-tts*', (r) => r.fulfill({ status: 500, body: 'no audio' }));
  // Insight / REST calls return text (no audio inlineData → audio fails fast;
  // the insight panel still opens on tap, which is all the tour needs).
  await page.route('**/api/ai/**', (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ content: { parts: [{ text: '**Poetic Translation**\nMock\n\n**In-Depth Analysis**\nMock\n\n**About the Poet**\nMock' }] } }],
      }),
    })
  );
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('hasSeenOnboarding', 'true'); // no splash
    localStorage.removeItem('tourCompleted'); // ensure a fresh, uncompleted tour
    localStorage.removeItem('tourStep');
  });
});

test('every step anchors to a real element and the tour walks to completion', async ({ page }) => {
  await setupMocks(page);
  await page.goto('/?tour=1');
  await page.waitForSelector('[dir="rtl"]', { timeout: 15000 });

  const card = page.locator('[role="dialog"][aria-label="App walkthrough"]');
  await expect(card).toBeVisible({ timeout: 10000 });

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const isLast = i === STEPS.length - 1;

    // 1. We're really on this step.
    await expect(card.getByText(step.title, { exact: false }).first()).toBeVisible({ timeout: 8000 });

    // 2. ANTI-DRIFT: the step's target must resolve to a real, visible element.
    if (step.target) {
      await expect(
        page.locator(step.target).first(),
        `Tour step "${step.key}" target ${step.target} is missing — did a control/data-tour change?`
      ).toBeVisible({ timeout: 8000 });
    }

    // Feature steps: perform the real action the tour is guiding.
    if (step.advanceOn) {
      if (step.tray) {
        // Click the actual control button to OPEN its panel/drawer. The anchor
        // may be a cell wrapper (icon + label); click the button inside it so
        // the click reliably lands on the control, not the gap between them.
        const anchor = page.locator(step.target).first();
        const innerBtn = anchor.locator('button').first();
        const control = (await innerBtn.count()) > 0 ? innerBtn : anchor;
        await control.click({ force: true });
        // Behavioral coupling we can assert cleanly: tapping Save (signed out)
        // opens the auth sheet.
        if (step.tray === 'auth') {
          await expect(page.locator('[data-tour-anchor="auth"]')).toBeVisible({ timeout: 5000 });
        } else {
          await page.waitForTimeout(800); // let the drawer/panel open
        }
      } else {
        // Listen/Pause: the control can be momentarily disabled while audio
        // "generates", so dispatch the click directly to fire the tour's unlock
        // regardless of disabled state (we're testing the tour, not playback).
        await page.locator(step.target).first().dispatchEvent('click');
        await page.waitForTimeout(200);
      }
    }

    // Advance (Next flashes-not-advances only when locked; we've done the action).
    await card.getByRole('button', { name: isLast ? 'Done' : 'Next' }).click({ force: true });
    await page.waitForTimeout(500);
  }

  // Completed: the coachmark is gone, the restart entry point persists, and the
  // completion flag is set.
  await expect(card).toBeHidden({ timeout: 8000 });
  await expect(page.locator('[data-tour="restart"]')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('tourCompleted'))).toBe('true');
});
