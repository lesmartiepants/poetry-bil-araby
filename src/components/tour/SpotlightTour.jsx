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
const PAD = 8; // breathing room around the spotlighted element
const GAP = 18; // distance between the control bar / element and the card
const POP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.7 };

// Steps can open an overlay (a "tray"): the engine then moves the card in front
// of it (un-blurred, centered in the bottom two-thirds) and closes it on Next.
const TRAYS = {
  discover: { key: 'discoverDrawer', close: () => useModalStore.getState().setDiscoverDrawer(false) },
  insight: { key: 'insightsDrawer', close: () => useModalStore.getState().setInsightsDrawer(false) },
  auth: { key: 'authModal', close: () => useModalStore.getState().setAuthModal(false) },
  saved: { key: 'savedPoems', close: () => useModalStore.getState().setSavedPoemsOpen(false) },
};

function measure(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

export default function SpotlightTour({ steps, onClose }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const discoverDrawer = useModalStore((s) => s.discoverDrawer);
  const insightsDrawer = useModalStore((s) => s.insightsDrawer);
  const authModal = useModalStore((s) => s.authModal);
  const savedPoems = useModalStore((s) => s.savedPoems);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [barTop, setBarTop] = useState(null);
  const [actioned, setActioned] = useState(() => new Set());
  const rafRef = useRef(0);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const total = steps.length;
  const needsAction = !!step?.advanceOn;
  const unlocked = !needsAction || actioned.has(step?.key);
  const tray = step?.tray ? TRAYS[step.tray] : null;
  const trayOpen = !!(tray && { discoverDrawer, insightsDrawer, authModal, savedPoems }[tray.key]);

  const finish = useCallback(() => {
    try {
      localStorage.setItem('hasSeenTour', 'true');
    } catch {
      /* private mode — ignore */
    }
    onClose?.();
  }, [onClose]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  // Next: when a tray/panel is open, just CLOSE it — advancing is driven by the
  // tray-dismissed effect below. This works uniformly whether the tray is a
  // modal Radix dialog (the insight panel, which intercepts the first outside
  // click to close itself) or a plain drawer. Otherwise advance directly.
  const next = useCallback(() => {
    const t = step?.tray ? TRAYS[step.tray] : null;
    if (t && useModalStore.getState()[t.key]) {
      t.close();
    } else {
      goNext();
    }
  }, [step, goNext]);

  // Advance the moment an opened tray gets dismissed — by Next, by the app's own
  // close button, or by a Radix outside-click — so a single Next always moves on.
  const prevTrayOpen = useRef(false);
  useEffect(() => {
    if (prevTrayOpen.current && !trayOpen && step?.tray) {
      prevTrayOpen.current = false;
      // Advance in response to an external store change (the dismissed overlay).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      goNext();
    } else {
      prevTrayOpen.current = trayOpen;
    }
  }, [trayOpen, step, goNext]);

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

  // Track the target + the control bar's top edge every frame.
  useLayoutEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setRect(measure(step?.target));
      const bar = document.querySelector('[data-tour-anchor="controlbar"]');
      setBarTop(bar ? bar.getBoundingClientRect().top : null);
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [step?.target]);

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
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight' && !(needsAction && !unlocked)) next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next, back, needsAction, unlocked]);

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
          locked={needsAction && !unlocked}
          unlocked={unlocked}
          onNext={next}
          onBack={back}
          onSkip={finish}
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
          borderRadius: 16,
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

function CoachCard({ step, index, total, isLast, darkMode, mode, rect, barTop, locked, unlocked, onNext, onBack, onSkip }) {
  const [size, setSize] = useState({ w: 320, h: 200 });
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, [index, mode]);

  const pos = computePosition({ mode, rect, barTop, size, side: step?.side, align: step?.align });

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

      {step.arabic && (
        <div style={{ fontFamily: "'Reem Kufi', sans-serif", color: 'var(--gold)', fontSize: '0.95rem', marginBottom: 4 }}>
          {step.arabic}
        </div>
      )}
      <h3 style={{ fontFamily: "'Forum', serif", fontSize: '1.18rem', margin: '0 0 6px', color: surface.text }}>
        {step.title}
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
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
 * Place the card.
 *  - tray:   centered horizontally, centered within the bottom two-thirds.
 *  - center: dead center (intro/outro).
 *  - spotlight: beside the target on the requested side. For bottom controls
 *    (side 'top') we anchor to the TOP of the control bar so the card clears the
 *    whole bar instead of partially overlapping individual buttons.
 */
function computePosition({ mode, rect, barTop, size, side = 'auto', align = 'center' }) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 32);
  const cardH = size.h || 200;
  const clampX = (x) => Math.min(Math.max(12, x), vw - cardW - 12);
  const clampY = (y) => Math.min(Math.max(12, y), vh - cardH - 12);

  if (mode === 'tray') {
    // Centered within the bottom two-thirds (its center sits at 2/3 height).
    return { left: clampX(vw / 2 - cardW / 2), top: clampY((2 * vh) / 3 - cardH / 2) };
  }
  if (mode === 'centered' || !rect || side === 'center') {
    return { top: Math.max(24, vh / 2 - cardH / 2), left: Math.max(16, vw / 2 - cardW / 2) };
  }

  let s = side;
  if (s === 'auto') s = rect.top > vh - rect.bottom ? 'top' : 'bottom';

  if (s === 'left' || s === 'right') {
    const left = s === 'left' ? rect.left - cardW - GAP : rect.right + GAP;
    let top;
    if (align === 'start') top = rect.top;
    else if (align === 'end') top = rect.bottom - cardH;
    else top = rect.top + rect.height / 2 - cardH / 2;
    return { left: clampX(left), top: clampY(top) };
  }

  // top / bottom. For 'top', clear the whole control bar when we know its edge.
  const refTop = s === 'top' && barTop != null ? barTop : rect.top;
  const top = s === 'top' ? refTop - cardH - GAP : rect.bottom + GAP;
  let left;
  if (align === 'start') left = rect.left;
  else if (align === 'end') left = rect.right - cardW;
  else left = rect.left + rect.width / 2 - cardW / 2;
  return { top: clampY(top), left: clampX(left) };
}
