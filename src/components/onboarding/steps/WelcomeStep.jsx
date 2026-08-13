import StepShell from '../StepShell.jsx';

/**
 * Step 1 — Welcome.
 *
 * ## The design feature: the type sets itself
 *
 * This screen is the only one that has to argue for the other five, and the
 * argument this app can make is the one thing it is actually about: a line of
 * Arabic, set well. So the hero is not an illustration or an icon — it is the
 * invitation itself, in Amiri, revealing word by word the way a line is read
 * rather than the way a page loads. Nothing else on the screen moves.
 *
 * That also settles the typography question the rest of the flow inherits. This
 * is running prose, so it is Amiri (naskh). The two door labels are short, so
 * they are Reem Kufi. Setting a sentence in Kufi is the visible mistake to
 * avoid and this screen is where the distinction gets demonstrated.
 *
 * ## The two doors
 *
 * The owner's sketch — "answer a few questions, or skip to reading" — has one
 * real job: make skipping feel like a legitimate door rather than a refusal.
 * Both actions are therefore full-width and equally reachable in the lower
 * third, with weight (fill vs hairline) carrying the recommendation instead of
 * size or position. "Five questions" is stated up front because the honest
 * objection to onboarding is not knowing how long it is.
 */

const GOLD = '#c5a059';

const LINE_AR = 'أجب عن خمسة أسئلة قصيرة، فنميل بما تقرأ نحو ما يشبهك.';
const LINE_AR_2 = 'أو ادخل الآن، فالبابُ مفتوح والدّيوان كما هو.';

// One continuous stagger across BOTH lines, so the second reads as the sentence
// continuing rather than as a second element appearing. The offset is passed in
// rather than counted with a mutable cursor, which would drift across renders.
const Words = ({ text, offset = 0 }) =>
  text.split(' ').map((w, i) => (
    <span
      key={`${offset}-${i}`}
      style={{
        display: 'inline-block',
        animation: `obWord .7s cubic-bezier(.2,.7,.3,1) ${0.28 + (offset + i) * 0.055}s both`,
      }}
    >
      {w}&nbsp;
    </span>
  ));

const WelcomeStep = ({ testId, stepIndex, stepCount, onNext, onSkipAll }) => {
  return (
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

      {/* Hero and doors are ONE centred group, not a centred hero with the
          doors pinned to the floor. Pinning them left a dead band of ~200px
          between the English gloss and the first button on an 852pt screen,
          and pushed both buttons onto the very bottom edge. Centred, the group
          lands with its actions around 70% of the height — still comfortably
          inside thumb reach, without the void. */}
      <div
        style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          gap: '1.15rem',
          paddingBottom: '.5rem',
        }}
      >
        <h1
          lang="ar"
          dir="rtl"
          style={{
            fontFamily: "'Reem Kufi', sans-serif",
            wordSpacing: '.16em',
            fontSize: 'clamp(1.9rem, 8vw, 2.6rem)',
            fontWeight: 400,
            color: GOLD,
            margin: 0,
            lineHeight: 1.3,
            animation: 'obRise .8s cubic-bezier(.2,.7,.3,1) both',
          }}
        >
          اقرأ ما يُشبهك
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

        <p
          lang="ar"
          dir="rtl"
          data-testid={`${testId}-lede`}
          style={{
            fontFamily: "'Amiri', serif",
            fontSize: 'clamp(1.05rem, 4.6vw, 1.3rem)',
            lineHeight: 2,
            color: 'rgba(255,255,255,0.80)',
            margin: 0,
            // 20rem broke the first sentence one word early and left "يشبهك."
            // alone on its own centred line.
            maxWidth: '22rem',
          }}
        >
          <Words text={LINE_AR} />
          <span style={{ display: 'block', height: '.35rem' }} />
          <span style={{ color: 'rgba(255,255,255,0.52)' }}>
            <Words text={LINE_AR_2} offset={LINE_AR.split(' ').length} />
          </span>
        </p>

        <p
          dir="ltr"
          style={{
            fontSize: '.8125rem',
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.32)',
            margin: 0,
            maxWidth: '19rem',
            animation: 'obRise .8s ease 1.25s both',
          }}
        >
          Five short questions and we&apos;ll lean your reading toward what suits you. Or walk
          straight in. Nothing is locked away either way.
        </p>

        {/* Both doors, inside the centred group. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '.6rem',
            width: '100%',
            maxWidth: 340,
            marginTop: '.9rem',
            animation: 'obRise .8s ease 1.45s both',
          }}
        >
          <button
            data-testid={`${testId}-continue`}
            onClick={onNext}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              minHeight: 56,
              border: `1px solid ${GOLD}`,
              borderRadius: 999,
              background: `${GOLD}1f`,
              color: GOLD,
              fontFamily: "'Reem Kufi', sans-serif",
              wordSpacing: '.16em',
              fontSize: '1.05rem',
              cursor: 'pointer',
            }}
          >
            <span>اختر لي</span>
            <span style={{ fontSize: '.6875rem', opacity: 0.6 }}>Curate my reading</span>
          </button>
          <button
            data-testid={`${testId}-skip-all`}
            onClick={onSkipAll}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              minHeight: 52,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 999,
              background: 'transparent',
              color: 'rgba(255,255,255,0.62)',
              fontFamily: "'Reem Kufi', sans-serif",
              wordSpacing: '.16em',
              fontSize: '.95rem',
              cursor: 'pointer',
            }}
          >
            <span>ادخل واقرأ</span>
            <span style={{ fontSize: '.6875rem', opacity: 0.6 }}>Just read</span>
          </button>
        </div>
      </div>
    </StepShell>
  );
};

export default WelcomeStep;
