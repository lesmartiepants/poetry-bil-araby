import StepShell from '../StepShell.jsx';
import MotifGlyph from '../motifGlyphs.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 3 — Imagery (the motif dimension).
 *
 * ## The design feature: the options are drawings
 *
 * This is the only question in the flow whose subject is pictures, so it is the
 * one step where a label alone would be the wrong answer. Each motif is a
 * line-art glyph (see motifGlyphs.jsx) sitting above its name: a crescent for
 * الليل, three waves for البحر والماء, a goblet for الكأس والخمر. Choosing lights
 * the drawing — the ink goes from a dim hairline to a lit stroke with a halo —
 * so the selected state is a change in the IMAGE, not a checkbox appearing next
 * to it.
 *
 * A reader who scans this screen is doing what the question asks: looking at
 * pictures and noticing which ones they want to keep seeing.
 *
 * ## Why a 3-up grid
 *
 * Motif labels are the longest in the taxonomy (الرحلة والراحلة, الصحراء والطلل
 * — up to 16 characters), which is what made them impossible on the old
 * constellation ring. In a grid the label wraps to a second line instead of
 * colliding with a neighbour. Three columns at 393px gives ~110px tiles, wide
 * enough for the longest label at 12px and tall enough for a 34px glyph, and
 * twelve of them land in four rows inside the body budget without scrolling.
 *
 * Optional by design: taxonomy v3 sets min_labels 0 on this dimension, so a
 * poem may legitimately carry no motif and a reader may legitimately skip.
 */

const ACCENT = '#c5a059';

const ImageryStep = ({
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

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;
    return (
      <div
        style={{
          // 0 1 auto, not 1 1 auto: the options size to their content so the
          // shell can centre the question and its answers as one group, and
          // only shrink (and scroll) when they genuinely do not fit.
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '.5rem',
          alignContent: 'center',
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
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '.35rem',
                minHeight: 96,
                padding: '.6rem .35rem',
                borderRadius: 14,
                cursor: 'pointer',
                border: `1px solid ${on ? `${o.color}aa` : 'rgba(255,255,255,0.09)'}`,
                background: on
                  ? `linear-gradient(180deg, ${o.color}22, ${o.color}0d)`
                  : 'rgba(255,255,255,0.02)',
                transition: 'border-color .25s ease, background .25s ease',
                animation: `obTile .45s ease ${0.035 * i}s both`,
              }}
            >
              <span
                style={{
                  // No glow. Mood owns the glow (its options ARE embers); three
                  // steps each throwing a halo is just a house style for "on".
                  // Here the tell is the ink going from dim to lit, which is
                  // what "the drawing lights up" was supposed to mean.
                  color: on ? o.color : 'rgba(255,255,255,0.38)',
                  transition: 'color .25s ease',
                  display: 'block',
                }}
              >
                <MotifGlyph motifKey={o.key} size={34} />
              </span>
              <span
                lang="ar"
                dir="rtl"
                style={{
                  // Amiri, not Reem Kufi. These are two-and-three word phrases
                  // (الصحراء والطلل, الرحلة والراحلة), which is prose length, and
                  // Kufi's flat teeth merge into a comb at label size. 12px was
                  // also too small: Arabic needs ~1.2x Latin for parity.
                  fontFamily: "'Amiri', serif",
                  fontSize: '.8125rem',
                  lineHeight: 1.4,
                  color: on ? '#fff' : 'rgba(255,255,255,0.7)',
                  textAlign: 'center',
                }}
              >
                {o.label_ar}
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
      accent={ACCENT}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={selected.length ? 'التالي' : 'تخطَّ'}
      ctaEn={selected.length ? 'Next' : 'Skip'}
    >
      <style>{`@keyframes obTile{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}`}</style>
      <StepTitle ar="أيّ الصور تسكنك؟" en="Which images stay with you?" />
      {body()}
    </StepShell>
  );
};

export default ImageryStep;
