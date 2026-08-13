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

const LINE_EN = "Answer five short questions and we'll lean your reading toward what suits you.";
const LINE_AR = 'أجب عن خمسة أسئلة قصيرة، فنميل بما تقرأ نحو ما يشبهك.';
const LINE_EN_2 = 'Or walk straight in. Nothing is locked away either way.';
const LINE_AR_2 = 'أو ادخل الآن، فالبابُ مفتوح والدّيوان كما هو.';

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

const WelcomeStep = ({ testId, stepIndex, stepCount, onNext, onSkipAll }) => (
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
        <span
          lang="ar"
          dir="rtl"
          className="ob-kufi"
          style={{ fontSize: 'clamp(1.9rem, 8vw, 2.5rem)', lineHeight: 1.35 }}
        >
          اقرأ ما يُشبهك
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
            fontSize: 'clamp(1rem, 4.2vw, 1.15rem)',
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.82)',
            margin: 0,
          }}
        >
          <Words text={LINE_EN} />
        </p>
        <p
          lang="ar"
          dir="rtl"
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 'clamp(1.15rem, 5vw, 1.35rem)',
            lineHeight: 1.85,
            color: 'rgba(255,255,255,0.82)',
            margin: 0,
          }}
        >
          <Words text={LINE_AR} offset={nWords(LINE_EN)} />
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
          <Words text={LINE_EN_2} offset={nWords(LINE_EN) + nWords(LINE_AR)} />
        </p>
        <p
          lang="ar"
          dir="rtl"
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 'clamp(1.05rem, 4.4vw, 1.2rem)',
            lineHeight: 1.8,
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
          }}
        >
          <Words text={LINE_AR_2} offset={nWords(LINE_EN) + nWords(LINE_AR) + nWords(LINE_EN_2)} />
        </p>
      </div>

      {/* Both doors, inside the centred group. */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '.6rem',
          width: '100%',
          maxWidth: 340,
          marginTop: '.7rem',
          animation: 'obRise .8s ease 1.5s both',
        }}
      >
        <button
          data-testid={`${testId}-continue`}
          onClick={onNext}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 60,
            border: `1px solid ${GOLD}`,
            borderRadius: 999,
            background: `${GOLD}1f`,
            color: GOLD,
            cursor: 'pointer',
          }}
        >
          <BilingualLabel en="Curate my reading" ar="اختر لي" size="control" color={GOLD} />
        </button>
        <button
          data-testid={`${testId}-skip-all`}
          onClick={onSkipAll}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 56,
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: 999,
            background: 'transparent',
            color: 'rgba(255,255,255,0.66)',
            cursor: 'pointer',
          }}
        >
          <BilingualLabel
            en="Just read"
            ar="ادخل واقرأ"
            size="control"
            color="rgba(255,255,255,0.66)"
          />
        </button>
      </div>
    </div>
  </StepShell>
);

export default WelcomeStep;
