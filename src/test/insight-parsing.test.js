import { describe, it, expect } from 'vitest';
import { parseInsight } from '../utils/insightParser';

describe('parseInsight', () => {
  it('returns null for null input', () => {
    expect(parseInsight(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(parseInsight(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseInsight('')).toBeNull();
  });

  it('parses a well-formed 3-section insight', () => {
    const text =
      'POEM:\nA river of longing flows through the night\n' +
      'THE DEPTH: The poet explores exile and identity through water imagery.\n' +
      'THE AUTHOR: Mahmoud Darwish was a Palestinian poet known for resistance literature.';
    const result = parseInsight(text);
    expect(result).toEqual({
      poeticTranslation: 'A river of longing flows through the night',
      depth: 'The poet explores exile and identity through water imagery.',
      author: 'Mahmoud Darwish was a Palestinian poet known for resistance literature.',
    });
  });

  it('handles missing THE DEPTH section gracefully', () => {
    const text = 'POEM:\nTranslation here\nTHE AUTHOR: Author info here.';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Translation here');
    // With only two sections after split, second part fills depth
    expect(result.depth).toBe('Author info here.');
    expect(result.author).toBe('');
  });

  it('handles missing THE AUTHOR section gracefully', () => {
    const text = 'POEM:\nTranslation here\nTHE DEPTH: Deep meaning here.';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Translation here');
    expect(result.depth).toBe('Deep meaning here.');
    expect(result.author).toBe('');
  });

  it('is case-insensitive for section markers', () => {
    const text =
      'poem:\nTranslation\nthe depth: Analysis\nthe author: Bio';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Translation');
    expect(result.depth).toBe('Analysis');
    expect(result.author).toBe('Bio');
  });

  it('handles streaming partial content (only POEM section received so far)', () => {
    const text = 'POEM:\nPartial translation being streamed...';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Partial translation being streamed...');
    expect(result.depth).toBe('');
    expect(result.author).toBe('');
  });

  it('trims whitespace from each section', () => {
    const text =
      'POEM:   \n  Spaced translation  \n  THE DEPTH:  \n  Spaced depth  \n  THE AUTHOR:  \n  Spaced author  ';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Spaced translation');
    expect(result.depth).toBe('Spaced depth');
    expect(result.author).toBe('Spaced author');
  });

  it('handles text with no markers at all', () => {
    const text = 'Just some random insight text without markers.';
    const result = parseInsight(text);
    expect(result.poeticTranslation).toBe('Just some random insight text without markers.');
    expect(result.depth).toBe('');
    expect(result.author).toBe('');
  });
});
