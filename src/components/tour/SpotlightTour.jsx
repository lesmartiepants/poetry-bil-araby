import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useUIStore } from '../../stores/uiStore';

/**
 * SpotlightTour — bespoke, on-brand walkthrough engine (no external library).
 *
 * Design goals (per product feedback):
 *  - The overlay NEVER blocks the page (pointer-events:none end-to-end), so the
 *    user genuinely taps the real Listen / Discover / Explain controls.
 *  - Steps don't auto-advance. Performing the real action UNLOCKS the Next
 *    button (which then pulses for attention); the user stays in control and
 *    can keep interacting (e.g. play → pause) before moving on.
 *  - The coachmark POPS into place at the target (no slow slide) and draws
 *    attention to itself with a gold glow + a pulsing ring on the target.
 */

const POP = { type: 'spring', stiffness: 460, damping: 30, mass: 0.7 };
const PAD = 8; // breathing room around the spotlighted element
const GAP = 16; // distance between the element and the coachmark card

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
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  // Keys of steps whose real action the user has performed. Derived `unlocked`
  // avoids resetting state in an effect on every step change.
  const [actioned, setActioned] = useState(() => new Set());
  const rafRef = useRef(0);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const total = steps.length;
  const needsAction = !!step?.advanceOn;
  const unlocked = !needsAction || actioned.has(step?.key);

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
  // of no taps/keys, which would yank the very elements we're pointing at.
  useEffect(() => {
    const id = setInterval(() => {
      window.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    }, 1200);
    return () => clearInterval(id);
  }, []);

  // Track the target's live position (the footer animates / the control morphs
  // play↔pause), so the spotlight and card follow it every frame.
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

  // Dynamic unlock: when the user actually performs the action on the real
  // control, light up the Next button instead of jumping ahead.
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

  const centered = !rect;

  return createPortal(
    // pointer-events:none on the root → every click falls through to the real
    // app. Only the card (and the centered tap-catcher) opt back in.
    <div
      className="fixed inset-0 z-[120]"
      style={{ pointerEvents: 'none' }}
      aria-live="polite"
      role="dialog"
      aria-label="App walkthrough"
    >
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
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Centered intro/outro: a faint tap-catcher keeps focus on the card. */}
      {centered && <div className="absolute inset-0" style={{ pointerEvents: 'auto' }} aria-hidden />}

      <AnimatePresence mode="wait">
        <CoachCard
          key={step.key}
          step={step}
          index={index}
          total={total}
          isLast={isLast}
          darkMode={darkMode}
          rect={rect}
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

/** Dim panels framing the target + a glowing, pulsing ring around it. */
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
      {/* glowing, breathing ring — re-positions instantly (no layout slide) */}
      <motion.div
        style={{
          position: 'absolute',
          top: t,
          left: l,
          width: w,
          height: h,
          borderRadius: 16,
          border: '1.5px solid rgba(197,160,89,0.95)',
          pointerEvents: 'none',
        }}
        animate={{
          boxShadow: [
            '0 0 0 1px rgba(197,160,89,0.25), 0 0 18px 2px rgba(197,160,89,0.30), inset 0 0 10px rgba(197,160,89,0.12)',
            '0 0 0 1px rgba(197,160,89,0.45), 0 0 34px 8px rgba(197,160,89,0.55), inset 0 0 16px rgba(197,160,89,0.22)',
            '0 0 0 1px rgba(197,160,89,0.25), 0 0 18px 2px rgba(197,160,89,0.30), inset 0 0 10px rgba(197,160,89,0.12)',
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      />
    </motion.div>
  );
}

function CoachCard({ step, index, total, isLast, darkMode, rect, locked, unlocked, onNext, onBack, onSkip }) {
  const [size, setSize] = useState({ w: 320, h: 200 });
  const ref = useRef(null);

  useLayoutEffect(() => {
    if (ref.current) {
      const r = ref.current.getBoundingClientRect();
      setSize({ w: r.width, h: r.height });
    }
  }, [index]);

  const pos = computePosition(rect, size, step?.side, step?.align);

  const surface = darkMode
    ? { bg: 'rgba(12,12,14,0.94)', text: '#e7e5e4', dim: 'rgba(231,229,228,0.62)' }
    : { bg: 'rgba(253,252,248,0.96)', text: '#1c1917', dim: 'rgba(28,25,23,0.6)' };

  return (
    <motion.div
      ref={ref}
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
        border: '1px solid rgba(197,160,89,0.28)',
        borderRadius: 18,
        padding: '18px 18px 14px',
        color: surface.text,
      }}
    >
      {/* Attention halo — a soft gold glow that breathes around the whole card. */}
      <motion.div
        aria-hidden
        style={{
          position: 'absolute',
          inset: -1,
          borderRadius: 18,
          pointerEvents: 'none',
        }}
        animate={{
          boxShadow: [
            '0 0 22px rgba(197,160,89,0.10), 0 12px 40px rgba(0,0,0,0.55)',
            '0 0 46px rgba(197,160,89,0.30), 0 12px 40px rgba(0,0,0,0.55)',
            '0 0 22px rgba(197,160,89,0.10), 0 12px 40px rgba(0,0,0,0.55)',
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      />

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
          zIndex: 1,
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
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--gold)',
                animation: 'tourPulse 1.4s ease-in-out infinite',
              }}
            />
          )}
          {locked ? step.hint : unlocked && step.advanceOn ? 'Done — tap Next' : step.hint}
        </div>
      )}

      {/* Progress + controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, position: 'relative', zIndex: 1 }}>
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
          <motion.button
            onClick={locked ? undefined : onNext}
            disabled={locked}
            aria-disabled={locked}
            style={{ ...goldBtn, ...(locked ? lockedBtn : null) }}
            animate={
              unlocked && step.advanceOn && !isLast
                ? { scale: [1, 1.06, 1], boxShadow: ['0 0 0 rgba(197,160,89,0)', '0 0 18px rgba(197,160,89,0.6)', '0 0 0 rgba(197,160,89,0)'] }
                : { scale: 1 }
            }
            transition={unlocked ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
          >
            {isLast ? 'Done' : 'Next'}
          </motion.button>
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

const lockedBtn = {
  background: 'rgba(197,160,89,0.18)',
  color: 'rgba(231,229,228,0.4)',
  cursor: 'not-allowed',
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

/**
 * Place the card relative to the target on the requested side/align, clamped
 * into the viewport so it never covers the element it points at.
 */
function computePosition(rect, size, side = 'auto', align = 'center') {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardW = Math.min(340, vw - 32);
  const cardH = size.h || 200;
  const clampX = (x) => Math.min(Math.max(12, x), vw - cardW - 12);
  const clampY = (y) => Math.min(Math.max(12, y), vh - cardH - 12);

  if (!rect || side === 'center') {
    return { top: Math.max(24, vh / 2 - cardH / 2), left: Math.max(16, vw / 2 - cardW / 2) };
  }

  // Resolve 'auto' to whichever vertical side has more room.
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

  // top / bottom
  const top = s === 'top' ? rect.top - cardH - GAP : rect.bottom + GAP;
  let left;
  if (align === 'start') left = rect.left;
  else if (align === 'end') left = rect.right - cardW;
  else left = rect.left + rect.width / 2 - cardW / 2;
  return { top: clampY(top), left: clampX(left) };
}
