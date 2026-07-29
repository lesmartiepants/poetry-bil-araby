import { describe, it, expect } from 'vitest';
import {
  VOICE_CATALOG,
  DEFAULT_VOICE,
  nextVoice,
  voiceDisplayName,
  voiceGender,
} from '../constants/voices.js';

describe('voice catalog', () => {
  it('has voices to cycle between with no duplicates', () => {
    expect(VOICE_CATALOG.length).toBeGreaterThanOrEqual(2);
    const names = VOICE_CATALOG.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('every entry has a name, descriptor, and a valid gender', () => {
    for (const v of VOICE_CATALOG) {
      expect(typeof v.name).toBe('string');
      expect(v.name.length).toBeGreaterThan(0);
      expect(typeof v.descriptor).toBe('string');
      expect(v.descriptor.length).toBeGreaterThan(0);
      expect(typeof v.displayName).toBe('string');
      expect(v.displayName.length).toBeGreaterThan(0);
      expect(['f', 'm']).toContain(v.gender);
    }
  });

  it('DEFAULT_VOICE is a real catalog entry', () => {
    expect(VOICE_CATALOG.some((v) => v.name === DEFAULT_VOICE)).toBe(true);
  });
});

describe('voiceGender', () => {
  it('returns the gender for a known voice', () => {
    expect(voiceGender('Zephyr')).toBe('f');
    expect(voiceGender('Autonoe')).toBe('f');
    expect(voiceGender('Orus')).toBe('m');
  });

  describe('voiceDisplayName', () => {
    it('returns the English persona name for a known voice', () => {
      expect(voiceDisplayName('Aoede')).toBe('Nasmah');
      expect(voiceDisplayName('Orus')).toBe('Azzam');
    });

    it('falls back to the raw voice id when unknown', () => {
      expect(voiceDisplayName('NotAVoice')).toBe('NotAVoice');
      expect(voiceDisplayName(undefined)).toBeUndefined();
    });
  });

  it('returns null for an unknown voice', () => {
    expect(voiceGender('NotAVoice')).toBeNull();
    expect(voiceGender(undefined)).toBeNull();
  });
});

describe('nextVoice', () => {
  it('alternates gender while returning active catalog voices', () => {
    for (const voice of VOICE_CATALOG) {
      const next = nextVoice(voice.name);
      expect(VOICE_CATALOG.some((candidate) => candidate.name === next)).toBe(true);
      expect(voiceGender(next)).not.toBe(voice.gender);
    }
  });

  it('starts unknown voices with an active male voice', () => {
    expect(nextVoice('NotAVoice')).toBe('Orus');
    expect(nextVoice(undefined)).toBe('Orus');
    expect(nextVoice('')).toBe('Orus');
  });
});
