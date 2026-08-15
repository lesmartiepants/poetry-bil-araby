import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 4 — Family.
 *
 * ## The design feature: one pool spreads, the rest draw back
 *
 * "What draws you in?" is a question about pull, so the answer is drawn as
 * something that pulls. The seven families are pools of ink on a dark page,
 * scattered rather than gridded, each in the colour it already owns — love is
 * rose, valor is red, nature is green, grief is slate. Choosing one lets that
 * pool SPREAD: it grows, its edge softens into a bloom, and the other six draw
 * back and thin out. Exclusivity is carried by attention rather than by a
 * checkbox: one thing on the page is getting bigger and everything else is
 * receding, which cannot be misread as a multi-select.
 *
 * Re-tapping the spread pool lets everything return. A single-select with no
 * way to un-choose traps a reader who changed their mind.
 *
 * ## Why this shape and not another
 *
 * Five concepts were drawn for this screen before this one:
 *
 *   1. Seven arched doorways, the chosen one lit from inside. Rejected because
 *      the welcome screen two steps earlier already spends its whole layout on
 *      two doors, and repeating the metaphor makes the flow feel like it only
 *      has one idea.
 *   2. An illuminated index page — the families as lines of a diwan's table of
 *      contents, each with a gilded initial. Beautiful, and a list. Three
 *      steps in this flow had already collapsed into stacked full-width rows
 *      once; this would have made four.
 *   3. A seven-pointed khatam rosette, one wedge per family, rotating the
 *      chosen point to the top. The most distinct object of the five, and it
 *      cannot carry seven bilingual labels at 393px — the labels end up
 *      outside the rosette, which is then just a decorative spinner attached
 *      to a list.
 *   4. Colour bands that collapse when one is chosen. This is the mosaic that
 *      was already here, with an animation on top.
 *   5. Pools of ink. Chosen.
 *
 * The deciding argument was register, not prettiness. By this point the flow is
 * relentlessly rectilinear: pills, a hex comb, a grid of outlined tiles, type
 * specimens, a vertical rail. Every screen is built from straight edges. Ink is
 * the one register missing, it is native to the subject, and "drawn in" is
 * literally what a pool does. It is also the reason this cannot be moved to
 * another step: the pools work because family is the only question that is both
 * exactly-one AND already carries colour per value.
 *
 * ## What this replaces
 *
 * A two-column mosaic of colour fields where choosing one drained the colour
 * from the other six. That worked and was approved; the owner asked for a
 * different concept, and desaturation was deliberately not carried over —
 * repeating the old mechanic in rounder boxes would be the same screen twice.
 * Before the mosaic it was a shelf of vertical book spines with rotated titles,
 * which failed in the hand: rotated text is hard to read in any script, and
 * worse in Arabic where the connected baseline and the tashkeel both carry
 * information a 90 degree turn destroys.
 *
 * ## Layout
 *
 * Positions are a fixed hand-set scatter in percentages of the container, not
 * random — a random scatter re-rolls on every render and can collide. They are
 * loosely off-grid on purpose: pools that line up read as a table with rounded
 * corners. Sizes vary slightly so no two neighbours are twins.
 */

/** left / top / size, as % of the pool field. Hand-set; see the note above. */
const SPOTS = [
  { x: 1, y: 0, s: 41 },
  { x: 55, y: 4, s: 39 },
  { x: 29, y: 23, s: 42 },
  { x: 0, y: 43, s: 40 },
  { x: 57, y: 39, s: 41 },
  { x: 27, y: 63, s: 39 },
  { x: 56, y: 70, s: 40 },
];

/** Irregular, so the pools are blots rather than circles. */
const BLOBS = [
  '63% 37% 48% 52% / 42% 61% 39% 58%',
  '38% 62% 61% 39% / 57% 36% 64% 43%',
  '58% 42% 34% 66% / 63% 47% 53% 37%',
  '41% 59% 63% 37% / 36% 58% 42% 64%',
  '66% 34% 52% 48% / 58% 39% 61% 42%',
  '45% 55% 38% 62% / 61% 55% 45% 39%',
  '36% 64% 57% 43% / 44% 38% 62% 56%',
];

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
  // Single-select: useSelection with multi=false keeps at most one key, and
  // re-tapping the chosen one empties the array.
  const [selected, toggle] = useSelection(value, false);
  const chosenKey = selected[0] || null;
  const chosen = options.find((o) => o.key === chosenKey) || null;

  const body = () => {
    if (loading) return <LoadingState testId={testId} />;
    if (!options.length) return <EmptyState testId={testId} />;

    return (
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: 344,
            // Tall enough for the scatter without the bottom pool colliding
            // with the advance row.
            aspectRatio: '344 / 430',
          }}
        >
          {options.map((o, i) => {
            const spot = SPOTS[i % SPOTS.length];
            const on = chosenKey === o.key;
            const dimmed = chosenKey && !on;
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
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.s}%`,
                  aspectRatio: '1 / 0.88',
                  padding: '0 8%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  // The chosen pool spreads and the rest draw back. Scale is
                  // doing the work colour used to do in the mosaic this
                  // replaced, so the two versions cannot be confused.
                  transform: `scale(${on ? 1.16 : dimmed ? 0.84 : 1})`,
                  opacity: dimmed ? 0.44 : 1,
                  zIndex: on ? 2 : 1,
                  transition: 'transform .5s cubic-bezier(.22,1,.36,1), opacity .45s ease',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: BLOBS[i % BLOBS.length],
                    background: `radial-gradient(120% 120% at 34% 28%, ${o.color}dd, ${o.color}5c 62%, ${o.color}1f)`,
                    // The bloom only exists on the chosen pool — an ink edge
                    // bleeding into the page.
                    boxShadow: on ? `0 0 34px 6px ${o.color}4d` : 'none',
                    transition: 'box-shadow .5s ease',
                  }}
                />
                <span
                  style={{
                    position: 'relative',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    width: '100%',
                    height: '100%',
                    color: '#fff',
                    textShadow: '0 1px 6px rgba(0,0,0,.55)',
                  }}
                >
                  <span
                    dir="ltr"
                    style={{
                      fontFamily: "'Forum', serif",
                      fontSize: 12,
                      lineHeight: 1.2,
                      textAlign: 'center',
                    }}
                  >
                    {o.label_en}
                  </span>
                  <span
                    dir="rtl"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: 10.2,
                      lineHeight: 1.25,
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
      accent={chosen?.color || '#c5a059'}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={chosenKey ? 'التالي' : 'تخطَّ'}
      ctaEn={chosenKey ? 'Next' : 'Skip'}
    >
      <StepTitle en="What draws you in?" ar="ما الذي يستهويك؟" />
      {body()}
    </StepShell>
  );
};

export default FamilyStep;
