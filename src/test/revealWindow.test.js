import { describe, it, expect } from 'vitest';
import {
  maxWindowTop,
  computeWindowTop,
  scrubResolve,
  contTop,
  commitTop,
  clipPercentForLine,
} from '../utils/revealWindow.js';

describe('maxWindowTop', () => {
  it('is 0 when the poem fits in the window', () => {
    expect(maxWindowTop(4)).toBe(0);
    expect(maxWindowTop(3)).toBe(0);
    expect(maxWindowTop(0)).toBe(0);
  });
  it('is total - visRows for longer poems', () => {
    expect(maxWindowTop(10)).toBe(6);
    expect(maxWindowTop(10, 4)).toBe(6);
    expect(maxWindowTop(7, 3)).toBe(4);
  });
});

describe('computeWindowTop', () => {
  it('keeps the window at 0 while the first 4 lines fill it', () => {
    // revealing line 1 (lastLine=1) of a 10-line poem → still top 0
    expect(computeWindowTop(1, 10, 4, 0)).toBe(0);
    expect(computeWindowTop(3, 10, 4, 0)).toBe(0);
  });
  it('scrolls so the newest line lands on the bottom row', () => {
    expect(computeWindowTop(4, 10, 4, 0)).toBe(1); // line 4 → top 1 (rows 1..4)
    expect(computeWindowTop(7, 10, 4, 2)).toBe(4); // line 7 → top 4 (rows 4..7)
  });
  it('never scrolls up (respects prevTop)', () => {
    // even if lastLine-3 would be smaller, we keep prevTop
    expect(computeWindowTop(3, 10, 4, 2)).toBe(2);
  });
  it('clamps to maxWindowTop near the end', () => {
    expect(computeWindowTop(9, 10, 4, 6)).toBe(6); // maxTop = 6
    expect(computeWindowTop(9, 10, 4, 8)).toBe(6); // prevTop above max → clamp
  });
  it('post-scrub off-by-one: an odd window/line offset still keeps the newest line visible', () => {
    // Scrubbed to line 5 with prevTop=2 (rows 2..5). Next tap reveals lines 6 then 7.
    const top = computeWindowTop(7, 10, 4, 2);
    expect(top).toBe(4); // rows 4..7 — line 7 (bottom) is inside the window, not below it
    expect(7 - top).toBeLessThanOrEqual(3);
  });
});

describe('scrubResolve', () => {
  it('clamps frac to [0,1]', () => {
    expect(scrubResolve(-0.5, 10)).toEqual({ line: 0, within: 0 });
    expect(scrubResolve(1.5, 10)).toEqual({ line: 9, within: 1 });
  });
  it('resolves a mid fraction to line + within', () => {
    const { line, within } = scrubResolve(0.55, 10); // 5.5
    expect(line).toBe(5);
    expect(within).toBeCloseTo(0.5, 5);
  });
  it('frac=1 lands on the last line fully revealed', () => {
    expect(scrubResolve(1, 10)).toEqual({ line: 9, within: 1 });
  });
  it('frac=0 lands on line 0 with no progress', () => {
    expect(scrubResolve(0, 10)).toEqual({ line: 0, within: 0 });
  });
});

describe('contTop', () => {
  it('follows the finger fractionally while dragging', () => {
    expect(contTop(5, 0.5, 10)).toBeCloseTo(2.5, 5); // 5.5 - 3
    expect(contTop(0, 0, 10)).toBe(0);
  });
  it('clamps to maxWindowTop', () => {
    expect(contTop(9, 1, 10)).toBe(6);
  });
  it('never goes negative near the start', () => {
    expect(contTop(1, 0, 10)).toBe(0);
  });
});

describe('commitTop', () => {
  it('settles the dropped-on line to the bottom row', () => {
    expect(commitTop(5, 10)).toBe(2); // rows 2..5
    expect(commitTop(9, 10)).toBe(6); // clamp to maxTop
    expect(commitTop(1, 10)).toBe(0); // clamp to 0
  });
});

describe('clipPercentForLine', () => {
  it('reveals lines before the target fully', () => {
    expect(clipPercentForLine(2, 5, 0.5)).toBe(0);
  });
  it('partially clips the target line by progress', () => {
    expect(clipPercentForLine(5, 5, 0.25)).toBeCloseTo(75, 5); // (1-0.25)*100
    expect(clipPercentForLine(5, 5, 1)).toBe(0);
    expect(clipPercentForLine(5, 5, 0)).toBe(100);
  });
  it('keeps lines after the target hidden', () => {
    expect(clipPercentForLine(7, 5, 0.5)).toBe(100);
  });
});
