import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import { BilingualLabel } from './stepParts.jsx';

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
    // The CHROME is LTR. The flow used to set dir="rtl" on this frame, which
    // made every directional thing in it run the other way: the progress rail
    // filled right to left, "next" sat on the left, and the advance arrow
    // pointed backwards to anyone reading the interface as English. Arabic verse
    // is genuinely RTL and stays RTL — but that is CONTENT. Individual Arabic
    // strings still carry their own dir="rtl"; the box they sit in does not.
    dir="ltr"
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
      /* Advance row. The press state is a 1px settle rather than a colour flash:
         at this size a background change reads as a flicker, a shift reads as a
         button. */
      .ob-nav{transition:background .18s ease,border-color .18s ease,transform .12s ease}
      .ob-nav:active{transform:translateY(1px)}
      .ob-nav-back:hover{border-color:rgba(197,160,89,.42);color:rgba(197,160,89,.95)}
      .ob-nav-next:hover{background:linear-gradient(180deg,rgba(197,160,89,.20),rgba(197,160,89,.11))}
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
        {/* Back on the LEFT, next on the RIGHT, and the arrows point the way an
            English reader expects. Back is rendered first so the DOM order and
            the visual order agree, which is also the tab order. */}
        {onBack && (
          <button
            className="ob-nav ob-nav-back"
            data-testid={`${testId}-back`}
            onClick={onBack}
            aria-label="Back — رجوع"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              // At 0.12 border / 0.5 glyph this was the only control in the flow
              // with no colour at all and read as disabled.
              border: '1px solid rgba(197,160,89,0.26)',
              borderRadius: '999px',
              background: 'transparent',
              color: 'rgba(197,160,89,0.7)',
              cursor: 'pointer',
              flex: '0 0 auto',
            }}
          >
            <ArrowLeft size={15} strokeWidth={1.75} />
          </button>
        )}
        <button
          className="ob-nav ob-nav-next"
          data-testid={`${testId}-continue`}
          onClick={() => onNext?.()}
          style={{
            flex: '0 1 auto',
            maxWidth: 232,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '9px',
            padding: '0 20px',
            // Hairline rather than a full-strength rule, and the fill carries a
            // slight top-down gradient with a 1px inner highlight: at this size
            // that reads as a machined edge where a flat panel read as a
            // placeholder. The border is what makes it crisp, so it stays 1px
            // and never doubles up as a shadow.
            border: '1px solid rgba(197,160,89,0.58)',
            borderRadius: '999px',
            background: 'linear-gradient(180deg,rgba(197,160,89,.15),rgba(197,160,89,.07))',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,.07)',
            color: accent,
            cursor: 'pointer',
            height: 46,
          }}
        >
          <BilingualLabel en={ctaEn} ar={ctaAr} size="nav" color={accent} />
          <ArrowRight size={15} strokeWidth={1.75} style={{ opacity: 0.72 }} />
        </button>
      </div>
    )}
  </motion.div>
);

export default StepShell;
