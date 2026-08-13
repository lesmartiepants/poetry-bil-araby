import StepShell from '../StepShell.jsx';
import {
  useSelection,
  StepTitle,
  EmptyState,
  LoadingState,
  BilingualLabel,
} from '../stepParts.jsx';

/**
 * Step 4 — Family.
 *
 * ## The design feature: one field keeps its colour, the rest lose theirs
 *
 * The families are the library's broad divisions and each one already owns a
 * colour — love is rose, valor is red, nature is green, grief is slate. This is
 * also the only question in the flow that takes exactly one answer. So the step
 * is a mosaic of colour fields, and choosing one DRAINS the colour out of the
 * other six: the chosen field goes to full saturation and lifts, the rest fall
 * to greyscale. Exclusivity is carried by colour itself, which is both instant
 * to read across a whole screen and impossible to mistake for a multi-select —
 * you cannot have two fields be the only coloured one.
 *
 * Re-tapping the lit field puts the colour back everywhere and clears the
 * answer. A single-select with no way to un-choose traps a reader who changed
 * their mind.
 *
 * ## What this replaces, and why
 *
 * The first version of this step was a shelf of vertical book spines with the
 * titles rotated to run up them. The metaphor was right and the execution was
 * not: rotated text is hard to read in any script, and worse in Arabic, where
 * the connected baseline and the tashkeel both carry information that fighting
 * a 90 degree turn destroys. Tested in the hand it simply failed. Every label
 * here is horizontal, at full size, in both languages.
 *
 * The tiles are deliberately not the flow's other shapes: mood is pills on
 * black, imagery is line drawings in outlined boxes, reading is bare type, era
 * is a rail. This is the only step made of filled colour.
 *
 * ## Layout
 *
 * A two-column grid, seven tiles, the last spanning both columns so the grid
 * closes flush instead of leaving a hole. Roughly 168x84 at 393px, which fits
 * the longest pair (Revelry & Companionship / الطرب والصُّحبة) on two horizontal
 * lines without clipping, and four rows land inside the body budget.
 */

const GOLD = '#c5a059';

const FamilyStep = ({
  testId,
  stepIndex,
  stepCount,
  options = [],
  value = [],
  onNext,
  onBack,
  loading,
}) => {
  const [selected, toggle] = useSelection(value, false);

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;
    return (
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 8,
        }}
      >
        {options.map((o, i) => {
          const on = selected[0] === o.key;
          const drained = selected.length > 0 && !on;
          const last = i === options.length - 1;
          const odd = options.length % 2 === 1;
          return (
            <button
              key={o.key}
              data-testid={`${testId}-option`}
              data-option-key={o.key}
              aria-pressed={on}
              aria-label={`${o.label_en} — ${o.label_ar}`}
              onClick={() => toggle(o.key)}
              style={{
                // The odd tile out spans the row rather than leaving a gap.
                gridColumn: last && odd ? 'span 2' : 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                minHeight: 84,
                padding: '.75rem .9rem',
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'start',
                border: `1px solid ${on ? o.color : 'transparent'}`,
                // A filled field, not an outlined card. The tile IS the colour.
                background: `linear-gradient(135deg, ${o.color}${on ? '55' : '30'}, ${o.color}${
                  on ? '22' : '12'
                })`,
                // Draining the colour is the whole selected state, so it has to
                // be a real change: greyscale plus a drop in brightness, not a
                // few points of opacity.
                filter: drained ? 'grayscale(1) brightness(0.62)' : 'none',
                opacity: drained ? 0.75 : 1,
                transform: on ? 'translateY(-2px)' : 'none',
                boxShadow: on ? `0 12px 26px -14px ${o.color}` : 'none',
                transition:
                  'filter .35s ease, opacity .35s ease, transform .3s cubic-bezier(.2,.7,.3,1), background .3s ease, border-color .3s ease',
                animation: `obField .5s ease ${0.04 * i}s both`,
              }}
            >
              <BilingualLabel
                en={o.label_en}
                ar={o.label_ar}
                size="option"
                align="start"
                color={on ? '#fff' : 'rgba(255,255,255,0.88)'}
                gap={2}
              />
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
      accent={GOLD}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={selected.length ? 'التالي' : 'تخطَّ'}
      ctaEn={selected.length ? 'Next' : 'Skip'}
    >
      <style>{`@keyframes obField{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <StepTitle en="What draws you in?" ar="ما الذي يستهويك؟" />
      {body()}
    </StepShell>
  );
};

export default FamilyStep;
