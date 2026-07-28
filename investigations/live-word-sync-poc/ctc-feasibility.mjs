import { execFile } from 'node:child_process';
import { access, appendFile, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

function usage() {
  throw new Error(
    'Usage: npm run poc:ctc -- artifacts/comparisons/<report>.json [--method=name] [--prepare-only]'
  );
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

function sourceWords(poem) {
  return poem.excerpt.trim().split(/\s+/).filter(Boolean);
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
}

function mapWords(words, source) {
  let cursor = 0;
  return words.map((cue) => {
    if (Number.isInteger(cue.sourceIndex) && cue.sourceIndex >= cursor && cue.sourceIndex < source.length) {
      cursor = cue.sourceIndex + 1;
      return { ...cue, sourceIndex: cue.sourceIndex };
    }
    const key = normalizeArabic(cue.word || '');
    const sourceIndex = source.findIndex(
      (candidate, index) =>
        index >= cursor && index < cursor + 14 && normalizeArabic(candidate) === key
    );
    if (sourceIndex >= 0) cursor = sourceIndex + 1;
    return { ...cue, sourceIndex };
  });
}

function parseArgs(argv) {
  const options = { method: null, prepareOnly: false, reportPath: null };
  for (const argument of argv) {
    if (argument === '--prepare-only') options.prepareOnly = true;
    else if (argument.startsWith('--method=')) options.method = argument.slice('--method='.length);
    else if (!argument.startsWith('--') && !options.reportPath) options.reportPath = argument;
    else usage();
  }
  if (!options.reportPath) usage();
  return options;
}

async function runAdapter({ adapterPath, audioPath, transcriptPath, outputPath }) {
  if (!isAbsolute(adapterPath)) {
    throw new Error('CTC_ALIGNER must be an absolute executable path.');
  }
  await access(adapterPath);
  const startedAt = performance.now();
  await execFileAsync(adapterPath, [
    '--audio',
    audioPath,
    '--transcript',
    transcriptPath,
    '--language',
    'ar',
    '--output',
    outputPath,
  ]);
  const wallMs = Math.round(performance.now() - startedAt);
  const result = JSON.parse(await readFile(outputPath, 'utf8'));
  if (!Array.isArray(result.words)) {
    throw new Error('CTC adapter output must contain a words array.');
  }
  for (const cue of result.words) {
    if (typeof cue.word !== 'string' || !Number.isFinite(cue.start) || !Number.isFinite(cue.end)) {
      throw new Error('Each CTC word must have word, numeric start, and numeric end fields.');
    }
  }
  return { ...result, wallMs };
}

const { reportPath, method, prepareOnly } = parseArgs(process.argv.slice(2));
let absoluteReportPath = resolve(reportPath);
try {
  await access(absoluteReportPath);
} catch {
  absoluteReportPath = resolve('investigations/live-word-sync-poc', reportPath);
}
const reportRoot = dirname(absoluteReportPath);
const report = JSON.parse(await readFile(absoluteReportPath, 'utf8'));
const recorded = report.results.filter(
  (result) => result.status === 'recorded' && (!method || result.method === method)
);

if (!recorded.length) {
  throw new Error(`No recorded result${method ? ` for method ${method}` : ''} in ${reportPath}.`);
}

const poem = recorded[0].metrics?.poem;
if (!poem?.excerpt) throw new Error('Report is missing the fixed-poem excerpt.');
const source = sourceWords(poem);
const adapterPath = process.env.CTC_ALIGNER;
const output = [];

for (const result of recorded) {
  const stem = result.recording.replace(/\.[^.]+$/, '');
  const audioPath = resolve(reportRoot, `${stem}.ctc-input.wav`);
  const transcriptPath = resolve(reportRoot, `${stem}.ctc-input.txt`);
  const ctcPath = resolve(reportRoot, `${stem}.ctc-feasibility.json`);
  const adapterOutputPath = resolve(reportRoot, `${stem}.ctc-adapter-output.json`);

  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    resolve(reportRoot, result.recording),
    '-map',
    '0:a:0',
    '-ac',
    '1',
    '-ar',
    '16000',
    audioPath,
  ]);
  await writeFile(transcriptPath, `${poem.excerpt.trim()}\n`);

  const feasibility = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    status: adapterPath && !prepareOnly ? 'adapter-pending' : 'prepared',
    reference: {
      report: absoluteReportPath,
      batchId: report.batchId,
      runId: result.runId,
      method: result.method,
      poemId: report.referencePoemId,
      sourceWordCount: source.length,
    },
    input: { audioPath, transcriptPath, sampleRateHertz: 16000 },
    constraints: [
      'Offline feasibility only: this workflow cannot delay first audible Live PCM.',
      'Any future live sidecar may correct future words only and must not reverse highlights.',
    ],
  };

  if (adapterPath && !prepareOnly) {
    const adapter = await runAdapter({
      adapterPath,
      audioPath,
      transcriptPath,
      outputPath: adapterOutputPath,
    });
    const mapped = mapWords(adapter.words, source).filter((cue) => cue.sourceIndex >= 0);
    const chirp = new Map(
      (result.analysis?.examples || []).map((example) => [example.sourceIndex, example.spokenAt])
    );
    const comparisons = mapped
      .filter((cue) => chirp.has(cue.sourceIndex))
      .map((cue) => ({
        sourceIndex: cue.sourceIndex,
        sourceWord: source[cue.sourceIndex],
        ctcStart: cue.start,
        chirpStart: chirp.get(cue.sourceIndex),
        absStartErrorMs: Math.round(Math.abs(cue.start - chirp.get(cue.sourceIndex)) * 1000),
        confidence: Number.isFinite(cue.confidence) ? cue.confidence : null,
      }));
    const errors = comparisons.map((item) => item.absStartErrorMs);
    feasibility.status = 'completed';
    feasibility.adapter = {
      adapter: adapter.adapter || 'unspecified',
      model: adapter.model || 'unspecified',
      wallMs: adapter.wallMs,
      alignedWordCount: adapter.words.length,
      mappedWordCount: mapped.length,
    };
    feasibility.comparison = {
      audit: 'Compared offline CTC cues with existing post-run Chirp word starts; neither participates in live playback.',
      chirpComparableWordCount: comparisons.length,
      ctcSourceCoverage: Number((new Set(mapped.map((cue) => cue.sourceIndex)).size / source.length).toFixed(3)),
      medianAbsStartErrorMs: percentile(errors, 0.5),
      p90AbsStartErrorMs: percentile(errors, 0.9),
      samples: comparisons,
    };
    feasibility.gates = {
      accuracy: Boolean(errors.length) && percentile(errors, 0.5) <= 120 && percentile(errors, 0.9) <= 250,
      runtime: adapter.wallMs <= 300,
      conclusion: 'Preliminary only. At least six independent captures and a separate causal-live test are required before a live sidecar can pass.',
    };
  }

  await writeFile(ctcPath, `${JSON.stringify(feasibility, null, 2)}\n`);
  output.push({ runId: result.runId, method: result.method, feasibility: ctcPath, status: feasibility.status });
}

await appendFile(
  resolve(reportRoot, 'run-log.jsonl'),
  output
    .map((item) =>
      JSON.stringify({
        event: 'ctc-feasibility',
        timestamp: new Date().toISOString(),
        batchId: report.batchId,
        referencePoemId: report.referencePoemId,
        ...item,
      })
    )
    .join('\n') + '\n'
);

console.log(JSON.stringify(output, null, 2));
