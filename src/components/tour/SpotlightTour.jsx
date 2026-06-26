import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';
import { useModalStore } from '../../stores/modalStore';

/**
 * SpotlightTour — bespoke, on-brand walkthrough engine (no external library).
 *
 * Behavior:
 *  - The overlay NEVER blocks the page (pointer-events:none), so the user
 *    genuinely taps the real Listen / Discover / Explain controls.
 *  - Steps don't auto-advance. Performing the real action UNLOCKS Next; the
 *    user stays in control (e.g. play → pause) before moving on.
 *  - The coachmark pops into place with a CONSTANT subtle glow (no flashing).
 *    The only thing that flashes — subtly — is the ring around the action.
 *  - The card sits fully ABOVE the control bar (never overlapping it). When a
 *    step opens a tray (Discover), the card moves in front of the tray, centered
 *    in the bottom two-thirds, and Next dismisses the tray.
 */

// Above the Discover drawer (z-202) and everything else.
const Z = 9999;
const PAD = 4; // breathing room around the spotlighted element (hugs the control)
const GAP = 18; // distance between the control bar / element and the card
const POP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.7 };

// Steps can open an overlay (a "tray"): the engine then moves the card in front
// of it (un-blurred, centered in the bottom two-thirds) and closes it on Next.
// `above` (a selector) marks a centered modal the card should sit fully ABOVE
// rather than float over; the others are bottom drawers the card centers in
// front of in the bottom two-thirds.
const TRAYS = {
  discover: { key: 'discoverDrawer', close: () => useModalStore.getState().setDiscoverDrawer(false) },
  insight: { key: 'insightsDrawer', close: () => useModalStore.getState().setInsightsDrawer(false) },
  auth: { key: 'authModal', close: () => useModalStore.getState().setAuthModal(false), above: '[data-tour-anchor="auth"]' },
  saved: { key: 'savedPoems', close: () => useModalStore.getState().setSavedPoemsOpen(false) },
};

function measure(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  const radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right, radius };
}

export default function SpotlightTour({ steps, initialStep = 0, onDismiss, onComplete, onStepChange }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const discoverDrawer = useModalStore((s) => s.discoverDrawer);
  const insightsDrawer = useModalStore((s) => s.insightsDrawer);
  const authModal = useModalStore((s) => s.authModal);
  const savedPoems = useModalStore((s) => s.savedPoems);
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialStep), Math.max(0, steps.length - 1)));
  const [rect, setRect] = useState(null);
  const [barTop, setBarTop] = useState(null);
  const [aboveRect, setAboveRect] = useState(null);
  const [actioned, setActioned] = useState(() => new Set());
  const rafRef = useRef(0);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const total = steps.length;
  const needsAction = !!step?.advanceOn;
  const unlocked = !needsAction || actioned.has(step?.key);
  const tray = step?.tray ? TRAYS[step.tray] : null;
  const trayOpen = !!(tray && { discoverDrawer, insightsDrawer, authModal, savedPoems }[tray.key]);

  // Dismiss = user closed it early (× / Esc) → can resume later.
  // Complete = reached the end (Done) → terminal; entry point moves to the corner.
  const dismiss = useCallback(() => onDismiss?.(), [onDismiss]);
  const complete = useCallback(() => onComplete?.(), [onComplete]);

  // Persist the current step so a resume picks up exactly where they left off.
  useEffect(() => {
    onStepChange?.(index);
  }, [index, onStepChange]);

  // Next closes any open tray/panel AND advances in a single tap. The tour
  // suppresses those overlays' own outside-dismiss (see tourActive), so tapping a
  // feature control merely OPENS its panel — the tour stays on this slide until
  // the user presses Next, rather than auto-advancing when the panel appears.
  const next = useCallback(() => {
    const t = step?.tray ? TRAYS[step.tray] : null;
    if (t && useModalStore.getState()[t.key]) t.close();
    setIndex((i) => {
      if (i >= steps.length - 1) {
        complete();
        return i;
      }
      return i + 1;
    });
  }, [step, steps.length, complete]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Flag the tour as active so app overlays (e.g. the insight drawer) suppress
  // their outside-click dismissal and let the tour drive them.
  useEffect(() => {
    useUIStore.getState().setTourActive(true);
    return () => useUIStore.getState().setTourActive(false);
  }, []);

  // Keep the app chrome awake (the idle timer would otherwise hide the bar).
  useEffect(() => {
    const id = setInterval(() => {
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Track the target, the control bar's top edge, and any "above" modal (auth)
  // every frame so the card follows them.
  useLayoutEffect(() => {
    let active = true;
    const tk = step?.tray ? TRAYS[step.tray] : null;
    const tick = () => {
      if (!active) return;
      setRect(measure(step?.target));
      const bar = document.querySelector('[data-tour-anchor="controlbar"]');
      setBarTop(bar ? bar.getBoundingClientRect().top : null);
      setAboveRect(tk?.above ? measure(tk.above) : null);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [step?.target, step?.tray]);

  // Dynamic unlock: performing the real action lights up Next.
  useEffect(() => {
    if (!needsAction || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const handler = () => setActioned((prev) => new Set(prev).add(step.key));
    el.addEventListener(step.advanceOn, handler);
    return () => el.removeEventListener(step.advanceOn, handler);
  }, [index, step, needsAction]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss();
      else if (e.key === 'ArrowRight' && !(needsAction && !unlocked)) next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismiss, next, back, needsAction, unlocked]);

  // Layout mode: tray (centered in front of an open drawer) > spotlight > centered.
  const mode = trayOpen ? 'tray' : rect ? 'spotlight' : 'centered';

  return createPortal(
    <div
      className="fixed inset-0"
      style={{ zIndex: Z, pointerEvents: 'none' }}
      aria-live="polite"
      role="dialog"
      aria-label="App walkthrough"
    >
      <AnimatePresence>
        {mode === 'spotlight' ? (
          <Spotlight key="spot" rect={rect} />
        ) : mode === 'centered' ? (
          <motion.div
            key="scrim"
            className="absolute inset-0"
            style={{ background: 'rgba(8,8,12,0.72)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        ) : null}
      </AnimatePresence>

      {/* Centered intro/outro: a faint tap-catcher keeps focus on the card. */}
      {mode === 'centered' && <div className="absolute inset-0" style={{ pointerEvents: 'auto' }} aria-hidden />}

      <AnimatePresence mode="wait">
        <CoachCard
          key={step.key}
          step={step}
          index={index}
          total={total}
          isLast={isLast}
          darkMode={darkMode}
          mode={mode}
          rect={rect}
          barTop={barTop}
          aboveRect={aboveRect}
          locked={needsAction && !unlocked}
          unlocked={unlocked}
          onNext={next}
          onBack={back}
          onSkip={dismiss}
        />
      </AnimatePresence>
    </div>,
    document.body
  );
}

/** Dim panels framing the target + a SUBTLY pulsing ring (the only flash). */
function Spotlight({ rect }) {
  const t = rect.top - PAD;
  const l = rect.left - PAD;
  const w = rect.width + PAD * 2;
  const h = rect.height + PAD * 2;
  // Match the target's own corner radius (a pill stays a pill) — concentric with PAD.
  const radius = Math.min((rect.radius || 0) + PAD, h / 2);
  const dim = 'rgba(8,8,12,0.66)';
  const panel = (style) => (
    <div style={{ position: 'absolute', background: dim, backdropFilter: 'blur(1.5px)', pointerEvents: 'none', ...style }} />
  );
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute inset-0"
      style={{ pointerEvents: 'none' }}
    >
      {panel({ top: 0, left: 0, right: 0, height: Math.max(0, t) })}
      {panel({ top: t, left: 0, width: Math.max(0, l), height: h })}
      {panel({ top: t, left: l + w, right: 0, height: h })}
      {panel({ top: t + h, left: 0, right: 0, bottom: 0 })}
      <motion.div
        style={{
          position: 'absolute',
          top: t,
          left: l,
          width: w,
          height: h,
          borderRadius: radius,
          border: '1.5px solid rgba(197,160,89,0.9)',
          pointerEvents: 'none',
        }}
        animate={{
          boxShadow: [
            '0 0 14px 1px rgba(197,160,89,0.28), inset 0 0 8px rgba(197,160,89,0.10)',
            '0 0 22px 3px rgba(197,160,89,0.42), inset 0 0 12px rgba(197,160,89,0.16)',
            '0 0 14px 1px rgba(197,160,89,0.28), inset 0 0 8px rgba(197,160,89,0.10)',
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function CoachCard({ step, index, total, isLast, darkMode, mode, rect, barTop, aboveRect, locked, unlocked, onNext, onBack, onSkip }) {
  const [size, setSize] = useState({ w: 320, h: 200 });
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, [index, mode]);

  const pos = computePosition({ mode, rect, barTop, aboveRect, size, side: step?.side, align: step?.align });

  const surface = darkMode
    ? { bg: 'rgba(12,12,14,0.94)', text: '#e7e5e4', dim: 'rgba(231,229,228,0.62)' }
    : { bg: 'rgba(253,252,248,0.96)', text: '#1c1917', dim: 'rgba(28,25,23,0.6)' };

  return (
    <motion.div
      ref={ref}
      // Keep pointer events on the card from reaching Radix's document-level
      // dismiss listener — otherwise tapping Next on a step whose tray is a Radix
      // modal (the insight panel) is treated as an "outside" click that just
      // closes the dialog, swallowing the first press. Stopping propagation lets
      // the tour's own Next close the panel AND advance in a single tap.
      onPointerDown={(e) => e.stopPropagation()}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={POP}
      style={{
        position: 'absolute',
        ...pos,
        width: 'min(340px, calc(100vw - 32px))',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        background: surface.bg,
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        border: '1px solid rgba(197,160,89,0.3)',
        borderRadius: 18,
        padding: '18px 18px 14px',
        color: surface.text,
        // Constant, subtle gold glow — no flashing on the popup itself.
        boxShadow: '0 0 28px rgba(197,160,89,0.16), 0 12px 40px rgba(0,0,0,0.55)',
      }}
    >
      <button
        onClick={onSkip}
        aria-label="Close walkthrough"
        style={{
          position: 'absolute',
          top: 10,
          right: 12,
          background: 'transparent',
          border: 'none',
          color: surface.dim,
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Scrollable content — header/body/hint scroll if space is tight so the
          Back/Next footer below always stays visible. */}
      <div style={{ overflowY: 'auto', minHeight: 0 }}>
        {/* Arabic on the left, English to the right, separated by an em dash —
            one line where it fits, wrapping to multiple lines on large text. */}
        <h3
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            gap: '0 0.5rem',
            margin: '0 28px 6px 0',
          }}
        >
          {step.arabic && (
            <span dir="rtl" style={{ fontFamily: "'Reem Kufi', sans-serif", color: 'var(--gold)', fontSize: '1.05rem', fontWeight: 700 }}>
              {step.arabic}
            </span>
          )}
          {step.arabic && <span style={{ color: surface.dim, fontFamily: "'Forum', serif" }}>—</span>}
          <span style={{ fontFamily: "'Forum', serif", fontSize: '1.18rem', color: surface.text }}>{step.title}</span>
        </h3>
        <p style={{ fontFamily: "'Forum', serif", fontSize: '0.92rem', lineHeight: 1.55, margin: 0, color: surface.dim }}>
          {step.body}
        </p>

        {step.hint && (
          <div
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: "'Forum', serif",
              fontSize: '0.78rem',
              color: unlocked ? '#7bbf7b' : 'var(--gold)',
              background: unlocked ? 'rgba(123,191,123,0.12)' : 'rgba(197,160,89,0.1)',
              border: `1px solid ${unlocked ? 'rgba(123,191,123,0.4)' : 'rgba(197,160,89,0.3)'}`,
              borderRadius: 999,
              padding: '4px 12px',
              transition: 'all 0.3s ease',
            }}
          >
            {unlocked ? (
              <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>✓</span>
            ) : (
              <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--gold)', animation: 'tourPulse 1.4s ease-in-out infinite' }} />
            )}
            {locked ? step.hint : unlocked && step.advanceOn ? 'Done — tap Next' : step.hint}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              style={{
                width: i === index ? 18 : 6,
                height: 6,
                borderRadius: 999,
                background: i === index ? 'var(--gold)' : 'rgba(197,160,89,0.3)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {index > 0 && (
            <button onClick={onBack} style={ghostBtn(surface)}>
              Back
            </button>
          )}
          <button onClick={locked ? undefined : onNext} disabled={locked} aria-disabled={locked} style={{ ...goldBtn, ...(locked ? lockedBtn : null) }}>
            {isLast ? 'Done' : 'Next'}
          </button>
        </div>
      </div>

      <style>{`@keyframes tourPulse { 0%,100% { opacity: 0.4; transform: scale(0.85); } 50% { opacity: 1; transform: scale(1.15); } }`}</style>
    </motion.div>
  );
}

const goldBtn = {
  fontFamily: "'Forum', serif",
  fontSize: '0.85rem',
  color: '#0c0c0e',
  background: 'linear-gradient(135deg, var(--gold), #B8943E)',
  border: 'none',
  borderRadius: 999,
  padding: '6px 18px',
  cursor: 'pointer',
  fontWeight: 600,
};
const lockedBtn = { background: 'rgba(197,160,89,0.18)', color: 'rgba(231,229,228,0.4)', cursor: 'not-allowed' };
const ghostBtn = (surface) => ({
  fontFamily: "'Forum', serif",
  fontSize: '0.85rem',
  color: surface.dim,
  background: 'transparent',
  border: '1px solid rgba(197,160,89,0.3)',
  borderRadius: 999,
  padding: '6px 16px',
  cursor: 'pointer',
});

/**
 * Place the card and return a maxHeight so it can scroll internally rather than
 * ever overlap what it points at.
 *  - tray + aboveRect (auth modal): sit fully ABOVE the modal, no overlap.
 *  - tray (bottom drawers): centered in the bottom two-thirds, in front.
 *  - center: dead center (intro/outro).
 *  - spotlight side 'top': bottom-anchored a GAP above the control bar (or the
 *    target) so the card never partially overlaps the controls.
 */
function computePosition({ mode, rect, barTop, aboveRect, size, side = 'auto', align = 'center' }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 32);
  const measuredH = size.h || 200;
  const clampX = (x) => Math.min(Math.max(12, x), vw - cardW - 12);

  // Anchor the card by its BOTTOM edge at `bottomY` (grows upward) so it can
  // never cross `bottomY` regardless of height; cap height to the room above and
  // scroll if tight.
  const placeAbove = (bottomY, leftX) => ({
    bottom: Math.max(12, vh - bottomY),
    left: clampX(leftX),
    maxHeight: Math.max(140, bottomY - 12),
  });
  const placeCentered = (centerY) => {
    const maxHeight = Math.max(160, vh - 32);
    const h = Math.min(measuredH, maxHeight);
    return { top: Math.min(Math.max(12, centerY - h / 2), vh - h - 12), left: clampX(vw / 2 - cardW / 2), maxHeight };
  };

  if (mode === 'tray') {
    // A centered modal (auth) → sit fully above it. A bottom drawer → centered.
    if (aboveRect) return placeAbove(aboveRect.top - GAP, vw / 2 - cardW / 2);
    return placeCentered((2 * vh) / 3);
  }
  if (mode === 'centered' || !rect || side === 'center') {
    return placeCentered(vh / 2);
  }

  let s = side;
  if (s === 'auto') s = rect.top > vh - rect.bottom ? 'top' : 'bottom';

  const leftFor = () => (align === 'start' ? rect.left : align === 'end' ? rect.right - cardW : rect.left + rect.width / 2 - cardW / 2);

  if (s === 'left' || s === 'right') {
    const left = s === 'left' ? rect.left - cardW - GAP : rect.right + GAP;
    const maxHeight = Math.max(160, vh - 24);
    const h = Math.min(measuredH, maxHeight);
    let top;
    if (align === 'start') top = rect.top;
    else if (align === 'end') top = rect.bottom - h;
    else top = rect.top + rect.height / 2 - h / 2;
    return { top: Math.min(Math.max(12, top), vh - h - 12), left: clampX(left), maxHeight };
  }

  if (s === 'top') {
    // Bottom-anchored above the whole control bar (or the target) — never overlaps.
    const refTop = barTop != null ? barTop : rect.top;
    return placeAbove(refTop - GAP, leftFor());
  }
  // bottom
  const top = rect.bottom + GAP;
  const maxHeight = Math.max(140, vh - top - 12);
  return { top, left: clampX(leftFor()), maxHeight };
}
