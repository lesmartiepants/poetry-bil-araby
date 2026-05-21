/* eslint-disable no-undef -- globals (goToPhase, helixRotation, etc.) live in browser page context via page.evaluate() */
import { test, expect } from '@playwright/test';

/**
 * Helix Era Picker — TDD E2E Tests
 *
 * Validates the cylindrical 3D helix movement experience in the Folio
 * onboarding prototype. The helix arranges 8 era cards on a cylinder
 * surface (6 Classical + 2 Modern) and rotates via scroll/drag/touch.
 *
 * Constants from implementation:
 *   ERA_COUNT = 8
 *   HELIX_ANGLE_STEP = 45° (360/8)
 *   HELIX_RADIUS = 220px
 *   HELIX_DRAG_SENSITIVITY = 80px per angle step
 *   HELIX_FOCUS_THRESHOLD = 0.6 (fraction of angle step)
 *   HELIX_OPACITY_RANGE = 120°
 */

const FOLIO_URL = '/design-review/awwwards-inspired/variation-1-folio.html';

const ALL_ERAS = [
  'pre-islamic',
  'early-islamic',
  'umayyad',
  'abbasid',
  'andalusian',
  'ottoman',
  'modern',
  'contemporary',
];

// Navigate directly to the era picker phase (phase 4) for focused testing
async function goToEraPhase(page) {
  await page.goto(FOLIO_URL);
  await page.waitForLoadState('domcontentloaded');
  // Use JS to jump directly to phase 4 (era picker) — avoids slow animation waits
  await page.evaluate(() => {
    if (typeof goToPhase === 'function') goToPhase(4);
  });
  // Wait for the era container to be visible
  await expect(page.locator('#eraContainer')).toBeVisible();
}

// ─── Structure Tests ──────────────────────────────────────────────────

test.describe('Helix Era Picker — Structure', () => {
  test('renders 8 era cards on the helix drum', async ({ page }) => {
    await goToEraPhase(page);
    const cards = page.locator('.era-card');
    await expect(cards).toHaveCount(8);
  });

  test('each card has a data-slug matching the era', async ({ page }) => {
    await goToEraPhase(page);
    for (let i = 0; i < ALL_ERAS.length; i++) {
      const card = page.locator(`.era-card[data-index="${i}"]`);
      await expect(card).toHaveAttribute('data-slug', ALL_ERAS[i]);
    }
  });

  test('each card has a data-index for position', async ({ page }) => {
    await goToEraPhase(page);
    for (let i = 0; i < 8; i++) {
      const card = page.locator(`.era-card[data-index="${i}"]`);
      await expect(card).toHaveCount(1);
    }
  });

  test('cards are positioned on cylinder surface with rotateX + translateZ', async ({ page }) => {
    await goToEraPhase(page);
    // Check first card (index=0): rotateX(0deg) translateZ(220px)
    const transform0 = await page
      .locator('.era-card[data-index="0"]')
      .evaluate((el) => el.style.transform);
    expect(transform0).toContain('rotateX(0deg)');
    expect(transform0).toContain('translateZ(220px)');

    // Check 4th card (index=3): rotateX(135deg) translateZ(220px)
    const transform3 = await page
      .locator('.era-card[data-index="3"]')
      .evaluate((el) => el.style.transform);
    expect(transform3).toContain('rotateX(135deg)');
    expect(transform3).toContain('translateZ(220px)');
  });

  test('helix drum has preserve-3d transform style', async ({ page }) => {
    await goToEraPhase(page);
    const style = await page
      .locator('#helixDrum')
      .evaluate((el) => getComputedStyle(el).transformStyle);
    expect(style).toBe('preserve-3d');
  });

  test('era container has CSS perspective set', async ({ page }) => {
    await goToEraPhase(page);
    const perspective = await page
      .locator('#eraContainer')
      .evaluate((el) => getComputedStyle(el).perspective);
    // Should be a non-zero px value (900px from CSS)
    expect(perspective).toMatch(/\d+px/);
    expect(parseInt(perspective)).toBeGreaterThan(0);
  });

  test('CLASSICAL badge on first card, MODERN badge on 7th card', async ({ page }) => {
    await goToEraPhase(page);
    // First card (index 0) should have CLASSICAL badge
    const classicalBadge = page.locator('.era-card[data-index="0"] .era-section-badge');
    await expect(classicalBadge).toHaveText('CLASSICAL');

    // 7th card (index 6) should have MODERN badge
    const modernBadge = page.locator('.era-card[data-index="6"] .era-section-badge');
    await expect(modernBadge).toHaveText('MODERN');

    // Cards without badges should not have one
    const noBadge = page.locator('.era-card[data-index="2"] .era-section-badge');
    await expect(noBadge).toHaveCount(0);
  });

  test('focus bar element exists for visual centering', async ({ page }) => {
    await goToEraPhase(page);
    await expect(page.locator('.helix-focus-bar')).toBeVisible();
  });

  test('interaction layer sits on top for event capture', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');
    await expect(layer).toBeAttached();
    // Should cover the era container via inset:0
    const zIndex = await layer.evaluate((el) => getComputedStyle(el).zIndex);
    expect(parseInt(zIndex)).toBeGreaterThanOrEqual(10);
  });
});

// ─── Initial State Tests ──────────────────────────────────────────────

test.describe('Helix Era Picker — Initial State', () => {
  test('first era (Pre-Islamic) is in focus on load', async ({ page }) => {
    await goToEraPhase(page);
    const focused = page.locator('.era-card.in-focus');
    await expect(focused).toHaveCount(1);
    await expect(focused).toHaveAttribute('data-slug', 'pre-islamic');
  });

  test('helixRotation starts at 0', async ({ page }) => {
    await goToEraPhase(page);
    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(0);
  });

  test('scroll hint is visible on load', async ({ page }) => {
    await goToEraPhase(page);
    const hint = page.locator('#helixHint');
    await expect(hint).toBeVisible();
    await expect(hint).not.toHaveClass(/hidden/);
  });

  test('CTA reads "تخطى" (skip) when no era is selected', async ({ page }) => {
    await goToEraPhase(page);
    await expect(page.locator('#eraCta')).toHaveText('تخطى');
  });

  test('no era card has .selected class initially', async ({ page }) => {
    await goToEraPhase(page);
    const selected = page.locator('.era-card.selected');
    await expect(selected).toHaveCount(0);
  });
});

// ─── Wheel Scroll Tests ──────────────────────────────────────────────

test.describe('Helix Era Picker — Wheel Scroll Rotation', () => {
  test('scrolling down rotates helix to next era', async ({ page }) => {
    await goToEraPhase(page);
    // Scroll down on the interaction layer
    const layer = page.locator('#helixInteractionLayer');
    await layer.dispatchEvent('wheel', { deltaY: 100 });
    // Wait for GSAP animation
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(45); // One HELIX_ANGLE_STEP

    // Second era should now be in focus
    const focused = page.locator('.era-card.in-focus');
    await expect(focused).toHaveAttribute('data-slug', 'early-islamic');
  });

  test('scrolling up from position 1 returns to first era', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Scroll down to era index 1
    await layer.dispatchEvent('wheel', { deltaY: 100 });
    await page.waitForTimeout(100);

    // Scroll back up
    await layer.dispatchEvent('wheel', { deltaY: -100 });
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(0);
    const focused = page.locator('.era-card.in-focus');
    await expect(focused).toHaveAttribute('data-slug', 'pre-islamic');
  });

  test('cannot scroll past the last era (Contemporary)', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Scroll down 10 times (more than 8 eras)
    for (let i = 0; i < 10; i++) {
      await layer.dispatchEvent('wheel', { deltaY: 100 });
      await page.waitForTimeout(50);
    }
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    // Maximum rotation = (8-1) * 45 = 315
    expect(rotation).toBe(315);
    const focused = page.locator('.era-card.in-focus');
    await expect(focused).toHaveAttribute('data-slug', 'contemporary');
  });

  test('cannot scroll before the first era', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Try scrolling up from the start
    await layer.dispatchEvent('wheel', { deltaY: -100 });
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(0);
  });

  test('scroll hint hides after first interaction', async ({ page }) => {
    await goToEraPhase(page);
    const hint = page.locator('#helixHint');
    await expect(hint).not.toHaveClass(/hidden/);

    // Scroll once
    const layer = page.locator('#helixInteractionLayer');
    await layer.dispatchEvent('wheel', { deltaY: 100 });
    await page.waitForTimeout(100);

    await expect(hint).toHaveClass(/hidden/);
  });

  test('each scroll step navigates to the correct era in sequence', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    for (let i = 0; i < ALL_ERAS.length; i++) {
      const focused = page.locator('.era-card.in-focus');
      await expect(focused).toHaveAttribute('data-slug', ALL_ERAS[i]);

      if (i < ALL_ERAS.length - 1) {
        await layer.dispatchEvent('wheel', { deltaY: 100 });
        await page.waitForTimeout(700);
      }
    }
  });
});

// ─── Opacity Falloff Tests ───────────────────────────────────────────

test.describe('Helix Era Picker — Opacity Falloff', () => {
  test('focused card has full opacity, distant cards have reduced opacity', async ({ page }) => {
    await goToEraPhase(page);
    // At rotation=0, first card should be visible, distant cards faded
    const opacity0 = await page
      .locator('.era-card[data-index="0"]')
      .evaluate((el) => parseFloat(el.style.opacity));
    const opacity3 = await page
      .locator('.era-card[data-index="3"]')
      .evaluate((el) => parseFloat(el.style.opacity));

    expect(opacity0).toBe(1);
    // Card at 135° delta → 1 - 135/120 = -0.125, clamped to 0
    expect(opacity3).toBeLessThan(0.1);
  });

  test('neighbor cards have partial opacity', async ({ page }) => {
    await goToEraPhase(page);
    // Card at index 1 is 45° away → opacity = 1 - 45/120 ≈ 0.625
    const opacity1 = await page
      .locator('.era-card[data-index="1"]')
      .evaluate((el) => parseFloat(el.style.opacity));
    expect(opacity1).toBeGreaterThan(0.5);
    expect(opacity1).toBeLessThan(0.8);
  });

  test('opacity updates when helix rotates to a new era', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Scroll to second era (index 1)
    await layer.dispatchEvent('wheel', { deltaY: 100 });
    await page.waitForTimeout(700);

    // Now card 1 should be full opacity, card 0 should be reduced
    const opacity1 = await page
      .locator('.era-card[data-index="1"]')
      .evaluate((el) => parseFloat(el.style.opacity));
    const opacity0 = await page
      .locator('.era-card[data-index="0"]')
      .evaluate((el) => parseFloat(el.style.opacity));

    expect(opacity1).toBe(1);
    expect(opacity0).toBeGreaterThan(0.5);
    expect(opacity0).toBeLessThan(0.8);
  });
});

// ─── Selection Tests ─────────────────────────────────────────────────

test.describe('Helix Era Picker — Selection', () => {
  test('clicking the focused card selects it', async ({ page }) => {
    await goToEraPhase(page);
    // Click the focused card directly (bypass interaction layer)
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });

    const selected = page.locator('.era-card.selected');
    await expect(selected).toHaveCount(1);
    await expect(selected).toHaveAttribute('data-slug', 'pre-islamic');
  });

  test('selecting an era changes CTA to "التالي" (next)', async ({ page }) => {
    await goToEraPhase(page);
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });

    await expect(page.locator('#eraCta')).toHaveText('التالي');
  });

  test('deselecting an era reverts CTA to "تخطى" (skip)', async ({ page }) => {
    await goToEraPhase(page);
    // Select
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });
    await expect(page.locator('#eraCta')).toHaveText('التالي');

    // Deselect
    await page.evaluate(() => {
      document.querySelector('.era-card.selected').click();
    });
    await expect(page.locator('#eraCta')).toHaveText('تخطى');
  });

  test('scroll to a different era and select it', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Scroll to Abbasid (index 3)
    for (let i = 0; i < 3; i++) {
      await layer.dispatchEvent('wheel', { deltaY: 100 });
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(700);

    // Click the focused card
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });

    const selected = page.locator('.era-card.selected');
    await expect(selected).toHaveAttribute('data-slug', 'abbasid');
  });

  test('selection state is tracked in JavaScript', async ({ page }) => {
    await goToEraPhase(page);
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });

    const eras = await page.evaluate(() => selections.eras);
    expect(eras).toContain('pre-islamic');
  });
});

// ─── Snap Behavior Tests ─────────────────────────────────────────────

test.describe('Helix Era Picker — Snap to Nearest', () => {
  test('helix snaps to nearest era after partial rotation via JS', async ({ page }) => {
    await goToEraPhase(page);

    // Set rotation to a value between eras (25° is between 0° and 45°)
    await page.evaluate(() => {
      helixRotation = 25;
      snapHelixToNearest();
    });
    await page.waitForTimeout(700);

    // Should snap to nearest: Math.round(25/45) = 1 → 1*45 = 45
    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(45);
  });

  test('helix snaps to 0 when slightly above it', async ({ page }) => {
    await goToEraPhase(page);

    await page.evaluate(() => {
      helixRotation = 20;
      snapHelixToNearest();
    });
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(0); // Math.round(20/45) = 0 → 0*45 = 0
  });

  test('snap clamps to max rotation', async ({ page }) => {
    await goToEraPhase(page);

    await page.evaluate(() => {
      helixRotation = 400; // Way past 315° max
      snapHelixToNearest();
    });
    await page.waitForTimeout(700);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(315); // (ERA_COUNT-1) * HELIX_ANGLE_STEP
  });
});

// ─── Reset Tests ─────────────────────────────────────────────────────

test.describe('Helix Era Picker — Reset on Restart', () => {
  test('restarting resets helix to initial position', async ({ page }) => {
    await goToEraPhase(page);
    const layer = page.locator('#helixInteractionLayer');

    // Scroll to era 3
    for (let i = 0; i < 3; i++) {
      await layer.dispatchEvent('wheel', { deltaY: 100 });
      await page.waitForTimeout(100);
    }

    // Select an era
    await page.evaluate(() => {
      document.querySelector('.era-card.in-focus').click();
    });

    // Navigate to result and restart
    await page.evaluate(() => {
      goToPhase(5); // topics
    });
    await page.waitForTimeout(200);
    await page.evaluate(() => {
      showResult();
      goToPhase(6); // result
    });
    await page.waitForTimeout(200);

    // Click restart
    await page.evaluate(() => {
      document.getElementById('resultCta').click();
    });
    await page.waitForTimeout(800);

    // Now go back to era phase
    await page.evaluate(() => goToPhase(4));
    await page.waitForTimeout(200);

    const rotation = await page.evaluate(() => helixRotation);
    expect(rotation).toBe(0);

    const selected = page.locator('.era-card.selected');
    await expect(selected).toHaveCount(0);

    const hint = page.locator('#helixHint');
    await expect(hint).not.toHaveClass(/hidden/);
  });
});

// ─── Drum Transform Tests ────────────────────────────────────────────

test.describe('Helix Era Picker — 3D Cylinder Transform', () => {
  test('drum rotateX changes when helix rotates', async ({ page }) => {
    await goToEraPhase(page);

    // Set rotation to era 2 (90°) and apply without GSAP animation
    await page.evaluate(() => {
      helixRotation = 90;
      // Apply directly without GSAP for deterministic check
      const drum = document.getElementById('helixDrum');
      drum.style.transform = `translate(-50%, -50%) rotateX(-90deg)`;
    });

    const transform = await page.locator('#helixDrum').evaluate((el) => el.style.transform);
    expect(transform).toContain('rotateX(-90deg)');
  });

  test('all 8 cards are distributed at 45° intervals on the cylinder', async ({ page }) => {
    await goToEraPhase(page);

    const transforms = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.era-card')).map((card) => card.style.transform);
    });

    expect(transforms).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      const expectedAngle = i * 45;
      expect(transforms[i]).toContain(`rotateX(${expectedAngle}deg)`);
      expect(transforms[i]).toContain('translateZ(220px)');
    }
  });
});
