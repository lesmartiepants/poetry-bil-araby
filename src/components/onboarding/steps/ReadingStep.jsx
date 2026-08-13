import StepShell from '../StepShell.jsx';
import { useSelection, StepTitle, EmptyState, LoadingState } from '../stepParts.jsx';

/**
 * Step 5 — Reading (the difficulty dimension).
 *
 * ## The design feature: the type is the specimen, set on the ground
 *
 * "Easy reading or a challenge" is a question about how a line will FEEL to
 * read, and no label answers that as well as a sample of the thing itself. Each
 * band renders its own name in a face and a size that match its difficulty:
 * Fustat, plain and modern, small; Amiri, the naskh the app actually reads poems
 * in, larger; Aref Ruqaa, a classical calligraphic hand, largest. Down the three
 * the letterforms get more written and less typed, and the reader picks the one
 * they want to be looking at.
 *
 * There are no cards. That is the point: a type specimen inside a bordered box
 * becomes a list item, and a list item is what the other steps are made of. The
 * specimens sit directly on the ground, the chosen one at full contrast and the
 * others dropped back, so the only thing on screen is the type and the only
 * thing that changes is how legible it is. The rising size IS the ordinal cue,
 * which is why the earlier version's tick-marks are gone — at 5px inside the
 * card edge they read as a scrollbar, and the type was already saying it.
 *
 * Amiri is deliberately the middle rung rather than a neutral choice: it is the
 * face the feed sets poems in, so the middle card is a literal preview.
 *
 * ## Data
 *
 * Bands come from `deriveDifficultyBands`, cut from the live accessibility
 * histogram rather than hardcoded, and their `share`/`poem_count` are not
 * rendered. Face and size assignment is by POSITION, so a re-cut that renames
 * the bands still runs plainest-to-most-classical in order.
 */

const GOLD = '#c5a059';

/**
 * Plain modern -> the app's reading naskh -> classical calligraphic hand.
 *
 * Alexandria was the first rung originally and was wrong: it is a geometric
 * Arabic sans, a near neighbour of the Reem Kufi in the title directly above it,
 * so rung 1 read as a restatement of the app's display voice instead of as
 * plain text. Fustat is humanist and unmistakably "ordinary reading".
 *
 * The specimens carry full tashkeel (سَهْلٌ مُيَسَّر), so the leading has to be
 * generous or the marks collide with the line above — on this step above all,
 * since broken vocalisation on a screen ABOUT typography is self-refuting.
 */
const SPECIMEN = [
  { face: "'Fustat', sans-serif", size: '1.35rem', leading: 1.5 },
  { face: "'Amiri', serif", size: '1.6rem', leading: 1.7 },
  { face: "'Katibeh', serif", size: '1.95rem', leading: 1.9 },
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
          display: 'flex',
          flexDirection: 'column',
          gap: '.35rem',
        }}
      >
        {options.map((o, i) => {
          const on = selected[0] === o.key;
          const spec = SPECIMEN[i] || SPECIMEN[SPECIMEN.length - 1];
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
                alignItems: 'flex-start',
                gap: '.1rem',
                width: '100%',
                minHeight: 84,
                padding: '.5rem 0 .6rem',
                background: 'transparent',
                border: 'none',
                // The only rule on the screen: a hairline that grows on the
                // chosen specimen. No box, so the type stays the subject.
                borderInlineStartWidth: 0,
                borderBottom: `1px solid ${on ? `${GOLD}55` : 'rgba(255,255,255,0.07)'}`,
                cursor: 'pointer',
                textAlign: 'start',
                opacity: selected.length && !on ? 0.34 : 1,
                transition: 'opacity .3s ease, border-color .3s ease',
                animation: `obSpec .55s ease ${0.08 * i}s both`,
              }}
            >
              <span
                lang="ar"
                dir="rtl"
                style={{
                  fontFamily: spec.face,
                  fontSize: spec.size,
                  lineHeight: spec.leading,
                  color: on ? '#fff' : 'rgba(255,255,255,0.86)',
                  transition: 'color .3s ease',
                }}
              >
                {o.label_ar}
              </span>
              <span
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '.55rem',
                  flexWrap: 'wrap',
                }}
              >
                {o.hint_ar && (
                  <span
                    lang="ar"
                    dir="rtl"
                    style={{
                      fontFamily: "'Amiri', serif",
                      fontSize: '.875rem',
                      lineHeight: 1.5,
                      color: on ? 'rgba(255,255,255,0.72)' : 'rgba(255,255,255,0.44)',
                    }}
                  >
                    {o.hint_ar}
                  </span>
                )}
                <span
                  dir="ltr"
                  style={{
                    fontSize: '.6875rem',
                    letterSpacing: '.02em',
                    color: on ? GOLD : 'rgba(255,255,255,0.3)',
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
      accent={GOLD}
      onBack={onBack}
      onNext={() => onNext?.(selected)}
      ctaAr={selected.length ? 'التالي' : 'تخطَّ'}
      ctaEn={selected.length ? 'Next' : 'Skip'}
    >
      <style>{`@keyframes obSpec{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
      <StepTitle ar="قراءة سهلة أم تحدٍّ؟" en="Easy reading, or a challenge" />
      {body()}
    </StepShell>
  );
};

export default ReadingStep;
