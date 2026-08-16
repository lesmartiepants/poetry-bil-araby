import StepShell from '../StepShell.jsx';
import { ordinal } from '../../../services/categoryBands.js';
import {
  useSelection,
  StepTitle,
  EmptyState,
  LoadingState,
  BilingualLabel,
} from '../stepParts.jsx';

/**
 * Step 6 — Era.
 *
 * ## The design feature: the centuries are the picture
 *
 * "Ancient to modern" is the only question in the flow with a real axis behind
 * it, so this step draws the axis and lets the DATES carry it. A rail runs down
 * the left edge from the pre-Islamic period to the present; each band hangs off
 * the rail on a leader line, headed by its century range set large;
 * and choosing one lights that band's own stretch of rail, so the reader can see
 * where in fourteen centuries they just landed.
 *
 * The step is multi-select, and that is what decided how the rail behaves. It
 * used to fill from the top down to the single chosen node, which cannot express
 * two picks at all, and worse would imply that everything above the lower pick
 * had been chosen too. Each band owning its own segment says exactly what was
 * asked for and nothing more.
 *
 * The numerals are the hero rather than an afterthought because they are the
 * only thing on the screen that is genuinely chronological — "الجاهلي" means
 * nothing to a reader who does not already know the periods, while "6th–8th" places
 * it immediately.
 *
 * Like the difficulty step there are no cards, for the same reason — a boxed row
 * with a mark on its edge is what the flow had six of. Here the rail, the
 * leaders and the big numerals are the structure.
 *
 * ## The bands are fixed
 *
 * Four of them, always, from `FIXED_ERA_BANDS` in services/categoryBands.js:
 * 6th–8th, 9th–10th, 11th–14th, and 15th to today. They were previously CUT
 * from the live century histogram by equal frequency, so that no band was a
 * dead end and none swallowed the library; that produced 6–8 / 9 / 11–14 /
 * undated, and the owner named both of its problems. The 9th stood alone
 * because it really is ~40% of the corpus, which reads as an arbitrary
 * one-century button. And "undated" was surfaced to the reader as a period,
 * with a literary-sounding name, when it is a gap in the metadata.
 *
 * Fixed cuts trade balance for legibility knowingly: 9th–10th is still much the
 * largest band, and that is now a stated choice rather than something the
 * algorithm was fighting. The undated poems ride with 15th-to-today, which
 * needs no button of its own and is where an undated poem most likely belongs.
 * `deriveEraBands` still reads the live histogram — only for the counts, and to
 * drop a band the corpus has nothing in.
 *
 * The rail heads are the ordinal form the owner asked for — "6th–8th",
 * "15th–Today" — which is also what the bands carry in `hint_ar` / `hint_en`
 * ("6th–8th c. CE"). The hints are not rendered on this screen, so the two do
 * not read as a repetition; they exist for the surfaces that do show them. That
 * is data about the CHOICE, not a poem count: it says what you are picking, not
 * how much of it there is.
 */

const GOLD = '#c5a059';

/**
 * The rail head for a band: "6th–8th", "9th–10th", "11th–14th", "15th–Today".
 *
 * These were bare numerals with an open dash on the last band — "15–" rather
 * than "15–21", on the argument that the closed number claims a precision the
 * corpus does not have, since that band also absorbs the undated poems. The
 * owner was asked directly and chose their own phrasing instead: ordinals on
 * both ends, and the word "Today" where the dash trailed off. Recorded rather
 * than deleted because the precision worry was not wrong, it was outvoted — if
 * anyone later wonders why the last band names a year-less endpoint while the
 * others name numbers, this is why.
 */
const headFor = (band) => {
  if (band.century_from == null) return '—';
  if (band.includesUndated) return `${ordinal(band.century_from)}–Today`;
  return band.century_from === band.century_to
    ? ordinal(band.century_from)
    : `${ordinal(band.century_from)}–${ordinal(band.century_to)}`;
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
  // Multi-select: a reader who wants the Jahiliyya AND the moderns should not
  // have to pick a winner.
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
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* The rail, on the left: the chrome reads left to right, so "earlier"
            is the left edge and the gold fills downward from it. */}
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
        {options.map((o, i) => {
          const on = selected.includes(o.key);
          return (
            <div
              key={o.key}
              style={{ display: 'flex', alignItems: 'stretch', position: 'relative' }}
            >
              {/* Each band owns its stretch of rail and lights only that. The
                  rail used to fill from the top down to the single chosen node,
                  which cannot express two picks — worse, it would imply
                  everything above the lower one had been chosen too. */}
              <span
                aria-hidden="true"
                data-testid={on ? `${testId}-axis-lit` : undefined}
                style={{
                  position: 'absolute',
                  insetInlineStart: 15,
                  top: 0,
                  bottom: 0,
                  width: 1,
                  background: on ? `linear-gradient(180deg, ${GOLD}, ${GOLD}88)` : 'transparent',
                  transition: 'background .35s ease',
                }}
              />
              {/* Node gutter, 31px wide so the dot's centre lands on the rail. */}
              <span
                aria-hidden="true"
                style={{
                  flex: '0 0 31px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <span
                  style={{
                    width: on ? 10 : 7,
                    height: on ? 10 : 7,
                    borderRadius: '50%',
                    background: on ? GOLD : '#0a0a0f',
                    border: `1.5px solid ${on ? GOLD : 'rgba(255,255,255,0.3)'}`,
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
                aria-label={`${o.label_en} — ${o.label_ar}`}
                onClick={() => toggle(o.key)}
                style={{
                  flex: '1 1 auto',
                  minWidth: 0,
                  minHeight: 92,
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
                  dir="ltr"
                  style={{
                    // Forum, not Amiri: the heads carry English ordinals and
                    // the word "Today" now, and Latin set in a naskh face reads
                    // as a fallback rather than a choice. All four heads share
                    // one face and ONE SIZE — the size never encodes anything
                    // here, same rule the difficulty step follows.
                    fontFamily: "'Forum', serif",
                    // Down a step from 1.55rem so "15th–Today" fits on one line
                    // at 393px without the other three shrinking to match it.
                    fontSize: '1.28rem',
                    lineHeight: 1.1,
                    letterSpacing: '.01em',
                    color: on ? GOLD : 'rgba(255,255,255,0.55)',
                    whiteSpace: 'nowrap',
                    flex: '0 0 auto',
                    minWidth: '5.4em',
                    transition: 'color .3s ease',
                  }}
                >
                  {headFor(o)}
                </span>
                <BilingualLabel
                  en={o.label_en}
                  ar={o.label_ar}
                  size="option"
                  align="start"
                  color={on ? '#fff' : 'rgba(255,255,255,0.82)'}
                  gap={1}
                />
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
      <StepTitle en="From which age?" ar="من أيّ زمن؟" />
      {body()}
    </StepShell>
  );
};

export default EraStep;
