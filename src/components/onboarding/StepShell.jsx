import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

/**
 * The only thing the six onboarding steps share.
 *
 * The previous flow shared a whole COMPONENT (PreferenceStep) with three
 * layout modes, which is why every question looked the same: a title, a field
 * of chips, a pill. This shell deliberately owns less. It holds the frame — the
 * viewport box, the progress rail, the title block and the advance controls —
 * and nothing about how options are presented. Each step draws its own body.
 *
 * ## Why the box is built this way
 *
 * The target is an iPhone 16 in Safari: 393 x 852 CSS px on paper, but the URL
 * bar and the home indicator eat into that, and `100vh` on iOS resolves to the
 * LARGE viewport (URL bar hidden) — so a `100vh` box is taller than what the
 * reader can actually see and the CTA sits below the fold on first paint.
 * `100dvh` tracks the live visible height instead, with `100vh` only as the
 * pre-dvh fallback. Insets come from `env(safe-area-inset-*)`, so the advance
 * row clears the home indicator rather than sitting under it.
 *
 * Three rows: header / body / footer. The body is the only one that may grow,
 * and it carries `minHeight: 0` because a flex child defaults to its content
 * size and would otherwise push the footer off-screen instead of scrolling
 * inside itself. A step that cannot fit scrolls its OWN region, deliberately;
 * the page never scrolls.
 *
 * The advance row is pinned to the bottom of the frame, which on an 852pt
 * screen is also the only part of it a thumb reaches without a regrip.
 */

const GOLD = '#c5a059';
export const INK = '#0a0a0f';

const StepShell = ({
  testId,
  stepIndex = 0,
  stepCount = 6,
  accent = GOLD,
  /** Painted behind everything — each step's own atmosphere. */
  backdrop = null,
  children,
  onNext,
  onBack,
  /** Advance label. Steps that have an answer say "Next"; empty ones say "Skip". */
  ctaAr = 'التالي',
  ctaEn = 'Next',
  /** Hidden on the welcome step, which draws its own two doors. */
  showFooter = true,
  /** Extra element between the body and the advance row (welcome's actions). */
  footerSlot = null,
}) => (
  <motion.div
    data-testid={testId}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.32, ease: 'easeOut' }}
    dir="rtl"
    className="ob-frame"
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 60,
      background: INK,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      paddingTop: 'max(env(safe-area-inset-top), 12px)',
      paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
      paddingInline: 'max(env(safe-area-inset-left), 20px)',
    }}
  >
    {/* A CSS fallback pair cannot be written in a JS style object (the second key
        just overwrites the first), so the one declaration that genuinely needs
        one lives here. */}
    <style>{`
      .ob-frame{height:100vh;height:100dvh}
      /* Reem Kufi's space glyph is far too narrow at display sizes: without this
         "ما مزاجك الآن؟" renders as one run of letters. Every Kufi element in the
         flow carries .ob-kufi. */
      .ob-kufi{font-family:'Reem Kufi',sans-serif;word-spacing:.16em}
      /* Nothing here is load-bearing motion, so honour the OS setting outright
         rather than reducing durations by hand in nine places. */
      @media (prefers-reduced-motion: reduce){
        .ob-frame *,.ob-frame *::before,.ob-frame *::after{
          animation-duration:.01ms !important;animation-delay:0ms !important;
          transition-duration:.01ms !important;
        }
      }
      .ob-frame button:focus-visible{outline:2px solid #c5a059;outline-offset:2px}
    `}</style>
    {backdrop}

    {/* Header — progress rail only. Titles belong to the steps, because half of
        them want the title to be part of the artwork rather than a line above it. */}
    <div style={{ position: 'relative', zIndex: 1, flex: '0 0 auto', paddingBottom: '.5rem' }}>
      <div
        data-testid={`${testId}-progress`}
        role="progressbar"
        aria-valuenow={stepIndex + 1}
        aria-valuemin={1}
        aria-valuemax={stepCount}
        aria-label={`الخطوة ${stepIndex + 1} من ${stepCount}`}
        style={{ display: 'flex', gap: '5px', justifyContent: 'center', paddingTop: '.35rem' }}
      >
        {Array.from({ length: stepCount }, (_, i) => (
          <span
            key={i}
            style={{
              width: i === stepIndex ? '20px' : '5px',
              height: '3px',
              borderRadius: '999px',
              background:
                i < stepIndex ? `${accent}88` : i === stepIndex ? accent : 'rgba(255,255,255,0.13)',
              transition: 'width .32s ease, background .32s ease',
            }}
          />
        ))}
      </div>
    </div>

    {/* Body — the only row allowed to grow, and the only one allowed to scroll.
        Contents start at the TOP. Two earlier arrangements were worse: filling
        the body with the options left a 150-250px dead band between the question
        and its answers, and centring the whole group instead moved the question
        between 158px and 240px down depending on how tall that step's options
        were, so no two steps' title landed at the same height. Anchored, every
        question sits at the same y and the slack collects in one place, above
        the advance row. */}
    <div
      style={{
        position: 'relative',
        zIndex: 1,
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        width: '100%',
        maxWidth: 560,
        marginInline: 'auto',
      }}
    >
      {children}
    </div>

    {footerSlot}

    {showFooter && (
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: '0 0 auto',
          display: 'flex',
          gap: '.6rem',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '.85rem',
        }}
      >
        <button
          data-testid={`${testId}-continue`}
          onClick={() => onNext?.()}
          style={{
            flex: '1 1 auto',
            maxWidth: 260,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 28px',
            border: `1px solid ${accent}`,
            borderRadius: '999px',
            background: `${accent}14`,
            color: accent,
            fontFamily: "'Reem Kufi', sans-serif",
            wordSpacing: '.16em',
            fontSize: '1rem',
            cursor: 'pointer',
            minHeight: '52px',
            transition: 'background .2s ease',
          }}
        >
          <span>{ctaAr}</span>
          <span style={{ fontSize: '.6875rem', opacity: 0.55, fontFamily: 'inherit' }}>
            {ctaEn}
          </span>
          <ArrowLeft size={16} />
        </button>
        {onBack && (
          <button
            data-testid={`${testId}-back`}
            onClick={onBack}
            aria-label="رجوع — Back"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              // At 0.12 border / 0.5 glyph this was the only control in the flow
              // with no colour at all and read as disabled.
              border: '1px solid rgba(197,160,89,0.28)',
              borderRadius: '999px',
              background: 'transparent',
              color: 'rgba(197,160,89,0.75)',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            <ArrowRight size={16} />
          </button>
        )}
      </div>
    )}
  </motion.div>
);

export default StepShell;
