// Mock QA: each App flow frame beside the app in the same state, at 390×844.
// Usage: npm run qa:mocks -- [--area 2] [--frame 2.4] [--base http://localhost:5180/new/]
// Writes qa/out/<frame>.png pairs and qa/out/index.html (contact sheet). A review aid, not a gate.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
const area = arg('area'); const only = arg('frame');
const base = arg('base') ?? 'http://localhost:5182/new/';
const canvas = new URL('../../design-review/design-refresh/canvas/', import.meta.url);
const out = new URL('./out/', import.meta.url);
mkdirSync(out, { recursive: true });
const { frames } = JSON.parse(readFileSync(new URL('./frames.json', import.meta.url), 'utf8'));
const pick = frames.filter((f) => (!area || f.frame.split('.')[0] === area) && (!only || f.frame === only));

async function up(url) { try { return (await fetch(url)).ok; } catch { return false; } }
let server;
if (!(await up(base))) {
  // QA compares against the mocks, so the app runs on mock data.
  server = spawn('npx', ['vite', '--port', '5182', '--strictPort'], { cwd: new URL('..', import.meta.url), stdio: 'ignore', env: { ...process.env, VITE_SOURCES: 'mock' } });
  for (let i = 0; i < 60 && !(await up(base)); i++) await new Promise((r) => setTimeout(r, 500));
}

const exe = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const rows = [];
for (const f of pick) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  // Frame, rendered static: the canvas runtime script stays off.
  const file = new URL(`${f.file}.dc.html`, canvas);
  if (existsSync(file)) {
    const still = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, javaScriptEnabled: false });
    const mock = await still.newPage();
    await mock.setContent(readFileSync(file, 'utf8'), { waitUntil: 'networkidle' }).catch(() => {});
    await mock.waitForTimeout(300);
    await mock.screenshot({ path: new URL(`${f.frame}-mock.png`, out).pathname });
    await still.close();
  }
  // App
  await page.goto(base);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.setItem('splashed', '1'); localStorage.setItem('welcomed', 'true'); });
  await page.goto(base + f.route.replace(/^\//, ''));
  await page.waitForTimeout(600); // let mock data settle before driving the state
  for (const s of f.steps ?? []) {
    if (s.api) {
      const { path, method = 'GET', status = 200, response = {} } = s.api;
      await page.route(`**${path}`, (route) => route.fulfill({ status, json: response }), { times: 1 });
      await page.evaluate(({ path, method }) => fetch(path, { method }), { path, method });
    }
    if (s.storage) await page.evaluate((st) => {
      for (const [k, v] of Object.entries(st.local ?? {})) localStorage.setItem(k, v);
      for (const [k, v] of Object.entries(st.session ?? {})) { if (v) sessionStorage.setItem(k, v); else sessionStorage.removeItem(k); }
    }, s.storage);
    if (s.reload) { await page.reload(); await page.waitForTimeout(600); }
    if (s.click) await page.click(s.click, { timeout: 4000 }).catch((e) => console.warn(f.frame, 'click failed', s.click, e.message.split('\n')[0]));
    // Press and keep holding, so the screenshot catches the held state: [selector, ms].
    if (s.hold) { const b = await page.locator(s.hold[0]).boundingBox(); if (b) { await page.mouse.move(b.x + 20, b.y + b.height / 2); await page.mouse.down(); await page.waitForTimeout(s.hold[1]); } }
    if (s.fill) await page.fill(s.fill[0], s.fill[1]).catch(() => {});
    if (s.scroll) { await page.evaluate((y) => window.scrollTo(0, y), s.scroll); await page.waitForTimeout(200); }
    if (s.wait) await page.waitForTimeout(s.wait);
  }
  if (!(f.steps ?? []).some((s) => s.noWait)) await page.waitForTimeout(700);
  await page.screenshot({ path: new URL(`${f.frame}-app.png`, out).pathname });
  rows.push(f);
  await ctx.close();
  process.stdout.write(`${f.frame} `);
}
await browser.close();
server?.kill();

writeFileSync(new URL('index.html', out), `<!doctype html><meta charset="utf-8"><title>Mock QA</title>
<style>body{background:#111;color:#ddd;font:14px system-ui;margin:20px}.pair{display:flex;gap:12px;margin:0 0 28px}figure{margin:0}img{width:300px;border:1px solid #333;border-radius:12px}h2{font-size:15px;margin:0 0 8px;color:#D4B36A}</style>
<h1>Mock QA · ${new Date().toISOString().slice(0, 16)}</h1>
${rows.map((f) => `<section><h2>${f.frame} · ${f.file}${f.note ? ` · ${f.note}` : ''}</h2><div class="pair"><figure><img src="${f.frame}-mock.png"><figcaption>Mock</figcaption></figure><figure><img src="${f.frame}-app.png"><figcaption>App</figcaption></figure></div></section>`).join('\n')}`);
console.log(`\n${rows.length} pairs → qa/out/index.html`);
