// Round 3 Screenshot Audit -- capture each key flow step for all 23 E2E designs + logos + auth
import { chromium } from 'playwright';
import { mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const DESIGN_DIR = resolve('./design-review');
const OUT_DIR = resolve('./design-review/audit-screenshots');

// 23 E2E flows + 3 logos + 2 auth = 28 total
const E2E_FILES = [
  // Set New (8)
  'e2e/set-new/zen1-refined.html',
  'e2e/set-new/zen2-haiku.html',
  'e2e/set-new/pf2-gold-mystical.html',
  'e2e/set-new/ls1-chiaroscuro.html',
  'e2e/set-new/ls2-ray-tracing.html',
  'e2e/set-new/pf1-calligraphic.html',
  'e2e/set-new/pf3-ink-constellation.html',
  'e2e/set-new/codex-spine-story.html',
  // Set 78ab (5)
  'e2e/set-78ab/e2e-a1-gold-orbit-story.html',
  'e2e/set-78ab/e2e-a2-paper-photon.html',
  'e2e/set-78ab/e2e-a8-deco-discovery.html',
  'e2e/set-78ab/e2e-b8-ritual-spotlight-hybrid.html',
  'e2e/set-78ab/e2e-b10-signature-blend.html',
  // Set c0cf-A (4)
  'e2e/set-c0cf-a/02-zen-manuscript.html',
  'e2e/set-c0cf-a/04-desert-poet.html',
  'e2e/set-c0cf-a/07-scroll-keeper.html',
  'e2e/set-c0cf-a/09-mosaic-discovery.html',
  // Set c0cf-B (6)
  'e2e/set-c0cf-b/01-particle-scroll.html',
  'e2e/set-c0cf-b/04-neumorphic-warmth.html',
  'e2e/set-c0cf-b/05-scroll-codex.html',
  'e2e/set-c0cf-b/07-particle-neumorphic.html',
  'e2e/set-c0cf-b/08-zen-spotlight.html',
  'e2e/set-c0cf-b/09-scandinavian-scroll.html',
];

const STATIC_FILES = [
  'branding/logo-option-1-canonical.html',
  'branding/logo-option-2-gold-accent.html',
  'branding/logo-option-4-minimal.html',
  'auth/e2e-auth-sso-flow.html',
  'auth/e2e-auth-signout-flow.html',
];

// CLI arg for batch selection: node screenshot-audit.mjs [batch]
// batch: "all" | "set-new" | "set-78ab" | "set-c0cf-a" | "set-c0cf-b" | "static"
const batchArg = process.argv[2] || 'all';

function getFileList() {
  if (batchArg === 'all') return [...E2E_FILES, ...STATIC_FILES];
  if (batchArg === 'static') return STATIC_FILES;
  if (batchArg === 'set-new') return E2E_FILES.filter(f => f.includes('set-new'));
  if (batchArg === 'set-78ab') return E2E_FILES.filter(f => f.includes('set-78ab'));
  if (batchArg === 'set-c0cf-a') return E2E_FILES.filter(f => f.includes('set-c0cf-a'));
  if (batchArg === 'set-c0cf-b') return E2E_FILES.filter(f => f.includes('set-c0cf-b'));
  return [...E2E_FILES, ...STATIC_FILES];
}

const CTA_SELECTORS = [
  '#splashCta', '#splashEnter', '#enterBtn', '#ctaEnter',
  '.splash-cta', '.splash-enter', '.cta-enter', '.enter-btn', '.cta-btn',
  'button:has-text("Begin")', 'button:has-text("Enter")', 'button:has-text("Start")',
  'button:has-text("Open")', 'button:has-text("Step Into")', 'button:has-text("Explore")',
  'button:has-text("\u0627\u0628\u062F\u0623")',
  'button:has-text("\u0627\u062F\u062E\u0644")',
  'button:has-text("\u0627\u0641\u062A\u062D")',
  'button:has-text("\u0627\u0628\u062F\u0623 \u0627\u0644\u0631\u062D\u0644\u0629")',
  'button:has-text("\u0627\u062F\u062E\u0644 \u0627\u0644\u062A\u0637\u0628\u064A\u0642")',
];

async function captureFlowScreenshots(context, file) {
  const fullPath = resolve(DESIGN_DIR, file);
  if (!existsSync(fullPath)) {
    console.log('SKIP (not found): ' + file);
    return 0;
  }

  const prefix = file.replace(/\//g, '--').replace('.html', '');
  const page = await context.newPage();
  let count = 0;

  try {
    await page.goto('file://' + fullPath, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2500);

    // 1: SPLASH
    await page.screenshot({ path: resolve(OUT_DIR, prefix + '--1-splash.png'), fullPage: false });
    count++;
    console.log('  [1/4] splash: ' + basename(file));

    // Click CTA to advance past splash
    let clickedCta = false;
    for (const sel of CTA_SELECTORS) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 300 })) {
          await btn.click();
          clickedCta = true;
          await page.waitForTimeout(1500);
          break;
        }
      } catch {}
    }
    if (!clickedCta) await page.waitForTimeout(4000);

    // 2: ONBOARDING
    await page.screenshot({ path: resolve(OUT_DIR, prefix + '--2-onboarding.png'), fullPage: false });
    count++;
    console.log('  [2/4] onboarding: ' + basename(file));

    // Try onboarding advancement buttons first
    for (const sel of [
      '.onboarding-dots + button', 'button:has-text("Next")',
      'button:has-text("\u0627\u0644\u062A\u0627\u0644\u064A")',
      '.ob-advance', '.walk-hint', '.onboarding-btn'
    ]) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 300 })) {
          await btn.click();
          await page.waitForTimeout(600);
        }
      } catch {}
    }

    // Advance through onboarding by tapping center
    for (let i = 0; i < 12; i++) {
      try {
        const wt = page.locator('#walkthrough, .walkthrough, .onboarding-overlay').first();
        if (await wt.isVisible({ timeout: 300 })) {
          await wt.click({ position: { x: 196, y: 426 } });
          await page.waitForTimeout(600);
        } else break;
      } catch { break; }
    }

    // Click finish buttons
    for (const sel of [
      'button:has-text("Begin Reading")', 'button:has-text("Explore")',
      'button:has-text("Start")', 'button:has-text("Enter")',
      'button:has-text("tap to turn page")', 'button:has-text("TAP ANYWHERE")',
      '.ob-finish', '.walkthrough-finish', '.ob-advance', '.walk-hint', '.onboarding-btn'
    ]) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 300 })) {
          await btn.click();
          await page.waitForTimeout(1200);
          break;
        }
      } catch {}
    }

    await page.waitForTimeout(800);

    // 3: MAIN APP
    await page.screenshot({ path: resolve(OUT_DIR, prefix + '--3-main-app.png'), fullPage: false });
    count++;
    console.log('  [3/4] main-app: ' + basename(file));

    // Try to reveal controls
    try { await page.click('body', { position: { x: 196, y: 800 } }); await page.waitForTimeout(600); } catch {}
    for (const sel of [
      '#sheetHandle', '#fanTrigger', '#glassSheet', '#decoFan', '#waveTrigger',
      '#wabiDot', '#maTouchZone',
      '.wabi-dot', '.text-menu-trigger', '.ma-touch-zone',
      '.glass-sheet-handle', '.deco-fan-trigger', '.wave-trigger',
      '.muji-circle', '.page-tab', '.nord-dot', '.ctrl-btn'
    ]) {
      try {
        const t = page.locator(sel).first();
        if (await t.isVisible({ timeout: 200 })) {
          await t.click();
          await page.waitForTimeout(600);
          break;
        }
      } catch {}
    }

    // 4: CONTROLS
    await page.screenshot({ path: resolve(OUT_DIR, prefix + '--4-controls.png'), fullPage: false });
    count++;
    console.log('  [4/4] controls: ' + basename(file));

  } catch (err) {
    console.log('ERR: ' + file + ' - ' + err.message);
  }

  await page.close();
  return count;
}

async function captureStaticScreenshot(context, file) {
  const fullPath = resolve(DESIGN_DIR, file);
  if (!existsSync(fullPath)) {
    console.log('SKIP (not found): ' + file);
    return;
  }

  const prefix = file.replace(/\//g, '--').replace('.html', '');
  const page = await context.newPage();

  try {
    await page.goto('file://' + fullPath, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: resolve(OUT_DIR, prefix + '.png'), fullPage: false });
    console.log('OK: ' + basename(file));
  } catch (err) {
    console.log('ERR: ' + file + ' - ' + err.message);
  }

  await page.close();
}

function basename(f) { return f.split('/').pop(); }

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
  });

  const files = getFileList();
  console.log('Processing ' + files.length + ' files (batch: ' + batchArg + ')\n');

  let total = 0;
  for (const file of files) {
    if (E2E_FILES.includes(file)) {
      total += await captureFlowScreenshots(context, file);
    } else {
      await captureStaticScreenshot(context, file);
      total++;
    }
  }

  await browser.close();
  console.log('\nDone: ' + total + ' screenshots captured in ' + OUT_DIR);
}

main().catch(console.error);
