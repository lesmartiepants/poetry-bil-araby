import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 2 — Mood.
 *
 * ## The design feature: the screen takes your mood
 *
 * Mood is the one axis in this taxonomy that is already colour. Every value has
 * an accent (grief is slate, joy is amber, melancholy is deep blue), so the
 * question can be answered in the medium it is asked in: the cells light in
 * their own colour, and as they are chosen the ground behind them warms toward
 * the mix. Pick grief and despair and the screen goes cold and low; pick joy
 * and dawn-gold light rises from the bottom edge. The reader can see their
 * answer before they read it back.
 *
 * That mixing is why the wash is built from the SELECTED colours rather than
 * from a fixed palette: two picks make a third atmosphere neither has alone,
 * which is exactly what a multi-select on mood means downstream (the feed is
 * weighted by all of them at once).
 *
 * ## The honeycomb
 *
 * 16 moods, and 1+2+3+4+3+2+1 = 16 exactly, so the comb is a true diamond with
 * no orphan cell and no padding row. That arithmetic is the whole reason the
 * layout is hardcoded rather than wrapped: a flow layout would have to invent
 * somewhere to put a 17th, whereas ROWS below is a shape, and if the taxonomy
 * grows the extra cells fall into a remainder row underneath rather than
 * silently breaking the diamond.
 *
 * Pointy-top cells, because rows of pointy-top hexes interlock horizontally —
 * flat-top ones tile in columns and would need seven columns across a 393px
 * screen. Cells touch: the "wall" is a 1.5px inset between an outer element
 * carrying the wall colour and an inner one carrying the fill, since clip-path
 * discards borders. Two touching cells therefore share a 3px wall, which is
 * what makes it read as one comb rather than 16 badges.
 *
 * A previous version was a wrapped field of pills, and before that a two-ring
 * constellation that could not fit (at 375px its outer ring needed ~1,210px of
 * arc and had 780px, so 17 pairs of chips overlapped).
 *
 * ## What this costs, and why it is still worth it
 *
 * A hexagon's usable text box is much narrower than its bounding width — the
 * corners are unusable — so labels sit at 10px Latin / 8.5px Arabic, the
 * smallest type in the flow. "Contemplation" fits with about 6px to spare. The
 * trade is deliberate: mood labels are one or two words and the colour does the
 * identifying work at a glance, so the type is confirming a choice the eye has
 * already made rather than carrying it.
 */

// Cells per row, top to bottom. Sums to 16.
const ROWS = [1, 2, 3, 4, 3, 2, 1];

/** Pointy-top hexagon: height is 2/√3 of width, and rows overlap by a quarter. */
const H_RATIO = 1.1547;
const ROW_PITCH = 0.866;
const WIDEST = Math.max(...ROWS);

/** Row/column placement for the nth option, in units of one cell width. */
const placements = (count) => {
  const out = [];
  let i = 0;
  for (let r = 0; r < ROWS.length && i < count; r += 1) {
    const n = Math.min(ROWS[r], count - i);
    for (let c = 0; c < n; c += 1, i += 1) {
      out.push({ row: r, x: (WIDEST - ROWS[r]) / 2 + c });
    }
  }
  // A taxonomy longer than the diamond keeps rendering, in full rows beneath.
  let row = ROWS.length;
  while (i < count) {
    const n = Math.min(WIDEST, count - i);
    for (let c = 0; c < n; c += 1, i += 1) out.push({ row, x: (WIDEST - n) / 2 + c });
    row += 1;
  }
  return out;
};

const HEX = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

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

    const spots = placements(options.length);
    const rowCount = spots.length ? spots[spots.length - 1].row + 1 : 0;

    return (
      <div
        style={{
          flex: '0 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '.4rem',
        }}
      >
        <div
          style={{
            position: 'relative',
            // One cell width drives every other number, so the comb scales as a
            // unit on narrow phones instead of the rows breaking apart.
            '--hw': `min(86px, calc((100vw - 44px) / ${WIDEST}))`,
            width: `calc(var(--hw) * ${WIDEST})`,
            height: `calc(var(--hw) * (${ROW_PITCH} * ${rowCount - 1} + ${H_RATIO}))`,
            flex: '0 0 auto',
          }}
        >
          {options.map((o, i) => {
            const on = selected.includes(o.key);
            const { row, x } = spots[i];
            return (
              <button
                key={o.key}
                data-testid={`${testId}-option`}
                data-option-key={o.key}
                aria-pressed={on}
                aria-label={`${o.label_en} — ${o.label_ar}`}
                onClick={() => toggle(o.key)}
                style={{
                  position: 'absolute',
                  left: `calc(var(--hw) * ${x})`,
                  top: `calc(var(--hw) * ${ROW_PITCH * row})`,
                  width: 'var(--hw)',
                  height: `calc(var(--hw) * ${H_RATIO})`,
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  animation: `obEmber .5s ease ${0.03 * i}s both`,
                }}
              >
                {/* Wall layer. clip-path discards borders, so the cell edge is
                    this element showing through a 1.5px inset. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    clipPath: HEX,
                    background: on ? o.color : 'rgba(255,255,255,0.15)',
                    transition: 'background .25s ease',
                  }}
                />
                {/* Fill layer. */}
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 1.5,
                    clipPath: HEX,
                    background: on ? `${o.color}59` : 'rgba(255,255,255,0.035)',
                    transition: 'background .25s ease',
                  }}
                />
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    // The corners are unusable, so the text box is inset well
                    // inside the bounding width.
                    padding: '0 14%',
                    color: on ? '#fff' : 'rgba(255,255,255,0.72)',
                    transition: 'color .25s ease',
                  }}
                >
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: "'Forum', serif",
                      fontSize: 10,
                      lineHeight: 1.15,
                      textAlign: 'center',
                    }}
                  >
                    {o.label_en}
                  </span>
                  {/* Same 0.85 ratio the rest of the flow uses. Unvocalised, at
                      88% — see BilingualLabel; this one is hand-rolled because
                      it has to centre inside a hexagon rather than a text run. */}
                  <span
                    dir="rtl"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: 8.5,
                      lineHeight: 1.2,
                      opacity: 0.88,
                      textAlign: 'center',
                    }}
                  >
                    {o.label_ar}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
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
      <StepTitle en="What mood are you in?" ar="ما مزاجك الآن؟" />
      {body()}
    </StepShell>
  );
};

export default MoodStep;
