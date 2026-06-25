import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';

/**
 * SpotlightTour — bespoke, on-brand walkthrough engine (no external library).
 *
 * Why this exists alongside DriverTour: it is fully styled in the app's
 * gold / glass language and is *dynamic* — the dim overlay never blocks the
 * page (pointer-events: none), so the user genuinely clicks the real Listen /
 * Discover / Explain controls. When a step declares `advanceOn`, performing
 * that real interaction auto-advances the tour. That is the "they actually
 * navigate the app" experience, as opposed to a passive Next-button slideshow.
 */

const EASE = [0.16, 1, 0.3, 1];
const PAD = 8; // breathing room around the spotlighted element
const GAP = 14; // distance between the element and the coachmark card

function measure(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { el, top: r.top, left: r.left, width: r.width, height: r.height, bottom: r.bottom, right: r.right };
}

export default function SpotlightTour({ steps, onClose }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const rafRef = useRef(0);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const total = steps.length;

  const finish = useCallback(() => {
    try {
      localStorage.setItem('hasSeenTour', 'true');
    } catch {
      /* private mode — ignore */
    }
    onClose?.();
  }, [onClose]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        finish();
        return i;
      }
      return i + 1;
    });
  }, [steps.length, finish]);

  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // Keep the app chrome awake: the idle timer hides the control bar after ~2s
  // of no taps/keys, which would yank the very elements we're pointing at. A
  // gentle synthetic interaction on a slow cadence keeps everything on screen.
  useEffect(() => {
    const id = setInterval(() => {
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Track the target's live position (the footer slides / animates), so the
  // spotlight and card follow it smoothly every frame while this step is shown.
  useLayoutEffect(() => {
    let active = true;
    const tick = () => {
      if (!active) return;
      setRect(measure(step?.target));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, [step?.target]);

  // Dynamic advance: when the step opts in, listen for the user actually doing
  // the thing (e.g. clicking the real Discover button) and move on.
  useEffect(() => {
    if (!step?.advanceOn || !step?.target) return;
    const el = document.querySelector(step.target);
    if (!el) return;
    const handler = () => setTimeout(next, 420); // let the app's own animation start
    el.addEventListener(step.advanceOn, handler, { once: true });
    return () => el.removeEventListener(step.advanceOn, handler);
  }, [index, step, next]);

  // Esc closes; arrows navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [finish, next, back]);

  const centered = !rect;
  const card = (
    <CoachCard
      step={step}
      index={index}
      total={total}
      isLast={isLast}
      darkMode={darkMode}
      rect={rect}
      onNext={next}
      onBack={back}
      onSkip={finish}
    />
  );

  return createPortal(
    <div className="fixed inset-0 z-[120]" aria-live="polite" role="dialog" aria-label="App walkthrough">
      {/* Dim layer. pointer-events:none everywhere so the REAL app stays fully
          interactive underneath — the spotlight only directs the eye. */}
      <AnimatePresence>
        {rect ? (
          <Spotlight key="spot" rect={rect} />
        ) : (
          <motion.div
            key="scrim"
            className="absolute inset-0"
            style={{ background: 'rgba(8,8,12,0.72)', backdropFilter: 'blur(2px)', pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
          />
        )}
      </AnimatePresence>

      {/* Tap-catcher behind the card for centered steps so a stray click on the
          backdrop doesn't fall through to the app and dismiss focus. */}
      {centered && <div className="absolute inset-0" style={{ pointerEvents: 'auto' }} aria-hidden />}

      <AnimatePresence mode="wait">{card}</AnimatePresence>
    </div>,
    document.body
  );
}

/** Four dim panels framing the target + a glowing ring around it. */
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
      transition={{ duration: 0.35, ease: EASE }}
      className="absolute inset-0"
    >
      {panel({ top: 0, left: 0, right: 0, height: Math.max(0, t) })}
      {panel({ top: t, left: 0, width: Math.max(0, l), height: h })}
      {panel({ top: t, left: l + w, right: 0, height: h })}
      {panel({ top: t + h, left: 0, right: 0, bottom: 0 })}
      {/* glowing ring */}
      <motion.div
        layout
        style={{
          position: 'absolute',
          top: t,
          left: l,
          width: w,
          height: h,
          borderRadius: 16,
          border: '1.5px solid rgba(197,160,89,0.9)',
          boxShadow: '0 0 0 1px rgba(197,160,89,0.25), 0 0 24px 4px rgba(197,160,89,0.35), inset 0 0 12px rgba(197,160,89,0.15)',
          pointerEvents: 'none',
        }}
        animate={{ opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function CoachCard({ step, index, total, isLast, darkMode, rect, onNext, onBack, onSkip }) {
  const [size, setSize] = useState({ w: 320, h: 200 });
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, [index]);

  const pos = computePosition(rect, size, step?.placement);

  const surface = darkMode
    ? { bg: 'rgba(12,12,14,0.94)', text: '#e7e5e4', dim: 'rgba(231,229,228,0.62)' }
    : { bg: 'rgba(253,252,248,0.96)', text: '#1c1917', dim: 'rgba(28,25,23,0.6)' };

  return (
    <motion.div
      ref={ref}
      key={step.key}
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.4, ease: EASE }}
      style={{
        position: 'absolute',
        ...pos,
        width: 'min(340px, calc(100vw - 32px))',
        pointerEvents: 'auto',
        background: surface.bg,
        backdropFilter: 'blur(24px) saturate(150%)',
        WebkitBackdropFilter: 'blur(24px) saturate(150%)',
        border: '1px solid rgba(197,160,89,0.28)',
        borderRadius: 18,
        padding: '18px 18px 14px',
        boxShadow: '0 0 50px rgba(197,160,89,0.08), 0 12px 40px rgba(0,0,0,0.55)',
        color: surface.text,
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
            color: 'var(--gold)',
            background: 'rgba(197,160,89,0.1)',
            border: '1px solid rgba(197,160,89,0.3)',
            borderRadius: 999,
            padding: '4px 12px',
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--gold)', animation: 'tourPulse 1.4s ease-in-out infinite' }} />
          {step.hint}
        </div>
      )}

      {/* Progress + controls */}
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
          <button onClick={onNext} style={goldBtn}>
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

/** Place the card relative to the target, clamped into the viewport. */
function computePosition(rect, size, placement) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect) {
    // Centered intro/outro card.
    return { top: Math.max(24, vh / 2 - size.h / 2), left: Math.max(16, vw / 2 - size.w / 2) };
  }
  const cardW = Math.min(340, vw - 32);
  const cardH = size.h || 200;
  const centerX = rect.left + rect.width / 2;
  let left = centerX - cardW / 2;
  left = Math.min(Math.max(12, left), vw - cardW - 12);

  const spaceAbove = rect.top;
  const spaceBelow = vh - rect.bottom;
  const wantTop = placement === 'top' || (placement !== 'bottom' && spaceAbove > spaceBelow);

  let top = wantTop ? rect.top - cardH - GAP : rect.bottom + GAP;
  top = Math.min(Math.max(12, top), vh - cardH - 12);
  return { top, left };
}
