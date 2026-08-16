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
 * ## The premise this file used to state, which is wrong
 *
 * An earlier version of this comment read: "Arabic is the question; English is a
 * gloss under it, not a translation with equal billing." That is rejected, and
 * it is written down here because the behaviour was corrected once already and
 * then rebuilt from the documentation. A large share of this audience comes to
 * Arabic poetry THROUGH English — diaspora, learners, people who can sound out
 * the script but not read a 9th-century qasida unaided. For that reader English
 * is not a courtesy caption, it is the road in.
 *
 * ## Two roles, two rules
 *
 * CONTENT (verse, poem title, poet's name): Arabic is the artifact and English
 * is the access, so the Arabic leads visually. Not this file's job.
 *
 * CHROME (questions, buttons, nav, empty states): the two languages are two
 * renderings of ONE instruction, so parity is the target and English leads in
 * reading order. That is what `BilingualLabel` is for.
 *
 * ## Parity is optical, and it runs the opposite way to intuition
 *
 * Setting Amiri and a Latin face at the same point size does not make them weigh
 * the same, and the correction is not to make the Arabic bigger — it is already
 * heavier. Measured ink-box height at equal px: Amiri 1.32x Forum, Reem Kufi
 * 1.31x, vocalized Arabic 1.78x. Horizontally it inverts, with the same content
 * running 1.16-2.03x WIDER in Latin.
 *
 * So the Arabic is set at 0.85x the Latin px (see AR_TO_LATIN) and at 88% of its
 * alpha, and chrome labels are stripped of tashkeel. Three other rules do the
 * rest:
 *
 *   1. Never uppercase or letterspace the Latin in a bilingual pair. Caps
 *      measure ~2.1x the width of the Arabic equivalent, so the hierarchy
 *      inverts by width even when the size is right. This flow shipped that
 *      mistake once: uppercased, tracked English at 12px measured physically
 *      wider than the 15px Arabic heading above it.
 *   2. Latin gets a DISPLAY face (Forum, the app's Latin brand face), not the UI
 *      sans. A sans beside Amiri reads as an annotation on it; a display serif
 *      reads as its counterpart.
 *   3. Equality is not duplication. Two co-equal lines cost twice the vertical,
 *      which is worth it on a title, a CTA or a category name, and wasteful on
 *      explanatory copy — mirroring every string just makes each reader skip
 *      every other line. Bilingual on the things that carry the question;
 *      single-language on body copy and hints.
 *
 * English is set first because the chrome reads left to right, and on an LTR
 * screen the first line is where the eye lands.
 */
/**
 * Arabic runs SMALLER than the Latin, not larger.
 *
 * This is the counter-intuitive part, and the first version of this table got it
 * backwards. Measured ink-box height at equal px, on the faces actually in use:
 * Amiri is 1.32x Forum, Reem Kufi is 1.31x, and a vocalized Arabic label is
 * 1.78x. Arabic already carries more ink per point than a Latin display face, so
 * setting it 1.30x larger again — which is what this table used to do — lands
 * the Arabic at roughly 1.7x the optical weight of the English. That is how the
 * English ended up first in reading order and second in perception.
 *
 * 0.85 is the correction. It targets a measured ink ratio of 1.00-1.15, which
 * `stepParts.parity.test.jsx` asserts so this cannot quietly drift back the
 * first time somebody nudges a size.
 */
const AR_TO_LATIN = 0.85;

/** Latin px per role; the Arabic is derived, never authored separately. */
const LATIN_PX = {
  title: 22,
  option: 17,
  control: 17,
  // The advance row. Smaller than `control` on purpose: the nav is furniture,
  // and at 17px a two-line bilingual label made the pill tall enough to compete
  // with the question it sits under.
  nav: 15,
  // Mood puts 16 of these in a wrapped field; at `option` size they no longer
  // fit the body budget. The RATIO is what carries parity, so shrinking both
  // together keeps the two languages equal at a smaller absolute size.
  chip: 14.5,
};

export const pairSizes = (size) => {
  const latin = LATIN_PX[size] ?? LATIN_PX.option;
  return { latin, arabic: Math.round(latin * AR_TO_LATIN * 100) / 100 };
};

/**
 * Chrome labels are set UNVOCALIZED.
 *
 * Tashkeel takes the Arabic-to-Latin ink ratio from 1.32 to 1.78 on its own, so
 * a vocalized label cannot reach parity at any size that is also readable. It
 * also buys nothing here: these are category names and button labels, not verse,
 * and vocalization earns its space where pronunciation is the point. Poems keep
 * their tashkeel.
 */
export const unvocalized = (s) => (s || '').replace(/[ً-ْٰـ]/g, '');

export const BilingualLabel = ({
  en,
  ar,
  size = 'option',
  color = '#fff',
  align = 'center',
  arFace = "'Amiri', serif",
  gap = 1,
}) => {
  const { latin, arabic } = pairSizes(size);
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
        data-bilingual="en"
        dir="ltr"
        style={{
          fontFamily: "'Forum', serif",
          fontSize: latin,
          lineHeight: 1.2,
          // Never uppercase or letterspace the Latin in a bilingual pair: caps
          // measure ~2.1x the width of the Arabic equivalent, so the hierarchy
          // inverts by width even when the size is right.
          letterSpacing: '.01em',
          color,
        }}
      >
        {en}
      </span>
      <span
        data-bilingual="ar"
        lang="ar"
        dir="rtl"
        style={{
          fontFamily: arFace,
          fontSize: arabic,
          lineHeight: 1.35,
          color,
          // Colour finishes what size starts: heavier ink at a matched size
          // still shouts, so the Arabic sits at 88% of the Latin's alpha.
          opacity: 0.88,
        }}
      >
        {unvocalized(ar)}
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
  en = 'Categories are not available yet',
  ar = 'لم تحمل التصنيفات بعد',
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
    {/* English first, matching the titles above it. This block was the last
        Arabic-first thing in the chrome: it sat under an English-led question
        and then answered in the other order. */}
    <BilingualLabel en={en} ar={ar} size="option" color="rgba(255,255,255,0.5)" gap={3} />
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
