// State QA: every main screen in its reactive states, at 390×844.
// Loading and error run the app on live sources with /api/v2 held open or failing (no server needed);
// empty / signed in / kept / progress run on mock data with the mock store preset.
// Usage: npm run qa:states -- [--only <text>]
// Writes qa/out/states/<case>.png, qa/out/states/index.html, and lists problems. Exits 1 if any check fails.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const arg = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
// A plain substring of the case id (no regular expression built from the command line).
const only = arg('only') ? { test: (id) => id.toLowerCase().includes(arg('only').toLowerCase()) } : null;
const out = new URL('./out/states/', import.meta.url);
mkdirSync(out, { recursive: true });

const SERVERS = { mock: 5193, live: 5194 };
const ACCOUNT = JSON.stringify({ signedIn: true, provider: 'google', name: 'Nour' });
const SIGNED_OUT = JSON.stringify({ signedIn: false });
const KEEP = (ids) => JSON.stringify(ids);
const AT = (position) => JSON.stringify([{ slug: 'your-first-seven', position, saved: true }]);

// Screens: route plus what must be on screen once loaded (a regex over visible text).
const SCREENS = [
  ['tonight', '/journey', /tonight/i],
  ['pathways', '/journey', /journey/i, [{ click: 'role=radio[name=/pathways/i]' }]],
  ['journey', '/journey/your-first-seven', /seven/i],
  ['reader', '/p/amurru', /دِيارِ|ديار/],
  ['explore', '/explore', /explore/i],
  ['poets', '/explore/poets', /poet/i],
  ['poet', '/poet/majnun-layla', /majnun/i],
  ['feeling', '/explore/feeling/longing', /longing/i],
  ['collections', '/explore/collections', /collections/i],
  ['collection', '/collection/your-first-seven', /seven/i],
  ['search', '/search', /majnun|lines/i, [{ fill: ['input', 'ليلى'] }]],
  ['library', '/library', /diwan|ديوان/i],
  ['you', '/you', /you/i],
];

const CASES = [];
for (const [name, route, expect, steps] of SCREENS) {
  // Library and You read this device first (keeps, account, settings), so nothing of theirs waits on /api/v2.
  CASES.push({ id: `${name}--loading`, mode: 'live', api: 'hang', route, steps, expectBusy: !['library', 'you'].includes(name) });
  CASES.push({ id: `${name}--error`, mode: 'live', api: 'fail', route, steps, expectNot: expect, expectMessage: name !== 'library' }); // signed out, Library is all on this device
  CASES.push({ id: `${name}--ready`, mode: 'mock', route, steps, expect });
}
// Per-user states (mock store).
CASES.push(
  { id: 'library--empty-signed-out', mode: 'mock', route: '/library', local: { 'mock.keeps': '[]', 'mock.lists': '[]', 'mock.follows': '[]', 'mock.account': SIGNED_OUT } },
  { id: 'library--signed-in-kept', mode: 'mock', route: '/library', local: { 'mock.account': ACCOUNT, 'mock.keeps': KEEP(['87201']) }, expect: /amurru|أمر|دِيارِ|ديار/i },
  { id: 'reader--unkept', mode: 'mock', route: '/p/amurru', local: { 'mock.keeps': '[]' } },
  { id: 'reader--kept', mode: 'mock', route: '/p/amurru', local: { 'mock.keeps': KEEP(['87201']) } },
  { id: 'you--signed-out', mode: 'mock', route: '/you', local: { 'mock.account': SIGNED_OUT } },
  { id: 'you--signed-in', mode: 'mock', route: '/you', local: { 'mock.account': ACCOUNT }, expect: /signed in with google/i },
  { id: 'journey--progress-0', mode: 'mock', route: '/journey/your-first-seven', local: { 'mock.progress': AT(0) } },
  { id: 'journey--progress-3', mode: 'mock', route: '/journey/your-first-seven', local: { 'mock.progress': AT(3) } },
  { id: 'journey--done', mode: 'mock', route: '/journey/your-first-seven/done/7', expect: /complete/i },
  { id: 'pathways--progress-3', mode: 'mock', route: '/journey', local: { 'mock.progress': AT(3) }, steps: [{ click: 'role=radio[name=/pathways/i]' }] },
  { id: 'search--no-results', mode: 'mock', route: '/search', steps: [{ fill: ['input', 'zzqxv'] }] },
  { id: 'welcome--first-run', mode: 'mock', route: '/welcome', fresh: true },
  // A short phone (iPhone 13 with browser chrome): the ENTER door must not cover WHY TONIGHT.
  { id: 'tonight--short-phone', mode: 'mock', route: '/journey', viewport: { width: 390, height: 664 }, noOverlap: ['.tonight__why', '.tonight__enter .enter'] },
  { id: 'unknown-route', mode: 'mock', route: '/nope', expect: /doesn.t exist/i },
);

// Only a server that serves this app counts (other projects may hold nearby ports).
async function up(url) { try { const r = await fetch(url); return r.ok && (await r.text()).includes('/new/'); } catch { return false; } }
const servers = [];
async function ensure(mode) {
  const base = `http://localhost:${SERVERS[mode]}/new/`;
  if (await up(base)) return base;
  const env = { ...process.env, ...(mode === 'mock' ? { VITE_SOURCES: 'mock' } : {}) };
  delete env.VITE_SUPABASE_URL; delete env.VITE_SUPABASE_ANON_KEY; // per-user data stays on the device
  servers.push(spawn('npx', ['vite', '--port', String(SERVERS[mode]), '--strictPort'], { cwd: new URL('..', import.meta.url), stdio: 'ignore', env }));
  for (let i = 0; i < 80 && !(await up(base)); i++) await new Promise((r) => setTimeout(r, 500));
  return base;
}

const exe = process.env.PW_CHROMIUM ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const results = [];
for (const c of CASES.filter((c) => !only || only.test(c.id))) {
  const base = await ensure(c.mode);
  const ctx = await browser.newContext({ viewport: c.viewport ?? { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const problems = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message.split('\n')[0]}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|status of 50\d|WebSocket connection/.test(m.text())) problems.push(`console: ${m.text().slice(0, 140)}`); });
  if (c.api) {
    await page.route('**/api/v2/**', (r) => (c.api === 'hang' ? new Promise(() => {}) : r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"qa"}' })));
  }
  await page.goto(base);
  await page.evaluate(({ local, fresh }) => {
    localStorage.clear();
    sessionStorage.setItem('splashed', '1');
    if (!fresh) localStorage.setItem('welcomed', 'true');
    for (const [k, v] of Object.entries(local ?? {})) localStorage.setItem(k, v);
  }, { local: c.local, fresh: c.fresh });
  await page.goto(base + c.route.replace(/^\//, ''));
  await page.waitForTimeout(c.api === 'hang' ? 1500 : 900);
  for (const s of c.steps ?? []) {
    try {
      if (s.click) await page.locator(s.click).first().click({ timeout: 3000 });
      if (s.fill) await page.locator(s.fill[0]).first().fill(s.fill[1], { timeout: 3000 });
      await page.waitForTimeout(700);
    } catch { if (!c.api) problems.push(`step failed: ${JSON.stringify(s)}`); }
  }
  if (c.api === 'fail') await page.waitForTimeout(3500); // let retries give up
  const text = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
  if (/\bundefined\b|\bNaN\b|\[object |\bnull\b/.test(text)) problems.push(`stray value in text: “${text.match(/.{0,30}(undefined|NaN|\[object |\bnull\b).{0,30}/)?.[0]}”`);
  if (c.expect && !c.expect.test(text)) problems.push(`expected ${c.expect} on screen`);
  for (const [a, b] of c.noOverlap ? [c.noOverlap] : []) {
    const [ra, rb] = await Promise.all([a, b].map((q) => page.locator(q).first().boundingBox()));
    if (!ra || !rb) problems.push(`overlap check: ${!ra ? a : b} not found`);
    else if (ra.y < rb.y + rb.height && rb.y < ra.y + ra.height) problems.push(`${a} and ${b} overlap`);
  }
  const busy = await page.locator('[aria-busy=true], .skeleton, [class*=skeleton]').count();
  if (c.expectBusy && !busy) problems.push('loading: no skeleton or aria-busy while data is pending');
  if (c.api === 'fail' && c.expectMessage !== false && !/try again|couldn.t|could not|went wrong|offline|retry/i.test(text)) problems.push('error: no error message or retry shown');
  const main = text.replace(/poetry|بالعربي|explore|library|you|tonight/gi, '').trim();
  if (main.length < 15 && !busy) problems.push('blank screen');
  await page.screenshot({ path: new URL(`${c.id}.png`, out).pathname });
  results.push({ ...c, problems });
  process.stdout.write(problems.length ? '✘' : '·');
  await ctx.close();
}
await browser.close();
for (const s of servers) s.kill();

const bad = results.filter((r) => r.problems.length);
writeFileSync(new URL('index.html', out), `<!doctype html><meta charset="utf-8"><title>State QA</title>
<style>body{background:#111;color:#ddd;font:13px system-ui;margin:20px}.grid{display:flex;flex-wrap:wrap;gap:16px}figure{margin:0;width:240px}img{width:240px;border:1px solid #333;border-radius:10px}h2{font-size:13px;margin:4px 0;color:#D4B36A}.bad h2{color:#f77}ul{margin:4px 0;padding-left:16px;color:#f99}</style>
<h1>State QA · ${new Date().toISOString().slice(0, 16)} · ${bad.length}/${results.length} with problems</h1><div class="grid">
${results.map((r) => `<figure class="${r.problems.length ? 'bad' : ''}"><h2>${r.id}</h2><img src="${r.id}.png"><ul>${r.problems.map((p) => `<li>${p.replace(/</g, '&lt;')}</li>`).join('')}</ul></figure>`).join('\n')}</div>`);
console.log(`\n${results.length} cases, ${bad.length} with problems → qa/out/states/index.html`);
for (const r of bad) console.log(`✘ ${r.id}\n   ${r.problems.join('\n   ')}`);
process.exit(bad.length ? 1 : 0);
