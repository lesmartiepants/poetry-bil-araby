// Phase 4: Screenshot audit -- take screenshots of all polished designs at iPhone 15 Pro (393x852)
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { resolve, basename } from 'path';

const DESIGN_DIR = resolve('./design-review');
const OUT_DIR = resolve('./design-review/audit-screenshots');

// All polished files (27 kept designs + 5 logos + 2 auth E2E = 34 total)
const FILES = [
  // Branding (5)
  'branding/logo-option-1-canonical.html',
  'branding/logo-option-2-gold-accent.html',
  'branding/logo-option-3-calligraphic.html',
  'branding/logo-option-4-minimal.html',
  'branding/logo-option-5-illuminated.html',
  // Splash -> E2E (6)
  'splash/particles/previews/option-2-gold-mystical.html',
  'splash/particles/previews/option-3-minimal-constellation.html',
  'splash/zen/previews/option-1-refined.html',
  'splash/zen/previews/option-2-haiku.html',
  'splash/light/previews/option-1-improved-chiaroscuro.html',
  'splash/light/previews/option-3-minimal-ray-tracing.html',
  // Controls (3)
  'controls/notion/vertical-controls-option3-notion.html',
  'controls/brutalist/vertical-controls-option4-wildcard.html',
  'controls/neumorphic/vertical-controls-option6-neumorphic.html',
  // E2E set-78ab (6)
  'e2e/set-78ab/e2e-a1-gold-orbit-story.html',
  'e2e/set-78ab/e2e-a2-paper-photon.html',
  'e2e/set-78ab/e2e-a3-ink-mono-archive.html',
  'e2e/set-78ab/e2e-a8-deco-discovery.html',
  'e2e/set-78ab/e2e-b8-ritual-spotlight-hybrid.html',
  'e2e/set-78ab/e2e-b10-signature-blend.html',
  // E2E set-c0cf-A (5)
  'e2e/set-c0cf-a/02-zen-manuscript.html',
  'e2e/set-c0cf-a/04-desert-poet.html',
  'e2e/set-c0cf-a/07-scroll-keeper.html',
  'e2e/set-c0cf-a/09-mosaic-discovery.html',
  'e2e/set-c0cf-a/10-calligraphy-flow.html',
  // E2E set-c0cf-B (7)
  'e2e/set-c0cf-b/01-particle-scroll.html',
  'e2e/set-c0cf-b/04-neumorphic-warmth.html',
  'e2e/set-c0cf-b/05-scroll-codex.html',
  'e2e/set-c0cf-b/07-particle-neumorphic.html',
  'e2e/set-c0cf-b/08-zen-spotlight.html',
  'e2e/set-c0cf-b/09-scandinavian-scroll.html',
  'e2e/set-c0cf-b/10-ethereal-constellation.html',
  // Auth E2E (2)
  'auth/e2e-auth-sso-flow.html',
  'auth/e2e-auth-signout-flow.html',
];

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
  });

  let count = 0;
  for (const file of FILES) {
    const fullPath = resolve(DESIGN_DIR, file);
    if (!existsSync(fullPath)) {
      console.log(`SKIP (not found): ${file}`);
      continue;
    }

    const page = await context.newPage();
    const url = `file://${fullPath}`;

    try {
      await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
      // Wait for animations to settle (splash screens have animations)
      await page.waitForTimeout(3000);

      // Try clicking skip/enter buttons if they exist
      try {
        const skipBtn = page.locator('button:has-text("skip"), button:has-text("تخطّي"), button:has-text("Skip"), [aria-label*="skip" i]').first();
        if (await skipBtn.isVisible({ timeout: 500 })) {
          await skipBtn.click();
          await page.waitForTimeout(1500);
        }
      } catch {}

      // Try clicking CTA / enter buttons
      try {
        const enterBtn = page.locator('button:has-text("ابدأ"), button:has-text("Enter"), button:has-text("Begin"), button:has-text("Start"), .cta-btn, .enter-btn').first();
        if (await enterBtn.isVisible({ timeout: 500 })) {
          await enterBtn.click();
          await page.waitForTimeout(1500);
        }
      } catch {}

      const screenshotName = file.replace(/\//g, '--').replace('.html', '.png');
      await page.screenshot({ path: resolve(OUT_DIR, screenshotName), fullPage: false });
      count++;
      console.log(`OK: ${file} -> ${screenshotName}`);
    } catch (err) {
      console.log(`ERR: ${file} - ${err.message}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone: ${count}/${FILES.length} screenshots captured in ${OUT_DIR}`);
}

main().catch(console.error);
