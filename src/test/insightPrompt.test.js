import { describe, it, expect } from 'vitest';
import { buildInsightPrompt } from '../utils/insightPrompt';

describe('buildInsightPrompt', () => {
  const arabic = 'سطر أول\nسطر ثان\nسطر ثالث';

  it('states the line contract using the count the reader will see', () => {
    const p = buildInsightPrompt({ arabic, poet: 'المتنبي' });
    expect(p).toContain('This poem has exactly 3 Arabic lines');
    expect(p).toContain('produce exactly 3 English lines');
  });

  it('ignores blank lines when counting', () => {
    const p = buildInsightPrompt({ arabic: 'أول\n\n  \nثان', poet: 'x' });
    expect(p).toContain('exactly 2 Arabic lines');
  });

  it('names the poet when known', () => {
    expect(buildInsightPrompt({ arabic, poet: 'المتنبي' })).toContain(
      'Deep Analysis of by المتنبي:'
    );
  });

  it('omits the poet clause entirely when unknown', () => {
    const p = buildInsightPrompt({ arabic });
    expect(p.startsWith('Deep Analysis of:')).toBe(true);
    expect(p).not.toContain(' by ');
  });

  it('carries the Arabic through verbatim', () => {
    expect(buildInsightPrompt({ arabic, poet: 'x' })).toContain(arabic);
  });

  // The batch backfill (scripts/batch-translate.mjs) converts the corpus's '*'
  // hemistich separator to newlines and then calls this same function. If that
  // conversion is skipped the whole poem counts as one line, and the model is
  // told to return a single line of English for a 20-line poem.
  it('counts a raw star-separated poem as one line, which is why callers convert first', () => {
    const raw = 'سطر أول*سطر ثان*سطر ثالث';
    expect(buildInsightPrompt({ arabic: raw })).toContain('exactly 1 Arabic lines');
    expect(buildInsightPrompt({ arabic: raw.split('*').join('\n') })).toContain(
      'exactly 3 Arabic lines'
    );
  });

  it('survives missing input without throwing', () => {
    expect(buildInsightPrompt()).toContain('exactly 0 Arabic lines');
    expect(buildInsightPrompt({})).toContain('exactly 0 Arabic lines');
  });
});
