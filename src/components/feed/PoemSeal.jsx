import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import '../../styles/poem-seal.css';

/**
 * PoemSeal — press and hold a quill to summon the next poem.
 *
 * The whole thing is driven by ONE custom property, `--p`, running 0 to 1. Quill tilt, ink trail,
 * ring sweep, bloom and vignette all key off it in CSS, so the only per-frame JS is writing that
 * number. The poem's recede is a CSS transition in poem-column.css, never per-frame work on the
 * verse rows.
 *
 * Two inputs charge the same `--p`: holding the quill (time-driven, 760ms) and pulling past the
 * bottom of the poem (distance-driven, 120px). Both funnel through setCharge/endCharge so there is
 * one commit path and one decay path.
 *
 * Layering is load-bearing. The bloom and vignette sit BEHIND the reading surface and the burst
 * and sweep sit ABOVE everything including the action bar. That only works if both layers are
 * siblings of the reader rather than descendants of it, which is what portalTarget is for: the
 * scroller clips (overflow-y:auto) and so does each feed slide (overflow-hidden).
 */

const SummonContext = createContext(null);

const HOLD_MS = 760; // Raised from 620: at 620 the bloom had not finished growing before it fired.
const DECAY_MS = 220;
const DISSOLVE_MS = 340; // Fallback only. Normally we wait for the dissolve's animationend.
const PULL_NEED = 120; // px of sustained over-pull equal to a full hold.
const SPARK_COUNT = 26;
const MOTE_COUNT = 90; // 46 was tried and read as stray specks rather than a shimmer.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function SummonProvider({ onSummon, portalTarget = null, children }) {
  const rootRef = useRef(null);
  const bgRef = useRef(null);
  const fxRef = useRef(null);
  const rafRef = useRef(null);
  const holdStartRef = useRef(0);
  const pRef = useRef(0);
  // Blocks a second commit while one is still running. Nothing else serialises summons now that
  // the feed's tween (whose kill() used to do this) is gone.
  const busyRef = useRef(false);
  const timersRef = useRef([]);

  const track = useCallback((id) => {
    timersRef.current.push(id);
    return id;
  }, []);

  const writeP = useCallback((p) => {
    pRef.current = p;
    const v = String(p);
    rootRef.current?.style.setProperty('--p', v);
    bgRef.current?.style.setProperty('--p', v);
    fxRef.current?.style.setProperty('--p', v);
  }, []);

  const anchor = useCallback((el) => {
    // Read once, on press. Under fixed positioning these viewport coordinates line up directly,
    // so there is no scroll offset to correct for.
    const r = el?.getBoundingClientRect?.();
    const x = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r ? r.top + r.height / 2 : window.innerHeight * 0.62;
    [bgRef, fxRef].forEach((ref) => {
      ref.current?.style.setProperty('--sx', `${x}px`);
      ref.current?.style.setProperty('--sy', `${y}px`);
    });
  }, []);

  const restart = (el, cls) => {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth; // reflow, so the animation can play again on a repeat summon
    el.classList.add(cls);
  };

  const sparkleIn = useCallback(() => {
    const fx = fxRef.current;
    if (!fx || prefersReducedMotion()) return;
    restart(fx.querySelector('.s-sweep'), 'go');
    const field = fx.querySelector('.s-motes');
    if (!field) return;
    field.innerHTML = '';
    const w = window.innerWidth;
    const h = window.innerHeight;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < MOTE_COUNT; i += 1) {
      const m = document.createElement('i');
      m.className = 'mote';
      m.style.left = `${(12 + Math.random() * (w - 24)).toFixed(0)}px`;
      m.style.top = `${(70 + Math.random() * (h - 220)).toFixed(0)}px`;
      m.style.setProperty('--dl', `${(Math.random() * 420).toFixed(0)}ms`);
      m.style.setProperty('--sz', `${(1.8 + Math.random() * 2.8).toFixed(1)}px`);
      frag.appendChild(m);
    }
    field.appendChild(frag);
    track(
      setTimeout(() => {
        field.innerHTML = '';
      }, 1700)
    );
  }, [track]);

  const sparks = useCallback((el) => {
    const fx = fxRef.current;
    if (!fx || !el || prefersReducedMotion()) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    for (let i = 0; i < SPARK_COUNT; i += 1) {
      const s = document.createElement('i');
      s.className = 'spark';
      s.style.left = `${cx}px`;
      s.style.top = `${cy}px`;
      fx.appendChild(s);
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 150;
      const anim = s.animate(
        [
          { transform: 'translate(0,0) scale(1)', opacity: 1 },
          {
            transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist}px) scale(0.2)`,
            opacity: 0,
          },
        ],
        {
          duration: 520 + Math.random() * 320,
          easing: 'cubic-bezier(.2,.7,.3,1)',
          fill: 'forwards',
        }
      );
      anim.onfinish = () => s.remove();
    }
  }, []);

  const cancelRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const decay = useCallback(() => {
    cancelRaf();
    const from = pRef.current;
    const t0 = performance.now();
    const step = () => {
      const k = Math.min(1, (performance.now() - t0) / DECAY_MS);
      writeP(Number((from * (1 - k)).toFixed(3)));
      if (k < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  }, [writeP]);

  const commit = useCallback(
    (sealEl) => {
      if (busyRef.current) return;
      busyRef.current = true;
      cancelRaf();
      writeP(1);
      const root = rootRef.current;
      root?.classList.remove('summoning');
      root?.classList.add('summoning-out');
      sealEl?.classList.add('fired');
      restart(fxRef.current?.querySelector('.s-burst'), 'go');
      sparks(sealEl);

      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        root?.classList.remove('summoning-out');
        writeP(0);
        sealEl?.classList.remove('fired', 'charging');
        onSummon?.();
        sparkleIn();
        busyRef.current = false;
      };

      // Derive the moment from the dissolve itself so the 340ms is not duplicated in JS and CSS.
      const col = root?.querySelector?.('.pc-col');
      if (col && !prefersReducedMotion()) {
        col.addEventListener('animationend', finish, { once: true });
        // Belt and braces: if the animation is interrupted, animationend never arrives.
        track(setTimeout(finish, DISSOLVE_MS + 200));
      } else {
        // Reduced motion disables the dissolve entirely, so animationend never fires. Without this
        // the summon would never complete and the reader would sit at 38% opacity forever.
        track(setTimeout(finish, 0));
      }
    },
    [onSummon, sparkleIn, sparks, track, writeP]
  );

  const setCharge = useCallback(
    (p) => {
      if (busyRef.current) return;
      cancelRaf();
      rootRef.current?.classList.add('summoning');
      writeP(Math.max(0, Math.min(1, p)));
    },
    [writeP]
  );

  const endCharge = useCallback(
    (sealEl) => {
      if (busyRef.current) return;
      if (pRef.current >= 1) {
        commit(sealEl);
      } else {
        rootRef.current?.classList.remove('summoning');
        sealEl?.classList.remove('charging');
        decay();
      }
    },
    [commit, decay]
  );

  // The hold: same charge, driven by a clock instead of a distance.
  const startHold = useCallback(
    (sealEl) => {
      if (busyRef.current) return;
      anchor(sealEl);
      sealEl?.classList.add('charging');
      holdStartRef.current = performance.now();
      cancelRaf();
      const tick = () => {
        const p = Math.min(1, (performance.now() - holdStartRef.current) / HOLD_MS);
        setCharge(p);
        if (p >= 1) {
          rafRef.current = null;
          commit(sealEl);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    },
    [anchor, commit, setCharge]
  );

  // The pull: distance-driven. A flick lifts the finger early, so endCharge sees an incomplete
  // charge and decays it. Only a sustained pull reaches 1 while still down, which is what keeps
  // summoning a decision rather than an accident.
  const pull = useCallback(
    ({ distance, phase }, sealEl) => {
      if (busyRef.current) return;
      if (phase === 'move') {
        if (distance <= 0) return;
        if (pRef.current === 0) anchor(sealEl);
        setCharge(distance / PULL_NEED);
      } else {
        endCharge(sealEl);
      }
    },
    [anchor, endCharge, setCharge]
  );

  useEffect(
    () => () => {
      cancelRaf();
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    },
    []
  );

  const api = useMemo(
    () => ({ setCharge, endCharge, commit, startHold, pull, sparkleIn, rootRef }),
    [setCharge, endCharge, commit, startHold, pull, sparkleIn]
  );

  const layers = (
    <>
      <div ref={bgRef} className="summon summon-bg" aria-hidden="true">
        <div className="s-vignette" />
        <div className="s-bloom" />
      </div>
      <div ref={fxRef} className="summon summon-fx" aria-hidden="true">
        <div className="s-burst" />
        <div className="s-sweep" />
        <div className="s-motes" />
      </div>
    </>
  );

  return (
    <SummonContext.Provider value={api}>
      <div ref={rootRef} className="summon-root">
        {portalTarget ? createPortal(layers, portalTarget) : layers}
        {children}
      </div>
    </SummonContext.Provider>
  );
}

export function useSummon() {
  return useContext(SummonContext);
}

/**
 * PoemSeal — the 76px quill itself. Rendered inside the poem column so it scrolls with the poem;
 * it only exists at the end, where the reader has arrived deliberately.
 */
export default function PoemSeal({ disabled = false, sealRef: externalSealRef }) {
  const summon = useSummon();
  const innerSealRef = useRef(null);
  // PoemReader passes a ref so the pull-at-bottom summon can hand this same element to
  // summon.pull(): one anchor point for the hold path and the pull path alike.
  const sealRef = externalSealRef ?? innerSealRef;
  const [keyHeld, setKeyHeld] = useState(false);

  const start = () => {
    if (disabled || !summon) return;
    summon.startHold(sealRef.current);
  };
  const stop = () => {
    if (disabled || !summon) return;
    summon.endCharge(sealRef.current);
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault(); // Space would scroll the column out from under the reader.
    if (keyHeld) return; // keydown auto-repeat must not restart the clock
    setKeyHeld(true);
    start();
  };
  const onKeyUp = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    setKeyHeld(false);
    stop();
  };

  return (
    <div className="seal-wrap">
      <div
        ref={sealRef}
        className="seal"
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Draw another poem"
        // role="button" announces as a plain button, so nothing would otherwise tell a screen
        // reader user that this control has to be held rather than pressed.
        aria-description="Press and hold to draw another poem."
        onPointerDown={(e) => {
          e.preventDefault();
          try {
            sealRef.current?.setPointerCapture?.(e.pointerId);
          } catch {
            /* capture is a nicety; the gesture still works without it */
          }
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onPointerLeave={stop}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        <div className="ring" />
        <div className="q-stage">
          <div className="q-trail" />
          <svg className="q-pen" viewBox="0 0 32 32" aria-hidden="true">
            <path
              className="q-vane"
              d="M28 3c-10 0-18.5 7.5-20.5 16.5L6 25l5.5-1.5C20.5 21.5 28 13 28 3z"
            />
            <path className="q-shaft" d="M26.5 4.5 8.5 25" />
            <path className="q-nib" d="M8.5 25 5 29.5" />
          </svg>
          <div className="q-ink" />
        </div>
      </div>
      {/* Load-bearing, not decoration: press-and-hold is undiscoverable without it. */}
      <div className="seal-caption">
        hold to draw
        <br />
        another poem
      </div>
    </div>
  );
}
