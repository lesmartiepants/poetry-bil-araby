import { describe, it, expect } from 'vitest';
import { VOICE_SHORTLIST, DEFAULT_VOICE, nextVoice } from '../constants/voices.js';

describe('voice shortlist', () => {
  it('has at least two distinct voices to cycle between', () => {
    expect(VOICE_SHORTLIST.length).toBeGreaterThanOrEqual(2);
    const names = VOICE_SHORTLIST.map((v) => v.name);
    expect(new Set(names).size).toBe(names.length); // no duplicates
  });

  it('every entry has a name and a descriptor', () => {
    for (const v of VOICE_SHORTLIST) {
      expect(typeof v.name).toBe('string');
      expect(v.name.length).toBeGreaterThan(0);
      expect(typeof v.descriptor).toBe('string');
      expect(v.descriptor.length).toBeGreaterThan(0);
    }
  });

  it('DEFAULT_VOICE is the first shortlist entry', () => {
    expect(DEFAULT_VOICE).toBe(VOICE_SHORTLIST[0].name);
  });
});

describe('nextVoice', () => {
  it('advances to the next voice in order', () => {
    for (let i = 0; i < VOICE_SHORTLIST.length - 1; i++) {
      expect(nextVoice(VOICE_SHORTLIST[i].name)).toBe(VOICE_SHORTLIST[i + 1].name);
    }
  });

  it('wraps around from the last voice to the first', () => {
    const last = VOICE_SHORTLIST[VOICE_SHORTLIST.length - 1].name;
    expect(nextVoice(last)).toBe(VOICE_SHORTLIST[0].name);
  });

  it('restarts the cycle for a voice not in the shortlist (e.g. a DebugPanel pick)', () => {
    expect(nextVoice('Zephyr')).toBe(VOICE_SHORTLIST[0].name);
    expect(nextVoice(undefined)).toBe(VOICE_SHORTLIST[0].name);
    expect(nextVoice('')).toBe(VOICE_SHORTLIST[0].name);
  });

  it('cycles through the entire shortlist and returns to the start', () => {
    let voice = DEFAULT_VOICE;
    for (let i = 0; i < VOICE_SHORTLIST.length; i++) {
      voice = nextVoice(voice);
    }
    expect(voice).toBe(DEFAULT_VOICE);
  });
});
