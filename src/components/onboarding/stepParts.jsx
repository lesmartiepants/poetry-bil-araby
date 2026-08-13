import { useState } from 'react';

/**
 * The small pieces every step needs that are NOT presentation: selection
 * semantics, the title block, and the two degraded states.
 *
 * Deliberately not a component with a `layout` prop. That is what the old
 * PreferenceStep was, and sharing the rendering is what made six questions look
 * like one. What is shared here is behaviour and copy furniture only.
 */

/**
 * Selection state for a step.
 *
 * Single-select TOGGLES OFF. Every step is skippable, so a reader who picks an
 * era and changes their mind needs a way back to "no answer"; without this the
 * only escape was reloading the flow. Tapping the chosen option clears it and
 * the CTA falls back from "Next" to "Skip". Do not regress this.
 */
export const useSelection = (initial = [], multi = true) => {
  const [selected, setSelected] = useState(initial);
  const toggle = (key) =>
    setSelected((cur) =>
      multi
        ? cur.includes(key)
          ? cur.filter((k) => k !== key)
          : [...cur, key]
        : cur[0] === key
          ? []
          : [key]
    );
  return [selected, toggle];
};

const GOLD = '#c5a059';

/**
 * Reem Kufi ships a very narrow space glyph — at display sizes the words in an
 * Arabic phrase run together ("ما مزاجك الآن؟" reads as one word). Every element
 * set in Kufi needs this; it is not an aesthetic tweak, it is the difference
 * between legible and not. Applied via a class rather than repeated inline so
 * there is one place to change it. The rule itself lives in StepShell, which
 * every step mounts, and is applied with `className="ob-kufi"`.
 */

/**
 * The question.
 *
 * Arabic is the question; English is a gloss under it, not a translation with
 * equal billing. Reem Kufi for the Arabic because it is a short display line —
 * a Kufi sentence reads flat and alien, so anything longer than a phrase goes
 * to Amiri instead (see the welcome and the hint lines).
 *
 * The English is NOT uppercased and carries almost no tracking. It was both,
 * and the result inverted the hierarchy the flow claims: "WHAT MOOD ARE YOU IN?"
 * at 12px measured physically wider than the 15px Arabic above it, because
 * uppercasing plus letterspacing inflates a Latin line's footprint. Sentence
 * case at .02em keeps it a gloss.
 *
 * The block has a FIXED height so the question lands at the same y on all six
 * steps. Letting it size to its content moved the title between 158px and 240px
 * from the top depending on how tall the options below it were, which is a large
 * part of why six screens read as six unrelated screens.
 */
export const StepTitle = ({ ar, en, accent = GOLD, align = 'center' }) => (
  <div
    style={{
      textAlign: align,
      flex: '0 0 auto',
      height: 78,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      marginBottom: '1.1rem',
    }}
  >
    <h2
      lang="ar"
      dir="rtl"
      className="ob-kufi"
      style={{
        fontSize: 'clamp(1.35rem, 5.4vw, 1.75rem)',
        lineHeight: 1.3,
        color: accent,
        margin: 0,
        fontWeight: 400,
      }}
    >
      {ar}
    </h2>
    <p
      dir="ltr"
      style={{
        fontSize: '.8125rem',
        letterSpacing: '.02em',
        color: 'rgba(255,255,255,0.32)',
        margin: '.3rem 0 0',
      }}
    >
      {en}
    </p>
  </div>
);

/**
 * Pre-migration (`/api/categories` -> empty) or a network failure. Say so and
 * let the reader skip through, rather than hanging on a spinner.
 */
export const EmptyState = ({
  testId,
  ar = 'لم تُحمَّل التصنيفات بعد',
  en = 'Categories are not available yet',
}) => (
  <div
    data-testid={`${testId}-empty`}
    style={{
      flex: '1 1 auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '.4rem',
      textAlign: 'center',
    }}
  >
    <p
      lang="ar"
      dir="rtl"
      style={{ fontFamily: "'Amiri', serif", color: 'rgba(255,255,255,0.5)', margin: 0 }}
    >
      {ar}
    </p>
    <p style={{ fontSize: '.75rem', color: 'rgba(255,255,255,0.28)', margin: 0 }}>{en}</p>
  </div>
);

export const LoadingState = ({ testId, accent = GOLD }) => (
  <div
    data-testid={`${testId}-loading`}
    style={{ flex: '1 1 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
  >
    <span
      style={{
        width: 26,
        height: 26,
        borderRadius: '50%',
        border: `1.5px solid ${accent}33`,
        borderTopColor: accent,
        animation: 'obSpin 1s linear infinite',
      }}
    />
    <style>{`@keyframes obSpin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
