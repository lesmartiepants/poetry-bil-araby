import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const comparisons = resolve(root, 'artifacts', 'comparisons');
const outputs = resolve(root, 'artifacts', 'global-search');

const round = (value, places = 1) =>
  Number.isFinite(value) ? Number(value.toFixed(places)) : null;
const mean = (values) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const percentile = (values, fraction) => {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
};
const percent = (value) => `${round((value || 0) * 100)}%`;

function parseArgs(argumentsList) {
  const options = { tag: null, minTrain: 5, minHoldout: 2, maxP90FirstAudioMs: 1500 };
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === '--tag') options.tag = argumentsList[++index];
    else if (argument === '--min-train') options.minTrain = Number(argumentsList[++index]);
    else if (argument === '--min-holdout') options.minHoldout = Number(argumentsList[++index]);
    else if (argument === '--max-p90-first-audio-ms')
      options.maxP90FirstAudioMs = Number(argumentsList[++index]);
    else throw new Error(`Unknown option: ${argument}`);
  }
  if (
    !Number.isInteger(options.minTrain) ||
    !Number.isInteger(options.minHoldout) ||
    !Number.isFinite(options.maxP90FirstAudioMs)
  ) {
    throw new Error('Invalid global-search options.');
  }
  if (options.tag && !/^[a-z0-9][a-z0-9-]{0,64}$/i.test(options.tag)) {
    throw new Error('--tag must contain only letters, numbers, and hyphens.');
  }
  return options;
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function familyFor(method) {
  if (method.includes('ctc')) return 'CTC alignment';
  if (method.includes('google')) return 'external STT anchor';
  if (method.includes('certainty')) return 'perceptual overlay';
  if (method.includes('nucleus')) return 'acoustic nuclei';
  if (method.includes('vad')) return 'VAD re-anchor';
  if (method.includes('agreement')) return 'agreement clock';
  if (method === 'verse' || method.includes('verse')) return 'verse-local clock';
  if (method.includes('transcript') || method.includes('mora') || method.includes('branch'))
    return 'transcript + prosody';
  if (method.includes('weighted') || method.includes('uniform') || method === 'main-char-650')
    return 'fixed clock';
  return 'other';
}

function karaokeScore(score) {
  // Different from the historic broad qualityScore: this weights the one thing
  // karaoke needs most—an exact, single-word highlight at speech onset.
  return 0.8 * score.exactRate + 0.1 * score.nearRate + 0.1 * score.sourceCoverage;
}

function aggregate(samples) {
  const values = (key) => samples.map((sample) => sample[key]).filter(Number.isFinite);
  const karaoke = values('karaoke');
  const firstAudio = values('firstAudioMs');
  return {
    samples: samples.length,
    cohorts: new Set(samples.map((sample) => sample.cohort)).size,
    meanKaraoke: mean(karaoke),
    p25Karaoke: percentile(karaoke, 0.25),
    meanExact: mean(values('exactRate')),
    meanHistoricQuality: mean(values('historicQuality')),
    p90FirstAudioMs: percentile(firstAudio, 0.9),
    medianFirstAudioMs: percentile(firstAudio, 0.5),
  };
}

function dominates(left, right) {
  if (!Number.isFinite(left.holdout.meanKaraoke) || !Number.isFinite(right.holdout.meanKaraoke))
    return false;
  const faster = left.holdout.p90FirstAudioMs <= right.holdout.p90FirstAudioMs;
  const stronger = left.holdout.meanKaraoke >= right.holdout.meanKaraoke;
  return (
    faster &&
    stronger &&
    (left.holdout.p90FirstAudioMs < right.holdout.p90FirstAudioMs ||
      left.holdout.meanKaraoke > right.holdout.meanKaraoke)
  );
}

function renderChart(candidates, maxLatency) {
  const width = 1120;
  const height = 560;
  const margin = { left: 90, right: 50, top: 65, bottom: 90 };
  const plotWidth = width - margin.left - margin.right;
  const plotHeight = height - margin.top - margin.bottom;
  const eligible = candidates.filter(
    (candidate) =>
      Number.isFinite(candidate.holdout.meanKaraoke) &&
      Number.isFinite(candidate.holdout.p90FirstAudioMs)
  );
  const latencyMax = Math.max(
    maxLatency,
    ...eligible.map((candidate) => candidate.holdout.p90FirstAudioMs)
  );
  const x = (latency) => margin.left + (latency / latencyMax) * plotWidth;
  const y = (score) => margin.top + plotHeight * (1 - score);
  const color = (candidate) => {
    if (candidate.status === 'confirmed') return candidate.pareto ? '#15803d' : '#2563eb';
    if (candidate.status === 'needs-validation') return '#f97316';
    return '#94a3b8';
  };
  const points = eligible
    .map((candidate) => {
      const label =
        candidate.method.length > 24 ? `${candidate.method.slice(0, 22)}…` : candidate.method;
      const labelNode = candidate.pareto
        ? `<text x="${x(candidate.holdout.p90FirstAudioMs) - 10}" y="${y(candidate.holdout.meanKaraoke) - 10}" text-anchor="end" font-size="11" font-weight="600" fill="#334155">${label}</text>`
        : '';
      return `<g><circle cx="${x(candidate.holdout.p90FirstAudioMs)}" cy="${y(candidate.holdout.meanKaraoke)}" r="${candidate.pareto ? 8 : 6}" fill="${color(candidate)}"><title>${label}: holdout karaoke ${percent(candidate.holdout.meanKaraoke)}, P90 first audio ${round(candidate.holdout.p90FirstAudioMs)} ms</title></circle>${labelNode}</g>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Karaoke global search Pareto frontier">
  <rect width="100%" height="100%" fill="#fff"/>
  <text x="${margin.left}" y="30" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#0f172a">Karaoke global search — held-out evidence frontier</text>
  <text x="${margin.left}" y="50" font-family="system-ui, sans-serif" font-size="12" fill="#64748b">Higher is better. Green = confirmed Pareto candidate; blue = confirmed but dominated; orange = needs validation; gray = exploratory.</text>
  ${[0, 0.2, 0.4, 0.6, 0.8, 1].map((value) => `<line x1="${margin.left}" y1="${y(value)}" x2="${width - margin.right}" y2="${y(value)}" stroke="#e2e8f0"/><text x="${margin.left - 12}" y="${y(value) + 4}" text-anchor="end" font-size="12" fill="#64748b">${Math.round(value * 100)}%</text>`).join('')}
  ${[0, 0.25, 0.5, 0.75, 1]
    .map((fraction) => {
      const value = latencyMax * fraction;
      return `<line x1="${x(value)}" y1="${margin.top}" x2="${x(value)}" y2="${height - margin.bottom}" stroke="#f1f5f9"/><text x="${x(value)}" y="${height - margin.bottom + 22}" text-anchor="middle" font-size="12" fill="#64748b">${Math.round(value)} ms</text>`;
    })
    .join('')}
  <line x1="${x(maxLatency)}" y1="${margin.top}" x2="${x(maxLatency)}" y2="${height - margin.bottom}" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 5"/>
  <text x="${x(maxLatency) + 6}" y="${margin.top + 15}" font-size="12" fill="#b91c1c">${maxLatency} ms P90 gate</text>
  ${points}
  <text x="${margin.left + plotWidth / 2}" y="${height - 20}" text-anchor="middle" font-size="13" fill="#334155">Held-out P90 request → first playable audio</text>
  <text x="20" y="${margin.top + plotHeight / 2}" text-anchor="middle" transform="rotate(-90 20 ${margin.top + plotHeight / 2})" font-size="13" fill="#334155">Held-out karaoke score</text>
</svg>`;
}

const options = parseArgs(process.argv.slice(2));
const tag = options.tag || new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
const outputDir = resolve(outputs, tag);
await mkdir(outputs, { recursive: true });
try {
  await mkdir(outputDir);
} catch (error) {
  if (error?.code === 'EEXIST')
    throw new Error(`Global-search tag ${tag} already exists; choose a new tag.`);
  throw error;
}

const files = (await readdir(comparisons)).filter((file) => file.endsWith('-comparison.json'));
const samples = [];
for (const file of files) {
  let report;
  try {
    report = JSON.parse(await readFile(resolve(comparisons, file), 'utf8'));
  } catch {
    continue;
  }
  const poemId =
    report.referencePoemId ??
    report.results?.find((result) => result.metrics?.poem)?.metrics.poem?.id;
  const voice = report.tts?.voiceName || 'unknown';
  const cohort = `${poemId || 'unknown'}|${voice}`;
  const partition = hash(cohort) % 5 === 0 ? 'holdout' : 'train';
  for (const result of report.results || []) {
    const score = result.analysis?.score;
    if (result.status !== 'recorded' || !score || !Number.isFinite(score.exactRate)) continue;
    samples.push({
      method: result.method,
      family: familyFor(result.method),
      cohort,
      partition,
      poemId: poemId || null,
      voice,
      report: `artifacts/comparisons/${file}`,
      historicQuality: score.qualityScore,
      exactRate: score.exactRate,
      nearRate: score.nearRate,
      sourceCoverage: score.sourceCoverage,
      karaoke: karaokeScore(score),
      firstAudioMs: result.metrics?.firstAudioMs,
    });
  }
}

const byMethod = Object.groupBy(samples, (sample) => sample.method);
const candidates = Object.entries(byMethod)
  .map(([method, candidateSamples]) => {
    const train = aggregate(candidateSamples.filter((sample) => sample.partition === 'train'));
    const holdout = aggregate(candidateSamples.filter((sample) => sample.partition === 'holdout'));
    const enoughTrain = train.samples >= options.minTrain && train.cohorts >= 2;
    const enoughHoldout = holdout.samples >= options.minHoldout && holdout.cohorts >= 1;
    const latencyViable =
      Number.isFinite(holdout.p90FirstAudioMs) &&
      holdout.p90FirstAudioMs <= options.maxP90FirstAudioMs;
    const status =
      enoughTrain && enoughHoldout && latencyViable
        ? 'confirmed'
        : candidateSamples.length >= 3
          ? 'needs-validation'
          : 'exploratory';
    return {
      method,
      family: familyFor(method),
      samples: candidateSamples.length,
      train,
      holdout,
      gates: { enoughTrain, enoughHoldout, latencyViable },
      status,
      pareto: false,
    };
  })
  .sort((left, right) => (right.holdout.meanKaraoke ?? -1) - (left.holdout.meanKaraoke ?? -1));

const confirmed = candidates.filter((candidate) => candidate.status === 'confirmed');
for (const candidate of confirmed) {
  candidate.pareto = !confirmed.some((other) => other !== candidate && dominates(other, candidate));
}
const contenders = candidates.filter(
  (candidate) =>
    candidate.status !== 'exploratory' && Number.isFinite(candidate.holdout.meanKaraoke)
);
const portfolio = [];
for (const candidate of contenders) {
  if (portfolio.some((item) => item.family === candidate.family)) continue;
  portfolio.push(candidate);
  if (portfolio.length === 5) break;
}
const campaign = portfolio.map((candidate, index) => ({
  rank: index + 1,
  method: candidate.method,
  family: candidate.family,
  why:
    candidate.status === 'confirmed'
      ? 'Held-out candidate; must next run against the same captured PCM/transcript trace as the control.'
      : 'Diverse opportunity candidate; current evidence is insufficient, so it cannot displace the control yet.',
  requiredComparison: ['transcript-mora-blend-50', candidate.method].filter(
    (method, position, list) => list.indexOf(method) === position
  ),
}));
const result = {
  schemaVersion: 1,
  tag,
  generatedAt: new Date().toISOString(),
  contract: 'karaoke-global-search-contract.md',
  evidence: {
    reportFilesScanned: files.length,
    auditedSamples: samples.length,
    uniqueCohorts: new Set(samples.map((sample) => sample.cohort)).size,
    split: 'deterministic poem × voice cohort hash; 20% holdout target',
  },
  objective:
    '0.8 exact single-word-at-speech-onset + 0.1 near-word + 0.1 source coverage; latency is an independent P90 gate.',
  gates: options,
  candidates,
  portfolio,
  campaign,
  verdict: portfolio.length
    ? `Provisional portfolio generated. ${portfolio.filter((candidate) => candidate.status === 'confirmed').length} candidates have enough held-out evidence; no global maximum is claimed until identical-input replay validates them.`
    : 'No candidate has enough broad evidence. Capture a balanced corpus before selecting a production strategy.',
  limitations: [
    'Separate Gemini Live deliveries are observational evidence only; they are not a paired comparison.',
    'The current corpus is heavily concentrated on poem #87443, so held-out voices are more informative than held-out poems.',
    'Provider timestamps remain unavailable during Live playback; Chirp is audit-only.',
  ],
};
const sortedForTsv = [...candidates].sort((left, right) => {
  const statusOrder = { confirmed: 0, 'needs-validation': 1, exploratory: 2 };
  if (statusOrder[left.status] !== statusOrder[right.status])
    return statusOrder[left.status] - statusOrder[right.status];
  return (right.holdout.meanKaraoke ?? -1) - (left.holdout.meanKaraoke ?? -1);
});
const tsv = [
  'method\tfamily\tstatus\tsamples\ttrain_samples\tholdout_samples\tholdout_karaoke\tholdout_exact\tholdout_p90_first_audio_ms\tpareto',
  ...sortedForTsv.map((candidate) =>
    [
      candidate.method,
      candidate.family,
      candidate.status,
      candidate.samples,
      candidate.train.samples,
      candidate.holdout.samples,
      round(candidate.holdout.meanKaraoke, 4),
      round(candidate.holdout.meanExact, 4),
      round(candidate.holdout.p90FirstAudioMs),
      candidate.pareto,
    ].join('\t')
  ),
].join('\n');
const tableRows = sortedForTsv
  .slice(0, 12)
  .map(
    (candidate) =>
      `| ${candidate.method} | ${candidate.family} | ${candidate.status} | ${candidate.holdout.samples} | ${percent(candidate.holdout.meanKaraoke)} | ${percent(candidate.holdout.meanExact)} | ${round(candidate.holdout.p90FirstAudioMs) ?? 'n/a'} ms | ${candidate.pareto ? 'yes' : '—'} |`
  )
  .join('\n');
const summary = `# Karaoke global search — ${tag}\n\n${result.verdict}\n\nScanned ${files.length} comparison reports containing ${samples.length} audited method runs across ${result.evidence.uniqueCohorts} poem × voice cohorts. The score emphasizes exact single-word state at the audited speech start.\n\n| Method | Family | Evidence | Holdout n | Karaoke | Exact | P90 first audio | Pareto |\n| --- | --- | --- | ---: | ---: | ---: | ---: | --- |\n${tableRows}\n\n## Next identical-input campaign\n\n${campaign.map((item) => `${item.rank}. \`${item.method}\` — ${item.family}. ${item.why}`).join('\n')}\n\nThe campaign is intentionally not auto-run against Gemini Live. It first requires a replay cohort where the exact same PCM and transcript-event trace is fed to every finalist; otherwise delivery variance can manufacture a local maximum.\n\nSee [frontier.svg](frontier.svg), [leaderboard.tsv](leaderboard.tsv), [results.json](results.json), and [next-campaign.json](next-campaign.json).\n`;
await Promise.all([
  writeFile(resolve(outputDir, 'results.json'), `${JSON.stringify(result, null, 2)}\n`),
  writeFile(resolve(outputDir, 'leaderboard.tsv'), `${tsv}\n`),
  writeFile(resolve(outputDir, 'summary.md'), summary),
  writeFile(resolve(outputDir, 'next-campaign.json'), `${JSON.stringify(campaign, null, 2)}\n`),
  writeFile(
    resolve(outputDir, 'frontier.svg'),
    renderChart(candidates, options.maxP90FirstAudioMs)
  ),
]);
console.log(
  JSON.stringify(
    {
      outputDir,
      verdict: result.verdict,
      portfolio: portfolio.map((candidate) => ({
        method: candidate.method,
        family: candidate.family,
        status: candidate.status,
        holdoutKaraoke: round(candidate.holdout.meanKaraoke * 100),
        holdoutSamples: candidate.holdout.samples,
      })),
    },
    null,
    2
  )
);
