import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { GoogleAuth } from 'google-auth-library';

// This is deliberately a capability probe, not a replacement timing audit. It
// asks whether an alternate engine can return source-controlled SSML marks and
// records request timings before anyone builds playback around it.
const root = resolve(import.meta.dirname);
const artifacts = resolve(root, 'artifacts', 'comparisons');
const referencePoemId = 87443;
const referenceText = `مِثَالِي هَذَا مَنْبِىءٌ عَنْ سَرِيرَتِي شَهَادَتُهُ حَقٌّ عَلَيَّ مُبِينُ
حَبَوْتُ بِهِ خِلا يُوفِّي بِصَوْنِهِ
كَرَامَةَ وُدِّي وَالوَفِيُّ أَمينُ
مَشَى النُّورُ فِيهِ وَالظِّلاَلُ تَحُفُّهْ
صَوَادِقُ فِي التَّشْبِيهِ لَيْسَ تَمِينُ
دَمِي مِنْهُ يَجْرِي فِي الْغُصُونِ وَمُهْجَتِي
يُحَسُّ لَهَا تَحْتَ السُّكُونِ حَنِيْنُ`;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT_ID;
const requestedVoice = process.env.GOOGLE_TTS_VOICE;
const endpoint = 'https://texttospeech.googleapis.com/v1';
const startedAt = new Date().toISOString();

class GoogleApiError extends Error {
  constructor(status, body) {
    const message = body?.error?.message || `Google Text-to-Speech returned HTTP ${status}`;
    super(message);
    this.status = status;
    this.code = body?.error?.status;
  }
}

function escapeXml(value) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[character]
  );
}

function referenceWords() {
  return referenceText.trim().split(/\s+/);
}

function markSsml(words) {
  // One deterministic, source-indexed mark before each word. Keep line breaks
  // as sentence breaks so returned mark offsets can later be compared to the
  // same 39-word reference used by the Live-TTS harness.
  const lines = referenceText.trim().split('\n');
  let index = 0;
  const paragraphs = lines.map((line) => {
    const marked = line
      .trim()
      .split(/\s+/)
      .map((word) => `<mark name="w${String(index++).padStart(3, '0')}"/>${escapeXml(word)}`)
      .join(' ');
    return `<s>${marked}</s>`;
  });
  return `<speak><p>${paragraphs.join('</p><p>')}</p></speak>`;
}

function chooseArabicVoice(voices) {
  if (requestedVoice) {
    const selected = voices.find((voice) => voice.name === requestedVoice);
    if (!selected)
      throw new Error(`Requested GOOGLE_TTS_VOICE ${requestedVoice} was not returned for ar-XA`);
    return selected;
  }
  return [...voices]
    .filter((voice) => voice.languageCodes?.some((code) => code.startsWith('ar')))
    .sort((left, right) => {
      const rank = (voice) =>
        voice.name.includes('Neural2') ? 0 : voice.name.includes('WaveNet') ? 1 : 2;
      return rank(left) - rank(right) || left.name.localeCompare(right.name);
    })[0];
}

function safeError(error) {
  return {
    name: error?.name || 'Error',
    message: String(error?.message || error).replace(/Bearer\s+[^\s]+/gi, 'Bearer [redacted]'),
    ...(error instanceof GoogleApiError
      ? { httpStatus: error.status, googleCode: error.code }
      : {}),
  };
}

async function main() {
  await mkdir(artifacts, { recursive: true });
  const timestampId = new Date().toISOString().replace(/[-:.]/g, '').replace('Z', 'Z');
  const filename = `google-tts-marks-probe-${timestampId}-${randomUUID().slice(0, 8)}.json`;
  const artifactPath = resolve(artifacts, filename);
  const words = referenceWords();
  const probe = {
    schemaVersion: 1,
    kind: 'capability-probe',
    capabilityProbe: true,
    probe: 'google-cloud-text-to-speech-ssml-marks',
    startedAt,
    completedAt: null,
    status: 'unavailable',
    reference: {
      poemId: referencePoemId,
      wordCount: words.length,
      textSource: 'Fixed POC reference text for poem #87443',
    },
    configuration: {
      languageCode: 'ar-XA',
      requestedVoice: requestedVoice || null,
      audioEncoding: 'LINEAR16',
      sampleRateHertz: 24000,
      requestedTimePointing: ['SSML_MARK'],
      projectConfigured: Boolean(projectId),
    },
    // Do not misrepresent an API response as listener-audible timing. This
    // probe does not schedule or play audio and receives no independent audit.
    interpretation:
      'Capability/latency probe only. Returned SSML mark offsets are provider metadata, not a browser playback measurement or a word-sync timing audit.',
    result: null,
  };

  try {
    const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const client = await auth.getClient();
    const request = async (url, options = {}) => {
      const headers = {
        ...(await client.getRequestHeaders(url)),
        ...(projectId ? { 'x-goog-user-project': projectId } : {}),
        ...options.headers,
      };
      const responseStarted = performance.now();
      const response = await fetch(url, { ...options, headers });
      const responseMs = Math.round(performance.now() - responseStarted);
      const responseBodyStarted = performance.now();
      const body = await response.json();
      const bodyMs = Math.round(performance.now() - responseBodyStarted);
      if (!response.ok) throw new GoogleApiError(response.status, body);
      return { body, responseMs, bodyMs };
    };

    const voiceResponse = await request(`${endpoint}/voices?languageCode=ar-XA`);
    const voice = chooseArabicVoice(voiceResponse.body.voices || []);
    if (!voice) throw new Error('Google Text-to-Speech returned no Arabic voice for ar-XA');

    const ssml = markSsml(words);
    const synthesisResponse = await request(`${endpoint}/text:synthesize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        input: { ssml },
        voice: { languageCode: 'ar-XA', name: voice.name },
        audioConfig: { audioEncoding: 'LINEAR16', sampleRateHertz: 24000 },
        enableTimePointing: ['SSML_MARK'],
      }),
    });
    const timepoints = (synthesisResponse.body.timepoints || []).map((point) => ({
      markName: point.markName,
      timeSeconds: Number(point.timeSeconds),
    }));
    const expectedMarks = words.length;
    const returnedMarks = timepoints.filter((point) => /^w\d{3}$/.test(point.markName)).length;

    probe.status = returnedMarks === expectedMarks ? 'supported' : 'partial';
    probe.result = {
      selectedVoice: {
        name: voice.name,
        ssmlGender: voice.ssmlGender,
        naturalSampleRateHertz: voice.naturalSampleRateHertz,
      },
      voiceDiscovery: { responseMs: voiceResponse.responseMs, bodyMs: voiceResponse.bodyMs },
      synthesis: {
        responseMs: synthesisResponse.responseMs,
        bodyMs: synthesisResponse.bodyMs,
        audioBase64Bytes: Buffer.byteLength(synthesisResponse.body.audioContent || '', 'base64'),
        expectedMarks,
        returnedMarks,
        timepointCoverage: Number((returnedMarks / expectedMarks).toFixed(3)),
        timepoints,
      },
    };
  } catch (error) {
    probe.status =
      error instanceof GoogleApiError && [401, 403, 404].includes(error.status)
        ? 'unavailable'
        : 'failed';
    probe.result = { error: safeError(error) };
  }

  probe.completedAt = new Date().toISOString();
  await writeFile(artifactPath, `${JSON.stringify(probe, null, 2)}\n`);
  await appendFile(
    resolve(artifacts, 'run-log.jsonl'),
    `${JSON.stringify({
      event: 'capability-probe',
      timestamp: probe.completedAt,
      capabilityProbe: true,
      probe: probe.probe,
      status: probe.status,
      referencePoemId,
      wordCount: words.length,
      artifact: filename,
      interpretation: probe.interpretation,
    })}\n`
  );
  console.log(
    JSON.stringify({ artifactPath, status: probe.status, result: probe.result }, null, 2)
  );
}

await main();
