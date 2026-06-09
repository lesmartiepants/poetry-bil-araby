import { test, expect } from '@playwright/test';

/**
 * First-word flash — in-app reproduction across the timing matrix.
 *
 * Symptom: at the start of a Live recitation the first word lights, goes dark, then
 * lights again — a flash. Cause: before the transcript lands, wordTimings uses the
 * char-count ESTIMATE (word0.start = 0) so word0 lights at once. When the aligned +
 * verse-delayed timing arrives, word0.start jumps forward (verse delay), but the
 * highlight clock is still floored near 0 by the lag offset — so word0 goes dark,
 * then re-lights once playback passes the delay. on -> off -> on.
 *
 * Drives the REAL hook + REAL wordTimings pipeline + REAL DOM via the dev-only debug
 * bridge (localStorage 'ttsHighlightDebug'): the store feeds the estimate->aligned
 * handoff and window.__ttsSetClock controls the playback clock. Runs every timing
 * mode x verse-delay x a couple voices. Asserts NO combo flashes (fails until fixed).
 *
 * Note: voice is orthogonal to this audio-free timing drive (it only changes the TTS
 * audio, not word boundaries) — varied here as requested to confirm the flash, and
 * later the fix, are voice-independent.
 */

const MOCK_POEM = {
  id: 60001,
  poet: 'al-Mutanabbi',
  poetArabic: 'المتنبي',
  title: 'On Ambition',
  titleArabic: 'في الهمة',
  arabic: 'على قدر أهل العزم تأتي العزائم\nوتأتي على قدر الكرام المكارم',
  english: 'Resolve comes in proportion to the people of resolve\nAnd noble deeds come in proportion to the noble',
  tags: ['حكمة'],
  isFromDatabase: true,
};

const MODES = ['even', 'smooth', 'verseLetterWeighted', 'verseSyllableWeighted', 'raw'];
const DELAYS = [0, 125, 250];
const VOICES = ['Charon', 'Kore'];

async function setupMocks(page) {
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/poems/random*', (r) => r.fulfill(json(MOCK_POEM)));
  await page.route('**/api/poets', (r) => r.fulfill(json([{ name: 'المتنبي' }])));
  await page.route('**/api/health', (r) => r.fulfill(json({ status: 'ok', totalPoems: 84329 })));
  await page.route('**/api/ai/models', (r) => r.fulfill(json({ models: [] })));
}

test.describe('first-word flash (timing matrix)', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('hasSeenOnboarding', 'true');
      localStorage.setItem('ttsHighlightDebug', '1');
    });
    await setupMocks(page);
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    const enterBtn = page.locator('button[aria-label="Enter the app"]');
    if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterBtn.click();
      await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
    }
    await page.locator('[data-word-index]').first().waitFor({ state: 'visible', timeout: 15000 });
  });

  test('no first-word flash across modes x delays x voices', async ({ page }) => {
    test.setTimeout(120_000); // 30-combo matrix runs in-page
    const results = await page.evaluate(async ({ MODES, DELAYS, VOICES }) => {
      const store = window.__ttsAudioStore;
      const ui = window.__ttsUIStore;
      const setClock = window.__ttsSetClock;
      if (!store || !setClock) return { error: 'debug bridge missing' };

      const spans = [...document.querySelectorAll('[data-word-index]')]
        .sort((a, b) => Number(a.getAttribute('data-word-index')) - Number(b.getAttribute('data-word-index')));
      const words = spans.map((s) => s.textContent.trim()).filter(Boolean);
      // Realistic transcript: word0 starts at 0 (as a real stream reports), 0.4s/word.
      const aligned = words.map((w, i) => ({ word: w, start: i * 0.4, end: (i + 1) * 0.4 }));

      const frame = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
      const wait = (ms) => new Promise((res) => setTimeout(res, ms));
      const word0El = spans.find((s) => Number(s.getAttribute('data-word-index')) === 0);
      const isActive = () => word0El.classList.contains('tts-active');
      // Wait until a condition holds (sampling per frame), up to a frame budget.
      const until = async (pred, frames = 30) => {
        for (let i = 0; i < frames; i++) { if (pred()) return true; await frame(); }
        return pred();
      };

      const rows = [];
      for (const mode of MODES) {
        for (const delay of DELAYS) {
          for (const voice of VOICES) {
            // Configure this combo. Mode + delay are read from localStorage inside the
            // app's wordTimings memo; voice via the ui store.
            localStorage.setItem('ttsTimingMode', mode);
            localStorage.setItem('ttsVerseDelayMs', String(delay));
            if (ui) ui.setState({ liveVoice: voice });

            // Reset to a clean pre-playback state.
            store.setState({ isPlaying: false });
            await frame();
            setClock(0);
            store.setState({ wordTimings: [] });
            await frame();

            // Continuous per-frame sampler of word0's active state (dedup consecutive).
            const seq = [];
            let sampling = true;
            const push = () => { if (seq.length === 0 || seq[seq.length - 1] !== isActive()) seq.push(isActive()); };
            (async () => { while (sampling) { push(); await frame(); } })();

            // 1) Start on the estimate (word0.start ~ 0), clock floored at 0 → word0 lights.
            store.setState({ isPlaying: true });
            await until(isActive, 12); // wait for the estimate to light word0
            await wait(30);

            // 2) Aligned transcript lands → recompute through mode + verse delay.
            //    With a delay, word0.start jumps ahead of the floored clock.
            store.setState({ wordTimings: aligned });
            await wait(80); await frame();

            // 3) Advance playback past the delay window → word0 should light again.
            setClock(0.4);
            await wait(80); await frame();

            sampling = false;
            store.setState({ isPlaying: false });
            await frame();

            // Flash = an active→inactive edge anywhere in the startup sequence.
            const flashed = seq.some((v, i) => i > 0 && seq[i - 1] === true && v === false);
            rows.push({ mode, delay, voice, seq, flashed });
          }
        }
      }
      return { rows };
    }, { MODES, DELAYS, VOICES });

    expect(results.error, results.error).toBeUndefined();

    // Print the matrix.
    console.log('\n=== first-word flash matrix (mode x delay x voice) ===');
    console.log('mode'.padEnd(22), 'delay'.padEnd(7), 'voice'.padEnd(8), 'seq'.padEnd(22), 'FLASH');
    const flashed = [];
    for (const r of results.rows) {
      const seqStr = `[${r.seq.map((b) => (b ? '1' : '0')).join('')}]`;
      console.log(
        r.mode.padEnd(22),
        String(r.delay).padEnd(7),
        r.voice.padEnd(8),
        seqStr.padEnd(22),
        r.flashed ? '⚠️ FLASH' : 'ok'
      );
      if (r.flashed) flashed.push(`${r.mode}/${r.delay}ms/${r.voice}`);
    }
    console.log(`\n${flashed.length}/${results.rows.length} combos flashed`);
    if (flashed.length) console.log('flashing:', flashed.join(', '));

    expect(flashed, `combos that flash:\n${flashed.join('\n')}`).toEqual([]);
  });
});
