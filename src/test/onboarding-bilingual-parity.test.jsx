import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { BilingualLabel, pairSizes, unvocalized } from '../components/onboarding/stepParts.jsx';

/**
 * Guards the bilingual contract for CHROME.
 *
 * The flow shipped the inverse of this rule twice — once as uppercased tracked
 * English that measured wider than the Arabic heading above it, and once as a
 * PAIR table that set the Arabic 1.30x LARGER than the Latin on the theory that
 * Arabic needs more size for equal presence. It needs less: at equal px its ink
 * box is ~1.32x the Latin's.
 *
 * jsdom has no font metrics, so this cannot measure real rendered ink. What it
 * CAN do is pin the inputs that produce the ratio — the size relationship, the
 * alpha, the absence of tashkeel and the absence of uppercasing — so a future
 * nudge to any of them fails here rather than silently re-inverting the
 * hierarchy on a phone. The measured-ink check belongs in a browser pass; these
 * are the invariants that make it reachable.
 */

/**
 * Ink-box height per px of font-size, measured in a real browser at 393px on
 * the faces this flow actually uses. Latin is the baseline at 1.0.
 */
const INK_PER_PX = { latin: 1.0, arabic: 1.32 };

/** The chief's target band for the rendered ink ratio. */
const MIN_RATIO = 1.0;
const MAX_RATIO = 1.15;

const ROLES = ['title', 'option', 'control', 'chip'];

describe('bilingual parity (chrome)', () => {
  it.each(ROLES)('keeps the projected ink ratio inside 1.00-1.15 for %s', (role) => {
    const { latin, arabic } = pairSizes(role);
    const ratio = (arabic * INK_PER_PX.arabic) / (latin * INK_PER_PX.latin);
    expect(ratio).toBeGreaterThanOrEqual(MIN_RATIO);
    expect(ratio).toBeLessThanOrEqual(MAX_RATIO);
  });

  it('sets the Arabic SMALLER than the Latin, not larger', () => {
    // The bug this file exists to prevent. If someone "fixes" the Arabic by
    // scaling it up again, every assertion above still has to fail loudly.
    for (const role of ROLES) {
      const { latin, arabic } = pairSizes(role);
      expect(arabic).toBeLessThan(latin);
    }
  });

  it('renders English first in the DOM, so reading order matches the LTR chrome', () => {
    render(<BilingualLabel en="What mood are you in?" ar="ما مزاجك الآن؟" size="title" />);
    const pair = screen.getByText('What mood are you in?').parentElement;
    const spans = [...pair.querySelectorAll('[data-bilingual]')];
    expect(spans.map((s) => s.getAttribute('data-bilingual'))).toEqual(['en', 'ar']);
  });

  it('never uppercases or heavily tracks the Latin', () => {
    // Caps measure ~2.1x the width of the Arabic equivalent, so the hierarchy
    // inverts by width even when the size is right.
    render(<BilingualLabel en="From which age?" ar="من أيّ زمن؟" size="title" />);
    const en = screen.getByText('From which age?');
    expect(en.style.textTransform).not.toBe('uppercase');
    expect(parseFloat(en.style.letterSpacing || '0')).toBeLessThanOrEqual(0.02);
  });

  it('holds the Arabic at 88% alpha so equal size does not read as louder', () => {
    render(<BilingualLabel en="Next" ar="التالي" size="control" />);
    const ar = screen.getByText('التالي');
    expect(Number(ar.style.opacity)).toBeCloseTo(0.88, 2);
  });

  it('strips tashkeel from chrome labels', () => {
    // Vocalization alone takes the ink ratio from 1.32 to 1.78, which no size
    // inside a readable range can bring back into the target band.
    expect(unvocalized('الطرب والصُّحبة')).toBe('الطرب والصحبة');
    expect(unvocalized('سَهْلٌ مُيَسَّر')).toBe('سهل ميسر');

    render(<BilingualLabel en="Revelry & Companionship" ar="الطرب والصُّحبة" />);
    expect(screen.getByText('الطرب والصحبة')).toBeTruthy();
  });

  it('leaves the Arabic string untouched when it carries no marks', () => {
    expect(unvocalized('الليل')).toBe('الليل');
  });
});
