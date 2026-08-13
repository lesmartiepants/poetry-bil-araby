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
 * ## Bilingual parity
 *
 * Both languages carry the label, and neither is a caption for the other.
 *
 * Parity is OPTICAL, not numeric. Setting Amiri and a Latin face at the same
 * point size does not make them weigh the same on screen: Arabic hangs most of
 * its mass on a single connected baseline with short verticals, while a Latin
 * face spends its em on cap-height and ascenders. At identical sizes the Latin
 * line looks bigger and busier. This flow already made the mirror-image mistake
 * in the other direction — uppercased, tracked English at 12px measured
 * physically WIDER than the 15px Arabic above it, so the "caption" was
 * out-shouting the heading it belonged to.
 *
 * The ratios below (Arabic ≈ 1.25x the Latin size) were set by eye against the
 * real strings at 393px, not derived. Two rules do most of the work:
 *
 *   1. Same colour and same opacity for both lines. Nothing signals "one of
 *      these is secondary" faster than dimming it, and nothing signals equality
 *      faster than not dimming it. This is why the old English gloss at 32%
 *      white could never have read as an equal no matter what size it was.
 *   2. Latin gets a DISPLAY face (Forum, the app's Latin brand face), not the UI
 *      sans. A sans-serif next to Amiri reads as an annotation on it; a display
 *      serif reads as its counterpart.
 *
 * English is set first because the chrome reads left-to-right, and on a
 * left-to-right screen the first line is where the eye lands. The Arabic is not
 * demoted by sitting second — it is larger, and it is in the app's own voice.
 */
const PAIR = {
  // [latin, arabic] — arabic runs ~1.2-1.25x for equal optical presence.
  title: ['1.15rem', '1.5rem'],
  option: ['.875rem', '1.05rem'],
  control: ['.9375rem', '1.05rem'],
  // Mood puts 16 of these in a wrapped field; at `option` size they no longer
  // fit the body budget. The RATIO is what carries parity, so shrinking both
  // together keeps the two languages equal at a smaller absolute size.
  chip: ['.75rem', '.9375rem'],
};

export const BilingualLabel = ({
  en,
  ar,
  size = 'option',
  color = '#fff',
  align = 'center',
  arFace = "'Amiri', serif",
  gap = 1,
}) => {
  const [enSize, arSize] = PAIR[size] || PAIR.option;
  return (
    <span
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap,
        alignItems: align === 'center' ? 'center' : 'flex-start',
        minWidth: 0,
      }}
    >
      <span
        dir="ltr"
        style={{
          fontFamily: "'Forum', serif",
          fontSize: enSize,
          lineHeight: 1.2,
          letterSpacing: '.01em',
          color,
        }}
      >
        {en}
      </span>
      <span
        lang="ar"
        dir="rtl"
        style={{ fontFamily: arFace, fontSize: arSize, lineHeight: 1.35, color }}
      >
        {ar}
      </span>
    </span>
  );
};

/**
 * The question, in both languages at equal weight.
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
      height: 92,
      display: 'flex',
      flexDirection: 'column',
      alignItems: align === 'center' ? 'center' : 'flex-start',
      justifyContent: 'center',
      marginBottom: '1rem',
    }}
  >
    <h2 style={{ margin: 0, fontWeight: 400 }}>
      <BilingualLabel en={en} ar={ar} size="title" color={accent} align={align} gap={2} />
    </h2>
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
