import { execFile } from 'node:child_process';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';
import { LIVE_SYSTEM_INSTRUCTION } from '../../src/prompts.js';

// This probe establishes whether a recorded audio/timing pair has a stable,
// inspectable identity. It intentionally does not play audio: that would test
// replay UX, not cache identity or artifact integrity.
const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts', 'comparisons');
const [reportArgument, ...rest] = process.argv.slice(2);
const methodArgument = rest[0] === '--method' ? rest[1] : rest[0];

if (!reportArgument) {
  throw new Error(
    'Usage: node cache-pair-probe.mjs artifacts/comparisons/<analyzed-report>.json [--method method]'
  );
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function safeRecordingPath(reportDirectory, recording) {
  if (!recording || basename(recording) !== recording || !/\.(?:webm|mp4)$/.test(recording)) {
    throw new Error(`Recorded run has an unsafe or unsupported recording name: ${recording}`);
  }
  return resolve(reportDirectory, recording);
}

async function hashPcmAudio(recordingPath) {
  // The saved WebM is the synchronized visual trace. This separately hashes
  // the exact PCM audio stream that a future replay cache would serve.
  const { stdout } = await execFileAsync(
    'ffmpeg',
    [
      '-v',
      'error',
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
      'pipe:1',
    ],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 }
  );
  return { sha256: sha256(stdout), byteLength: stdout.length };
}

function pickRun(report, method) {
  const candidates = (report.results || []).filter(
    (result) =>
      result.status === 'recorded' &&
      result.recording &&
      result.metrics?.poem &&
      Array.isArray(result.metrics.highlightTimeline) &&
      result.analysis?.score
  );
  const matching = method ? candidates.filter((result) => result.method === method) : candidates;
  if (!matching.length) {
    throw new Error(
      method
        ? `No analyzed recorded run found for method ${method}`
        : 'No analyzed recorded run found; run poc:analyze first'
    );
  }
  // Selecting the strongest audited run by default makes this probe useful
  // without pretending it is an experiment ranking. Tie-breakers are stable.
  return [...matching].sort((left, right) => {
    const scoreDelta =
      (right.analysis?.score?.qualityScore ?? -1) - (left.analysis?.score?.qualityScore ?? -1);
    return (
      scoreDelta ||
      left.method.localeCompare(right.method) ||
      String(left.runId || '').localeCompare(String(right.runId || ''))
    );
  })[0];
}

async function main() {
  const reportPath = resolve(reportArgument);
  const reportDirectory = resolve(reportPath, '..');
  const report = JSON.parse(await readFile(reportPath, 'utf8'));
  const run = pickRun(report, methodArgument);
  const poem = run.metrics.poem;
  const poemSource = poem.excerpt || poem.arabic;
  if (!poemSource) throw new Error('Selected run has no poem source text');

  // The MP4 is the portable viewer artifact. Cache identity must stay tied to
  // the original one-stream browser capture, so AAC re-encoding cannot alter
  // the hashed PCM evidence.
  const sourceRecording = run.sourceRecording || run.recording;
  const recordingPath = safeRecordingPath(reportDirectory, sourceRecording);
  const recording = await readFile(recordingPath);
  const audio = await hashPcmAudio(recordingPath);
  const timingMap = {
    schema: 'live-word-sync-highlight-timeline-v1',
    strategy: run.metrics.strategy || run.method,
    parameters: run.metrics.parameters || {},
    highlightTimeline: run.metrics.highlightTimeline,
  };
  const prompt = {
    source: report.tts?.promptSource || null,
    // The report predates prompt-content digests. This is a conservative
    // probe-time snapshot, not a claim about the historical generation input.
    currentContentSha256: sha256(LIVE_SYSTEM_INSTRUCTION),
    digestProvenance: 'Current src/prompts.js LIVE_SYSTEM_INSTRUCTION at probe time',
  };
  const engineSettings = {
    provider: 'google',
    engine: 'gemini-live',
    audioTransport: 'PCM streamed through scheduled Web Audio playback',
    voiceName: report.tts?.voiceName || null,
    temperature: report.tts?.temperature ?? null,
    prompt,
  };
  const keyFields = {
    schema: 'live-word-sync-replay-cache-key-v1',
    poem: {
      id: poem.id,
      sourceSha256: sha256(poemSource),
      characterCount: poemSource.length,
      wordCount: wordCount(poemSource),
    },
    engineSettings,
    audioArtifact: {
      extractedPcmSha256: audio.sha256,
      extractedPcmBytes: audio.byteLength,
      format: 's16le; mono; 24000 Hz; extracted from the recorded audio stream',
    },
    timingMapSha256: sha256(canonicalJson(timingMap)),
  };
  const cacheKey = sha256(canonicalJson(keyFields));
  const now = new Date().toISOString();
  const filename = `cache-pair-probe-${report.batchId || 'legacy'}-${run.method}-${now
    .replace(/[-:.]/g, '')
    .replace('Z', 'Z')}-${randomUUID().slice(0, 8)}.json`;
  const artifactPath = resolve(artifacts, filename);
  const probe = {
    schemaVersion: 1,
    kind: 'capability-probe',
    capabilityProbe: true,
    probe: 'replay-cache-pair-identity-integrity',
    status: 'validated',
    startedAt: now,
    completedAt: now,
    source: {
      report: basename(reportPath),
      batchId: report.batchId || null,
      runId: run.runId,
      method: run.method,
      recording: run.recording,
      sourceRecording,
    },
    integrity: {
      sourceRecordingSha256: sha256(recording),
      sourceRecordingBytes: recording.length,
      timingMapItemCount: run.metrics.highlightTimeline.length,
    },
    exactReplayCacheKey: {
      cacheKeySha256: cacheKey,
      fields: keyFields,
    },
    limitations: [
      'Validates cache identity and artifact integrity only; it does not validate live replay UX.',
      'It does not measure replay first-audio latency, output-device scheduling, or listener-perceived word sync.',
      'The historical report stores a prompt source label but not a prompt-content digest; currentContentSha256 is a probe-time safeguard for future cache writes.',
    ],
  };

  await mkdir(artifacts, { recursive: true });
  await writeFile(artifactPath, `${JSON.stringify(probe, null, 2)}\n`);
  const persisted = JSON.parse(await readFile(artifactPath, 'utf8'));
  if (persisted.exactReplayCacheKey.cacheKeySha256 !== cacheKey) {
    throw new Error('Cache-pair probe persistence check failed');
  }
  await appendFile(
    resolve(artifacts, 'run-log.jsonl'),
    `${JSON.stringify({
      event: 'capability-probe',
      timestamp: now,
      capabilityProbe: true,
      probe: probe.probe,
      status: probe.status,
      referencePoemId: poem.id,
      runId: run.runId,
      method: run.method,
      report: basename(reportPath),
      artifact: filename,
      cacheKeySha256: cacheKey,
      interpretation: 'Validates cache identity/integrity only—not live replay UX.',
    })}\n`
  );
  console.log(
    JSON.stringify(
      {
        artifactPath,
        cacheKeySha256: cacheKey,
        run: {
          method: run.method,
          runId: run.runId,
          recording: run.recording,
          sourceRecording,
        },
        integrity: probe.integrity,
      },
      null,
      2
    )
  );
}

await main();
