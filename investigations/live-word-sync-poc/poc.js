import { activeIndexAt, applyFutureAnchor, buildPlan } from './future-anchor-planner.mjs';

const API_BASE = new URLSearchParams(location.search).get('api') || '';
const SAMPLE_RATE = 24_000;
const pullPoemButton = document.querySelector('#pull-poem');
const testMethodButton = document.querySelector('#test-method');
const stopTestButton = document.querySelector('#stop-test');
const modeLab = document.querySelector('#mode-lab');
const metrics = document.querySelector('#metrics');
const poem = document.querySelector('#poem');
const title = document.querySelector('#title');
const byline = document.querySelector('#byline');
const arabic = document.querySelector('#arabic');
const download = document.querySelector('#download');
const downloadAudit = document.querySelector('#download-audit');
const modeInputs = [...document.querySelectorAll('input[name="mode"]')];
const RETAINED_METHODS = new Set([
  'transcript-moras-weighted-fallback',
  'transcript-mora-blend-50',
  'transcript-mora-blend-75',
  'branch-transcript-moras',
  'branch-transcript-letters',
  'transcript-mora-blend-25',
  'transcript-mora-blend-50-weighted-fallback',
  'transcript-mora-final',
  'transcript-anchor-observe',
  'transcript-anchor-correct',
  'google-anchor-observe',
  'google-anchor-correct',
  'ctc-anchor-observe',
  'ctc-anchor-correct',
  'ctc-precision-phrase',
]);
const modeNote = document.querySelector('#mode-note');
const providerStatus = document.querySelector('#provider-status');
const nudgeValue = document.querySelector('#nudge-value');
const nudgeInput = document.querySelector('#nudge');
const labView = document.querySelector('#lab-view');
const runsView = document.querySelector('#runs-view');
const showLabButton = document.querySelector('#show-lab');
const showRunsButton = document.querySelector('#show-runs');
const discoveryGoal = document.querySelector('#discovery-goal');
const startDiscoveryButton = document.querySelector('#start-discovery');
const discoveryStatus = document.querySelector('#discovery-status');
const discoveryResults = document.querySelector('#discovery-results');
const copyDiscoveryBriefButton = document.querySelector('#copy-discovery-brief');
const copyCodexWorkshopButton = document.querySelector('#copy-codex-workshop');

// Keep historical profiles and their immutable reports reproducible. The active lab exposes the
// retained portfolio plus explicit anchor/CTC comparison modes; archived profiles remain invocable
// only by explicit CLI method name.
for (const input of modeInputs) {
  if (!RETAINED_METHODS.has(input.value)) input.closest('label')?.setAttribute('hidden', '');
}
document.querySelector('input[value="branch-transcript-moras"]')?.click();

let audioContext;
let currentDemo;
let loadedPoem;
let harnessConfig;
let visualNudgeSeconds = 0;
let isTesting = false;
let discoveryIdeas = [];
let selectedDiscoveryIdea;
let activeRunVideo;
let runVideoObserver;

const DISCOVERY_LENSES = [
  {
    name: 'real-time audio systems engineer',
    focus:
      'Borrow from media playout, jitter buffers, clock recovery, phase-locked loops, and online signal processing. Keep first audio fast.',
  },
  {
    name: 'Arabic speech-alignment researcher',
    focus:
      'Reason about Arabic orthography, recitation prosody, ASR/forced alignment, phoneme-duration priors, and cues available only after audio has begun.',
  },
  {
    name: 'perceptual interaction designer',
    focus:
      'Seek UX designs that make imperfect alignment feel honest and comfortable: grouping, anticipation, progressive certainty, or reader control.',
  },
  {
    name: 'cross-domain research scout',
    focus:
      'Use analogies from karaoke, captioning, language learning, live translation, music-following, teleprompters, and accessibility. Propose exact research questions to verify before coding.',
  },
];

const DISCOVERY_FOCUS = {
  broad:
    'Find approaches that are qualitatively different from changing a word-clock rate or fixed offset.',
  alignment:
    'Prioritize cues that improve alignment after playback begins without delaying the first audible PCM.',
  perception:
    'Prioritize perceptual robustness when exact word timing cannot be known immediately.',
  architecture:
    'Prioritize a shippable hybrid architecture with clear client/server boundaries and graceful fallbacks.',
};

const modeNotes = {
  'main-char-650':
    'Faithful main baseline: raw JavaScript character count, a 650 ms-per-word whole-poem estimate, and a wall-clock visual cursor.',
  'branch-transcript-raw':
    'Timing-branch raw option: consume Gemini Live transcript-fragment spans as they arrive, use the content playhead, and delay the visual clock by 250 ms.',
  'branch-transcript-even':
    'Timing-branch even option: when a full verse is transcript-anchored, spread its words uniformly across that measured span; otherwise retain raw fragment timing.',
  'branch-transcript-letters':
    'Timing-branch verse-plus-letters option: when a full verse is transcript-anchored, allocate its measured span by raw Arabic character count.',
  'branch-transcript-moras':
    'Timing-branch verse-plus-syllables option: when a full verse is transcript-anchored, allocate its measured span using a tashkeel-aware mora prior.',
  'transcript-mora-blend-25':
    'Allocation sweep: retain 75% even verse timing and add 25% tashkeel-aware mora mass only after a whole source verse is anchored.',
  'transcript-mora-blend-50':
    'Allocation sweep: divide each transcript-anchored verse span with an equal blend of even words and tashkeel-aware mora mass.',
  'transcript-even-weighted-fallback':
    'Hybrid timing: use the Arabic-weighted word clock until a transcript-anchored verse is usable, then replace that region with even measured-span timing.',
  'transcript-mora-blend-50-weighted-fallback':
    'Hybrid timing: use the Arabic-weighted word clock until a transcript-anchored verse is usable, then replace that region with a 50% even/mora allocation.',
  'transcript-moras-weighted-fallback':
    'Hybrid timing: use the Arabic-weighted word clock until a transcript-anchored verse is usable, then replace that region with full mora allocation.',
  'transcript-mora-blend-75':
    'Allocation sweep: retain 25% even verse timing and add 75% tashkeel-aware mora mass only after a whole source verse is anchored.',
  'transcript-mora-final':
    'Hypothesis trial: retain mora-weighted transcript-anchored verse timing, but reserve 1.25× mora mass for its final lexical word. It activates only after every word in the verse has an anchor.',
  'transcript-anchor-observe':
    'Anchor-contract prototype: existing Gemini transcript timings are mapped as delayed anchors and measured against the immediate weighted/mora fallback, but never alter the visible cursor.',
  'transcript-anchor-correct':
    'Anchor-contract prototype: delayed Gemini transcript timings may make a bounded, future-only correction to the immediate weighted/mora plan. It rejects late, active, and contradictory anchors; this validates the CTC integration contract, not CTC accuracy.',
  'google-anchor-observe':
    'Live sidecar prototype: stream the same PCM to Google Chirp, record word anchors and their usefulness, but never change the visible production-equivalent fallback cursor.',
  'google-anchor-correct':
    'Live sidecar prototype: Google Chirp word anchors can apply bounded, future-only corrections to the production-equivalent fallback. This proves the sidecar contract and safety controls, not CTC quality.',
  'ctc-anchor-observe':
    'Local CTC sidecar: tee scheduled PCM to the persistent Arabic CTC worker, record its past-word anchors and timing, but never alter the visible production-equivalent fallback.',
  'ctc-anchor-correct':
    'Local CTC sidecar: apply only the persistent worker’s timely, monotonic past-word anchors as bounded future-only corrections. Any late, uncertain, or contradictory anchor is a no-op.',
  'ctc-precision-phrase':
    'Precision Recitation: buffer the opening phrase while a warm local CTC worker aligns it. If every opening word is ready before the bounded deadline, use those direct timings before audio begins; otherwise start Mora 50 unchanged.',
  'certainty-overlay-transcript-moras':
    'UX-only: preserves transcript-mora word timing while softly contextualizing the current source line and previewing the next line up to 900 ms before its estimated start, upgraded to an observed transcript start when available.',
  'nucleus-clock':
    'Acoustic hypothesis: after PCM is scheduled, causal energy-nucleus events advance a monotonic cursor over an Arabic mora proxy. It uses neither transcript timing nor VAD pauses.',
  weighted:
    'Best zero-cost word estimate: Arabic letter length and punctuation set the visual pace.',
  uniform:
    'Baseline comparison: every word receives the same share of the estimated speaking time.',
  phrase: 'Safer UX when word timing is uncertain: highlight a whole source verse at a time.',
  vad: 'Uses detected quiet periods in the actual PCM stream to re-anchor upcoming verse timing. It cannot identify words inside speech.',
  google:
    'Sends the same PCM to Google Chirp 3. Final Arabic transcript timing re-anchors phrases without delaying first audio; it does not provide streaming word offsets.',
  'uniform-slow': 'Uniform clock with a slower calibrated word rate.',
  'uniform-fast': 'Uniform clock with a faster calibrated word rate.',
  'weighted-slow': 'Arabic-weighted clock with a slower character-mass rate.',
  'weighted-fast': 'Arabic-weighted clock with a faster character-mass rate.',
  'weighted-lead': 'Arabic-weighted clock advanced by 200 ms.',
  'weighted-lag': 'Arabic-weighted clock delayed by 200 ms.',
  'weighted-rate-5-6': 'Arabic-weighted clock with a slightly slower 5.6 character-mass rate.',
  'weighted-rate-6-0': 'Arabic-weighted clock with a slightly faster 6.0 character-mass rate.',
  'weighted-lead-50': 'Arabic-weighted clock advanced by 50 ms.',
  'weighted-lag-50': 'Arabic-weighted clock delayed by 50 ms.',
  'weighted-lead-100': 'Arabic-weighted clock advanced by 100 ms.',
  'weighted-lag-100': 'Arabic-weighted clock delayed by 100 ms.',
  'weighted-lead-75': 'Arabic-weighted clock advanced by 75 ms.',
  'weighted-lead-125': 'Arabic-weighted clock advanced by 125 ms.',
  'weighted-lead-150': 'Arabic-weighted clock advanced by 150 ms.',
  'weighted-lead-175': 'Arabic-weighted clock advanced by 175 ms.',
  'weighted-lead-225': 'Arabic-weighted clock advanced by 225 ms.',
  phonetic: 'Arabic phonetic-mass clock: long vowels, shadda, and punctuation receive extra time.',
  verse:
    'A separate weighted clock for each verse, preventing drift from accumulating across lines.',
  'verse-pause-250': 'Verse-local weighted clock with a 250 ms predicted pause between lines.',
  pause: 'Verse-local clock with predicted pauses reserved between lines.',
  'vad-sensitive': 'VAD verse re-anchoring with a shorter, more sensitive pause detector.',
  'vad-conservative': 'VAD verse re-anchoring with a longer, conservative pause detector.',
  'vad-slew':
    'A cautious VAD phase-lock loop: detected verse pauses can correct the next local clock by at most 140 ms.',
  'vad-slew-60':
    'Conservative VAD phase lock: detected verse pauses can correct the next local clock by at most 60 ms.',
  'vad-slew-220':
    'Permissive VAD phase lock: detected verse pauses can correct the next local clock by at most 220 ms.',
  'agreement-window':
    'Uses a firm word only when letter and phonetic clocks agree; otherwise shows a soft two-word reading window.',
  'agreement-strict-2':
    'Uses a firm word only when the letter and phonetic clocks differ by no more than two words; otherwise shows a soft two-word reading window.',
  'agreement-strict-3':
    'Uses a firm word only when the letter and phonetic clocks differ by no more than two words; otherwise shows a soft three-word reading window.',
};

const PROFILES = {
  // Baseline from main: computeWordTimings(allWords, allWords.length * 0.65),
  // driven by wall time while a Live stream has no decoded player buffer.
  'main-char-650': { family: 'word', mass: 'main-raw-char', durationPerWord: 0.65, nudgeMs: 0 },
  // These reproduce the timing branch's architectural inputs without importing its
  // reader highlighter: Live transcript-fragment spans, content time (not stream
  // underrun time), and the branch's 250 ms visual lag. The verse schedules are
  // deliberately applied only after their full verse has timing anchors, which
  // makes the comparison conservative and observable in the audit ledger.
  'branch-transcript-raw': {
    family: 'live-transcript',
    schedule: 'raw',
    durationPerWord: 0.65,
    nudgeMs: -250,
  },
  'branch-transcript-even': {
    family: 'live-transcript',
    schedule: 'even',
    durationPerWord: 0.65,
    nudgeMs: -250,
  },
  'branch-transcript-letters': {
    family: 'live-transcript',
    schedule: 'letters',
    durationPerWord: 0.65,
    nudgeMs: -250,
  },
  'branch-transcript-moras': {
    family: 'live-transcript',
    schedule: 'moras',
    durationPerWord: 0.65,
    nudgeMs: -250,
  },
  'transcript-mora-blend-25': {
    family: 'live-transcript',
    schedule: 'mora-blend',
    moraBlend: 0.25,
    durationPerWord: 0.65,
    nudgeMs: -250,
    requireFullSegment: true,
  },
  'transcript-mora-blend-50': {
    family: 'live-transcript',
    schedule: 'mora-blend',
    moraBlend: 0.5,
    durationPerWord: 0.65,
    nudgeMs: -250,
    requireFullSegment: true,
  },
  'transcript-even-weighted-fallback': {
    family: 'live-transcript',
    schedule: 'even',
    durationPerWord: 0.65,
    nudgeMs: -250,
    fallbackMode: 'weighted',
  },
  'transcript-mora-blend-50-weighted-fallback': {
    family: 'live-transcript',
    schedule: 'mora-blend',
    moraBlend: 0.5,
    durationPerWord: 0.65,
    nudgeMs: -250,
    requireFullSegment: true,
    fallbackMode: 'weighted',
  },
  'transcript-moras-weighted-fallback': {
    family: 'live-transcript',
    schedule: 'moras',
    durationPerWord: 0.65,
    nudgeMs: -250,
    fallbackMode: 'weighted',
  },
  'transcript-mora-blend-75': {
    family: 'live-transcript',
    schedule: 'mora-blend',
    moraBlend: 0.75,
    durationPerWord: 0.65,
    nudgeMs: -250,
    requireFullSegment: true,
  },
  'transcript-mora-final': {
    family: 'live-transcript',
    schedule: 'moras-final',
    durationPerWord: 0.65,
    nudgeMs: -250,
    finalWeight: 1.25,
    requireFullSegment: true,
  },
  'transcript-anchor-observe': {
    family: 'future-anchor',
    anchorMode: 'observe',
    anchorSource: 'gemini-output-audio-transcript-surrogate',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'transcript-anchor-correct': {
    family: 'future-anchor',
    anchorMode: 'correct',
    anchorSource: 'gemini-output-audio-transcript-surrogate',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'google-anchor-observe': {
    family: 'future-anchor',
    anchorMode: 'observe',
    anchorProvider: 'google',
    anchorSource: 'google-chirp-3-streaming',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'google-anchor-correct': {
    family: 'future-anchor',
    anchorMode: 'correct',
    anchorProvider: 'google',
    anchorSource: 'google-chirp-3-streaming',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'ctc-anchor-observe': {
    family: 'future-anchor',
    anchorMode: 'observe',
    anchorProvider: 'ctc',
    anchorSource: 'local-arabic-ctc-worker',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'ctc-anchor-correct': {
    family: 'future-anchor',
    anchorMode: 'correct',
    anchorProvider: 'ctc',
    anchorSource: 'local-arabic-ctc-worker',
    fallbackMode: 'weighted',
    durationPerWord: 0.65,
    nudgeMs: -250,
    correctionCapMs: 120,
    correctionRejectMs: 400,
    futureHorizonMs: 150,
    horizonWords: 6,
    safePastWords: 1,
  },
  'ctc-precision-phrase': {
    family: 'precision-ctc',
    anchorProvider: 'ctc',
    anchorSource: 'local-arabic-ctc-worker',
    fallbackMode: 'transcript-mora-blend-50-weighted-fallback',
    phraseWordCount: 6,
    alignmentWordCount: 6,
    // Include the worker's 750 ms commit lag after a six-word phrase; 7 s
    // proved too tight for the phrase-final word and stalled range rotation.
    phraseWindowMs: 8_000,
    minBufferedAudioMs: 1_500,
    // The first stable six-word phrase currently arrives in ~3.4 s after the
    // first PCM on this warm local worker. This is deliberately a precision
    // experiment, not the instant path; the dogfood report decides whether the
    // extra pre-roll earns its keep.
    startupDeadlineMs: 4_200,
    requiredCueCount: 6,
    nudgeMs: 0,
  },
  'certainty-overlay-transcript-moras': {
    family: 'live-transcript',
    schedule: 'moras',
    durationPerWord: 0.65,
    nudgeMs: -250,
    certaintyOverlay: true,
    previewLeadMs: 900,
    fadeMs: 150,
    currentAlpha: 0.12,
    nextAlpha: 0.08,
  },
  'nucleus-clock': {
    family: 'nucleus-clock',
    mass: 'acoustic-nucleus-to-text-mora',
    nudgeMs: 0,
    frameMs: 10,
    envelopeSmoothingMs: 40,
    peakLookaheadMs: 40,
    minPeakGapMs: 90,
    peakThreshold: 'rolling-median-plus-1.2-mad',
    initialActiveIndex: 0,
    monotonic: true,
    fallbackAfterNoPeakMs: 700,
  },
  weighted: { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 0 },
  uniform: { family: 'uniform', uniformRate: 1.7, nudgeMs: 0 },
  'uniform-slow': { family: 'uniform', uniformRate: 1.35, nudgeMs: 0 },
  'uniform-fast': { family: 'uniform', uniformRate: 2.05, nudgeMs: 0 },
  'weighted-slow': { family: 'word', mass: 'letters', rate: 4.8, nudgeMs: 0 },
  'weighted-fast': { family: 'word', mass: 'letters', rate: 6.8, nudgeMs: 0 },
  'weighted-lead': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 200 },
  'weighted-lag': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: -200 },
  'weighted-rate-5-6': { family: 'word', mass: 'letters', rate: 5.6, nudgeMs: 0 },
  'weighted-rate-6-0': { family: 'word', mass: 'letters', rate: 6.0, nudgeMs: 0 },
  'weighted-lead-50': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 50 },
  'weighted-lag-50': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: -50 },
  'weighted-lead-100': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 100 },
  'weighted-lag-100': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: -100 },
  'weighted-lead-75': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 75 },
  'weighted-lead-125': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 125 },
  'weighted-lead-150': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 150 },
  'weighted-lead-175': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 175 },
  'weighted-lead-225': { family: 'word', mass: 'letters', rate: 5.8, nudgeMs: 225 },
  phonetic: { family: 'word', mass: 'phonetic', rate: 6.8, nudgeMs: 0 },
  phrase: { family: 'phrase', mass: 'letters', rate: 5.8, nudgeMs: 0 },
  verse: { family: 'verse', mass: 'letters', rate: 5.8, nudgeMs: 0, linePauseMs: 0 },
  'verse-pause-250': {
    family: 'verse',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    linePauseMs: 250,
  },
  pause: { family: 'verse', mass: 'letters', rate: 5.8, nudgeMs: 0, linePauseMs: 450 },
  vad: {
    family: 'vad',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.018,
    vadQuietMs: 120,
  },
  'vad-sensitive': {
    family: 'vad',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.012,
    vadQuietMs: 80,
  },
  'vad-conservative': {
    family: 'vad',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.025,
    vadQuietMs: 240,
  },
  'vad-slew': {
    family: 'vad-slew',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.018,
    vadQuietMs: 120,
    maxAnchorCorrectionMs: 140,
  },
  'vad-slew-60': {
    family: 'vad-slew',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.018,
    vadQuietMs: 120,
    maxAnchorCorrectionMs: 60,
  },
  'vad-slew-220': {
    family: 'vad-slew',
    mass: 'letters',
    rate: 5.8,
    nudgeMs: 0,
    vadThreshold: 0.018,
    vadQuietMs: 120,
    maxAnchorCorrectionMs: 220,
  },
  'agreement-window': {
    family: 'agreement-window',
    mass: 'letters',
    rate: 5.8,
    phoneticRate: 6.8,
    nudgeMs: 0,
  },
  'agreement-strict-2': {
    family: 'agreement-window',
    mass: 'letters',
    rate: 5.8,
    phoneticRate: 6.8,
    nudgeMs: 0,
    agreementThresholdWords: 2,
    uncertainWindowWords: 2,
  },
  'agreement-strict-3': {
    family: 'agreement-window',
    mass: 'letters',
    rate: 5.8,
    phoneticRate: 6.8,
    nudgeMs: 0,
    agreementThresholdWords: 2,
    uncertainWindowWords: 3,
  },
  google: { family: 'google', mass: 'letters', rate: 5.8, nudgeMs: 0 },
};

function selectedMode() {
  return modeInputs.find((input) => input.checked)?.value || 'branch-transcript-moras';
}

function activeProfile(mode = selectedMode()) {
  return PROFILES[mode] || PROFILES.weighted;
}

function updateModeUI() {
  modeNote.textContent = modeNotes[selectedMode()];
  const milliseconds = Math.round(visualNudgeSeconds * 1000);
  nudgeValue.textContent = `Visual clock: ${milliseconds >= 0 ? '+' : ''}${milliseconds} ms`;
}

function markNeedsTest() {
  updateModeUI();
  if (!loadedPoem || isTesting) return;
  testMethodButton.disabled = false;
  testMethodButton.textContent = 'Test selected method';
}

async function refreshProviderStatus() {
  const googleInputs = [
    document.querySelector('input[value="google"]'),
    document.querySelector('input[value="google-anchor-observe"]'),
    document.querySelector('input[value="google-anchor-correct"]'),
  ].filter(Boolean);
  const ctcInputs = [
    document.querySelector('input[value="ctc-anchor-observe"]'),
    document.querySelector('input[value="ctc-anchor-correct"]'),
  ].filter(Boolean);
  try {
    const response = await fetch('/alignment/providers');
    const { google, ctc } = await response.json();
    if (google.available) {
      googleInputs.forEach((input) => {
        input.disabled = false;
      });
      providerStatus.textContent = `Google STT ready: ${google.language}, ${google.location}.`;
    } else {
      googleInputs.forEach((input) => {
        input.disabled = true;
      });
      providerStatus.textContent = `Google STT needs ${google.missing.join(', ')} plus server-side Application Default Credentials.`;
      if (selectedMode() === 'google' || activeProfile().anchorProvider === 'google')
        document.querySelector('input[value="weighted"]').checked = true;
    }
    ctcInputs.forEach((input) => {
      input.disabled = !ctc?.available;
    });
    if (ctc?.available) {
      providerStatus.textContent = `${providerStatus.textContent} Local CTC worker ready.`;
    } else if (activeProfile().anchorProvider === 'ctc') {
      document.querySelector('input[value="branch-transcript-moras"]')?.click();
      providerStatus.textContent = `${providerStatus.textContent} CTC worker unavailable: ${ctc?.error || ctc?.missing?.join(', ') || 'not configured'}.`;
    }
  } catch {
    googleInputs.forEach((input) => {
      input.disabled = true;
    });
    ctcInputs.forEach((input) => {
      input.disabled = true;
    });
    providerStatus.textContent = 'Google STT availability could not be checked.';
  }
}

async function loadHarnessConfig() {
  const response = await fetch(`/harness/config${window.location.search}`);
  if (!response.ok) throw new Error('Reference harness configuration is unavailable');
  return response.json();
}

function setMetrics(items) {
  const metricNodes = items.map(({ label, value }) => {
    const metric = document.createElement('div');
    metric.className = 'metric';
    const strong = document.createElement('strong');
    strong.textContent = value;
    const span = document.createElement('span');
    span.textContent = label;
    metric.append(strong, span);
    return metric;
  });
  metrics.replaceChildren(...metricNodes);
}

function runArtifactUrl(name) {
  return `/runs/artifact?name=${encodeURIComponent(name)}`;
}

function loadRunVideo(video) {
  if (video.dataset.loaded) return;
  video.dataset.loaded = 'true';
  video.preload = 'auto';
  video.src = runArtifactUrl(video.dataset.recording);
  video.load();
}

function unloadRunVideo(video) {
  if (!video.dataset.loaded || video === activeRunVideo) return;
  video.removeAttribute('src');
  video.preload = 'none';
  delete video.dataset.loaded;
  delete video.dataset.fallbackUsed;
  video.load();
}

function observeRunVideo(video) {
  runVideoObserver.observe(video);
  video.addEventListener('play', () => {
    document.querySelectorAll('.run-card video').forEach((other) => {
      if (other !== video) other.pause();
    });
    activeRunVideo = video;
  });
  video.addEventListener('pause', () => {
    if (activeRunVideo === video) activeRunVideo = undefined;
  });
  video.addEventListener('error', () => {
    const fallback = video.dataset.sourceRecording;
    if (fallback && !video.dataset.fallbackUsed) {
      video.dataset.fallbackUsed = 'true';
      video.src = runArtifactUrl(fallback);
      video.load();
    }
  });
}

function runMetric(label, value) {
  const metric = document.createElement('span');
  metric.textContent = `${label}: ${value}`;
  return metric;
}

function responseText(data) {
  return (data.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('');
}

function parseDiscoveryJson(text) {
  const clean = text.replace(/```(?:json)?|```/gi, '').trim();
  const objectStart = clean.indexOf('{');
  const arrayStart = clean.indexOf('[');
  const start =
    objectStart < 0 ? arrayStart : arrayStart < 0 ? objectStart : Math.min(objectStart, arrayStart);
  const end = clean.endsWith(']') ? clean.lastIndexOf(']') : clean.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('The research response did not contain JSON');
  return JSON.parse(clean.slice(start, end + 1));
}

function normalizeDiscoveryIdeas(data, lens) {
  const ideas = Array.isArray(data) ? data : Array.isArray(data?.ideas) ? data.ideas : [];
  return ideas
    .filter((idea) => idea && typeof idea.title === 'string' && idea.title.trim())
    .map((idea) => ({
      lens: idea.lens || lens,
      title: idea.title.trim(),
      novelty: idea.novelty || 'A distinct hypothesis to test.',
      mechanism: idea.mechanism || 'Mechanism was not specified.',
      latency: idea.latency || 'Latency impact must be measured.',
      prototype: idea.prototype || 'Define the smallest instrumented POC change.',
      falsify: idea.falsify || 'Compare to the current weighted-clock control.',
      metric:
        idea.metric || 'Use the existing conservative word-coverage score and first-audio latency.',
      research: idea.research || 'No external research lead was supplied.',
    }));
}

async function discoveryModels() {
  try {
    const response = await fetch(`${API_BASE}/api/ai/models`);
    if (!response.ok) throw new Error('Model list unavailable');
    const data = await response.json();
    const available = new Set(
      (data.models || [])
        .filter(
          (model) =>
            model.name?.startsWith('models/gemini-') &&
            model.supportedGenerationMethods?.includes('generateContent') &&
            !model.name.includes('tts')
        )
        .map((model) => model.name.replace('models/', ''))
    );
    const preferred = ['gemini-2.5-flash', 'gemini-2.0-flash'];
    return [...preferred.filter((model) => available.has(model)), ...available].slice(0, 4);
  } catch {
    return ['gemini-2.5-flash', 'gemini-2.0-flash'];
  }
}

async function generateDiscoveryJson(prompt, models) {
  let lastError;
  for (const model of models) {
    try {
      const response = await fetch(`${API_BASE}/api/ai/${model}/generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.8,
            maxOutputTokens: 1800,
            ...(model.startsWith('gemini-2.5-') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        const message = data.error?.message || `HTTP ${response.status}`;
        if (response.status === 404 || response.status === 410) {
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }
      return parseDiscoveryJson(responseText(data));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No discovery model was available');
}

function discoveryPrompt(lens, focus) {
  return `You are the ${lens.name} in a design-research workshop. ${lens.focus}

Problem: highlight Arabic words in sync with low-latency Gemini Live TTS. Audio starts as scheduled PCM chunks arrive. Gemini Live gives no word timestamps. The Web Audio playhead is reliable once scheduled. The fixed seven-line Gibran reference is audited post-run with Google Chirp word timestamps. Existing strategies include character-weighted clocks, local verse clocks, VAD re-anchors, and phrase-level Google STT. Individual runs vary because generated delivery and phrasing vary.

Workshop objective: ${focus}

Propose exactly two materially different ideas. Do not propose another bare rate/offset sweep. Do not claim an API returns word timestamps unless the proposal explicitly treats that as a research question to verify. Preserve a fast first-audio path. Treat LLM output as a hypothesis, not evidence.

Return JSON only: {"ideas":[{"lens":"${lens.name}","title":"short name","novelty":"why this differs from current approaches","mechanism":"how it would work","latency":"first-audio impact and mitigation","prototype":"smallest POC implementation, naming likely files","falsify":"what result would reject it","metric":"specific comparison and threshold","research":"one precise external documentation/paper/query to verify before implementation"}]}.`;
}

function synthesisPrompt(candidates, focus) {
  return `You are the skeptical research lead for a low-latency Arabic word-sync POC. Select and rewrite at most five strong, non-duplicative experiment proposals from the candidate ideas below.

Objective: ${focus}
Known constraints: Gemini Live returns PCM without word timestamps; first audio must remain fast; the existing harness records audio and highlights together, then audits conservative word coverage after playback. A proposal is not evidence until it passes that harness.

For each retained proposal, retain a concrete research lead and make the falsification test decisive. Prefer a portfolio: at least one timing-systems idea, one speech/alignment idea, one perceptual UX idea, and one research-dependent idea when the candidates support them. Do not suggest rate/offset tuning alone.

Candidates: ${JSON.stringify(candidates)}

Return JSON only: {"ideas":[{"lens":"origin lens","title":"short name","novelty":"why this is worth testing","mechanism":"how it works","latency":"first-audio impact and mitigation","prototype":"smallest POC implementation, naming likely files","falsify":"control and decisive rejection condition","metric":"specific comparison and threshold","research":"precise thing to research before coding"}]}.`;
}

function diverseDiscoveryPortfolio(ideas) {
  const firstPerLens = [];
  const seenLenses = new Set();
  for (const idea of ideas) {
    if (!seenLenses.has(idea.lens)) {
      firstPerLens.push(idea);
      seenLenses.add(idea.lens);
    }
  }
  return [...firstPerLens, ...ideas.filter((idea) => !firstPerLens.includes(idea))].slice(0, 5);
}

function renderDiscoveryIdeas() {
  discoveryResults.replaceChildren();
  discoveryResults.hidden = false;
  for (const idea of discoveryIdeas) {
    const card = document.createElement('article');
    card.className = `discovery-idea${selectedDiscoveryIdea === idea ? ' selected' : ''}`;
    const heading = document.createElement('h3');
    heading.textContent = idea.title;
    const lens = document.createElement('p');
    lens.textContent = `Lens: ${idea.lens}`;
    const detail = (label, value) => {
      const paragraph = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = `${label}: `;
      paragraph.append(strong, value);
      return paragraph;
    };
    const mechanism = detail('Mechanism', idea.mechanism);
    const test = detail('Falsify', idea.falsify);
    const research = detail('Research lead', idea.research);
    const select = document.createElement('button');
    select.type = 'button';
    select.textContent =
      selectedDiscoveryIdea === idea ? 'Selected for brief' : 'Use as next brief';
    select.addEventListener('click', () => {
      selectedDiscoveryIdea = idea;
      renderDiscoveryIdeas();
      copyDiscoveryBriefButton.hidden = false;
      discoveryStatus.textContent =
        'Selected. Copy the brief, then implement a named profile and compare it with a control.';
    });
    card.append(heading, lens, mechanism, test, research, select);
    discoveryResults.append(card);
  }
}

function selectedDiscoveryBrief() {
  const idea = selectedDiscoveryIdea;
  return `# Live word-sync experiment brief\n\n## Hypothesis\n${idea.title}: ${idea.novelty}\n\n## Mechanism\n${idea.mechanism}\n\n## First-audio constraint\n${idea.latency}\n\n## Smallest POC\n${idea.prototype}\n\n## Control and falsification\n${idea.falsify}\n\n## Measurement\n${idea.metric}\n\n## Research before coding\n${idea.research}\n\n## Workflow\n1. Verify the research lead with primary documentation or a paper.\n2. Add one named POC profile; do not modify the shipped reader highlighter.\n3. Capture it beside the weighted-clock control on poem #87443.\n4. Run the deterministic post-run audit and append the timestamped result to Runs.\n5. Keep it only if it improves the control without materially regressing first-audio latency.`;
}

async function copyDiscoveryBrief() {
  if (!selectedDiscoveryIdea) return;
  await copyText(selectedDiscoveryBrief(), copyDiscoveryBriefButton, 'Experiment brief copied');
}

async function copyText(text, successButton, successLabel) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  successButton.textContent = successLabel;
}

function codexWorkshopPrompt() {
  return `Act as the research lead for a low-latency Arabic word-sync investigation. Work in four independent passes: (1) real-time audio systems, (2) Arabic speech alignment, (3) perceptual interaction design, and (4) cross-domain research scouting. Then act as a skeptical critic to rank a diverse shortlist.

Facts, not assumptions:
- Gemini Live TTS returns scheduled PCM chunks but no word timestamps.
- First audible audio must remain fast; the Web Audio playhead is reliable after scheduling.
- The POC uses fixed poem #87443 and records audio plus visual highlights in one stream.
- Google Chirp 3 provides post-run word timestamps for deterministic audit only.
- Existing experiments include weighted clocks, verse-local clocks, VAD re-anchoring, and phrase-level Google STT; one-off results vary with generated delivery.

For each proposal give: novelty, mechanism, first-audio impact, smallest POC change, control/falsification criterion, metric, and a precise primary-source research lead. Seek mechanisms beyond bare rate/offset tuning. Do not assert an API capability without verifying it. Treat brainstorming as hypotheses, not evidence. Finish with a 3–5 idea portfolio and an implementation order that minimizes irreversible work.`;
}

async function copyCodexWorkshopPrompt() {
  await copyText(codexWorkshopPrompt(), copyCodexWorkshopButton, 'Codex research prompt copied');
}

async function startDiscoveryWorkflow() {
  const focus = DISCOVERY_FOCUS[discoveryGoal.value] || DISCOVERY_FOCUS.broad;
  startDiscoveryButton.disabled = true;
  copyDiscoveryBriefButton.hidden = true;
  discoveryResults.hidden = true;
  discoveryStatus.textContent = 'Asking four independent lenses for hypotheses and research leads…';
  try {
    const models = await discoveryModels();
    const lensResults = await Promise.allSettled(
      DISCOVERY_LENSES.map(async (lens) =>
        normalizeDiscoveryIdeas(
          await generateDiscoveryJson(discoveryPrompt(lens, focus), models),
          lens.name
        )
      )
    );
    const candidates = lensResults
      .filter((result) => result.status === 'fulfilled')
      .flatMap((result) => result.value);
    if (!candidates.length) {
      const failure = lensResults.find((result) => result.status === 'rejected');
      throw failure?.reason || new Error('No research lens returned a usable proposal');
    }
    discoveryStatus.textContent = 'A skeptical research lead is ranking the independent ideas…';
    try {
      discoveryIdeas = normalizeDiscoveryIdeas(
        await generateDiscoveryJson(synthesisPrompt(candidates, focus), models),
        'research lead'
      ).slice(0, 5);
    } catch {
      discoveryIdeas = diverseDiscoveryPortfolio(candidates);
    }
    if (!discoveryIdeas.length) throw new Error('No usable proposals were returned');
    selectedDiscoveryIdea = undefined;
    renderDiscoveryIdeas();
    discoveryStatus.textContent = `${discoveryIdeas.length} proposals ready. Select one to create a measured experiment brief.`;
  } catch (error) {
    discoveryStatus.textContent = `Discovery could not start: ${error.message}`;
  } finally {
    startDiscoveryButton.disabled = false;
  }
}

startDiscoveryButton.addEventListener('click', startDiscoveryWorkflow);
copyDiscoveryBriefButton.addEventListener('click', copyDiscoveryBrief);
copyCodexWorkshopButton.addEventListener('click', copyCodexWorkshopPrompt);

async function refreshRuns() {
  runVideoObserver?.disconnect();
  activeRunVideo?.pause();
  activeRunVideo = undefined;
  runVideoObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) loadRunVideo(entry.target);
        else unloadRunVideo(entry.target);
      }
    },
    { rootMargin: '400px 0px' }
  );
  runsView.replaceChildren();
  const heading = document.createElement('h2');
  heading.textContent = 'Recorded comparison runs';
  runsView.append(heading);
  try {
    const response = await fetch('/runs');
    const { reports, log } = await response.json();
    if (!response.ok) throw new Error('Run history is unavailable');
    harnessConfig ||= await loadHarnessConfig();
    const referenceReports = reports.filter(
      (report) => report.referencePoemId === harnessConfig.poemId
    );
    if (!referenceReports.length) {
      const empty = document.createElement('p');
      empty.textContent =
        'No reference comparison runs yet. Run `npm run poc:compare` to create an audit set.';
      runsView.append(empty);
      return;
    }
    const ranked = referenceReports
      .flatMap((report) =>
        report.results
          .filter((result) => result.status === 'recorded')
          .map((result) => ({ report, result }))
      )
      .sort((left, right) => {
        const leftScore = left.result.analysis?.score?.qualityScore ?? -1;
        const rightScore = right.result.analysis?.score?.qualityScore ?? -1;
        if (rightScore !== leftScore) return rightScore - leftScore;
        return String(right.result.completedAt || '').localeCompare(
          String(left.result.completedAt || '')
        );
      });
    const logNote = document.createElement('p');
    logNote.textContent = `${log.filter((entry) => entry.referencePoemId === harnessConfig.poemId).length} timestamped ledger events · ranked best to worst by experimental score.`;
    runsView.append(logNote);
    for (const [rank, { report, result }] of ranked.entries()) {
      const card = document.createElement('article');
      card.className = 'run-card';
      const details = document.createElement('div');
      const title = document.createElement('h2');
      title.textContent = `#${rank + 1} · ${result.method} · ${report.poem.title || 'Untitled poem'}`;
      const byline = document.createElement('p');
      byline.textContent = report.poem.poet || '';
      const metrics = document.createElement('div');
      metrics.className = 'run-metrics';
      metrics.append(
        runMetric('score', result.analysis?.score?.qualityScore ?? 'pending audit'),
        runMetric('phase', result.phase || report.phase || 'legacy'),
        runMetric('first audio', `${Math.round(result.metrics.firstAudioMs)} ms`),
        runMetric('audio', `${result.metrics.duration.toFixed(1)} s`),
        runMetric('run', `${(result.elapsedMs / 1000).toFixed(1)} s`),
        runMetric(
          'UTC',
          new Date(result.completedAt || report.generatedAt).toISOString().slice(0, 19)
        )
      );
      for (const [key, value] of Object.entries(result.metrics.parameters || {})) {
        if (value != null) metrics.append(runMetric(key, value));
      }
      details.append(title, byline, metrics);
      if (result.hypothesis || report.hypothesis) {
        const hypothesis = document.createElement('p');
        hypothesis.textContent = `Hypothesis: ${result.hypothesis || report.hypothesis}`;
        details.append(hypothesis);
      }
      if (result.solutionDesign || report.solutionDesign) {
        const solutionDesign = document.createElement('p');
        solutionDesign.textContent = `Solution design: ${result.solutionDesign || report.solutionDesign}`;
        details.append(solutionDesign);
      }
      if (result.metrics.anchor) {
        const anchor = result.metrics.anchor;
        const summary = document.createElement('p');
        summary.textContent = `Anchor contract (${anchor.source}, ${anchor.mode}): ${anchor.acceptedCount}/${anchor.receivedCount} accepted; ${anchor.rejectedCount} rejected. ${anchor.events.at(-1)?.status || 'No anchor event arrived.'}`;
        details.append(summary);
      }
      if (result.analysis?.summary) {
        const analysis = document.createElement('p');
        const sourceWordCount =
          result.analysis.sourceWordCount ||
          Math.round(
            result.analysis.matchedWordCount / (result.analysis.score?.sourceCoverage || 1)
          );
        const exactWordCount =
          result.analysis.exactWordCount ??
          result.analysis.examples.filter(
            (example) => example.covered && example.activeEnd - example.activeIndex === 1
          ).length;
        analysis.textContent = `Exact single-word highlight: ${Math.round(exactWordCount)}/${sourceWordCount} source words. Auditor could map ${result.analysis.matchedWordCount}/${sourceWordCount} spoken words; the rest were not comparable transcription matches.`;
        details.append(analysis);
        const examples = document.createElement('details');
        const summary = document.createElement('summary');
        summary.textContent = 'Word-by-word audit samples';
        const list = document.createElement('ul');
        for (const example of result.analysis.examples.slice(0, 10)) {
          const item = document.createElement('li');
          item.textContent = `${example.spokenAt}s: “${example.sourceWord}” → “${example.highlightedWord || 'none'}” ${example.covered ? '✓' : '×'}`;
          list.append(item);
        }
        examples.append(summary, list);
        details.append(examples);
      }
      const video = document.createElement('video');
      video.controls = true;
      video.preload = 'none';
      video.playsInline = true;
      video.dataset.recording = result.recording;
      if (result.sourceRecording) video.dataset.sourceRecording = result.sourceRecording;
      observeRunVideo(video);
      // Every card visibly embeds the actual recording rather than a separate
      // screenshot. Sources are attached only near the viewport, so scrolling
      // the ranked list cannot exhaust the browser's media loader.
      card.append(details, video);
      runsView.append(card);
    }
  } catch (error) {
    const unavailable = document.createElement('p');
    unavailable.textContent = error.message;
    runsView.append(unavailable);
  }
}

function selectView(view) {
  const runs = view === 'runs';
  labView.hidden = runs;
  runsView.hidden = !runs;
  showLabButton.setAttribute('aria-selected', String(!runs));
  showRunsButton.setAttribute('aria-selected', String(runs));
  if (runs) void refreshRuns();
}

function normalizedWeight(word, profile = activeProfile()) {
  if (profile.mass === 'main-raw-char') return word.length;
  const letters = word.replace(/[\u064B-\u065F\u0670\u0640\s]/g, '');
  const base = Math.max(1, [...letters].length) + (/[،؛.!؟]/.test(word) ? 1.5 : 0);
  if (profile.mass !== 'phonetic') return base;
  const longVowels = (word.match(/[اوي]/g) || []).length * 0.6;
  const shadda = (word.match(/\u0651/g) || []).length * 0.7;
  const article = /^ال/.test(word.replace(/[\u064B-\u065F]/g, '')) ? 0.25 : 0;
  return base + longVowels + shadda + article;
}

function tokenize(text) {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => ({ text, weight: normalizedWeight(text) }));
}

function makeSegments(lines) {
  let wordStart = 0;
  return lines.map((line, index) => {
    const words = tokenize(line);
    const segment = {
      index,
      wordStart,
      wordEnd: wordStart + words.length,
      weight: words.reduce((sum, word) => sum + word.weight, 0),
    };
    wordStart = segment.wordEnd;
    return segment;
  });
}

function segmentIndexForWord(index) {
  return currentDemo.segments.findIndex(
    (segment) => index >= segment.wordStart && index < segment.wordEnd
  );
}

function certaintyOverlaySnapshot(snapshot, profile, timings, visualElapsed) {
  if (!profile.certaintyOverlay) return snapshot;
  const currentSegment = segmentIndexForWord(snapshot.activeIndex);
  const nextSegment = currentDemo.segments[currentSegment + 1];
  const observedNextStart = nextSegment ? timings[nextSegment.wordStart]?.start : null;
  const estimatedNextStart = nextSegment
    ? currentDemo.expectedSegmentStarts[nextSegment.index]
    : null;
  const nextStart = observedNextStart ?? estimatedNextStart;
  const previewSegment =
    nextStart != null &&
    visualElapsed >= nextStart - profile.previewLeadMs / 1000 &&
    visualElapsed < nextStart
      ? nextSegment.index
      : null;
  return {
    ...snapshot,
    currentSegment: currentSegment >= 0 ? currentSegment : null,
    previewSegment,
    previewSource:
      previewSegment == null ? null : observedNextStart != null ? 'observed' : 'estimated',
    certaintyTier: previewSegment != null ? 'context-plus-preview' : 'context-only',
  };
}

function expectedDuration(words, mode = selectedMode()) {
  const profile = activeProfile(mode);
  if (profile.durationPerWord) return words.length * profile.durationPerWord;
  if (profile.family === 'uniform') return words.length / profile.uniformRate;
  if (profile.family === 'nucleus-clock') return expectedDuration(words, 'weighted');
  return words.reduce((sum, word) => sum + normalizedWeight(word.text, profile), 0) / profile.rate;
}

function moraWeight(word) {
  const text = word.normalize('NFC');
  let morae = 0;
  let letters = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (/[ًٌٍَُِ]/.test(char)) {
      morae += 1;
      continue;
    }
    if (char === 'ٰ' || char === 'آ') {
      morae += 2;
      if (char === 'آ') letters += 1;
      continue;
    }
    if (char === 'ّ') {
      morae += 1;
      continue;
    }
    if (/[ء-يٱ-ۓ]/.test(char)) letters += 1;
    if (/[اوي]/.test(char) && /[َُِ]/.test(text[index - 1] || '')) morae += 1;
  }
  return Math.max(1, morae || Math.ceil(Math.max(1, letters) / 2));
}

function scheduleVerse({ timings, segment, profile }) {
  const first = timings[segment.wordStart];
  const last = timings[segment.wordEnd - 1];
  if (!first || !last || last.end < first.start) return timings;
  if (
    profile.requireFullSegment &&
    timings.slice(segment.wordStart, segment.wordEnd).some((timing) => !timing)
  ) {
    return timings;
  }
  const count = segment.wordEnd - segment.wordStart;
  const span = last.end - first.start;
  const weights = Array.from({ length: count }, (_, offset) => {
    const word = currentDemo.words[segment.wordStart + offset].text;
    if (profile.schedule === 'letters') return Math.max(1, word.length);
    if (profile.schedule === 'moras-final' && offset === count - 1) {
      return moraWeight(word) * profile.finalWeight;
    }
    if (profile.schedule === 'moras' || profile.schedule === 'moras-final') return moraWeight(word);
    if (profile.schedule === 'mora-blend') {
      return 1 + profile.moraBlend * (moraWeight(word) - 1);
    }
    return 1;
  });
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = first.start;
  const output = [...timings];
  for (let offset = 0; offset < count; offset += 1) {
    const index = segment.wordStart + offset;
    const end = offset === count - 1 ? last.end : cursor + span * (weights[offset] / total);
    output[index] = { start: cursor, end };
    cursor = end;
  }
  return output;
}

function liveTranscriptSnapshot(profile, elapsed) {
  const contentElapsed = Math.max(0, elapsed - currentDemo.insertedGapSeconds);
  const visualElapsed = Math.max(0, contentElapsed + currentDemo.nudgeSeconds);
  let timings = currentDemo.liveTimings;
  if (profile.schedule !== 'raw') {
    for (const segment of currentDemo.segments) {
      timings = scheduleVerse({ timings, segment, profile });
    }
  }
  let activeIndex = -1;
  for (let index = 0; index < timings.length; index += 1) {
    const timing = timings[index];
    if (timing && visualElapsed >= timing.start && visualElapsed < timing.end) {
      activeIndex = index;
      break;
    }
  }
  if (activeIndex < 0) {
    const fallbackMode = profile.fallbackMode || 'main-char-650';
    activeIndex = wordIndexForTime(
      currentDemo.words,
      visualElapsed,
      fallbackMode,
      expectedDuration(currentDemo.words, fallbackMode)
    );
  }
  return certaintyOverlaySnapshot(
    {
      activeIndex,
      activeEnd: activeIndex + 1,
      elapsed,
      expectedDuration: expectedDuration(currentDemo.words, 'main-char-650'),
      mode: selectedMode(),
    },
    profile,
    timings,
    visualElapsed
  );
}

function precisionCtcSnapshot(profile, elapsed) {
  const precision = currentDemo.precision;
  const contentTime = contentElapsed() ?? Math.max(0, elapsed - currentDemo.insertedGapSeconds);
  const direct = precision?.timings || [];
  const directIndex = direct.findIndex(
    (timing) => timing && contentTime >= timing.start && contentTime < timing.end
  );
  if (directIndex >= 0) {
    precision.lastRenderedIndex = Math.max(precision.lastRenderedIndex, directIndex);
    return {
      activeIndex: precision.lastRenderedIndex,
      activeEnd: precision.lastRenderedIndex + 1,
      elapsed: contentTime,
      expectedDuration: direct.at(-1)?.end || expectedDuration(currentDemo.words, 'weighted'),
      mode: selectedMode(),
      precisionSource: 'committed-ctc-phrase',
    };
  }
  const fallback = liveTranscriptSnapshot(PROFILES[profile.fallbackMode], elapsed);
  const activeIndex = Math.max(precision?.lastRenderedIndex || 0, fallback.activeIndex);
  if (precision) precision.lastRenderedIndex = activeIndex;
  return {
    ...fallback,
    activeIndex,
    activeEnd: activeIndex + 1,
    precisionSource: 'mora-50-fallback',
  };
}

function weightedFallbackPlan(words) {
  const fallbackProfile = activeProfile('weighted');
  return buildPlan(
    words.map((word) => normalizedWeight(word.text, fallbackProfile) / fallbackProfile.rate)
  );
}

function anchorPlannerOptions(profile) {
  return {
    correctionCapSeconds: profile.correctionCapMs / 1000,
    correctionRejectSeconds: profile.correctionRejectMs / 1000,
    futureHorizonSeconds: profile.futureHorizonMs / 1000,
    horizonWords: profile.horizonWords,
    safePastWords: profile.safePastWords,
  };
}

function contentElapsed() {
  if (!audioContext || !currentDemo?.audioStart) return null;
  const now = audioContext.currentTime;
  const scheduled = currentDemo.pcmTrace.filter((trace) => trace.scheduledAt <= now).at(-1);
  if (scheduled) {
    return (
      scheduled.contentStartSample / SAMPLE_RATE +
      Math.max(0, Math.min(scheduled.durationSeconds, now - scheduled.scheduledAt))
    );
  }
  return Math.max(
    0,
    audioContext.currentTime - currentDemo.audioStart - currentDemo.insertedGapSeconds
  );
}

function flushTranscriptAnchorQueue() {
  const anchor = currentDemo?.anchor;
  const elapsed = contentElapsed();
  if (!anchor || elapsed == null) return;
  for (const [key, cue] of anchor.pending) {
    if (anchor.seen.has(cue.key)) {
      anchor.pending.delete(key);
      continue;
    }
    const outcome = applyFutureAnchor({
      plan: anchor.plan,
      anchorIndex: cue.index,
      observedStart: cue.start,
      playbackSeconds: elapsed,
      options: anchorPlannerOptions(currentDemo.profile),
    });
    // The CTC worker may inspect PCM that is already queued in Web Audio but
    // has not played yet. An early cue is useful later; keep it pending until
    // its word is safely in the playback past instead of turning safety into a
    // one-shot false negative. All other outcomes are final for this cue.
    if (outcome.status === 'rejected-not-safely-past') continue;
    anchor.seen.add(cue.key);
    anchor.pending.delete(key);
    const event = {
      source: currentDemo.profile.anchorSource,
      sourceIndex: cue.index,
      sourceWord: currentDemo.words[cue.index].text,
      observedStart: cue.start,
      observedEnd: cue.end,
      receivedAtContentTime: Number(elapsed.toFixed(3)),
      stalenessMs: Math.round((elapsed - cue.start) * 1000),
      status: outcome.status,
      activeIndex: outcome.activeIndex ?? null,
      futureStartIndex: outcome.futureStartIndex ?? null,
      futureHorizonMs:
        outcome.futureHorizon == null ? null : Math.round(outcome.futureHorizon * 1000),
      discrepancyMs: outcome.discrepancy == null ? null : Math.round(outcome.discrepancy * 1000),
      appliedCorrectionMs:
        outcome.correction == null ? null : Math.round(outcome.correction * 1000),
    };
    anchor.events.push(event);
    if (outcome.status === 'accepted' && currentDemo.profile.anchorMode === 'correct') {
      anchor.plan = outcome.plan;
      anchor.lastAcceptedIndex = cue.index;
    }
  }
}

function queueAnchor(cue) {
  const anchor = currentDemo?.anchor;
  if (!anchor) return;
  if (cue.index <= anchor.lastSeenSourceIndex) return;
  anchor.lastSeenSourceIndex = cue.index;
  anchor.pending.set(cue.key, cue);
  flushTranscriptAnchorQueue();
}

function futureAnchorSnapshot(profile, elapsed) {
  flushTranscriptAnchorQueue();
  const contentTime = contentElapsed() ?? Math.max(0, elapsed - currentDemo.insertedGapSeconds);
  const visualElapsed = Math.max(0, contentTime + currentDemo.nudgeSeconds);
  const anchor = currentDemo.anchor;
  const proposedIndex = activeIndexAt(anchor.plan, visualElapsed);
  const activeIndex = Math.max(anchor.lastRenderedIndex, proposedIndex);
  anchor.lastRenderedIndex = activeIndex;
  return {
    activeIndex,
    activeEnd: activeIndex + 1,
    elapsed: contentTime,
    expectedDuration: anchor.plan.at(-1)?.end || expectedDuration(currentDemo.words, 'weighted'),
    mode: selectedMode(),
    anchorAcceptedCount: anchor.events.filter((event) => event.status === 'accepted').length,
    anchorRejectedCount: anchor.events.filter((event) => event.status.startsWith('rejected'))
      .length,
    anchorMode: profile.anchorMode,
  };
}

function updateLiveTimings(partialTimings) {
  if (!partialTimings?.length || !currentDemo) return;
  const timings = Array(currentDemo.words.length).fill(null);
  let cursor = 0;
  for (const timing of partialTimings) {
    const key = normalizeArabic(timing.word || '');
    if (!key) continue;
    const index = currentDemo.words.findIndex(
      (source, sourceIndex) =>
        sourceIndex >= cursor && sourceIndex < cursor + 14 && normalizeArabic(source.text) === key
    );
    if (index < 0) continue;
    cursor = index + 1;
    const start = Number(timing.start);
    const end = Number(timing.end);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) continue;
    timings[index] = { start, end };
    if (currentDemo.profile.family === 'future-anchor') {
      queueAnchor({
        index,
        start,
        end,
        key: `${index}:${start.toFixed(3)}:${end.toFixed(3)}`,
      });
    }
  }
  currentDemo.liveTimings = timings;
}

function wordIndexForTime(
  words,
  elapsed,
  mode = selectedMode(),
  duration = expectedDuration(words, mode)
) {
  const profile = activeProfile(mode);
  if (profile.family === 'uniform') {
    return Math.min(words.length - 1, Math.max(0, Math.floor(elapsed / (duration / words.length))));
  }
  const totalWeight = words.reduce((sum, word) => sum + normalizedWeight(word.text, profile), 0);
  const targetWeight = Math.min(1, elapsed / duration) * totalWeight;
  let cursor = 0;
  for (let index = 0; index < words.length; index += 1) {
    cursor += normalizedWeight(words[index].text, profile);
    if (targetWeight <= cursor) return index;
  }
  return words.length - 1;
}

function normalizeArabic(text) {
  return text
    .normalize('NFKC')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640\u200E\u200F]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/[ک]/g, 'ك')
    .replace(/[ی]/g, 'ي')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function base64FromBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, initial) => {
  let value = initial;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
  }
  return value >>> 0;
});

// Matches zlib.crc32, including incremental use with the prior returned value.
// This gives the browser an end-to-end byte-integrity check for every cue's PCM.
function pcmChecksum(bytes, previous = 0) {
  let checksum = (previous ^ 0xffffffff) >>> 0;
  for (const byte of bytes) {
    checksum = (checksum >>> 8) ^ CRC32_TABLE[(checksum ^ byte) & 0xff];
  }
  return (checksum ^ 0xffffffff) >>> 0;
}

function checksumHex(value) {
  return (value >>> 0).toString(16).padStart(8, '0');
}

function mapGoogleWords(words) {
  const google = currentDemo.google;
  for (const heard of words) {
    const key = normalizeArabic(heard.word);
    if (!key) continue;
    const match = currentDemo.words.findIndex(
      (source, index) =>
        index >= google.sourceCursor &&
        index < google.sourceCursor + 14 &&
        normalizeArabic(source.text) === key
    );
    if (match < 0) continue;
    google.sourceCursor = match + 1;
    google.wordCues.set(match, { start: heard.start, end: heard.end });
    if (currentDemo.profile.anchorProvider === 'google') {
      queueAnchor({
        index: match,
        start: heard.start,
        end: heard.end,
        key: `google:${match}:${heard.start.toFixed(3)}:${heard.end.toFixed(3)}`,
      });
    }
  }
}

function mapGooglePhrase(cue) {
  if (!cue.transcript || !cue.end) return;
  const google = currentDemo.google;
  let lastMatch = -1;
  for (const heard of cue.transcript.split(/\s+/)) {
    const key = normalizeArabic(heard);
    if (!key) continue;
    const match = currentDemo.words.findIndex(
      (source, index) =>
        index >= google.sourceCursor &&
        index < google.sourceCursor + 14 &&
        normalizeArabic(source.text) === key
    );
    if (match >= 0) {
      lastMatch = match;
      google.sourceCursor = match + 1;
    }
  }
  if (lastMatch >= 0) google.phraseAnchors.push({ index: lastMatch, end: cue.end });
}

async function pollGoogleCues() {
  const google = currentDemo?.google;
  if (!google || google.closed || google.polling) return;
  google.polling = true;
  try {
    const response = await fetch(
      `/alignment/google/cues?session=${google.sessionId}&after=${google.cursor}`
    );
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Google STT cue polling failed');
    google.cursor = data.next;
    for (const cue of data.cues) {
      if (!cue.final) continue;
      if (cue.words.length) mapGoogleWords(cue.words);
      else mapGooglePhrase(cue);
    }
  } catch (error) {
    google.error = error.message;
  } finally {
    google.polling = false;
  }
}

async function startGoogleTiming() {
  const response = await fetch('/alignment/google/start', { method: 'POST' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Google STT is unavailable');
  currentDemo.google = {
    sessionId: data.sessionId,
    cursor: 0,
    sourceCursor: 0,
    wordCues: new Map(),
    phraseAnchors: [],
    polling: false,
    closed: false,
    pendingWrites: new Set(),
  };
  currentDemo.google.poller = setInterval(pollGoogleCues, 250);
}

function sendGoogleChunk(pcm) {
  if (!currentDemo.google || currentDemo.google.closed) return;
  const google = currentDemo.google;
  const pendingWrite = fetch('/alignment/google/chunk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: google.sessionId, audio: base64FromBytes(pcm) }),
  })
    .then((response) => {
      if (!response.ok) throw new Error(`Google PCM copy failed (${response.status})`);
    })
    .catch((error) => {
      google.error = error.message;
    })
    .finally(() => {
      google.pendingWrites.delete(pendingWrite);
    });
  google.pendingWrites.add(pendingWrite);
}

async function stopGoogleTiming() {
  const google = currentDemo?.google;
  if (!google || google.closed) return;
  clearInterval(google.poller);
  // A sidecar must never hold the playback/UI path hostage. Record unfinished PCM
  // copies after a short bounded drain and continue with the fallback if its relay is stuck.
  await Promise.race([
    Promise.allSettled([...google.pendingWrites]),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  google.unsettledWritesAtClose = google.pendingWrites.size;
  await fetch('/alignment/google/stop', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: google.sessionId }),
  });
  // Final Chirp results can arrive after the audio stream closes. Drain long enough to
  // record their actual lateness; they remain unusable if playback has no future horizon.
  const deadline = performance.now() + 6_000;
  while (performance.now() < deadline) {
    await pollGoogleCues();
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  google.closed = true;
  await fetch('/alignment/google/dispose', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ sessionId: google.sessionId }),
  });
}

function mapCtcWords(cues) {
  const ctc = currentDemo.ctc;
  for (const cue of cues) {
    const key = normalizeArabic(cue.word || '');
    let match = Number.isInteger(cue.sourceIndex) ? cue.sourceIndex : -1;
    if (
      match < ctc.sourceCursor ||
      match >= currentDemo.words.length ||
      (key && normalizeArabic(currentDemo.words[match].text) !== key)
    ) {
      match = currentDemo.words.findIndex(
        (source, index) =>
          index >= ctc.sourceCursor &&
          index < ctc.sourceCursor + 14 &&
          normalizeArabic(source.text) === key
      );
    }
    if (match < 0) continue;
    ctc.sourceCursor = match + 1;
    if (currentDemo.profile.family === 'precision-ctc') {
      const precision = currentDemo.precision;
      if (cue.stable !== true) continue;
      const start = Number.isInteger(cue.startSample24k)
        ? cue.startSample24k / SAMPLE_RATE
        : Number(cue.start);
      const end = Number.isInteger(cue.endSample24k)
        ? cue.endSample24k / SAMPLE_RATE
        : Number(cue.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      const contentTime = contentElapsed();
      const safelyFuture = contentTime == null || start - contentTime >= 0.15;
      if (!safelyFuture) precision.directRejectedLateCount += 1;
      else precision.timings[match] = { start, end };
      precision.cues.set(match, {
        ...cue,
        sourceIndex: match,
        directCommitted: safelyFuture,
        receivedAtWallMs: Math.round(performance.now() - precision.streamStartedAt),
      });
      precision.ready = Array.from(
        { length: currentDemo.profile.requiredCueCount },
        (_, index) => precision.timings[index]
      ).every(Boolean);
      if (precision.ready && !precision.readyAtWallMs) {
        precision.readyAtWallMs = Math.round(performance.now() - precision.streamStartedAt);
      }
      precision.maybeStart?.('ctc-opening-phrase-ready');
      void maybeAdvancePrecisionRange();
      continue;
    }
    queueAnchor({
      index: match,
      start: Number(cue.start),
      end: Number(cue.end),
      key: `ctc:${match}:${Number(cue.start).toFixed(3)}:${Number(cue.end).toFixed(3)}`,
    });
  }
}

function rangeHasAllCues(precision, range) {
  for (let index = range.sourceStartIndex; index < range.sourceEndIndex; index += 1) {
    if (!precision.cues.get(index)?.stable) return false;
  }
  return true;
}

async function maybeAdvancePrecisionRange() {
  const precision = currentDemo?.precision;
  if (!precision || precision.rotating) return;
  const active = precision.ranges[precision.activeRangeIndex];
  if (!active || active.status === 'committed' || !rangeHasAllCues(precision, active)) return;
  active.status = 'committed';
  const next = precision.ranges[precision.activeRangeIndex + 1];
  if (!next) return;
  const lastCue = precision.cues.get(active.sourceEndIndex - 1);
  if (!Number.isInteger(lastCue?.endSample24k)) return;
  precision.rotating = true;
  next.alignmentStartSample24k = lastCue.endSample24k;
  try {
    await configurePrecisionCtcRange(next.rangeIndex);
    // A fixed bounded window needs two independent worker passes for the
    // stability contract. A deliberate second control-plane request triggers
    // that pass without changing its source/audio range.
    setTimeout(() => void configurePrecisionCtcRange(next.rangeIndex), 350);
  } catch (error) {
    precision.rangeError = error.message;
    next.status = 'fallback';
  } finally {
    precision.rotating = false;
  }
}

async function pollCtcCues() {
  const ctc = currentDemo?.ctc;
  if (!ctc || ctc.closed || ctc.polling) return;
  ctc.polling = true;
  try {
    const response = await fetch(
      `/alignment/ctc/cues?session=${ctc.sessionId}&after=${ctc.cursor}`
    );
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'CTC cue polling failed');
    ctc.cursor = data.next;
    mapCtcWords(data.cues || []);
  } catch (error) {
    ctc.error = error.message;
  } finally {
    ctc.polling = false;
  }
}

async function startCtcTiming() {
  const response = await fetch('/alignment/ctc/start', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      transcript: currentDemo.poem.excerpt,
      sampleRateHertz: SAMPLE_RATE,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'CTC worker is unavailable');
  currentDemo.ctc = {
    sessionId: data.sessionId,
    cursor: -1,
    sourceCursor: 0,
    polling: false,
    closed: false,
    pendingWrites: new Set(),
    writeChain: Promise.resolve(),
    rollingChecksum: 0,
    worker: data.worker || null,
  };
  currentDemo.ctc.poller = setInterval(pollCtcCues, 150);
  if (currentDemo.profile.family === 'precision-ctc') {
    await configurePrecisionCtcRange(0);
  }
}

async function configurePrecisionCtcRange(rangeIndex) {
  const precision = currentDemo.precision;
  const ctc = currentDemo.ctc;
  const range = precision?.ranges[rangeIndex];
  if (!precision || !ctc || !range) return;
  const alignmentStartSample24k = range.alignmentStartSample24k ?? 0;
  const alignmentEndSample24k =
    alignmentStartSample24k + Math.round((currentDemo.profile.phraseWindowMs / 1000) * SAMPLE_RATE);
  const response = await fetch('/alignment/ctc/range', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sessionId: ctc.sessionId,
      sourceStartIndex: range.sourceStartIndex,
      sourceEndIndex: range.sourceEndIndex,
      alignmentStartSample24k,
      alignmentEndSample24k,
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error(data.error || 'CTC phrase-range setup failed');
  range.status = 'aligning';
  range.alignmentStartSample24k = alignmentStartSample24k;
  range.alignmentEndSample24k = alignmentEndSample24k;
  precision.activeRangeIndex = rangeIndex;
}

function sendCtcChunk(pcm, metadata) {
  const ctc = currentDemo.ctc;
  if (!ctc || ctc.closed) return;
  // Fetch completion is not ordered by the browser. Chain requests so strict
  // sequence validation proves this is one contiguous copy of scheduled PCM.
  const pendingWrite = ctc.writeChain
    .catch(() => undefined)
    .then(async () => {
      const chunkChecksum = pcmChecksum(pcm);
      const expectedRollingChecksum = pcmChecksum(pcm, ctc.rollingChecksum);
      const response = await fetch('/alignment/ctc/chunk', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          sessionId: ctc.sessionId,
          seq: metadata.seq,
          startSample24k: metadata.contentStartSample,
          sampleCount24k: metadata.sampleCount,
          checksum: checksumHex(chunkChecksum),
          audio: base64FromBytes(pcm),
          ...(currentDemo.profile.family === 'precision-ctc'
            ? {}
            : {
                // Legacy anchor experiments use the opening known-text range. The
                // precision path configures an explicit bounded range separately.
                sourceStartIndex: 0,
                sourceEndIndex: Math.min(
                  currentDemo.words.length,
                  currentDemo.profile.alignmentWordCount || 6
                ),
              }),
        }),
      });
      if (!response.ok) throw new Error(`CTC PCM copy failed (${response.status})`);
      const acknowledgement = await response.json();
      const expectedThrough = metadata.contentStartSample + metadata.sampleCount;
      if (acknowledgement.receivedThroughSample24k !== expectedThrough) {
        throw new Error(`CTC sample acknowledgement mismatch after chunk ${metadata.seq}`);
      }
      if (acknowledgement.receivedCrc32 !== checksumHex(expectedRollingChecksum)) {
        throw new Error(`CTC PCM checksum mismatch after chunk ${metadata.seq}`);
      }
      ctc.rollingChecksum = expectedRollingChecksum;
      ctc.lastAcknowledgement = acknowledgement;
    })
    .catch((error) => {
      ctc.error = error.message;
    })
    .finally(() => {
      ctc.pendingWrites.delete(pendingWrite);
    });
  ctc.writeChain = pendingWrite;
  ctc.pendingWrites.add(pendingWrite);
}

async function stopCtcTiming() {
  const ctc = currentDemo?.ctc;
  if (!ctc || ctc.closed) return;
  clearInterval(ctc.poller);
  await Promise.race([
    Promise.allSettled([...ctc.pendingWrites]),
    new Promise((resolve) => setTimeout(resolve, 2_000)),
  ]);
  ctc.unsettledWritesAtClose = ctc.pendingWrites.size;
  try {
    await fetch('/alignment/ctc/stop', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: ctc.sessionId }),
    });
    const deadline = performance.now() + 6_000;
    while (performance.now() < deadline) {
      await pollCtcCues();
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  } catch (error) {
    ctc.error = error.message;
  } finally {
    ctc.closed = true;
    void fetch('/alignment/ctc/dispose', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sessionId: ctc.sessionId }),
    });
  }
}

function renderWords(words) {
  arabic.replaceChildren(
    ...words.map((word, index) => {
      const span = document.createElement('span');
      span.className = 'word';
      span.dataset.index = index;
      span.textContent = `${word.text} `;
      return span;
    })
  );
}

function decodePcm(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function pcmToFloat32(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const samples = new Float32Array(bytes.byteLength / 2);
  for (let i = 0; i < samples.length; i += 1) samples[i] = view.getInt16(i * 2, true) / 32768;
  return samples;
}

function wavBlob(chunks) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const out = new Uint8Array(44 + length);
  const view = new DataView(out.buffer);
  const text = (offset, value) =>
    [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, 'data');
  view.setUint32(40, length, true);
  let offset = 44;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return new Blob([out], { type: 'audio/wav' });
}

function anchoredSegmentStart(segmentIndex, profile) {
  const expected = currentDemo.expectedSegmentStarts[segmentIndex];
  if (profile.family === 'vad') return currentDemo.vad.segmentStarts[segmentIndex] ?? expected;
  if (profile.family === 'vad-slew') {
    const observed = currentDemo.vad.segmentStarts[segmentIndex];
    if (observed == null) return expected;
    const limit = (profile.maxAnchorCorrectionMs || 0) / 1000;
    return expected + Math.max(-limit, Math.min(limit, observed - expected));
  }
  return expected;
}

function playbackSnapshot() {
  const mode = selectedMode();
  const profile = activeProfile(mode);
  const elapsed = Math.max(0, audioContext.currentTime - currentDemo.audioStart);
  const visualElapsed = Math.max(0, elapsed + currentDemo.nudgeSeconds);
  const wholeDuration = expectedDuration(currentDemo.words, mode);

  if (profile.family === 'live-transcript') return liveTranscriptSnapshot(profile, elapsed);

  if (profile.family === 'future-anchor') return futureAnchorSnapshot(profile, elapsed);

  if (profile.family === 'precision-ctc') return precisionCtcSnapshot(profile, elapsed);

  if (profile.family === 'nucleus-clock') return nucleusClockSnapshot(elapsed, profile);

  if (profile.family === 'google') {
    const phraseAnchor = currentDemo.google?.phraseAnchors.find(
      (anchor) => visualElapsed <= anchor.end
    );
    const fallbackIndex = phraseAnchor
      ? Math.floor((visualElapsed / phraseAnchor.end) * phraseAnchor.index)
      : wordIndexForTime(currentDemo.words, visualElapsed, 'weighted', wholeDuration);
    let matchedIndex = -1;
    for (const [index, cue] of currentDemo.google?.wordCues || []) {
      if (cue.start <= visualElapsed + 0.08) matchedIndex = Math.max(matchedIndex, index);
    }
    const activeIndex = Math.max(
      currentDemo.google?.lastRenderedIndex || 0,
      matchedIndex,
      fallbackIndex
    );
    if (currentDemo.google) currentDemo.google.lastRenderedIndex = activeIndex;
    return {
      activeIndex,
      activeEnd: activeIndex + 1,
      elapsed,
      expectedDuration: wholeDuration,
      mode,
    };
  }

  if (profile.family === 'agreement-window') {
    const weightedIndex = wordIndexForTime(
      currentDemo.words,
      visualElapsed,
      'weighted',
      expectedDuration(currentDemo.words, 'weighted')
    );
    const phoneticIndex = wordIndexForTime(
      currentDemo.words,
      visualElapsed,
      'phonetic',
      expectedDuration(currentDemo.words, 'phonetic')
    );
    const agrees =
      Math.abs(weightedIndex - phoneticIndex) <= (profile.agreementThresholdWords ?? 1);
    const activeIndex = agrees ? weightedIndex : Math.min(weightedIndex, phoneticIndex);
    return {
      activeIndex,
      activeEnd: agrees
        ? activeIndex + 1
        : Math.min(currentDemo.words.length, activeIndex + (profile.uncertainWindowWords ?? 2)),
      uncertain: !agrees,
      elapsed,
      expectedDuration: wholeDuration,
      mode,
    };
  }

  if (['phrase', 'verse', 'vad', 'vad-slew'].includes(profile.family)) {
    let segmentIndex = currentDemo.segments.length - 1;
    for (let index = 0; index < currentDemo.segments.length; index += 1) {
      const start = anchoredSegmentStart(index, profile);
      const next = anchoredSegmentStart(index + 1, profile) ?? Infinity;
      if (visualElapsed >= start && visualElapsed < next) {
        segmentIndex = index;
        break;
      }
    }
    const segment = currentDemo.segments[segmentIndex];
    if (profile.family === 'phrase') {
      return {
        activeIndex: segment.wordStart,
        activeEnd: segment.wordEnd,
        elapsed,
        expectedDuration: wholeDuration,
        mode,
      };
    }
    const segmentStart = anchoredSegmentStart(segmentIndex, profile);
    const segmentDuration = expectedDuration(
      currentDemo.words.slice(segment.wordStart, segment.wordEnd),
      'weighted'
    );
    const localIndex = wordIndexForTime(
      currentDemo.words.slice(segment.wordStart, segment.wordEnd),
      visualElapsed - segmentStart,
      'weighted',
      segmentDuration
    );
    return {
      activeIndex: segment.wordStart + localIndex,
      activeEnd: segment.wordStart + localIndex + 1,
      elapsed,
      expectedDuration: wholeDuration,
      mode,
    };
  }

  const activeIndex = wordIndexForTime(currentDemo.words, visualElapsed, mode, wholeDuration);
  return {
    activeIndex,
    activeEnd: activeIndex + 1,
    elapsed,
    expectedDuration: wholeDuration,
    mode,
  };
}

function inspectVad(samples) {
  const frameSize = 480;
  const profile = currentDemo.profile;
  const threshold = profile.vadThreshold || 0.018;
  const minQuietSamples = SAMPLE_RATE * ((profile.vadQuietMs || 120) / 1000);
  const vad = currentDemo.vad;
  for (let offset = 0; offset + frameSize <= samples.length; offset += frameSize) {
    let energy = 0;
    for (let index = 0; index < frameSize; index += 1) energy += samples[offset + index] ** 2;
    const samplePosition = vad.samplesSeen + offset;
    if (Math.sqrt(energy / frameSize) < threshold) {
      vad.quietSince ??= samplePosition;
      continue;
    }
    if (vad.quietSince != null && samplePosition - vad.quietSince >= minQuietSamples) {
      const cue = samplePosition / SAMPLE_RATE;
      const nextSegment = vad.segmentStarts.length;
      const target = currentDemo.expectedSegmentStarts[nextSegment];
      if (target != null && Math.abs(cue - target) < 1.8) vad.segmentStarts.push(cue);
    }
    vad.quietSince = null;
  }
  vad.samplesSeen += samples.length;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function nucleusClockSnapshot(elapsed, profile) {
  const nucleus = currentDemo.nucleus;
  const events = nucleus.events.filter((event) => event.time <= elapsed);
  if (!events.length && elapsed >= profile.fallbackAfterNoPeakMs / 1000) {
    nucleus.fallback = true;
  }
  if (nucleus.fallback) {
    const activeIndex = wordIndexForTime(
      currentDemo.words,
      elapsed,
      'weighted',
      expectedDuration(currentDemo.words, 'weighted')
    );
    nucleus.lastRenderedIndex = Math.max(nucleus.lastRenderedIndex, activeIndex);
    return {
      activeIndex: nucleus.lastRenderedIndex,
      activeEnd: nucleus.lastRenderedIndex + 1,
      elapsed,
      expectedDuration: expectedDuration(currentDemo.words, 'weighted'),
      mode: selectedMode(),
    };
  }

  const observedMass = events.reduce((total, event) => total + event.mass, 0);
  let activeIndex = profile.initialActiveIndex;
  let targetMass = currentDemo.nucleusTextMassByWord[activeIndex] || 1;
  while (activeIndex < currentDemo.words.length - 1 && observedMass >= targetMass) {
    activeIndex += 1;
    targetMass += currentDemo.nucleusTextMassByWord[activeIndex] || 1;
  }
  nucleus.lastRenderedIndex = Math.max(nucleus.lastRenderedIndex, activeIndex);
  return {
    activeIndex: nucleus.lastRenderedIndex,
    activeEnd: nucleus.lastRenderedIndex + 1,
    elapsed,
    expectedDuration: expectedDuration(currentDemo.words, 'weighted'),
    mode: selectedMode(),
  };
}

function resetNucleusContinuity(nucleus) {
  nucleus.pendingSamples = new Float32Array(0);
  nucleus.pendingStart = null;
  nucleus.frameWindow = [];
  nucleus.energyHistory = [];
}

function inspectNuclei(samples, scheduledContentStart) {
  const profile = currentDemo.profile;
  if (profile.family !== 'nucleus-clock') return;

  const startedAt = performance.now();
  const nucleus = currentDemo.nucleus;
  const frameSize = Math.round((profile.frameMs / 1000) * SAMPLE_RATE);
  const expectedStart =
    nucleus.pendingStart == null
      ? null
      : nucleus.pendingStart + nucleus.pendingSamples.length / SAMPLE_RATE;
  if (expectedStart != null && Math.abs(expectedStart - scheduledContentStart) > 0.002) {
    resetNucleusContinuity(nucleus);
  }

  let combined = samples;
  let combinedStart = scheduledContentStart;
  if (nucleus.pendingSamples.length) {
    combined = new Float32Array(nucleus.pendingSamples.length + samples.length);
    combined.set(nucleus.pendingSamples);
    combined.set(samples, nucleus.pendingSamples.length);
    combinedStart = nucleus.pendingStart;
  }

  let offset = 0;
  while (offset + frameSize <= combined.length) {
    let sumSquares = 0;
    for (let index = offset; index < offset + frameSize; index += 1) {
      sumSquares += combined[index] ** 2;
    }
    const rawEnergy = Math.sqrt(sumSquares / frameSize);
    const previous = nucleus.frameWindow.at(-1);
    const smoothing = profile.frameMs / profile.envelopeSmoothingMs;
    const energy = previous
      ? previous.energy + clamp(smoothing, 0, 1) * (rawEnergy - previous.energy)
      : rawEnergy;
    const frame = {
      energy,
      time: combinedStart + (offset + frameSize / 2) / SAMPLE_RATE,
    };
    nucleus.frameWindow.push(frame);
    nucleus.energyHistory.push(energy);
    if (nucleus.energyHistory.length > 100) nucleus.energyHistory.shift();

    const lookaheadFrames = Math.round(profile.peakLookaheadMs / profile.frameMs);
    const windowSize = lookaheadFrames * 2 + 1;
    if (nucleus.frameWindow.length >= windowSize) {
      const window = nucleus.frameWindow.slice(-windowSize);
      const candidate = window[lookaheadFrames];
      const background = median(nucleus.energyHistory);
      const deviations = nucleus.energyHistory.map((value) => Math.abs(value - background));
      const threshold = Math.max(0.012, background + 1.2 * median(deviations));
      const isLocalMaximum = window.every((frame) => candidate.energy >= frame.energy);
      const farEnough = candidate.time - nucleus.lastAcceptedTime >= profile.minPeakGapMs / 1000;
      if (isLocalMaximum && candidate.energy >= threshold && farEnough) {
        const preceding = window.slice(0, lookaheadFrames + 1);
        const valley = preceding.reduce((lowest, frame) =>
          frame.energy < lowest.energy ? frame : lowest
        );
        const halfHeight = candidate.energy * 0.6;
        const widthFrames = window.filter((frame) => frame.energy >= halfHeight).length;
        const mass = clamp((widthFrames * profile.frameMs) / 40, 0.5, 2);
        nucleus.events.push({ time: valley.time, mass });
        nucleus.lastAcceptedTime = candidate.time;
        nucleus.acousticMass += mass;
      }
      nucleus.frameWindow.shift();
    }
    offset += frameSize;
  }

  nucleus.pendingSamples = combined.slice(offset);
  nucleus.pendingStart = combinedStart + offset / SAMPLE_RATE;
  const cpuMs = performance.now() - startedAt;
  nucleus.cpuMs += cpuMs;
  nucleus.chunkCpuMs.push(cpuMs);
}

function drawAuditCanvas({
  activeIndex,
  elapsed,
  expectedDuration,
  mode,
  currentSegment,
  previewSegment,
}) {
  const { canvas, context } = currentDemo.audit;
  const { width, height } = canvas;
  context.fillStyle = '#10192d';
  context.fillRect(0, 0, width, height);
  context.direction = 'ltr';
  context.textAlign = 'left';
  context.fillStyle = '#e5bb62';
  context.font = '700 28px system-ui';
  context.fillText('Gemini Live · timing audit', 60, 70);
  context.fillStyle = '#f5ead2';
  context.font = '700 52px system-ui';
  context.fillText('Audio clock → highlight clock', 60, 140);
  context.fillStyle = '#c8d3e4';
  context.font = '28px system-ui';
  context.fillText(`playhead ${elapsed.toFixed(2)} s · ${mode} strategy`, 60, 190);
  context.fillStyle = '#263a5e';
  context.fillRect(60, 220, width - 120, 12);
  context.fillStyle = '#e5bb62';
  context.fillRect(60, 220, Math.min(1, elapsed / expectedDuration) * (width - 120), 12);

  let x = width - 70;
  let y = 330;
  context.direction = 'rtl';
  context.textAlign = 'right';
  context.font = '52px serif';
  for (let index = 0; index < currentDemo.words.length; index += 1) {
    const word = currentDemo.words[index].text;
    const wordWidth = context.measureText(word).width;
    if (x - wordWidth < 70) {
      x = width - 70;
      y += 100;
    }
    const segmentIndex = segmentIndexForWord(index);
    if (segmentIndex === currentSegment) {
      context.fillStyle = `rgba(229, 187, 98, ${currentDemo.profile.currentAlpha || 0})`;
      context.fillRect(x - wordWidth - 10, y - 56, wordWidth + 20, 72);
    } else if (segmentIndex === previewSegment) {
      context.fillStyle = `rgba(229, 187, 98, ${currentDemo.profile.nextAlpha || 0})`;
      context.fillRect(x - wordWidth - 10, y - 56, wordWidth + 20, 72);
    }
    if (index >= activeIndex && index < currentDemo.snapshot.activeEnd) {
      context.fillStyle = '#e5bb62';
      context.fillRect(x - wordWidth - 10, y - 56, wordWidth + 20, 72);
    }
    context.fillStyle = index < activeIndex ? '#8fa3c4' : '#f5ead2';
    if (index >= activeIndex && index < currentDemo.snapshot.activeEnd)
      context.fillStyle = '#15203a';
    context.fillText(word, x, y);
    x -= wordWidth + 26;
  }
}

function paintPlayback() {
  if (!currentDemo?.audioStart) return;
  const snapshot = playbackSnapshot();
  currentDemo.snapshot = snapshot;
  const previous = currentDemo.highlightTimeline.at(-1);
  if (!previous || snapshot.elapsed - previous.time >= 0.05) {
    currentDemo.highlightTimeline.push({
      time: snapshot.elapsed,
      activeIndex: snapshot.activeIndex,
      activeEnd: snapshot.activeEnd,
      currentSegment: snapshot.currentSegment,
      previewSegment: snapshot.previewSegment,
      previewSource: snapshot.previewSource,
      certaintyTier: snapshot.certaintyTier,
    });
  }
  const lastTransition = currentDemo.highlightTransitions.at(-1);
  if (
    !lastTransition ||
    lastTransition.activeIndex !== snapshot.activeIndex ||
    lastTransition.activeEnd !== snapshot.activeEnd
  ) {
    currentDemo.highlightTransitions.push({
      contentTime: Number(snapshot.elapsed.toFixed(4)),
      activeIndex: snapshot.activeIndex,
      activeEnd: snapshot.activeEnd,
    });
  }
  document.querySelectorAll('.word').forEach((node, index) => {
    const segmentIndex = segmentIndexForWord(index);
    node.classList.toggle('active', index >= snapshot.activeIndex && index < snapshot.activeEnd);
    node.classList.toggle(
      'uncertain',
      Boolean(snapshot.uncertain) && index >= snapshot.activeIndex && index < snapshot.activeEnd
    );
    node.classList.toggle('complete', index < snapshot.activeIndex);
    node.classList.toggle('context-phrase', segmentIndex === snapshot.currentSegment);
    node.classList.toggle('preview-phrase', segmentIndex === snapshot.previewSegment);
  });
  drawAuditCanvas(snapshot);
  currentDemo.frame = requestAnimationFrame(paintPlayback);
}

function startAuditCapture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const context = canvas.getContext('2d');
  const destination = audioContext.createMediaStreamDestination();
  const stream = new MediaStream([
    ...canvas.captureStream(30).getVideoTracks(),
    ...destination.stream.getAudioTracks(),
  ]);
  const chunks = [];
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
  currentDemo.audit = { canvas, context, destination, recorder, chunks };
  currentDemo.audit.finished = new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType });
      downloadAudit.href = URL.createObjectURL(blob);
      downloadAudit.download = `live-word-sync-clock-${currentDemo.poem.id}.webm`;
      downloadAudit.hidden = false;
      resolve();
    };
  });
  recorder.ondataavailable = ({ data }) => {
    if (data.size) chunks.push(data);
  };
  recorder.start(250);
}

async function finishAuditCapture(endTime) {
  const remainingMs = Math.max(0, (endTime - audioContext.currentTime) * 1000 + 150);
  await new Promise((resolve) => setTimeout(resolve, remainingMs));
  cancelAnimationFrame(currentDemo.frame);
  if (currentDemo.audit.recorder.state !== 'inactive') currentDemo.audit.recorder.stop();
  await currentDemo.audit.finished;
}

async function loadPoem() {
  harnessConfig ||= await loadHarnessConfig();
  const response = await fetch(`${API_BASE}/api/poems/${harnessConfig.poemId}`);
  if (!response.ok) throw new Error(`Poem request failed (${response.status})`);
  const data = await response.json();
  const lines = data.arabic
    .split(/[\n*]+/)
    .map((line) => line.trim())
    .filter(Boolean);
  return { ...data, lines, excerpt: lines.join('\n') };
}

async function streamLiveTts(text) {
  const startedAt = performance.now();
  currentDemo.abortController = new AbortController();
  const response = await fetch(`${API_BASE}/api/ai/live-tts?stream=1`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voiceName: harnessConfig.tts.voiceName,
      temperature: harnessConfig.tts.temperature,
      systemInstruction: harnessConfig.tts.systemInstruction,
    }),
    signal: currentDemo.abortController.signal,
  });
  if (!response.ok || !response.body)
    throw new Error(`Live TTS request failed (${response.status})`);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let pending = '';
  let nextStart = 0;
  const pcmChunks = [];
  let chunks = 0;
  let firstAudioMs;
  const heldPcm = [];
  const precision = currentDemo.precision;

  function schedulePcm(segment) {
    const buffer = audioContext.createBuffer(1, segment.samples.length, SAMPLE_RATE);
    buffer.copyToChannel(segment.samples, 0);
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    currentDemo.sources.push(source);
    source.connect(audioContext.destination);
    source.connect(currentDemo.audit.destination);
    const previousNextStart = nextStart;
    nextStart = Math.max(nextStart, audioContext.currentTime + 0.02);
    if (currentDemo.pcmTrace.length && nextStart > previousNextStart) {
      currentDemo.insertedGapSeconds += nextStart - previousNextStart;
    }
    source.start(nextStart);
    const scheduledContentStart = nextStart - currentDemo.audioStart;
    currentDemo.pcmTrace.push({
      seq: segment.seq,
      contentStartSample: segment.contentStartSample,
      sampleCount: segment.samples.length,
      checksum: checksumHex(pcmChecksum(segment.pcm)),
      scheduledAt: nextStart,
      scheduledContentStart,
      durationSeconds: buffer.duration,
    });
    inspectVad(segment.samples);
    inspectNuclei(segment.samples, scheduledContentStart);
    nextStart += buffer.duration;
  }

  function startPlayback(reason) {
    if (currentDemo.audioStart || !heldPcm.length) return false;
    firstAudioMs = performance.now() - startedAt;
    nextStart = audioContext.currentTime + 0.05;
    currentDemo.audioStart = nextStart;
    if (precision) {
      precision.scheduledReason = reason;
      precision.firstAudioMs = Math.round(firstAudioMs);
      if (reason !== 'ctc-opening-phrase-ready') precision.fallbackReason = reason;
      clearTimeout(precision.deadlineTimer);
    }
    startAuditCapture();
    currentDemo.frame = requestAnimationFrame(paintPlayback);
    flushTranscriptAnchorQueue();
    while (heldPcm.length) schedulePcm(heldPcm.shift());
    return true;
  }

  function maybeStartPrecision(reason) {
    if (!precision || currentDemo.audioStart || !heldPcm.length) return;
    const minimumBuffered = currentDemo.profile.minBufferedAudioMs / 1000;
    if (precision.ready && precision.initialBufferDuration >= minimumBuffered) {
      startPlayback('ctc-opening-phrase-ready');
      return;
    }
    if (precision.deadlineExpired) startPlayback(reason || 'precision-deadline-mora-50-fallback');
  }

  if (precision) {
    precision.streamStartedAt = startedAt;
    precision.maybeStart = maybeStartPrecision;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done || currentDemo.stopped) break;
    pending += decoder.decode(value, { stream: true });
    const frames = pending.split(/\r?\n\r?\n/);
    pending = frames.pop();
    for (const frame of frames) {
      const dataLine = frame.split(/\r?\n/).find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      const event = JSON.parse(dataLine.slice(6));
      if (event.error) throw new Error(event.error);
      if (event.partialTimings) updateLiveTimings(event.partialTimings);
      if (event.done && event.wordTimings) updateLiveTimings(event.wordTimings);
      if (!event.chunk) continue;

      const pcm = decodePcm(event.chunk);
      const samples = pcmToFloat32(pcm);
      const contentStartSample = currentDemo.contentSamplesSeen;
      const segment = { seq: chunks, pcm, samples, contentStartSample };
      currentDemo.contentSamplesSeen += samples.length;
      if (selectedMode() === 'google' || currentDemo.profile.anchorProvider === 'google') {
        sendGoogleChunk(pcm);
      }
      if (currentDemo.profile.anchorProvider === 'ctc') {
        sendCtcChunk(pcm, { seq: chunks, contentStartSample, sampleCount: samples.length });
      }
      pcmChunks.push(pcm);
      chunks += 1;
      heldPcm.push(segment);
      if (precision) {
        if (!precision.firstPcmAtWallMs) {
          precision.firstPcmAtWallMs = Math.round(performance.now() - startedAt);
          precision.deadlineAtWallMs =
            precision.firstPcmAtWallMs + currentDemo.profile.startupDeadlineMs;
          precision.deadlineTimer = setTimeout(() => {
            precision.deadlineExpired = true;
            maybeStartPrecision('precision-deadline-mora-50-fallback');
          }, currentDemo.profile.startupDeadlineMs);
        }
        precision.initialBufferDuration += samples.length / SAMPLE_RATE;
        maybeStartPrecision();
      } else {
        startPlayback('first-pcm');
      }
      if (currentDemo.audioStart) {
        while (heldPcm.length) schedulePcm(heldPcm.shift());
      }
      setMetrics(
        [
          {
            value: firstAudioMs == null ? 'buffering' : `${Math.round(firstAudioMs)} ms`,
            label: 'request → first playable audio',
          },
          { value: `${chunks}`, label: 'PCM chunks received' },
          {
            value: currentDemo.audioStart
              ? `${(nextStart - audioContext.currentTime).toFixed(1)} s`
              : `${precision?.initialBufferDuration.toFixed(1) || 0} s`,
            label: currentDemo.audioStart ? 'audio already queued' : 'precision pre-roll buffered',
          },
          { value: selectedMode(), label: 'highlight strategy' },
          {
            value: `${currentDemo.vad.segmentStarts.length}/${currentDemo.segments.length}`,
            label: 'VAD verse starts found',
          },
          selectedMode() === 'nucleus-clock'
            ? { value: `${currentDemo.nucleus.events.length}`, label: 'acoustic nuclei found' }
            : null,
          currentDemo.profile.family === 'future-anchor'
            ? {
                value: `${currentDemo.anchor.events.filter((event) => event.status === 'accepted').length}/${currentDemo.anchor.events.length}`,
                label: 'accepted / received transcript anchors',
              }
            : null,
          precision
            ? {
                value: `${precision.cues.size}/${currentDemo.profile.requiredCueCount}`,
                label: precision.ready ? 'opening CTC phrase ready' : 'opening CTC phrase cues',
              }
            : null,
        ].filter(Boolean)
      );
    }
  }

  if (precision && !currentDemo.audioStart) {
    const anchorWallMs = precision.firstPcmAtWallMs ?? Math.round(performance.now() - startedAt);
    const remainingMs = Math.max(
      0,
      anchorWallMs + currentDemo.profile.startupDeadlineMs - (performance.now() - startedAt)
    );
    if (remainingMs) await new Promise((resolve) => setTimeout(resolve, remainingMs));
    precision.deadlineExpired = true;
    maybeStartPrecision('precision-stream-complete-mora-50-fallback');
  }
  if (currentDemo.stopped) return;
  if (!currentDemo.audioStart) throw new Error('No PCM was buffered for playback.');
  const duration = pcmChunks.reduce((sum, chunk) => sum + chunk.length / 2 / SAMPLE_RATE, 0);
  await finishAuditCapture(nextStart);
  await stopGoogleTiming();
  await stopCtcTiming();
  currentDemo.metrics = {
    firstAudioMs,
    chunks,
    duration,
    strategy: selectedMode(),
    parameters: {
      ...currentDemo.profile,
      manualNudgeMs: Math.round(visualNudgeSeconds * 1000),
      effectiveNudgeMs: Math.round(currentDemo.nudgeSeconds * 1000),
    },
    vadVerseStarts: currentDemo.vad.segmentStarts,
    googlePhraseAnchors: currentDemo.google?.phraseAnchors.length || 0,
    nucleus:
      currentDemo.profile.family === 'nucleus-clock'
        ? {
            events: currentDemo.nucleus.events,
            eventCount: currentDemo.nucleus.events.length,
            acousticMass: Number(currentDemo.nucleus.acousticMass.toFixed(3)),
            textMoraMass: currentDemo.nucleus.textMoraMass,
            massRatio: Number(
              (currentDemo.nucleus.acousticMass / currentDemo.nucleus.textMoraMass).toFixed(3)
            ),
            detectorCpuMs: Number(currentDemo.nucleus.cpuMs.toFixed(3)),
            detectorP95ChunkMs: Number(percentile(currentDemo.nucleus.chunkCpuMs, 0.95).toFixed(3)),
            detectorRealTimeFactor: Number(
              (currentDemo.nucleus.cpuMs / (duration * 1000)).toFixed(4)
            ),
            fallback: currentDemo.nucleus.fallback,
          }
        : null,
    anchor:
      currentDemo.profile.family === 'future-anchor'
        ? {
            source: currentDemo.profile.anchorSource,
            mode: currentDemo.profile.anchorMode,
            events: currentDemo.anchor.events,
            receivedCount: currentDemo.anchor.events.length,
            acceptedCount: currentDemo.anchor.events.filter((event) => event.status === 'accepted')
              .length,
            rejectedCount: currentDemo.anchor.events.filter((event) =>
              event.status.startsWith('rejected')
            ).length,
            providerError:
              (currentDemo.profile.anchorProvider === 'ctc'
                ? currentDemo.ctc?.error
                : currentDemo.google?.error) || null,
            unsettledWritesAtClose:
              (currentDemo.profile.anchorProvider === 'ctc'
                ? currentDemo.ctc?.unsettledWritesAtClose
                : currentDemo.google?.unsettledWritesAtClose) || 0,
            lastAcknowledgement:
              currentDemo.profile.anchorProvider === 'ctc'
                ? currentDemo.ctc?.lastAcknowledgement || null
                : null,
          }
        : null,
    precision: precision
      ? {
          openingPhraseWordCount: currentDemo.profile.phraseWordCount,
          requiredCueCount: currentDemo.profile.requiredCueCount,
          receivedCueCount: precision.cues.size,
          ready: precision.ready,
          readyAtWallMs: precision.readyAtWallMs,
          firstPcmAtWallMs: precision.firstPcmAtWallMs,
          deadlineAtWallMs: precision.deadlineAtWallMs,
          firstAudioMs: precision.firstAudioMs,
          initialBufferMs: Math.round(precision.initialBufferDuration * 1000),
          scheduledReason: precision.scheduledReason,
          fallbackReason: precision.fallbackReason,
          cues: [...precision.cues.values()],
          ranges: precision.ranges,
          directCommittedCueCount: [...precision.cues.values()].filter((cue) => cue.directCommitted)
            .length,
          directRejectedLateCount: precision.directRejectedLateCount,
          rangeError: precision.rangeError || null,
          providerError: currentDemo.ctc?.error || null,
          lastAcknowledgement: currentDemo.ctc?.lastAcknowledgement || null,
        }
      : null,
    pcmTrace: currentDemo.pcmTrace.map((trace) => ({
      seq: trace.seq,
      contentStartSample: trace.contentStartSample,
      sampleCount: trace.sampleCount,
      checksum: trace.checksum,
      scheduledContentStart: Number(trace.scheduledContentStart.toFixed(4)),
    })),
    highlightTimeline: currentDemo.highlightTimeline,
    highlightTransitions: currentDemo.highlightTransitions,
  };
  download.href = URL.createObjectURL(wavBlob(pcmChunks));
  download.download = `live-word-sync-${currentDemo.poem.id}.wav`;
  download.hidden = false;
  window.__pocMetrics = { poem: currentDemo.poem, ...currentDemo.metrics };
  setMetrics(
    [
      { value: `${Math.round(firstAudioMs)} ms`, label: 'request → first playable audio' },
      { value: `${chunks}`, label: 'PCM chunks scheduled' },
      { value: `${duration.toFixed(1)} s`, label: 'captured audio duration' },
      { value: selectedMode(), label: 'highlight strategy' },
      {
        value: `${currentDemo.vad.segmentStarts.length}/${currentDemo.segments.length}`,
        label: 'VAD verse starts found',
      },
      selectedMode() === 'nucleus-clock'
        ? {
            value: `${currentDemo.nucleus.events.length} · ${currentDemo.metrics.nucleus.massRatio}×`,
            label: 'acoustic nuclei · mass ratio',
          }
        : null,
      selectedMode() === 'google'
        ? {
            value: `${currentDemo.google?.phraseAnchors.length || 0}`,
            label: 'Google phrase anchors',
          }
        : currentDemo.profile.family === 'future-anchor'
          ? {
              value: `${currentDemo.metrics.anchor.acceptedCount}/${currentDemo.metrics.anchor.receivedCount}`,
              label: 'accepted / received transcript anchors',
            }
          : { value: 'fallback', label: 'external cue source' },
    ].filter(Boolean)
  );
}

function createDemo(selected) {
  const profile = activeProfile();
  const words = tokenize(selected.excerpt);
  const segments = makeSegments(selected.lines);
  const expectedSegmentStarts = [0];
  for (let index = 0; index < segments.length - 1; index += 1) {
    const previous = segments[index];
    expectedSegmentStarts.push(
      expectedSegmentStarts[index] +
        expectedDuration(words.slice(previous.wordStart, previous.wordEnd)) +
        (profile.linePauseMs || 0) / 1000
    );
  }
  return {
    poem: selected,
    words,
    segments,
    expectedSegmentStarts,
    nudgeSeconds: visualNudgeSeconds + (profile.nudgeMs || 0) / 1000,
    profile,
    vad: { samplesSeen: 0, quietSince: null, segmentStarts: [0] },
    nucleus: {
      pendingSamples: new Float32Array(0),
      pendingStart: null,
      frameWindow: [],
      energyHistory: [],
      events: [],
      lastAcceptedTime: -Infinity,
      lastRenderedIndex: profile.initialActiveIndex || 0,
      acousticMass: 0,
      textMoraMass: words.reduce((total, word) => total + moraWeight(word.text), 0),
      cpuMs: 0,
      chunkCpuMs: [],
      fallback: false,
    },
    nucleusTextMassByWord: words.map((word) => moraWeight(word.text)),
    liveTimings: Array(words.length).fill(null),
    precision:
      profile.family === 'precision-ctc'
        ? {
            timings: Array(words.length).fill(null),
            cues: new Map(),
            ready: false,
            readyAtWallMs: null,
            streamStartedAt: null,
            initialBufferDuration: 0,
            scheduledReason: null,
            fallbackReason: null,
            lastRenderedIndex: 0,
            ranges: Array.from(
              { length: Math.ceil(words.length / profile.alignmentWordCount) },
              (_, rangeIndex) => ({
                rangeIndex,
                sourceStartIndex: rangeIndex * profile.alignmentWordCount,
                sourceEndIndex: Math.min(
                  words.length,
                  (rangeIndex + 1) * profile.alignmentWordCount
                ),
                status: rangeIndex === 0 ? 'active' : 'pending',
              })
            ),
            activeRangeIndex: 0,
            directRejectedLateCount: 0,
          }
        : null,
    contentSamplesSeen: 0,
    pcmTrace: [],
    anchor:
      profile.family === 'future-anchor'
        ? {
            plan: weightedFallbackPlan(words),
            events: [],
            pending: new Map(),
            seen: new Set(),
            lastSeenSourceIndex: -1,
            lastAcceptedIndex: -1,
            lastRenderedIndex: 0,
          }
        : null,
    insertedGapSeconds: 0,
    sources: [],
    stopped: false,
    audioStart: null,
    highlightTimeline: [],
    highlightTransitions: [],
  };
}

pullPoemButton.addEventListener('click', async () => {
  pullPoemButton.disabled = true;
  pullPoemButton.textContent = 'Pulling poem…';
  try {
    loadedPoem = await loadPoem();
    currentDemo = createDemo(loadedPoem);
    title.textContent = loadedPoem.titleArabic || loadedPoem.title || 'Untitled poem';
    byline.textContent = loadedPoem.poetArabic || loadedPoem.poet || '';
    renderWords(currentDemo.words);
    poem.hidden = false;
    modeLab.hidden = false;
    testMethodButton.hidden = false;
    stopTestButton.hidden = false;
    setMetrics([{ value: 'Ready', label: 'choose a strategy, then test it' }]);
    markNeedsTest();
    pullPoemButton.textContent = 'Reload reference poem';
  } catch (error) {
    setMetrics([{ value: 'Unavailable', label: error.message }]);
    pullPoemButton.textContent = 'Retry poem pull';
  } finally {
    pullPoemButton.disabled = false;
  }
});

testMethodButton.addEventListener('click', async () => {
  if (!loadedPoem) return;
  isTesting = true;
  testMethodButton.disabled = true;
  testMethodButton.textContent = 'Testing Gemini Live…';
  pullPoemButton.disabled = true;
  stopTestButton.disabled = false;
  try {
    audioContext ||= new AudioContext({ sampleRate: SAMPLE_RATE });
    await audioContext.resume();
    currentDemo = createDemo(loadedPoem);
    if (selectedMode() === 'google' || currentDemo.profile.anchorProvider === 'google') {
      await startGoogleTiming();
    }
    if (currentDemo.profile.anchorProvider === 'ctc') await startCtcTiming();
    setMetrics([{ value: 'Waiting', label: `for ${selectedMode()} strategy audio` }]);
    await streamLiveTts(loadedPoem.arabic);
    testMethodButton.textContent = 'Test selected method again';
    testMethodButton.disabled = false;
  } catch (error) {
    if (currentDemo?.stopped) {
      setMetrics([{ value: 'Stopped', label: 'reading stopped; change settings or test again' }]);
      testMethodButton.textContent = 'Test selected method';
      testMethodButton.disabled = false;
    } else {
      setMetrics([{ value: 'Unavailable', label: error.message }]);
      testMethodButton.textContent = 'Retry selected method';
      testMethodButton.disabled = false;
    }
  } finally {
    isTesting = false;
    pullPoemButton.disabled = false;
    stopTestButton.disabled = true;
  }
});

stopTestButton.addEventListener('click', () => {
  if (!currentDemo || !isTesting) return;
  currentDemo.stopped = true;
  currentDemo.abortController?.abort();
  void stopGoogleTiming();
  void stopCtcTiming();
  currentDemo.sources.forEach((source) => {
    try {
      source.stop();
    } catch {}
  });
  cancelAnimationFrame(currentDemo.frame);
  if (currentDemo.audit?.recorder?.state === 'recording') currentDemo.audit.recorder.stop();
  stopTestButton.disabled = true;
});

modeInputs.forEach((input) => input.addEventListener('change', markNeedsTest));
nudgeInput.addEventListener('input', () => {
  visualNudgeSeconds = Number(nudgeInput.value) / 1000;
  markNeedsTest();
});
showLabButton.addEventListener('click', () => selectView('lab'));
showRunsButton.addEventListener('click', () => selectView('runs'));
updateModeUI();
void refreshProviderStatus();
