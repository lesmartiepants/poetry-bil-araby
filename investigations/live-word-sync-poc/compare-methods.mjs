import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const execFileAsync = promisify(execFile);

const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts', 'comparisons');
const pocUrl = process.env.POC_URL || 'http://localhost:5181';
const batchId = `${new Date().toISOString().replace(/[-:.]/g, '')}-${randomUUID().slice(0, 8)}`;
const phase = process.env.POC_PHASE || 'broad-sweep';
const hypothesis =
  process.env.POC_HYPOTHESIS || 'Compare timing strategies on the fixed reference poem.';
const solutionDesign =
  process.env.POC_SOLUTION_DESIGN ||
  'No design note supplied; interpret this as a timing-strategy comparison only.';
const methods = (process.env.POC_METHODS || 'weighted,uniform,phrase,vad,google')
  .split(',')
  .map((method) => method.trim())
  .filter(Boolean);

await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({
  headless: process.env.POC_HEADED !== '1',
  args: ['--autoplay-policy=no-user-gesture-required'],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
const page = await context.newPage();
const browserErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') browserErrors.push(message.text());
});
page.on('pageerror', (error) => browserErrors.push(error.message));

try {
  await page.goto(pocUrl, { waitUntil: 'networkidle' });
  const harnessUrl = new URL('/harness/config', pocUrl);
  harnessUrl.search = new URL(pocUrl).search;
  const harnessConfig = await (await page.request.get(harnessUrl.toString())).json();
  await page.locator('#pull-poem').click();
  await page.locator('#poem').waitFor({ state: 'visible', timeout: 20_000 });
  const poem = await page.evaluate(() => ({
    title: document.querySelector('#title')?.textContent,
    poet: document.querySelector('#byline')?.textContent,
  }));
  const results = [];

  for (const method of methods) {
    const input = page.locator(`input[value="${method}"]`);
    if (!(await input.count()) || (await input.isDisabled())) {
      results.push({ method, status: 'skipped', reason: 'not available in this POC session' });
      continue;
    }

    await input.check();
    await page.evaluate(() => {
      window.__pocMetrics = undefined;
    });
    const startedAt = performance.now();
    await page.locator('#test-method').click();
    await page.waitForFunction(
      (selectedMethod) => window.__pocMetrics?.strategy === selectedMethod,
      method,
      { timeout: 90_000 }
    );

    const metrics = await page.evaluate(() => window.__pocMetrics);
    if (metrics.poem.id !== harnessConfig.poemId) {
      throw new Error(
        `Expected reference poem ${harnessConfig.poemId}, received ${metrics.poem.id}`
      );
    }
    const auditDownload = page.waitForEvent('download');
    await page.locator('#download-audit').click();
    const audit = await auditDownload;
    const runId = `${batchId}-${method}-${randomUUID().slice(0, 6)}`;
    const sourceRecording = `poem-${metrics.poem.id}-${batchId}-${method}.webm`;
    const recording = sourceRecording.replace(/\.webm$/, '.mp4');
    await audit.saveAs(resolve(artifacts, sourceRecording));
    await execFileAsync('ffmpeg', [
      '-y',
      '-i',
      resolve(artifacts, sourceRecording),
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
      resolve(artifacts, recording),
    ]);
    await page.screenshot({
      path: resolve(artifacts, `poem-${metrics.poem.id}-${batchId}-${method}.png`),
      fullPage: true,
    });
    results.push({
      method,
      status: 'recorded',
      runId,
      startedAt: new Date(Date.now() - Math.round(performance.now() - startedAt)).toISOString(),
      completedAt: new Date().toISOString(),
      phase,
      hypothesis,
      solutionDesign,
      elapsedMs: Math.round(performance.now() - startedAt),
      recording,
      sourceRecording,
      metrics,
    });
  }

  const report = {
    schemaVersion: 2,
    batchId,
    generatedAt: new Date().toISOString(),
    pocUrl,
    poem,
    referencePoemId: harnessConfig.poemId,
    tts: {
      voiceName: harnessConfig.tts.voiceName,
      temperature: harnessConfig.tts.temperature,
      promptProfile: harnessConfig.tts.promptProfile || 'production',
      promptSource:
        harnessConfig.tts.promptProfile && harnessConfig.tts.promptProfile !== 'production'
          ? 'serve-poc.mjs PROMPT_PROFILES'
          : 'src/prompts.js LIVE_SYSTEM_INSTRUCTION',
    },
    phase,
    hypothesis,
    solutionDesign,
    results,
    browserErrors,
    interpretation:
      'Each WebM is one browser MediaRecorder stream: canvas highlights driven by the scheduled Web Audio playhead plus the exact PCM routed to MediaStreamDestination. Compare only runs for this one poem.',
  };
  const poemId = results.find((result) => result.metrics)?.metrics.poem.id || 'unknown';
  const reportPath = resolve(artifacts, `poem-${poemId}-${batchId}-comparison.json`);
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  await appendFile(
    resolve(artifacts, 'run-log.jsonl'),
    results
      .filter((result) => result.status === 'recorded')
      .map((result) =>
        JSON.stringify({
          event: 'captured',
          timestamp: result.completedAt,
          runId: result.runId,
          batchId,
          phase,
          hypothesis,
          solutionDesign,
          referencePoemId: harnessConfig.poemId,
          tts: report.tts,
          method: result.method,
          parameters: result.metrics.parameters || {},
          metrics: {
            firstAudioMs: result.metrics.firstAudioMs,
            duration: result.metrics.duration,
          },
          artifacts: {
            recording: result.recording,
            sourceRecording: result.sourceRecording,
            report: reportPath.split('/').at(-1),
          },
          status: result.status,
        })
      )
      .join('\n') + '\n'
  );
  console.log(
    JSON.stringify(
      {
        reportPath,
        results: results.map((result) => ({
          method: result.method,
          status: result.status,
          firstAudioMs: result.metrics && Math.round(result.metrics.firstAudioMs),
          duration: result.metrics && Number(result.metrics.duration.toFixed(2)),
          recording: result.recording,
        })),
      },
      null,
      2
    )
  );
} finally {
  await page.close();
  await context.close();
  await browser.close();
}
