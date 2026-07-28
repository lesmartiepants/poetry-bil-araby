import { createServer } from 'node:http';
import { readFile, readdir, stat } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { GoogleSttSessions, googleSttStatus } from './google-stt-adapter.mjs';
import { LIVE_SYSTEM_INSTRUCTION } from '../../src/prompts.js';
import { DEFAULT_VOICE, VOICE_CATALOG } from '../../src/constants/voices.js';

const root = resolve(import.meta.dirname);
const comparisonArtifacts = resolve(root, 'artifacts', 'comparisons');
const apiOrigin = process.env.POC_API_ORIGIN || 'http://localhost:3102';
// A timing-worktree server can generate Live audio without database access, while
// the fixed reference poem is served from the existing read-only API. Keeping the
// two origins configurable lets one POC run characterize a branch's Live-TTS
// behavior without changing its poem, prompt, or voice.
const poemApiOrigin = process.env.POC_POEM_API_ORIGIN || apiOrigin;
const port = Number(process.env.POC_PORT || 5180);
// The normal automated reference remains #87443. POC_POEM_ID is a deliberate
// generalization-screen override: its report keeps the returned poem ID, so it
// cannot be mistaken for the reference leaderboard.
const REFERENCE_POEM_ID = Number(process.env.POC_POEM_ID || 87443);
const types = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
};
const googleSessions = new GoogleSttSessions();
const requestedVoice = process.env.POC_VOICE || DEFAULT_VOICE;
const PROMPT_PROFILES = {
  production: LIVE_SYSTEM_INSTRUCTION,
  'steady-clarity':
    'You are a masculine Arabic speaker reciting classical Arabic poetry. Recite the supplied Arabic text exactly, at a steady natural pace. Articulate every word clearly, keep the rhythm calm and consistent within each line, and make only brief, natural pauses at line endings. Do not add, omit, repeat, or explain words.\n\nاقرأ النص العربي كما هو، بوضوح وإيقاع ثابت وطبيعي. انطق كل كلمة بوضوح، واجعل الوقفات قصيرة وطبيعية في نهاية الأسطر فقط. لا تضف أو تحذف أو تكرر أي كلمة.',
  'verse-boundaries':
    'You are a masculine Arabic poet reciting classical Arabic verse. Recite the supplied Arabic text exactly. Keep a predictable pace within each poetic line, make each line ending clearly audible with a short natural pause, and avoid dramatic stretching of individual words. Do not add, omit, repeat, or explain words.\n\nألقِ النص العربي كما هو. حافظ على سرعة منتظمة داخل كل سطر، واجعل نهاية كل سطر واضحة بوقفة قصيرة طبيعية، وتجنب المد الدرامي المبالغ فيه للكلمات. لا تضف أو تحذف أو تكرر أي كلمة.',
};
const promptProfile = process.env.POC_PROMPT_PROFILE || 'production';
const systemInstruction = PROMPT_PROFILES[promptProfile];

if (!VOICE_CATALOG.some(({ name }) => name === requestedVoice)) {
  throw new Error(`Unknown POC_VOICE: ${requestedVoice}`);
}
if (!systemInstruction) {
  throw new Error(`Unknown POC_PROMPT_PROFILE: ${promptProfile}`);
}
if (!Number.isSafeInteger(REFERENCE_POEM_ID) || REFERENCE_POEM_ID <= 0) {
  throw new Error(`Invalid POC_POEM_ID: ${process.env.POC_POEM_ID}`);
}

function harnessConfig(requestUrl) {
  const voiceName = requestUrl.searchParams.get('voice') || requestedVoice;
  const selectedPromptProfile = requestUrl.searchParams.get('prompt') || promptProfile;
  const selectedSystemInstruction = PROMPT_PROFILES[selectedPromptProfile];
  const poemIdParam = requestUrl.searchParams.get('poemId');
  const poemId = poemIdParam ? Number(poemIdParam) : REFERENCE_POEM_ID;
  if (!VOICE_CATALOG.some(({ name }) => name === voiceName)) {
    throw new Error(`Unknown harness voice: ${voiceName}`);
  }
  if (!selectedSystemInstruction) {
    throw new Error(`Unknown harness prompt profile: ${selectedPromptProfile}`);
  }
  if (!Number.isSafeInteger(poemId) || poemId <= 0) {
    throw new Error(`Invalid harness poem ID: ${poemIdParam}`);
  }
  return {
    poemId,
    tts: {
      voiceName,
      temperature: 0,
      systemInstruction: selectedSystemInstruction,
      promptProfile: selectedPromptProfile,
    },
  };
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function sendJson(response, status, data) {
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' });
  response.end(JSON.stringify(data));
}

async function serveArtifact(request, response, name, mime) {
  const path = resolve(comparisonArtifacts, name);
  const file = await stat(path);
  const range = request.headers.range;
  const headers = {
    'content-type': mime,
    'cache-control': 'no-store',
    'accept-ranges': 'bytes',
  };

  if (!range) {
    response.writeHead(200, { ...headers, 'content-length': file.size });
    if (request.method === 'HEAD') response.end();
    else createReadStream(path).pipe(response);
    return;
  }

  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!match) {
    response.writeHead(416, { 'content-range': `bytes */${file.size}` });
    response.end();
    return;
  }
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : file.size - 1;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start > end || start >= file.size) {
    response.writeHead(416, { 'content-range': `bytes */${file.size}` });
    response.end();
    return;
  }
  const boundedEnd = Math.min(end, file.size - 1);
  response.writeHead(206, {
    ...headers,
    'content-length': boundedEnd - start + 1,
    'content-range': `bytes ${start}-${boundedEnd}/${file.size}`,
  });
  if (request.method === 'HEAD') response.end();
  else createReadStream(path, { start, end: boundedEnd }).pipe(response);
}

async function comparisonReports() {
  const names = await readdir(comparisonArtifacts);
  const reports = await Promise.all(
    names
      .filter((name) => name.endsWith('-comparison.json'))
      .sort()
      .reverse()
      .map(async (name) => JSON.parse(await readFile(resolve(comparisonArtifacts, name), 'utf8')))
  );
  return reports;
}

async function runLog() {
  try {
    return (await readFile(resolve(comparisonArtifacts, 'run-log.jsonl'), 'utf8'))
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url, 'http://localhost');
    if (requestUrl.pathname === '/harness/config') {
      return sendJson(response, 200, harnessConfig(requestUrl));
    }
    if (requestUrl.pathname === '/runs') {
      return sendJson(response, 200, { reports: await comparisonReports(), log: await runLog() });
    }
    if (requestUrl.pathname === '/runs/artifact') {
      const name = requestUrl.searchParams.get('name') || '';
      if (basename(name) !== name || !/\.(?:webm|mp4|png|json)$/.test(name)) {
        return sendJson(response, 400, { error: 'Invalid run artifact' });
      }
      const extension = name.split('.').pop();
      const mime = {
        webm: 'video/webm',
        mp4: 'video/mp4',
        png: 'image/png',
        json: 'application/json',
      }[extension];
      await serveArtifact(request, response, name, mime);
      return;
    }
    if (requestUrl.pathname === '/alignment/providers') {
      return sendJson(response, 200, { google: googleSttStatus() });
    }
    if (requestUrl.pathname === '/alignment/google/start' && request.method === 'POST') {
      return sendJson(response, 201, { sessionId: googleSessions.start() });
    }
    if (requestUrl.pathname === '/alignment/google/chunk' && request.method === 'POST') {
      const { sessionId, audio } = await readJson(request);
      googleSessions.get(sessionId).writeBase64(audio);
      return sendJson(response, 202, {});
    }
    if (requestUrl.pathname === '/alignment/google/cues') {
      const session = googleSessions.get(requestUrl.searchParams.get('session'));
      return sendJson(
        response,
        200,
        session.read(Number(requestUrl.searchParams.get('after') || 0))
      );
    }
    if (requestUrl.pathname === '/alignment/google/stop' && request.method === 'POST') {
      const { sessionId } = await readJson(request);
      googleSessions.close(sessionId);
      return sendJson(response, 202, {});
    }
    if (requestUrl.pathname === '/alignment/google/dispose' && request.method === 'POST') {
      const { sessionId } = await readJson(request);
      googleSessions.dispose(sessionId);
      return sendJson(response, 204, {});
    }
    if (requestUrl.pathname.startsWith('/api/')) {
      const upstreamOrigin = requestUrl.pathname.startsWith('/api/poems/')
        ? poemApiOrigin
        : apiOrigin;
      const upstream = await fetch(`${upstreamOrigin}${requestUrl.pathname}${requestUrl.search}`, {
        method: request.method,
        headers: { 'content-type': request.headers['content-type'] || 'application/json' },
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request,
        duplex: 'half',
      });
      response.writeHead(upstream.status, {
        'cache-control': upstream.headers.get('cache-control') || 'no-store',
        'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
      });
      if (upstream.body) Readable.fromWeb(upstream.body).pipe(response);
      else response.end();
      return;
    }

    const pathname = requestUrl.pathname === '/' ? 'index.html' : basename(requestUrl.pathname);
    const file = await readFile(resolve(root, pathname));
    response.writeHead(200, {
      'content-type': types[`.${pathname.split('.').pop()}`] || 'text/plain',
      'cache-control': 'no-store',
    });
    response.end(file);
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}).listen(port, '127.0.0.1', () => console.log(`POC: http://localhost:${port}`));
