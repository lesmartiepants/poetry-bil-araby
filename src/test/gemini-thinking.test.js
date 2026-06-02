import { describe, it, expect } from 'vitest';
import { thinkingConfigFor } from '../services/gemini.js';

/**
 * thinkingConfigFor picks the right "minimize thinking" knob per model family.
 * Minimizing thinking is the insights/translation latency fix: it drops
 * time-to-first-streamed-token from ~15s warm to ~1s (profiled 2026-06).
 * The field name differs by family, so a wrong field would 400 the request.
 */
describe('thinkingConfigFor', () => {
  it('uses thinkingLevel:minimal for Gemini 3.x models', () => {
    expect(thinkingConfigFor('gemini-3.5-flash')).toEqual({
      thinkingConfig: { thinkingLevel: 'minimal' },
    });
    expect(thinkingConfigFor('gemini-3-flash-preview')).toEqual({
      thinkingConfig: { thinkingLevel: 'minimal' },
    });
  });

  it('uses thinkingBudget:0 for Gemini 2.5 models', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({
      thinkingConfig: { thinkingBudget: 0 },
    });
    expect(thinkingConfigFor('gemini-2.5-pro')).toEqual({
      thinkingConfig: { thinkingBudget: 0 },
    });
  });

  it('returns an empty object for models without thinking support', () => {
    // Older families 400 on the thinking field, so they must get nothing.
    expect(thinkingConfigFor('gemini-2.0-flash')).toEqual({});
    expect(thinkingConfigFor('gemini-1.5-flash')).toEqual({});
    expect(thinkingConfigFor('')).toEqual({});
    expect(thinkingConfigFor()).toEqual({});
  });

  it('returns a fresh spreadable object each call (no shared mutation)', () => {
    const a = thinkingConfigFor('gemini-3.5-flash');
    const b = thinkingConfigFor('gemini-3.5-flash');
    expect(a).not.toBe(b);
    const merged = { maxOutputTokens: 8192, ...thinkingConfigFor('gemini-2.5-flash') };
    expect(merged).toEqual({ maxOutputTokens: 8192, thinkingConfig: { thinkingBudget: 0 } });
  });
});
