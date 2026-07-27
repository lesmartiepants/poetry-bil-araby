import { execFile } from 'node:child_process';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';
import { v2 as speechV2 } from '@google-cloud/speech';

const execFileAsync = promisify(execFile);
const reportPath = process.argv[2];
const project = process.env.GOOGLE_CLOUD_PROJECT;

if (!reportPath || !project) {
  throw new Error(
    'Usage: GOOGLE_CLOUD_PROJECT=... npm run poc:analyze -- artifacts/comparisons/<report>.json'
  );
}

function durationSeconds(duration) {
  return Number(duration?.seconds || 0) + Number(duration?.nanos || 0) / 1_000_000_000;
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

function mapWords(transcribed, source) {
  let cursor = 0;
  return transcribed.map((word) => {
    const key = normalizeArabic(word.word);
    const index = source.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex >= cursor &&
        candidateIndex < cursor + 14 &&
        normalizeArabic(candidate) === key
    );
    if (index >= 0) cursor = index + 1;
    return { ...word, sourceIndex: index };
  });
}

function snapshotAt(timeline, seconds) {
  let snapshot = timeline[0];
  for (const item of timeline) {
    if (item.time > seconds) break;
    snapshot = item;
  }
  return snapshot;
}

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * fraction))];
}

function scoreRun({ judgments, matched, transcribed, sourceCount, firstAudioMs }) {
  const exact = judgments.filter(
    (item) => item.covered && item.activeEnd - item.activeIndex === 1
  ).length;
  const near = judgments.filter((item) => Math.abs(item.wordOffset) <= 1).length;
  const offsets = judgments.map((item) => Math.abs(item.wordOffset));
  const exactRate = matched ? exact / matched : 0;
  const nearRate = matched ? near / matched : 0;
  const matchRate = transcribed ? matched / transcribed : 0;
  const sourceCoverage = sourceCount
    ? new Set(judgments.map((item) => item.sourceIndex)).size / sourceCount
    : 0;
  const latencyScore = Math.max(0, Math.min(1, (1500 - (firstAudioMs + 50)) / 500));
  return {
    qualityScore: Number(
      (
        100 *
        (0.6 * exactRate +
          0.15 * nearRate +
          0.1 * matchRate +
          0.1 * sourceCoverage +
          0.05 * latencyScore)
      ).toFixed(1)
    ),
    exactRate,
    nearRate,
    matchRate,
    sourceCoverage,
    medianAbsWordOffset: percentile(offsets, 0.5),
    p90AbsWordOffset: percentile(offsets, 0.9),
    lateCount: judgments.filter((item) => item.wordOffset > 0).length,
    earlyCount: judgments.filter((item) => item.wordOffset < 0).length,
  };
}

async function transcribe(recordingPath) {
  const pcmPath = recordingPath.replace(/\.[^.]+$/, '.pcm');
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    recordingPath,
    '-map',
    '0:a:0',
    '-ac',
    '1',
    '-ar',
    '24000',
    '-f',
    's16le',
    pcmPath,
  ]);
  const content = await readFile(pcmPath);
  const client = new speechV2.SpeechClient({ apiEndpoint: 'us-speech.googleapis.com' });
  const [response] = await client.recognize({
    recognizer: `projects/${project}/locations/us/recognizers/_`,
    config: {
      languageCodes: ['ar-SA'],
      model: 'chirp_3',
      explicitDecodingConfig: {
        encoding: 'LINEAR16',
        sampleRateHertz: 24_000,
        audioChannelCount: 1,
      },
      features: { enableWordTimeOffsets: true },
    },
    content,
  });
  return (response.results || []).flatMap((result) =>
    (result.alternatives?.[0]?.words || []).map((word) => ({
      word: word.word,
      start: durationSeconds(word.startOffset),
      end: durationSeconds(word.endOffset),
    }))
  );
}

const report = JSON.parse(await readFile(reportPath, 'utf8'));
const root = resolve(reportPath, '..');
const source = sourceWords(report.results.find((result) => result.metrics)?.metrics.poem);

for (const result of report.results.filter((item) => item.status === 'recorded')) {
  const transcribed = await transcribe(resolve(root, result.recording));
  const mapped = mapWords(transcribed, source);
  const matched = mapped.filter((word) => word.sourceIndex >= 0);
  const judgments = matched.map((word) => {
    const snapshot = snapshotAt(result.metrics.highlightTimeline, word.start);
    const covered = Boolean(
      snapshot && word.sourceIndex >= snapshot.activeIndex && word.sourceIndex < snapshot.activeEnd
    );
    return {
      word: word.word,
      sourceWord: source[word.sourceIndex],
      sourceIndex: word.sourceIndex,
      spokenAt: Number(word.start.toFixed(2)),
      highlightedWord: snapshot ? source[snapshot.activeIndex] : null,
      activeIndex: snapshot?.activeIndex ?? null,
      activeEnd: snapshot?.activeEnd ?? null,
      covered,
      wordOffset: snapshot ? word.sourceIndex - snapshot.activeIndex : null,
    };
  });
  const covered = judgments.filter((judgment) => judgment.covered).length;
  const score = scoreRun({
    judgments,
    matched: matched.length,
    transcribed: mapped.length,
    sourceCount: source.length,
    firstAudioMs: result.metrics.firstAudioMs,
  });
  result.analysis = {
    audit:
      'Post-run Google Chirp 3 synchronous transcription with word timestamps; not part of live playback.',
    summary: `${covered}/${matched.length} conservatively matched spoken words were inside the visual highlight; ${mapped.length - matched.length} transcribed words could not be conservatively matched to the source text.`,
    transcribedWordCount: mapped.length,
    sourceWordCount: source.length,
    matchedWordCount: matched.length,
    coveredWordCount: covered,
    exactWordCount: Math.round(score.exactRate * matched.length),
    score,
    examples: judgments,
  };
}

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
await appendFile(
  resolve(root, 'run-log.jsonl'),
  report.results
    .filter((result) => result.status === 'recorded' && result.analysis)
    .map((result) =>
      JSON.stringify({
        event: 'analyzed',
        timestamp: new Date().toISOString(),
        runId: result.runId,
        batchId: report.batchId,
        phase: result.phase,
        hypothesis: result.hypothesis,
        solutionDesign: result.solutionDesign || report.solutionDesign,
        referencePoemId: report.referencePoemId,
        method: result.method,
        parameters: result.metrics.parameters || {},
        metrics: { firstAudioMs: result.metrics.firstAudioMs, duration: result.metrics.duration },
        analysis: result.analysis.score,
        artifacts: { recording: result.recording, report: reportPath.split('/').at(-1) },
        status: 'analyzed',
      })
    )
    .join('\n') + '\n'
);
console.log(
  JSON.stringify(
    report.results.map((result) => ({ method: result.method, analysis: result.analysis?.summary })),
    null,
    2
  )
);
