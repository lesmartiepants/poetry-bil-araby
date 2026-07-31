import { execFile } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = resolve(import.meta.dirname, '../..');
const envPath = resolve(repoRoot, '.env');
const apiOrigin = process.env.POC_API_ORIGIN || 'http://127.0.0.1:3001';

async function hasConfiguredGeminiKey() {
  if (process.env.GEMINI_API_KEY) return true;
  try {
    const env = await readFile(envPath, 'utf8');
    return /^GEMINI_API_KEY=\S+/m.test(env);
  } catch {
    return false;
  }
}

async function checkCommand(command, args) {
  try {
    await execFileAsync(command, args, { timeout: 5_000 });
    return true;
  } catch {
    return false;
  }
}

async function apiReachable() {
  try {
    const response = await fetch(`${apiOrigin}/api/health`, { signal: AbortSignal.timeout(2_000) });
    return response.ok;
  } catch {
    return false;
  }
}

const checks = [
  {
    name: 'Node 20+',
    required: true,
    ok: Number(process.versions.node.split('.')[0]) >= 20,
    fix: 'Install Node 20 or newer.',
  },
  {
    name: 'Playwright browser driver',
    required: true,
    ok: await import('playwright').then(() => true).catch(() => false),
    fix: 'Run npm install, then npx playwright install chromium if needed.',
  },
  {
    name: 'ffmpeg recording converter',
    required: true,
    ok: await checkCommand('ffmpeg', ['-version']),
    fix: 'Install ffmpeg (for example: brew install ffmpeg).',
  },
  {
    name: 'GEMINI_API_KEY configured',
    required: true,
    ok: await hasConfiguredGeminiKey(),
    fix: 'Add GEMINI_API_KEY to .env; do not use VITE_GEMINI_API_KEY for the POC server.',
  },
  {
    name: `API reachable at ${apiOrigin}`,
    required: true,
    ok: await apiReachable(),
    fix: 'Start the backend with npm run dev:server, or set POC_API_ORIGIN to its origin.',
  },
  {
    name: 'Chirp audit configuration',
    required: false,
    ok: Boolean(process.env.GOOGLE_CLOUD_PROJECT),
    fix: 'Set GOOGLE_CLOUD_PROJECT and Application Default Credentials before npm run poc:analyze.',
  },
  {
    name: 'CTC worker configuration',
    required: false,
    ok: Boolean(process.env.CTC_WORKER_URL),
    fix: 'Optional: set CTC_WORKER_URL only for CTC POC modes.',
  },
];

for (const check of checks) {
  const status = check.ok ? 'ok' : check.required ? 'missing' : 'optional';
  console.log(`${status.padEnd(8)} ${check.name}${check.ok ? '' : ` — ${check.fix}`}`);
}

try {
  await access(resolve(repoRoot, 'package.json'));
} catch {
  throw new Error('Run this command from a Poetry Bil-Araby checkout.');
}

if (checks.some((check) => check.required && !check.ok)) process.exitCode = 1;
