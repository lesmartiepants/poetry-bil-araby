import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts');
await mkdir(artifacts, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
const page = await context.newPage();
await page.goto('http://localhost:5180', { waitUntil: 'networkidle' });
await page.screenshot({ path: resolve(artifacts, '01-ready.png'), fullPage: true });

await page.click('#start');
await page.waitForFunction(() => window.__pocMetrics?.firstAudioMs, null, { timeout: 90_000 });
await page.screenshot({ path: resolve(artifacts, '02-stream-complete.png'), fullPage: true });

const metrics = await page.evaluate(() => window.__pocMetrics);
const downloadPromise = page.waitForEvent('download');
await page.click('#download');
const wav = await downloadPromise;
await wav.saveAs(resolve(artifacts, `poem-${metrics.poem.id}-live.wav`));
const auditDownloadPromise = page.waitForEvent('download');
await page.click('#download-audit');
const audit = await auditDownloadPromise;
await audit.saveAs(resolve(artifacts, `poem-${metrics.poem.id}-clock-synchronized.webm`));

await page.waitForTimeout(Math.min(8_000, Math.max(2_000, metrics.duration * 250)));
await page.screenshot({ path: resolve(artifacts, '03-playback.png'), fullPage: true });
await page.close();
await context.close();
await browser.close();

const annotation = {
  ...metrics,
  method: 'Weighted Arabic word estimate driven by the Web Audio scheduled playback clock.',
  interpretation: {
    firstAudioMs: 'Request start to first PCM buffer scheduled for playback.',
    chunks: 'Number of streamed PCM buffers scheduled back-to-back.',
    duration: 'Captured PCM duration, independent of network arrival timing.',
    wordAccuracy: 'Not measured: Gemini Live does not return word timestamps.',
  },
};
await writeFile(
  resolve(artifacts, `poem-${metrics.poem.id}-annotations.json`),
  `${JSON.stringify(annotation, null, 2)}\n`
);
console.log(JSON.stringify(annotation, null, 2));
