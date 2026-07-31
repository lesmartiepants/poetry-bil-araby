import { execFile } from 'node:child_process';
import { appendFile, readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts', 'comparisons');
const now = new Date().toISOString();

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

async function convert(webm) {
  const mp4 = webm.replace(/\.webm$/, '.mp4');
  if (await exists(resolve(artifacts, mp4))) return { webm, mp4, converted: false };
  await execFileAsync('ffmpeg', [
    '-y',
    '-i',
    resolve(artifacts, webm),
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    '-movflags',
    '+faststart',
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    resolve(artifacts, mp4),
  ]);
  return { webm, mp4, converted: true };
}

const names = await readdir(artifacts);
const recordings = names.filter((name) => name.endsWith('.webm'));
const conversions = [];
for (const recording of recordings) conversions.push(await convert(recording));
const lookup = new Map(conversions.map((item) => [item.webm, item.mp4]));
const migrated = [];

for (const name of names.filter((item) => item.endsWith('-comparison.json'))) {
  const path = resolve(artifacts, name);
  const report = JSON.parse(await readFile(path, 'utf8'));
  let changed = false;
  for (const result of report.results || []) {
    if (!lookup.has(result.recording)) continue;
    const sourceRecording = result.recording;
    result.sourceRecording ||= sourceRecording;
    result.recording = lookup.get(sourceRecording);
    changed = true;
    migrated.push({
      report: name,
      runId: result.runId || null,
      method: result.method,
      sourceRecording,
      recording: result.recording,
    });
  }
  if (changed) await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}

if (migrated.length) {
  await appendFile(
    resolve(artifacts, 'run-log.jsonl'),
    migrated
      .map((item) =>
        JSON.stringify({
          event: 'artifact-converted',
          timestamp: now,
          capabilityProbe: false,
          status: 'converted',
          ...item,
          interpretation:
            'WebM source retained for audit provenance; MP4/H.264/AAC is the viewer and QuickTime playback artifact.',
        })
      )
      .join('\n') + '\n'
  );
}

console.log(
  JSON.stringify(
    {
      webmSources: recordings.length,
      newlyConverted: conversions.filter((item) => item.converted).length,
      reportsMigrated: new Set(migrated.map((item) => item.report)).size,
      resultArtifactsMigrated: migrated.length,
    },
    null,
    2
  )
);
