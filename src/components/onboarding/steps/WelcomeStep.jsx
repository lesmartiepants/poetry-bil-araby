import StepShell from '../StepShell.jsx';
import { BilingualLabel } from '../stepParts.jsx';

/**
 * Step 1 — Welcome.
 *
 * ## The design feature: the type sets itself, in both languages
 *
 * This screen is the only one that has to argue for the other five, and the
 * argument this app can make is the one thing it is actually about: a line, set
 * well. So the hero is not an illustration or an icon — it is the invitation
 * itself, revealing word by word the way a line is read rather than the way a
 * page loads. Nothing else on the screen moves.
 *
 * The invitation is written twice, once in each language, at weights that match.
 * The English is not a translation note under the Arabic and the Arabic is not
 * ornament above the English: the stagger runs continuously through both, so
 * they read as one sentence arriving rather than a sentence and its subtitle.
 *
 * That also settles the typographic question the rest of the flow inherits: the
 * Latin gets a display serif (Forum) rather than the UI sans, because a sans
 * beside Amiri reads as an annotation on it.
 *
 * ## The two doors
 *
 * The owner's sketch — "answer a few questions, or skip to reading" — has one
 * real job: make skipping feel like a legitimate door rather than a refusal.
 * Both actions are full-width and equally reachable, with weight (fill vs
 * hairline) carrying the recommendation instead of size or position. "Five
 * questions" is stated up front, because the honest objection to onboarding is
 * not knowing how long it is.
 */

const GOLD = '#c5a059';

/**
 * The lede is SINGLE-LANGUAGE, deliberately.
 *
 * It used to run in both, each sentence written out twice in full, which meant
 * an English-first reader skipped every other line to read their own and an
 * Arabic reader did the same in the other direction. Equality is not
 * duplication: it belongs on the things that carry the question — the heading,
 * the two doors, the option names — and it is waste on explanatory copy, where
 * it doubles the vertical and serves nobody. The heading above this is bilingual
 * and both buttons below it are; the paragraph between them does not need to be.
 */
const LEDE = "Answer five short questions and we'll lean your reading toward what suits you.";
const LEDE_2 = 'Or walk straight in. The dīwān is the same either way.';

/**
 * The second, quieter question.
 *
 * Welcome already asks curated-or-skip, and adding a second question to the
 * first screen anyone sees is a real risk — so this one is built to read as a
 * settings hint rather than a second interrogation: no heading of its own, a
 * single row of three low-contrast options, sized well under the two doors above
 * it, and skippable simply by not touching it.
 *
 * It is here rather than on a seventh step because it earns its place on every
 * poem afterwards, and because the owner held the flow at six.
 *
 * The wording is doing real work. "I'm reading in English" has to be a
 * comfortable thing to select rather than a confession, so nothing here is
 * phrased as a deficiency ("can't read Arabic", "beginner") and the Arabic
 * option is not flattered. It is also framed as PREFERENCE, not capability:
 * translations are generated lazily and only a minority of poems have one
 * cached, so promising a full English reading experience would be a promise the
 * corpus keeps about an eighth of the time on a first load (see #713).
 */
const POSTURES = [
  { key: 'arabic', en: 'In Arabic', hint: 'just the poem' },
  { key: 'learning', en: "I'm learning", hint: 'sound it out' },
  { key: 'english', en: 'In English', hint: 'meaning and sound' },
];

// One continuous stagger across all four lines, so they read as one sentence
// arriving rather than as four elements appearing. The offset is passed in
// rather than counted with a mutable cursor, which would drift across renders.
const Words = ({ text, offset = 0 }) =>
  text.split(' ').map((w, i) => (
    <span
      key={`${offset}-${i}`}
      style={{
        display: 'inline-block',
        animation: `obWord .7s cubic-bezier(.2,.7,.3,1) ${0.24 + (offset + i) * 0.035}s both`,
      }}
    >
      {w}&nbsp;
    </span>
  ));

const nWords = (s) => s.split(' ').length;

const WelcomeStep = ({ testId, stepIndex, stepCount, onNext, onSkipAll, posture, onPosture }) => (
  <StepShell
    testId={testId}
    stepIndex={stepIndex}
    stepCount={stepCount}
    accent={GOLD}
    showFooter={false}
  >
    <style>{`
        @keyframes obWord{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
        @keyframes obRule{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes obRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      `}</style>

    {/* Hero and doors are ONE centred group, not a centred hero with the doors
        pinned to the floor. Pinning them left a dead band of ~200px between the
        copy and the first button on an 852pt screen, and pushed both buttons
        onto the very bottom edge. */}
    <div
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        gap: '1rem',
        paddingBottom: '.5rem',
      }}
    >
      <h1
        style={{
          margin: 0,
          fontWeight: 400,
          color: GOLD,
          animation: 'obRise .8s cubic-bezier(.2,.7,.3,1) both',
          display: 'flex',
          flexDirection: 'column',
          gap: '.15rem',
        }}
      >
        <span
          dir="ltr"
          style={{
            fontFamily: "'Forum', serif",
            fontSize: 'clamp(1.6rem, 6.6vw, 2.1rem)',
            lineHeight: 1.15,
          }}
        >
          Read what resembles you
        </span>
        {/* The hero is hand-set rather than a BilingualLabel because it needs
            Reem Kufi and a viewport-scaled size, but it obeys the same rules:
            0.85x the Latin (it was 1.19x, which is the old inverted ratio),
            88% alpha, and no tashkeel. */}
        <span
          lang="ar"
          dir="rtl"
          className="ob-kufi"
          style={{
            fontSize: 'clamp(1.36rem, 5.6vw, 1.79rem)',
            lineHeight: 1.35,
            opacity: 0.88,
          }}
        >
          اقرأ ما يشبهك
        </span>
      </h1>

      <span
        aria-hidden="true"
        style={{
          width: 96,
          height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)`,
          animation: 'obRule .9s cubic-bezier(.2,.7,.3,1) .15s both',
        }}
      />

      <div
        data-testid={`${testId}-lede`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '.55rem',
          // 23rem broke the Arabic sentence one word early and left "يشبهك."
          // alone on its own centred line.
          maxWidth: '25rem',
          margin: 0,
        }}
      >
        <p
          dir="ltr"
          style={{
            fontFamily: "'Forum', serif",
            fontSize: 'clamp(1.05rem, 4.4vw, 1.2rem)',
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.82)',
            margin: 0,
          }}
        >
          <Words text={LEDE} />
        </p>
        <p
          dir="ltr"
          style={{
            fontFamily: "'Forum', serif",
            fontSize: 'clamp(.9375rem, 3.9vw, 1.05rem)',
            lineHeight: 1.5,
            color: 'rgba(255,255,255,0.5)',
            margin: '.15rem 0 0',
          }}
        >
          <Words text={LEDE_2} offset={nWords(LEDE)} />
        </p>
      </div>

      {/* FIRST question: how they read. It gates the doors below, so it comes
          first in reading order as well as in sequence — a locked control under
          an unanswered question is only legible if the question is above it. */}
      <div
        data-testid={`${testId}-posture`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '.45rem',
          marginTop: '.7rem',
          animation: 'obRise .8s ease 1.5s both',
        }}
      >
        <span
          dir="ltr"
          style={{
            fontFamily: "'Forum', serif",
            fontSize: '.9375rem',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          I read poems…
        </span>
        <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {POSTURES.map((p) => {
            const on = posture === p.key;
            return (
              <button
                key={p.key}
                data-testid={`${testId}-posture-option`}
                data-posture={p.key}
                aria-pressed={on}
                // Re-tapping clears it, like every other single choice in the
                // flow, so this cannot become the one answer you are stuck with.
                // Clearing re-locks the doors, which is the honest consequence.
                onClick={() => onPosture?.(on ? null : p.key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 1,
                  minHeight: 48,
                  padding: '.4rem .7rem',
                  borderRadius: 10,
                  cursor: 'pointer',
                  border: `1px solid ${on ? `${GOLD}88` : 'rgba(255,255,255,0.10)'}`,
                  background: on ? `${GOLD}14` : 'transparent',
                  color: on ? GOLD : 'rgba(255,255,255,0.55)',
                  transition: 'all .22s ease',
                }}
              >
                <span dir="ltr" style={{ fontFamily: "'Forum', serif", fontSize: '.9375rem' }}>
                  {p.en}
                </span>
                <span dir="ltr" style={{ fontSize: '.625rem', opacity: 0.65 }}>
                  {p.hint}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Both doors, inside the centred group. Dimmed and inert until the
          question above is answered: no copy explaining the lock, because the
          state change when it opens says it better than a sentence would. */}
      <div
        aria-hidden={!posture}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '.6rem',
          width: '100%',
          maxWidth: 340,
          marginTop: '.85rem',
          opacity: posture ? 1 : 0.5,
          pointerEvents: posture ? 'auto' : 'none',
          transition: 'opacity .45s ease',
          animation: 'obRise .8s ease 1.75s both',
        }}
      >
        <button
          data-testid={`${testId}-continue`}
          onClick={onNext}
          disabled={!posture}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 60,
            border: `1px solid ${posture ? GOLD : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 999,
            background: posture ? `${GOLD}1f` : 'transparent',
            color: posture ? GOLD : 'rgba(255,255,255,0.3)',
            transition: 'border-color .45s ease, background .45s ease, color .45s ease',
            cursor: posture ? 'pointer' : 'default',
          }}
        >
          <BilingualLabel
            en="Curate my reading"
            ar="اختر لي"
            size="control"
            color={posture ? GOLD : 'rgba(255,255,255,0.3)'}
          />
        </button>
        <button
          data-testid={`${testId}-skip-all`}
          onClick={onSkipAll}
          disabled={!posture}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 56,
            border: `1px solid rgba(255,255,255,${posture ? 0.14 : 0.07})`,
            borderRadius: 999,
            background: 'transparent',
            color: `rgba(255,255,255,${posture ? 0.66 : 0.3})`,
            transition: 'border-color .45s ease, color .45s ease',
            cursor: posture ? 'pointer' : 'default',
          }}
        >
          <BilingualLabel
            en="Just read"
            ar="ادخل واقرأ"
            size="control"
            color={`rgba(255,255,255,${posture ? 0.66 : 0.3})`}
          />
        </button>
      </div>
    </div>
  </StepShell>
);

export default WelcomeStep;
