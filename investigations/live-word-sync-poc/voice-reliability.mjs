import { execFile } from 'node:child_process';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname);
const repoRoot = resolve(root, '../..');
const artifacts = resolve(root, 'artifacts', 'comparisons');
const defaultVoices = [
  'Zephyr',
  'Leda',
  'Aoede',
  'Callirrhoe',
  'Autonoe',
  'Despina',
  'Laomedeia',
  'Achernar',
  'Pulcherrima',
  'Vindemiatrix',
  'Sulafat',
  'Orus',
  'Puck',
  'Charon',
  'Enceladus',
  'Iapetus',
  'Algieba',
  'Algenib',
  'Rasalgethi',
  'Alnilam',
  'Zubenelgenubi',
];
const voices = (process.env.POC_VOICES || defaultVoices.join(','))
  .split(',')
  .map((voice) => voice.trim())
  .filter(Boolean);
const repeats = Number(process.env.POC_REPEATS || 3);
const repeatIds = (process.env.POC_REPEAT_IDS || Array.from({ length: repeats }, (_, index) => index + 1).join(','))
  .split(',')
  .map((value) => Number(value.trim()))
  .filter(Number.isInteger);
const baseUrl = process.env.POC_URL || 'http://127.0.0.1:5196';
const method = process.env.POC_METHOD || 'transcript-mora-blend-50';
const captureRetries = Number(process.env.POC_CAPTURE_RETRIES || 2);
const campaign = process.env.POC_CAMPAIGN || `voice-reliability-${method}`;
const hypothesis =
  process.env.POC_HYPOTHESIS ||
  `Independent production-prompt deliveries determine whether ${method} is reliable for each surviving voice.`;
const solutionDesign =
  process.env.POC_SOLUTION_DESIGN ||
  `Strategy-by-voice reliability screen: fixed poem #87443, production prompt, temperature 0, immediate PCM scheduling, and the ${method} highlight schedule. Each repeat is a fresh Gemini Live delivery.`;

if (!Number.isInteger(repeats) || repeats < 1 || repeats > 5) {
  throw new Error('POC_REPEATS must be an integer from 1 to 5.');
}
if (!repeatIds.length || repeatIds.some((repeat) => repeat < 1 || repeat > repeats)) {
  throw new Error('POC_REPEAT_IDS must contain one or more repeat numbers from 1 through POC_REPEATS.');
}

const samples = [];
for (const voice of voices) {
  for (const repeat of repeatIds) {
    const url = new URL(baseUrl);
    url.searchParams.set('voice', voice);
    url.searchParams.set('prompt', 'production');
    const phase = `${campaign}-${voice.toLowerCase()}-${repeat}-of-${repeats}`;
    const env = {
      ...process.env,
      POC_URL: url.toString(),
      POC_METHODS: method,
      POC_PHASE: phase,
      POC_HYPOTHESIS: hypothesis,
      POC_SOLUTION_DESIGN: solutionDesign,
    };
    let stdout;
    let lastError;
    for (let attempt = 1; attempt <= captureRetries; attempt += 1) {
      try {
        ({ stdout } = await execFileAsync(
          'node',
          ['investigations/live-word-sync-poc/compare-methods.mjs'],
          { cwd: repoRoot, env, maxBuffer: 1024 * 1024 }
        ));
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        console.warn(`${voice} ${repeat}/${repeats}: capture attempt ${attempt} failed`);
        if (attempt < captureRetries) await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    if (lastError) throw lastError;
    const captured = JSON.parse(stdout);
    const reportPath = captured.reportPath;
    await execFileAsync(
      'node',
      ['investigations/live-word-sync-poc/analyze-comparison.mjs', reportPath],
      { cwd: repoRoot, env, maxBuffer: 1024 * 1024 }
    );
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    const result = report.results.find((entry) => entry.method === method);
    const score = result?.analysis?.score?.qualityScore;
    samples.push({ voice, repeat, reportPath, score: Number.isFinite(score) ? score : null });
    console.log(`${voice} ${repeat}/${repeats}: ${score ?? 'audit unavailable'}`);
  }
}

const grouped = Object.groupBy(samples, ({ voice }) => voice);
const summary = Object.entries(grouped)
  .map(([voice, entries]) => {
    const scores = entries.map(({ score }) => score).filter(Number.isFinite);
    return {
      voice,
      samples: entries,
      auditedRuns: scores.length,
      meanScore: scores.length ? Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1)) : null,
      minScore: scores.length ? Math.min(...scores) : null,
      maxScore: scores.length ? Math.max(...scores) : null,
    };
  })
  .sort((left, right) => (right.meanScore ?? -1) - (left.meanScore ?? -1));
const generatedAt = new Date().toISOString();
const summaryPath = resolve(artifacts, `voice-reliability-${generatedAt.replace(/[-:.]/g, '')}.json`);
await writeFile(
  summaryPath,
  `${JSON.stringify(
    {
      generatedAt,
      method,
      campaign,
      poemId: 87443,
      promptProfile: 'production',
      repeats,
      voices,
      summary,
    },
    null,
    2
  )}\n`
);
console.log(JSON.stringify({ summaryPath, summary }, null, 2));
