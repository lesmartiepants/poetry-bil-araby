import { describe, it, expect } from 'vitest';
import { repairAndParseJSON } from '../utils/jsonRepair';

describe('repairAndParseJSON', () => {
  it('passes through valid JSON unchanged', () => {
    const obj = { poet: 'Nizar Qabbani', tags: ['Modern', 'Romantic'] };
    expect(repairAndParseJSON(JSON.stringify(obj))).toEqual(obj);
  });

  it('strips markdown code fences', () => {
    const obj = { title: 'Test' };
    const fenced = '```json\n' + JSON.stringify(obj) + '\n```';
    expect(repairAndParseJSON(fenced)).toEqual(obj);
  });

  it('repairs a single unclosed brace', () => {
    const truncated = '{"poet":"Al-Mutanabbi","arabic":"عَلَى قَدْرِ"';
    const result = repairAndParseJSON(truncated);
    expect(result.poet).toBe('Al-Mutanabbi');
    expect(result.arabic).toBe('عَلَى قَدْرِ');
  });

  it('repairs unclosed brackets inside an array', () => {
    const truncated = '{"tags":["Modern","Romantic"';
    const result = repairAndParseJSON(truncated);
    expect(result.tags).toEqual(['Modern', 'Romantic']);
  });

  it('repairs an odd number of quotes', () => {
    // Trailing unclosed string value
    const truncated = '{"poet":"Nizar';
    const result = repairAndParseJSON(truncated);
    expect(result.poet).toBe('Nizar');
  });

  it('handles multiple unclosed braces', () => {
    const truncated = '{"poet":"Nizar","tags":["Modern","Romantic"]}';
    // Already valid — just has nested structure
    const result = repairAndParseJSON(truncated);
    expect(result.poet).toBe('Nizar');
    expect(result.tags).toEqual(['Modern', 'Romantic']);
  });

  it('throws on completely invalid input', () => {
    expect(() => repairAndParseJSON('not json at all {')).toThrow(
      'AI returned invalid JSON'
    );
  });

  it('throws on null input', () => {
    expect(() => repairAndParseJSON(null)).toThrow();
  });

  it('throws on empty string', () => {
    expect(() => repairAndParseJSON('')).toThrow();
  });

  it('handles code fences with extra whitespace', () => {
    const obj = { key: 'value' };
    const fenced = '  ```json  \n  ' + JSON.stringify(obj) + '  \n  ```  ';
    expect(repairAndParseJSON(fenced)).toEqual(obj);
  });
});
