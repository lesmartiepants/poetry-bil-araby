import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 6 — Era.
 *
 * ## The design feature: the centuries are the picture
 *
 * "Ancient to modern" is the only question in the flow with a real axis behind
 * it, so this step draws the axis and lets the DATES carry it. A rail runs down
 * the leading edge from the pre-Islamic period to the present; each band hangs
 * off the rail on a leader line, headed by its century range set large in Amiri;
 * and choosing one runs gold down the rail to that node, so the reader can see
 * where in fourteen centuries they just landed and how much sits before it.
 *
 * The numerals are the hero rather than an afterthought because they are the
 * only thing on the screen that is genuinely chronological — "الجاهلي" means
 * nothing to a reader who does not already know the periods, while "6–8" places
 * it immediately. Every band already carries the range from the banding service
 * (`hint_ar` / `hint_en`). That is data about the CHOICE, not a poem count: it
 * says what you are picking, not how much of it there is.
 *
 * Like the difficulty step there are no cards, for the same reason — a boxed row
 * with a mark on its edge is what the flow had six of. Here the rail, the
 * leaders and the big numerals are the structure.
 *
 * ## Bands are derived, so the count varies
 *
 * `deriveEraBands` cuts roughly equal-weight bands from the live century
 * histogram and appends an undated band for the late/modern poems whose century
 * is deliberately NULL — that is a real period, not missing data, so it gets the
 * present-day end of the rail and is headed "اليوم" instead of a number.
 */

const GOLD = '#c5a059';

/** The rail head for a band: its century span, or the modern end. */
const headFor = (band) => {
  if (band.undated) return 'اليوم';
  if (band.century_from == null) return '—';
  return band.century_from === band.century_to
    ? String(band.century_from)
    : `${band.century_from}–${band.century_to}`;
};

const EraStep = ({
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
  const chosenIndex = options.findIndex((o) => o.key === selected[0]);

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;

    // How far down the rail the gold runs: to the centre of the chosen node.
    const fill = chosenIndex < 0 ? 0 : ((chosenIndex + 0.5) / options.length) * 100;

    return (
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* The rail, on the leading (right, in RTL) edge. */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            insetInlineStart: 15,
            top: 6,
            bottom: 6,
            width: 1,
            background: 'rgba(255,255,255,0.14)',
          }}
        />
        <span
          aria-hidden="true"
          data-testid={`${testId}-axis-fill`}
          style={{
            position: 'absolute',
            insetInlineStart: 15,
            top: 6,
            height: `calc(${fill}% - 6px)`,
            width: 1,
            background: `linear-gradient(180deg, ${GOLD}, ${GOLD}55)`,
            transition: 'height .45s cubic-bezier(.2,.7,.3,1)',
          }}
        />

        {options.map((o, i) => {
          const on = selected[0] === o.key;
          const passed = chosenIndex >= 0 && i < chosenIndex;
          return (
            <div key={o.key} style={{ display: 'flex', alignItems: 'stretch' }}>
              {/* Node gutter, 31px wide so the dot's centre lands on the rail. */}
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 31px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span
                  style={{
                    width: on ? 10 : 7,
                    height: on ? 10 : 7,
                    borderRadius: '50%',
                    background: on ? GOLD : '#0a0a0f',
                    border: `1.5px solid ${on || passed ? GOLD : 'rgba(255,255,255,0.3)'}`,
                    transition: 'all .3s ease',
                  }}
                />
              </span>

              {/* Leader — ties the row to its node, so the rail reads as part of
                  the list rather than as decoration bolted alongside it. */}
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 14px',
                  alignSelf: 'center',
                  height: 1,
                  background: on ? `${GOLD}aa` : 'rgba(255,255,255,0.14)',
                  transition: 'background .3s ease',
                }}
              />

              <button
                data-testid={`${testId}-option`}
                data-option-key={o.key}
                aria-pressed={on}
                aria-label={`${o.label_ar} — ${o.label_en}`}
                onClick={() => toggle(o.key)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  minHeight: 78,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.7rem',
                  padding: '.55rem .2rem',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'start',
                  opacity: selected.length && !on ? 0.38 : 1,
                  transition: 'opacity .3s ease',
                  animation: `obEra .5s ease ${0.07 * i}s both`,
                }}
              >
                <span
                  lang={o.undated ? 'ar' : undefined}
                  dir={o.undated ? 'rtl' : 'ltr'}
                  style={{
                    fontFamily: "'Amiri', serif",
                    fontSize: o.undated ? '1.1rem' : '1.55rem',
                    lineHeight: 1.1,
                    letterSpacing: '.01em',
                    color: on ? GOLD : 'rgba(255,255,255,0.55)',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    minWidth: '3.2em',
                    transition: 'color .3s ease',
                  }}
                >
                  {headFor(o)}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span
                    lang="ar"
                    dir="rtl"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '1.15rem',
                      lineHeight: 1.35,
                      color: on ? '#fff' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    {o.label_ar}
                  </span>
                  <span
                    dir="ltr"
                    style={{
                      fontSize: '.6875rem',
                      letterSpacing: '.02em',
                      color: on ? `${GOLD}cc` : 'rgba(255,255,255,0.3)',
                    }}
                  >
                    {o.label_en}
                  </span>
                </span>
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Last step, so the advance is the finish either way: answering and not
  // answering both land on the feed, and "Skip" would misdescribe the button.
  return (
    <StepShell
      testId={testId}
      stepIndex={stepIndex}
      stepCount={stepCount}
      accent={GOLD}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr="ابدأ القراءة"
      ctaEn="Start reading"
    >
      <style>{`@keyframes obEra{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <StepTitle ar="من أيّ زمن؟" en="From which age" />
      {body()}
    </StepShell>
  );
};

export default EraStep;
