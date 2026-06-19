import { test, expect } from '@playwright/test';

/**
 * Reader-follows-recitation — USER-EXPERIENCE QA harness.
 *
 * Runs the REAL advancing wall-clock (playback elapses in real seconds from "play")
 * and the live transcript handoff (estimate → aligned), then verifies the thing that
 * actually matters: the highlighted word matches the word being recited.
 *
 * Ground truth: the aligned transcript IS the model's report of which word it said and
 * when. So "recited at time t" = the aligned-window word at the playhead. Each combo
 * (timing mode × voice) runs in its OWN fresh page so nothing bleeds between runs.
 *
 * Asserts, against that truth:
 *   1) no flash — no word lights more than once,
 *   2) the highlight never RACES ahead of the audio (≥2 words ahead),
 *   3) never stuck ≥3 words behind,
 *   4) no multi-word backward jump,
 *   5) on the right word (±1) for the large majority of samples, and progresses.
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

const MODES = ['even', 'verseLetterWeighted', 'verseSyllableWeighted'];
const VOICES = ['Charon', 'Kore'];
const DELAY_MS = 125;
const SEC_PER_WORD = 0.45;

async function setupMocks(page) {
  const json = (body) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  await page.route('**/api/poems/random*', (r) => r.fulfill(json(MOCK_POEM)));
  await page.route('**/api/poets', (r) => r.fulfill(json([{ name: 'المتنبي' }])));
  await page.route('**/api/health', (r) => r.fulfill(json({ status: 'ok', totalPoems: 84329 })));
  await page.route('**/api/ai/models', (r) => r.fulfill(json({ models: [] })));
}

// One fresh page per combo → no carousel drift, no wall-clock bleed.
for (const mode of MODES) {
  for (const voice of VOICES) {
    test(`highlight tracks recited word — ${mode} / ${voice}`, async ({ page }) => {
      await page.addInitScript(({ mode, voice, DELAY_MS }) => {
        localStorage.setItem('hasSeenOnboarding', 'true');
        localStorage.setItem('ttsHighlightDebug', '1');
        localStorage.setItem('ttsTimingMode', mode);
        localStorage.setItem('ttsVerseDelayMs', String(DELAY_MS));
        window.__qaVoice = voice;
      }, { mode, voice, DELAY_MS });
      await setupMocks(page);
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      const enterBtn = page.locator('button[aria-label="Enter the app"]');
      if (await enterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await enterBtn.click();
        await enterBtn.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
      }
      await page.locator('[data-word-index]').first().waitFor({ state: 'visible', timeout: 15000 });

      const r = await page.evaluate(async ({ SEC_PER_WORD }) => {
        const store = window.__ttsAudioStore;
        const ui = window.__ttsUIStore;
        const startWallClock = window.__ttsStartWallClock;
        const getElapsed = window.__ttsGetElapsed;
        if (!store || !startWallClock || !getElapsed) return { error: 'debug bridge missing' };
        if (ui && window.__qaVoice) ui.setState({ liveVoice: window.__qaVoice });

        // The active poem's words — the only spans that get highlighted. Scope the
        // index space to exactly these so an audio-truth index maps 1:1.
        const spans = [...document.querySelectorAll('[data-word-index]')]
          .map((s) => ({ idx: Number(s.getAttribute('data-word-index')), el: s }))
          .sort((a, b) => a.idx - b.idx);
        const N = spans.length;
        const words = spans.map((s) => s.el.textContent.trim());
        const idxSet = new Set(spans.map((s) => s.idx));
        const spw = SEC_PER_WORD;
        const aligned = spans.map((s, i) => ({ word: words[i], start: i * spw, end: (i + 1) * spw }));
        const audioWordAt = (t) => (t < 0 ? -1 : Math.min(Math.floor(t / spw), N - 1));
        const highlightedIdx = () => {
          const els = document.querySelectorAll('[data-word-index].tts-active');
          let min = -1;
          els.forEach((e) => {
            const i = Number(e.getAttribute('data-word-index'));
            if (idxSet.has(i) && (min === -1 || i < min)) min = i;
          });
          return min;
        };
        const wait = (ms) => new Promise((res) => setTimeout(res, ms));

        store.setState({ isPlaying: false, wordTimings: [] });
        await wait(60);

        // "Play": real clock starts; estimate only (transcript not yet arrived).
        startWallClock();
        store.setState({ wordTimings: [], isPlaying: true });

        const samples = [];
        const activations = new Map();
        let prevHi = -1, pushedAligned = false;
        const t0 = performance.now();
        while (performance.now() - t0 < 1500) {
          if (!pushedAligned && performance.now() - t0 >= 250) {
            store.setState({ wordTimings: aligned });
            pushedAligned = true;
          }
          const elapsed = getElapsed();
          const hi = highlightedIdx();
          if (hi !== prevHi) {
            if (hi >= 0) activations.set(hi, (activations.get(hi) || 0) + 1);
            prevHi = hi;
          }
          samples.push({ elapsed: Number(elapsed.toFixed(3)), audio: audioWordAt(elapsed), hi });
          await wait(25);
        }
        store.setState({ isPlaying: false });

        const reLit = [...activations.entries()].filter(([, n]) => n > 1).map(([i]) => i);
        let maxLead = 0, maxLag = 0, maxBackJump = 0, backCount = 0, within1 = 0, evaluated = 0;
        let prev = -1;
        for (const s of samples) {
          if (s.hi < 0) continue;
          if (prev >= 0 && s.hi < prev) { backCount++; maxBackJump = Math.max(maxBackJump, prev - s.hi); }
          prev = s.hi;
          if (s.elapsed >= N * spw) continue;
          evaluated++;
          const delta = s.hi - s.audio;
          if (delta > 0) maxLead = Math.max(maxLead, delta);
          if (delta < 0) maxLag = Math.max(maxLag, -delta);
          if (Math.abs(delta) <= 1) within1++;
        }
        return {
          N,
          reLit, maxLead, maxLag, maxBackJump, backCount,
          within1Pct: evaluated ? Math.round((within1 / evaluated) * 100) : 0,
          activeWords: activations.size,
        };
      }, { SEC_PER_WORD });

      expect(r.error, r.error).toBeUndefined();
      console.log(
        `[${mode}/${voice}] N=${r.N} reLit=[${r.reLit.join(',')}] maxLead=${r.maxLead} ` +
        `maxLag=${r.maxLag} backJump=${r.maxBackJump}(x${r.backCount}) within1=${r.within1Pct}% words=${r.activeWords}`
      );

      // The reader follows the recitation:
      expect(r.reLit, 'a word lit more than once (flash)').toEqual([]);
      expect(r.maxLead, 'highlight raced ≥2 words ahead of the audio').toBeLessThanOrEqual(1);
      expect(r.maxLag, 'highlight fell ≥3 words behind the audio').toBeLessThanOrEqual(2);
      expect(r.maxBackJump, 'highlight jumped backward more than one word').toBeLessThanOrEqual(1);
      expect(r.within1Pct, 'highlight off by >1 word too often').toBeGreaterThanOrEqual(85);
      expect(r.activeWords, 'highlight never advanced past the first word').toBeGreaterThan(1);
    });
  }
}
