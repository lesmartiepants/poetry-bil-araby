import StepShell from '../StepShell.jsx';
import {
  useSelection,
  StepTitle,
  EmptyState,
  LoadingState,
  BilingualLabel,
} from '../stepParts.jsx';

/**
 * Step 5 — Reading (the difficulty dimension).
 *
 * ## The design feature: one typeface, three golds
 *
 * This screen used to BE its answer: each band set in a face and size matching
 * its difficulty, so "Demanding" arrived in a classical calligraphic hand at
 * the largest size and "Gentle" in a plain modern one at the smallest. The
 * ladder was legible and the owner rejected it — a specimen ladder makes the
 * screen a font sampler, and three different faces at three different sizes is
 * a lot of noise for what is one question about difficulty.
 *
 * So the type is now CONSTANT: one Latin face, one Arabic face, one size, one
 * leading, for all three. Nothing about the letterforms says anything about
 * difficulty. The whole ladder is carried by gold instead — the app's one
 * accent, graded three ways:
 *
 *   Gentle     a thin gold at low strength; the mark is barely lit
 *   Measured   the same gold at full strength; flat, solid
 *   Demanding  molten gold — a gradient with a highlight and a dark foot, the
 *              only place on the screen where the accent has depth
 *
 * That is intensity read as material rather than as size: the metal gets richer
 * as the reading gets harder. It works because gold already means "this matters"
 * everywhere else in the flow, so more gold is more of the same signal, and it
 * survives at a glance without a legend.
 *
 * ## Selection is not intensity
 *
 * The step is multi-select — a reader who wants easy AND hard poems and nothing
 * in the middle can now say so. That creates a real risk: if "chosen" were also
 * expressed in gold, it would be indistinguishable from the intensity ladder.
 * So the two signals are kept in different registers. Intensity is the gold and
 * never changes. Chosen is a panel: a tinted ground and a hairline around the
 * row, which is a shape appearing, not a colour deepening.
 */
/**
 * The three grades of gold, easiest first. Only the MARK changes; every row's
 * type is identical. Index-aligned to the bands as they arrive (easy -> hard),
 * and a fourth band would fall back to the last grade rather than run out.
 */
const GRADES = [
  {
    bar: 'rgba(197,160,89,0.34)',
    text: 'rgba(233,216,182,0.74)',
    hint: 'rgba(255,255,255,0.4)',
  },
  {
    bar: '#c5a059',
    text: 'rgba(240,224,190,0.92)',
    hint: 'rgba(255,255,255,0.5)',
  },
  {
    bar: 'linear-gradient(180deg,#fbeeca 0%,#e3c483 22%,#c5a059 52%,#7d5c26 100%)',
    glow: '0 0 12px rgba(197,160,89,.45)',
    text: '#f6e6bd',
    hint: 'rgba(255,255,255,0.62)',
  },
];

/**
 * Strip tashkeel from the specimen line.
 *
 * The band names arrive vocalised (سَهْلٌ مُيَسَّر) and the display faces set those
 * marks badly — Katibeh and Aref Ruqaa detach the shadda cluster and float it
 * over empty space, Fustat stacks it into the letter tops. Broken vocalisation
 * on the one screen that is ABOUT typography refutes the screen. The marks are
 * not carrying meaning here: these are UI labels, not verse, and the ladder is
 * carried by face, size and leading. Poems themselves keep their tashkeel; this
 * is scoped to three labels.
 */
const unvocalised = (s) => (s || '').replace(/[ً-ْٰـ]/g, '');

const ReadingStep = ({
  testId,
  stepIndex,
  stepCount,
  options = [],
  value = [],
  onNext,
  onBack,
  loading,
}) => {
  // Multi-select: easy AND hard, with nothing in between, is a real answer.
  const [selected, toggle] = useSelection(value, true);

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;
    return (
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '.5rem',
        }}
      >
        {options.map((o, i) => {
          const on = selected.includes(o.key);
          const g = GRADES[i] || GRADES[GRADES.length - 1];
          return (
            <button
              key={o.key}
              data-testid={`${testId}-option`}
              data-option-key={o.key}
              aria-pressed={on}
              aria-label={`${o.label_en} — ${o.label_ar}`}
              onClick={() => toggle(o.key)}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: 14,
                width: '100%',
                minHeight: 76,
                padding: '.7rem .8rem',
                textAlign: 'start',
                cursor: 'pointer',
                borderRadius: 12,
                // Chosen is a SHAPE appearing, not a richer gold — the gold is
                // already spoken for by the intensity ladder.
                border: `1px solid ${on ? 'rgba(197,160,89,0.5)' : 'transparent'}`,
                background: on ? 'rgba(197,160,89,0.09)' : 'transparent',
                transition: 'background .25s ease, border-color .25s ease',
                animation: `obSpec .55s ease ${0.08 * i}s both`,
              }}
            >
              {/* The grade. This is the only thing that differs between rows. */}
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 auto',
                  width: 6,
                  alignSelf: 'stretch',
                  borderRadius: 3,
                  background: g.bar,
                  // Only the molten grade gets a cast shadow. It is the one
                  // rung that is meant to look like metal rather than paint.
                  boxShadow: g.glow || 'none',
                }}
              />
              <span
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '.25rem',
                  minWidth: 0,
                }}
              >
                {/* Same face, same size, every row — BilingualLabel also holds
                    the Arabic to 0.85x the Latin, so the parity rule survives a
                    screen that is nominally about type. */}
                <BilingualLabel
                  en={o.label_en}
                  ar={unvocalised(o.label_ar)}
                  size="option"
                  color={g.text}
                  align="start"
                />
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '.55rem',
                    flexWrap: 'wrap',
                  }}
                >
                  {/* English first, to match the reading order of the chrome. */}
                  {o.hint_en && (
                    <span
                      dir="ltr"
                      style={{
                        fontFamily: "'Forum', serif",
                        fontSize: '.8125rem',
                        lineHeight: 1.45,
                        color: g.hint,
                      }}
                    >
                      {o.hint_en}
                    </span>
                  )}
                  {o.hint_ar && (
                    <span
                      lang="ar"
                      dir="rtl"
                      style={{
                        fontFamily: "'Amiri', serif",
                        fontSize: '.8125rem',
                        lineHeight: 1.45,
                        color: g.hint,
                      }}
                    >
                      {unvocalised(o.hint_ar)}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <StepShell
      testId={testId}
      stepIndex={stepIndex}
      stepCount={stepCount}
      accent="#c5a059"
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={selected.length ? 'التالي' : 'تخطَّ'}
      ctaEn={selected.length ? 'Next' : 'Skip'}
    >
      <style>{`@keyframes obSpec{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      {/* "تحدٍّ" carries a tanween AND a shadda on one tooth, and Reem Kufi at
          display size stacks them into each other — a broken mark in the title of
          the step that is about typography. "عسيرة" says the same thing unmarked. */}
      <StepTitle en="Easy reading, or a challenge?" ar="قراءة سهلة أم لغة عسيرة؟" />
      {body()}
    </StepShell>
  );
};

export default ReadingStep;
