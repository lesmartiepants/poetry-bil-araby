import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 4 — Family.
 *
 * ## The design feature: a shelf seen head-on, and one volume pulled forward
 *
 * The families are the library's broad shelves, and this is the only question
 * in the flow that takes exactly one answer. So the seven options stand side by
 * side ACROSS the screen as spines, titles running up them, on a shelf floor
 * they all rest on. Choosing lifts one forward and out; the rest dim back into
 * the row. Only one volume can be off the shelf at a time, which is the
 * single-select rule drawn rather than stated, and re-tapping the raised spine
 * puts it back — a single-select with no way to un-choose traps a reader who
 * changed their mind.
 *
 * ## Why the geometry, not just the ornament
 *
 * The first pass drew these as full-width horizontal cards with a coloured edge.
 * So did the difficulty step, and so did the era step: three of the six screens
 * were one stacked card with a different 5px mark pinned to its inline-start
 * edge, and the "shelf" existed only in this comment. A row of vertical objects
 * appears nowhere else in the flow, so this step can no longer be mistaken for
 * its neighbours at a glance.
 *
 * Rotating the label is what makes a spine a spine. `transform: rotate(-90deg)`
 * rather than `writing-mode: vertical-rl`, because vertical writing modes break
 * Arabic: they set the glyphs as an upright stack of disconnected letters. A
 * rotated horizontal line keeps the shaping and the joins intact and simply
 * turns the whole run on its side, which is exactly how a real Arabic spine is
 * lettered.
 *
 * ## Layout
 *
 * Seven spines across 353px of usable width: about 44px each with 6px gaps at
 * 393, capped at 52px so they do not sprawl on a desktop. That is narrow, but
 * each is 320px tall, so the touch area is far larger than a 48px button even
 * though one dimension is under it. The English gloss cannot be repeated seven
 * times up seven spines without turning the shelf into a wall of Latin, so only
 * the CHOSEN family names itself in English, on a line under the shelf.
 */

const GOLD = '#c5a059';

/** Never let a low-chroma family (grief-loss is slate) read as switched off. */
const LIT = 0.92;

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
  const chosen = options.find((o) => o.key === selected[0]);

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;
    return (
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '.9rem',
        }}
      >
        {/* Sized to the spines, not to the column. The spines are capped at 52px
            each, so on a wide screen a full-width shelf floor stuck out well past
            the books standing on it. */}
        <div
          style={{
            width: 'fit-content',
            maxWidth: '100%',
            marginInline: 'auto',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 6,
              // Room for the raised spine to travel into without the row growing.
              paddingTop: 18,
            }}
          >
            {options.map((o, i) => {
              const on = selected[0] === o.key;
              const dimmed = selected.length > 0 && !on;
              return (
                <button
                  key={o.key}
                  data-testid={`${testId}-option`}
                  data-option-key={o.key}
                  aria-pressed={on}
                  aria-label={`${o.label_ar} — ${o.label_en}`}
                  onClick={() => toggle(o.key)}
                  style={{
                    position: 'relative',
                    flex: '1 1 0',
                    minWidth: 0,
                    maxWidth: 52,
                    height: 320,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    padding: 0,
                    // Square on the floor, rounded at the head — a book seen edge on.
                    borderRadius: '8px 8px 2px 2px',
                    border: `1px solid ${on ? o.color : 'rgba(255,255,255,0.10)'}`,
                    background: on
                      ? `linear-gradient(180deg, ${o.color}3a, ${o.color}10)`
                      : `linear-gradient(180deg, ${o.color}14, rgba(255,255,255,0.02))`,
                    // Lifted forward and out of the row.
                    transform: on ? 'translateY(-16px)' : 'none',
                    opacity: dimmed ? 0.4 : LIT,
                    boxShadow: on ? `0 10px 22px -12px ${o.color}` : 'none',
                    transition:
                      'transform .32s cubic-bezier(.2,.7,.3,1), opacity .3s ease, background .3s ease, border-color .3s ease',
                    animation: `obShelf .5s ease ${0.05 * i}s both`,
                  }}
                >
                  <span
                    lang="ar"
                    dir="rtl"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '1rem',
                      lineHeight: 1,
                      whiteSpace: 'nowrap',
                      color: on ? '#fff' : 'rgba(255,255,255,0.74)',
                      // Reads bottom-to-top, the way a spine is lettered.
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    {o.label_ar}
                  </span>
                </button>
              );
            })}
          </div>

          {/* The shelf itself. Without a floor the spines were just a misaligned
            row and "pulled out" had nothing to be pulled out of. */}
          <div style={{ width: '100%', flex: '0 0 auto' }} data-testid={`${testId}-shelf`}>
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                height: 1,
                background:
                  'linear-gradient(90deg, transparent, rgba(197,160,89,0.55), transparent)',
              }}
            />
            <span
              aria-hidden="true"
              style={{
                display: 'block',
                height: 14,
                background: 'linear-gradient(180deg, rgba(197,160,89,0.10), transparent)',
              }}
            />
          </div>
        </div>

        {/* Only the chosen shelf names itself. Seven English glosses up seven
            spines would bury the Arabic under Latin. */}
        <p
          data-testid={`${testId}-caption`}
          dir="ltr"
          style={{
            margin: 0,
            minHeight: '1.2rem',
            fontSize: '.8125rem',
            letterSpacing: '.02em',
            textAlign: 'center',
            color: chosen ? chosen.color : 'rgba(255,255,255,0.26)',
            transition: 'color .3s ease',
          }}
        >
          {chosen ? chosen.label_en : 'Pick one shelf, or skip'}
        </p>
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
      <style>{`@keyframes obShelf{from{opacity:0;transform:translateY(16px)}to{opacity:${LIT}}}`}</style>
      <StepTitle ar="ما الذي يستهويك؟" en="What draws you in" />
      {body()}
    </StepShell>
  );
};

export default FamilyStep;
