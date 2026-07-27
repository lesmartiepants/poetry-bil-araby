import { v2 as speechV2 } from '@google-cloud/speech';
import { randomUUID } from 'node:crypto';

const MAX_AUDIO_BYTES = 15_000;

function durationSeconds(duration) {
  if (!duration) return 0;
  return Number(duration.seconds || 0) + Number(duration.nanos || 0) / 1_000_000_000;
}

function configuration() {
  return {
    project: process.env.GOOGLE_CLOUD_PROJECT || '',
    location: process.env.GOOGLE_CLOUD_LOCATION || 'us',
    language: process.env.GOOGLE_STT_LANGUAGE || 'ar-SA',
  };
}

export function googleSttStatus() {
  const { project, location, language } = configuration();
  return {
    available: Boolean(project),
    provider: 'Google Cloud Speech-to-Text V2 / Chirp 3',
    location,
    language,
    missing: project ? [] : ['GOOGLE_CLOUD_PROJECT'],
    note: 'Application Default Credentials must be available to this server; never expose them to the browser.',
  };
}

class GoogleSttSession {
  constructor() {
    const { project, location, language } = configuration();
    if (!project) throw new Error('Google STT requires GOOGLE_CLOUD_PROJECT on the POC server');
    this.id = randomUUID();
    this.cues = [];
    this.cursor = 0;
    this.closed = false;
    this.client = new speechV2.SpeechClient({ apiEndpoint: `${location}-speech.googleapis.com` });
    this.stream = this.client._streamingRecognize();
    this.stream.on('data', (response) => this.receive(response));
    this.stream.on('error', (error) => {
      this.error = error.message;
    });
    this.stream.write({
      recognizer: `projects/${project}/locations/${location}/recognizers/_`,
      streamingConfig: {
        config: {
          languageCodes: [language],
          model: 'chirp_3',
          explicitDecodingConfig: {
            encoding: 'LINEAR16',
            sampleRateHertz: 24_000,
            audioChannelCount: 1,
          },
        },
        streamingFeatures: { interimResults: true },
      },
    });
  }

  receive(response) {
    for (const result of response.results || []) {
      const alternative = result.alternatives?.[0];
      if (!alternative) continue;
      const words = (alternative.words || []).map((word) => ({
        word: word.word,
        start: durationSeconds(word.startOffset),
        end: durationSeconds(word.endOffset),
      }));
      if (words.length || alternative.transcript) {
        this.cues.push({
          final: Boolean(result.isFinal),
          transcript: alternative.transcript,
          end: durationSeconds(result.resultEndOffset),
          words,
        });
      }
    }
  }

  writeBase64(audio) {
    if (this.closed) return;
    const pcm = Buffer.from(audio, 'base64');
    for (let offset = 0; offset < pcm.length; offset += MAX_AUDIO_BYTES) {
      this.stream.write({ audio: pcm.subarray(offset, offset + MAX_AUDIO_BYTES) });
    }
  }

  read(after = 0) {
    return {
      next: this.cues.length,
      cues: this.cues.slice(after),
      error: this.error || null,
    };
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.stream.end();
  }
}

export class GoogleSttSessions {
  constructor() {
    this.sessions = new Map();
  }

  start() {
    const session = new GoogleSttSession();
    this.sessions.set(session.id, session);
    return session.id;
  }

  get(id) {
    const session = this.sessions.get(id);
    if (!session) throw new Error('Unknown Google STT session');
    return session;
  }

  close(id) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.close();
  }

  dispose(id) {
    const session = this.sessions.get(id);
    if (!session) return;
    session.close();
    this.sessions.delete(id);
  }
}
