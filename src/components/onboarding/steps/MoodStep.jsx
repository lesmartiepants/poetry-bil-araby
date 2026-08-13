import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 2 — Mood.
 *
 * ## The design feature: the screen takes your mood
 *
 * Mood is the one axis in this taxonomy that is already colour. Every value has
 * an accent (grief is slate, joy is amber, melancholy is deep blue), so the
 * question can be answered in the medium it is asked in: each mood is an ember,
 * and as they are chosen the ground behind them warms toward the mix. Pick
 * grief and despair and the screen goes cold and low; pick joy and dawn-gold
 * light rises from the bottom edge. The reader can see their answer before they
 * read it back.
 *
 * That mixing is why the wash is built from the SELECTED colours rather than
 * from a fixed palette: two picks make a third atmosphere neither has alone,
 * which is exactly what a multi-select on mood means downstream (the feed is
 * weighted by all of them at once).
 *
 * ## Why a wrapped field and not the old constellation
 *
 * The constellation put these on two rings and could not fit them: at 375px the
 * outer ring needed ~1,210px of arc and had 780px, so chips painted over each
 * other — 17 overlapping pairs, "Moon & Stars" sitting on "Tears". Mood labels
 * are short (حزن, فرح, شوق — one or two words), so a wrapped centre-justified
 * field holds all 16 in six rows at 393px with no measurement to get wrong and
 * no phone/desktop fork. Order is by feeling, warm through upright, so scanning
 * the field is scanning a spectrum.
 */

const MoodStep = ({
  testId,
  stepIndex,
  stepCount,
  options = [],
  value = [],
  onNext,
  onBack,
  loading,
}) => {
  const [selected, toggle] = useSelection(value, true);

  const chosen = options.filter((o) => selected.includes(o.key));
  const wash = chosen.length ? (
    <div
      aria-hidden="true"
      data-testid={`${testId}-wash`}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        transition: 'opacity .6s ease',
        // Each chosen mood throws light from a different point along the bottom
        // edge, so two picks read as two sources mixing rather than one colour
        // being replaced.
        background: chosen
          .map((o, i) => {
            const x = chosen.length === 1 ? 50 : 16 + (68 * i) / (chosen.length - 1);
            return `radial-gradient(80% 52% at ${x}% 108%, ${o.color}${
              chosen.length > 3 ? '30' : '44'
            }, transparent 70%)`;
          })
          .join(','),
      }}
    />
  ) : null;

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;
    return (
      <div
        style={{
          // 0 1 auto, not 1 1 auto: the options size to their content, so every
          // step's question lands at the same y and the slack collects once, at
          // the bottom, instead of opening a gap under each title.
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '.5rem',
          alignContent: 'flex-start',
          // Flush to the start edge, not centred. Centre-wrapping gave rows of
          // 3/3/4/4/3/3 with different indents on both sides, which reads as a
          // tag cloud; Arabic wants a straight right edge to scan down.
          justifyContent: 'flex-start',
          paddingBottom: '.25rem',
        }}
      >
        {options.map((o, i) => {
          const on = selected.includes(o.key);
          return (
            <button
              key={o.key}
              data-testid={`${testId}-option`}
              data-option-key={o.key}
              aria-pressed={on}
              aria-label={`${o.label_ar} — ${o.label_en}`}
              onClick={() => toggle(o.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '.45rem',
                padding: '0 .9rem',
                minHeight: 48,
                borderRadius: 999,
                cursor: 'pointer',
                border: `1px solid ${on ? o.color : 'rgba(255,255,255,0.11)'}`,
                background: on ? `${o.color}26` : 'rgba(255,255,255,0.02)',
                color: on ? '#fff' : 'rgba(255,255,255,0.74)',
                transition: 'background .25s ease, border-color .25s ease, transform .25s ease',
                transform: on ? 'translateY(-1px)' : 'none',
                animation: `obEmber .5s ease ${0.03 * i}s both`,
              }}
            >
              {/* The ember. Dim and small until chosen, then lit with a halo —
                  the chip's own colour doing the work of a checkmark. */}
              <span
                aria-hidden="true"
                style={{
                  width: on ? 9 : 6,
                  height: on ? 9 : 6,
                  borderRadius: '50%',
                  background: o.color,
                  opacity: on ? 1 : 0.5,
                  boxShadow: on ? `0 0 10px 1px ${o.color}` : 'none',
                  transition: 'all .25s ease',
                  flex: '0 0 auto',
                }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span
                  lang="ar"
                  dir="rtl"
                  style={{
                    fontFamily: "'Reem Kufi', sans-serif",
                    wordSpacing: '.16em',
                    fontSize: '.95rem',
                    lineHeight: 1.25,
                  }}
                >
                  {o.label_ar}
                </span>
                <span
                  dir="ltr"
                  style={{
                    // Sentence case, almost no tracking: uppercased and tracked,
                    // "MELANCHOLY" measured wider than the 15px حزن above it and
                    // inverted the hierarchy the flow claims.
                    fontSize: '.5625rem',
                    letterSpacing: '.02em',
                    opacity: on ? 0.7 : 0.4,
                    lineHeight: 1.3,
                  }}
                >
                  {o.label_en}
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
      backdrop={wash}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={selected.length ? 'التالي' : 'تخطَّ'}
      ctaEn={selected.length ? 'Next' : 'Skip'}
    >
      <style>{`@keyframes obEmber{from{opacity:0;transform:translateY(6px)}to{opacity:1}}`}</style>
      <StepTitle ar="ما مزاجك الآن؟" en="What mood are you in?" />
      {body()}
    </StepShell>
  );
};

export default MoodStep;
