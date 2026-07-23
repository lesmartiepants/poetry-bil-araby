import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
mkdirSync('/tmp/screenshots', { recursive: true });

// Seed poem must include ALL fields the app expects, including poetArabic
const SEED_POEM = {
  id: 'seed-1',
  arabic: 'أَلا لَيتَ الشَّبابَ يَعودُ يَوماً\nفَأُخبِرَهُ بِما فَعَلَ المَشيبُ\nتَمَنّى المَرءُ في الصِّبا طِوالاً\nفَلَمّا نالَهُ أَبكى وَخابا',
  english: 'Oh, if only youth would return one day\nThat I might tell it what old age has done\nIn youth a man wishes for endless days\nBut when he gains them, weeps — the hope undone',
  poet: 'أبو تمام',
  poetArabic: 'أبو تمام',
  poetEnglish: 'Abu Tammam',
  title: 'شكوى الشيب',
  category: 'classical',
  isFromDatabase: true,
};

// Return an array of similar poems for the carousel (different IDs)
const CAROUSEL_POEMS = ['seed-2', 'seed-3', 'seed-4'].map((id, i) => ({
  ...SEED_POEM,
  id,
  arabic: SEED_POEM.arabic,
}));

async function shoot({ name, lightMode = false }) {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();

  let callCount = 0;
  await page.route('**/api/**', route => {
    const url = route.request().url();
    if (url.includes('/api/poems/random')) {
      // Return different IDs each call so carousel dedup doesn't skip them
      const poem = CAROUSEL_POEMS[callCount % CAROUSEL_POEMS.length] || SEED_POEM;
      callCount++;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(poem) });
    }
    if (url.includes('/api/poets')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'أبو تمام', poem_count: 42 }]) });
    if (url.includes('/api/health')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', poemCount: 84000 }) });
    return route.continue();
  });

  await page.goto('http://localhost:5050/', { waitUntil: 'load' });
  await page.evaluate((lm) => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    sessionStorage.setItem('hasSeenOnboarding', 'true');
    if (lm) localStorage.setItem('theme', 'light');
  }, lightMode);
  await page.reload({ waitUntil: 'load' });

  // Wait generously for poem load + carousel population + GSAP animations
  await page.waitForTimeout(8000);

  // Close debug panel by clicking × button
  await page.mouse.click(289, 352);
  await page.waitForTimeout(400);

  // Force all GSAP inline opacity=0 to visible via JS
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      if (el.style?.opacity === '0') el.style.opacity = '1';
      if (el.style?.filter?.includes('blur')) el.style.filter = 'none';
    });
  });
  await page.waitForTimeout(300);

  const pCount = await page.evaluate(() => document.querySelectorAll('p').length);
  console.log(`Paragraph count for ${name}:`, pCount);

  await page.screenshot({ path: `/tmp/screenshots/${name}.png` });
  console.log('Saved:', name);
  await browser.close();
}

await shoot({ name: 'aurora-dark', lightMode: false });
await shoot({ name: 'aurora-light', lightMode: true });
console.log('Done');
