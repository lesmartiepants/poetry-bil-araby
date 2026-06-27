import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { SPARK_COLORS } from '../utils/sparkler.js';
import {
  computeWindowTop,
  scrubResolve,
  contTop,
  commitTop,
  clipPercentForLine,
} from '../utils/revealWindow.js';

/**
 * useSparklerReveal — headless, ref-driven controller for the sparkler teleprompter reveal.
 *
 * Ports the standalone prototype's `makeController` (design-review/poem-reader/sparkler-reveal.html)
 * into a React hook. The controller is the source of truth for reveal state; React only reflects
 * `revealedCount` via `onRevealedChange`. The canvas particle loop runs ONLY while the slide is
 * active (perf). All windowing math comes from utils/revealWindow.js.
 *
 * @param {object} opts
 * @param {boolean} opts.isActive       - only the active slide animates / holds a live canvas
 * @param {string|number} opts.poemId   - reset trigger
 * @param {number} opts.lineCount       - total verse lines
 * @param {boolean} opts.reducedMotion  - skip head/canvas, instant clip + fade
 * @param {(n:number)=>void} opts.onRevealedChange
 * @param {object} opts.refs            - { stageRef, trackRef, headRef, canvasRef, unitRefs, scrubFillRef, scrubHandleRef }
 * @returns {React.MutableRefObject} controller ref with { start, advance, scrubTo, revealUpTo, reset, getState }
 */
export function useSparklerReveal({
  isActive,
  poemId,
  lineCount,
  reducedMotion = false,
  onRevealedChange,
  refs,
}) {
  // Latest config, read inside the imperative closures so the stable controller never goes stale.
  // Updated in an effect (not during render) so we never write a ref mid-render. The controller's
  // methods only run from effects/handlers/timeouts, which fire after this effect commits.
  const cfg = useRef({ lineCount, reducedMotion, onRevealedChange, refs, isActive });
  useEffect(() => {
    cfg.current = { lineCount, reducedMotion, onRevealedChange, refs, isActive };
  });

  // Mutable controller state (never triggers re-render).
  const st = useRef({
    revealed: 0,
    windowTop: 0,
    busy: false,
    revealing: -1,
    scrubbing: false,
    particles: [],
    head: { x: 0, y: 0, alive: false },
    activeTween: null,
    rafId: null,
    last: 0,
  });

  // Build the imperative controller once. Its closures read the latest config/state through the
  // stable `cfg`/`st` refs, so a single instance stays correct across renders.
  const controller = useMemo(() => {
    const VIS = 4;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    const total = () => cfg.current.lineCount || 0;
    const R = () => cfg.current.refs;
    const unit = (i) => R().unitRefs?.current?.[i] ?? null;
    const els = (i) => {
      const u = unit(i);
      if (!u) return null;
      return {
        u,
        ar: u.querySelector('.ar-line'),
        en: u.querySelector('.en-line'),
        translit: u.querySelector('.translit-line'),
      };
    };
    const unitH = () => {
      const u = unit(0);
      const h = u ? u.getBoundingClientRect().height : 0;
      return h || 1;
    };

    const emitRevealed = () => cfg.current.onRevealedChange?.(st.current.revealed);

    // ── progress scrubber: write fill width + handle position directly (no React) ──
    const writeProgress = (frac) => {
      const pct = (Math.max(0, Math.min(1, frac)) * 100).toFixed(2) + '%';
      const fill = R().scrubFillRef?.current;
      const handle = R().scrubHandleRef?.current;
      if (fill) fill.style.width = pct;
      if (handle) handle.style.left = pct;
    };

    // ── canvas ──
    const sizeCanvas = () => {
      const canvas = R().canvasRef?.current;
      const stage = R().stageRef?.current;
      if (!canvas || !stage) return;
      const rect = stage.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const startLoop = () => {
      if (st.current.rafId != null) return;
      st.current.last = (performance.now && performance.now()) || 0;
      const canvas = R().canvasRef?.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx) return;
      const loop = (now) => {
        const s = st.current;
        const dt = Math.min(40, now - s.last);
        s.last = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (s.head.alive && !cfg.current.reducedMotion) {
          for (let k = 0; k < 8; k++) {
            // Forward (left) semicircle spray — reveal travels right→left.
            const ang = Math.PI * 0.5 + Math.random() * Math.PI;
            const sp = 1.6 + Math.random() * 4.8;
            s.particles.push({
              x: s.head.x + (Math.random() - 0.5) * 4,
              y: s.head.y + (Math.random() - 0.5) * 4,
              vx: Math.cos(ang) * sp - 1.1,
              vy: Math.sin(ang) * sp - 1.0,
              life: 1,
              decay: 0.008 + Math.random() * 0.013,
              size: 1.0 + Math.random() * 2.2,
              tw: Math.random() * 6.28,
              color: SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0],
            });
          }
        }
        ctx.globalCompositeOperation = 'lighter';
        for (let i = s.particles.length - 1; i >= 0; i--) {
          const p = s.particles[i];
          p.life -= p.decay * dt;
          if (p.life <= 0) {
            s.particles.splice(i, 1);
            continue;
          }
          p.vy += 0.013 * dt;
          p.x += p.vx * dt * 0.06;
          p.y += p.vy * dt * 0.06;
          const tw = 0.45 + 0.55 * Math.sin(p.tw + now * 0.018);
          const sz = p.size * (0.5 + 0.7 * p.life);
          ctx.globalAlpha = Math.max(0, p.life) * tw;
          ctx.strokeStyle = p.color;
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.lineWidth = Math.max(0.5, sz * 0.34);
          ctx.beginPath();
          ctx.moveTo(p.x - sz * 1.7, p.y);
          ctx.lineTo(p.x + sz * 1.7, p.y);
          ctx.moveTo(p.x, p.y - sz * 1.7);
          ctx.lineTo(p.x, p.y + sz * 1.7);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.4, sz * 0.5), 0, 6.283);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
        s.rafId = requestAnimationFrame(loop);
      };
      st.current.rafId = requestAnimationFrame(loop);
    };

    const stopLoop = () => {
      if (st.current.rafId != null) {
        cancelAnimationFrame(st.current.rafId);
        st.current.rafId = null;
      }
      st.current.particles = [];
      const canvas = R().canvasRef?.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const setHead = (x, y) => {
      st.current.head.x = x;
      st.current.head.y = y;
      const head = R().headRef?.current;
      if (head) head.style.transform = `translate(${x}px, ${y}px)`;
    };

    // Paint a line to a given clip percent (used by scrub + instant reveal). English/transliteration
    // opacity is React-driven (revealedCount) so it stays correct for late translations / toggles —
    // the controller only owns the Arabic clip + the `lit` glow class.
    const paintLine = (i, clipPct, { lit } = {}) => {
      const e = els(i);
      if (!e?.ar) return;
      e.ar.style.clipPath = `inset(0 0 0 ${clipPct}%)`;
      if (lit != null) e.u.classList.toggle('lit', !!lit);
    };

    // Ignite a single line: clip-mask reveal R→L with the sparkler head riding the edge.
    const ignite = (i, fromP = 1) =>
      new Promise((res) => {
        const e = els(i);
        if (!e?.ar) {
          res();
          return;
        }
        sizeCanvas();
        const { ar, u } = e;
        if (cfg.current.reducedMotion) {
          gsap.set(ar, { clipPath: 'inset(0 0 0 0%)' });
          gsap.fromTo(u, { opacity: 0 }, { opacity: 1, duration: 0.45 });
          u.classList.add('lit');
          res();
          return;
        }
        const head = R().headRef?.current;
        if (head) head.style.opacity = '1';
        st.current.head.alive = true;
        st.current.revealing = i;
        const canvas = R().canvasRef?.current;
        const obj = { p: fromP };
        st.current.activeTween = gsap.to(obj, {
          p: 0,
          duration: Math.max(0.05, 1.4 * fromP),
          ease: 'power1.inOut',
          onUpdate() {
            const arRect = ar.getBoundingClientRect();
            const cRect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0 };
            ar.style.clipPath = `inset(0 0 0 ${obj.p * 100}%)`;
            const hx = arRect.left - cRect.left + arRect.width * obj.p;
            const hy = arRect.top - cRect.top + arRect.height / 2;
            setHead(hx, hy);
            writeProgress((i + (1 - obj.p)) / total());
          },
          onComplete() {
            u.classList.add('lit');
            st.current.head.alive = false;
            st.current.revealing = -1;
            if (head) gsap.to(head, { opacity: 0, duration: 0.4 });
            res();
          },
        });
      });

    const scrollTrack = (top, dur = 0.7) =>
      new Promise((r) => {
        const track = R().trackRef?.current;
        if (!track) {
          r();
          return;
        }
        gsap.to(track, {
          y: -top * unitH(),
          duration: dur,
          ease: 'power3.inOut',
          onComplete: r,
        });
      });

    const start = async () => {
      const s = st.current;
      s.busy = true;
      writeProgress(0);
      await ignite(0);
      s.revealed = 1;
      emitRevealed();
      if (total() > 1) {
        await wait(250);
        await ignite(1);
        s.revealed = 2;
        emitRevealed();
      }
      s.busy = false;
    };

    const advance = async () => {
      const s = st.current;
      if (s.busy || s.revealed >= total()) return;
      s.busy = true;
      // Scroll BEFORE revealing so the newest line of this tap's pair lands on the bottom row.
      const lastLine = Math.min(s.revealed + 1, total() - 1);
      const newTop = computeWindowTop(lastLine, total(), VIS, s.windowTop);
      if (newTop !== s.windowTop) {
        s.windowTop = newTop;
        await scrollTrack(newTop);
      }
      await ignite(s.revealed);
      s.revealed++;
      emitRevealed();
      if (s.revealed < total()) {
        await wait(200);
        await ignite(s.revealed);
        s.revealed++;
        emitRevealed();
      }
      s.busy = false;
    };

    // Drag-to-seek. `commit=false` while dragging, `true` on release (resumes the reveal).
    const scrubTo = (frac, commit) => {
      const s = st.current;
      const T = total();
      if (!T) return;
      const { line, within } = scrubResolve(frac, T);
      const uh = unitH();
      const ct = contTop(line, within, T, VIS);
      const track = R().trackRef?.current;
      if (track) gsap.set(track, { y: -ct * uh });
      s.windowTop = commitTop(line, T, VIS);
      for (let idx = 0; idx < T; idx++) {
        const e = els(idx);
        if (!e?.ar) continue;
        gsap.killTweensOf([e.ar].filter(Boolean));
        paintLine(idx, clipPercentForLine(idx, line, within), { lit: idx < line });
      }
      // Head sits at the drop point on the target line.
      const e = els(line);
      const canvas = R().canvasRef?.current;
      if (e?.ar && canvas) {
        const arRect = e.ar.getBoundingClientRect();
        const cRect = canvas.getBoundingClientRect();
        const p = 1 - within;
        setHead(
          arRect.left - cRect.left + arRect.width * p,
          arRect.top - cRect.top + arRect.height / 2
        );
      }
      const head = R().headRef?.current;
      if (head) head.style.opacity = '1';
      s.head.alive = !commit; // sparkle while dragging; resume re-lights on commit
      s.revealed = line;
      s.revealing = -1;
      writeProgress(frac);
      if (commit) {
        if (track) gsap.to(track, { y: -s.windowTop * uh, duration: 0.28, ease: 'power2.out' });
        resumeScrub(line, within);
      }
    };

    const resumeScrub = async (line, within) => {
      const s = st.current;
      s.busy = true;
      await ignite(line, 1 - within);
      s.revealed = line + 1;
      s.revealing = -1;
      s.busy = false;
      emitRevealed();
    };

    // TTS line-sync: ensure lines [0..target] are visible (un-clipped) and the target sits
    // on the bottom row. No sparkler theatrics — instant, follows the spoken word.
    const revealUpTo = async (target, { animate = true } = {}) => {
      const s = st.current;
      const T = total();
      if (target < 0 || !T) return;
      const tgt = Math.min(target, T - 1);
      for (let i = 0; i <= tgt; i++) {
        const e = els(i);
        if (!e?.ar) continue;
        gsap.killTweensOf(e.ar);
        paintLine(i, 0, { lit: true });
      }
      s.revealed = Math.max(s.revealed, tgt + 1);
      const head = R().headRef?.current;
      if (head) head.style.opacity = '0';
      s.head.alive = false;
      s.windowTop = computeWindowTop(tgt, T, VIS, s.windowTop);
      const track = R().trackRef?.current;
      if (track)
        gsap.to(track, {
          y: -s.windowTop * unitH(),
          duration: animate ? 0.4 : 0,
          ease: 'power2.out',
        });
      writeProgress((tgt + 1) / T);
      emitRevealed();
    };

    const reset = () => {
      const s = st.current;
      if (s.activeTween) s.activeTween.kill();
      s.activeTween = null;
      stopLoop();
      s.revealed = 0;
      s.windowTop = 0;
      s.busy = false;
      s.revealing = -1;
      s.head.alive = false;
      const track = R().trackRef?.current;
      const head = R().headRef?.current;
      if (track) {
        gsap.killTweensOf(track);
        gsap.set(track, { y: 0 });
      }
      if (head) {
        gsap.killTweensOf(head);
        head.style.opacity = '0';
      }
      const T = total();
      for (let i = 0; i < T; i++) {
        const e = els(i);
        if (!e?.ar) continue;
        gsap.killTweensOf(e.ar);
        e.ar.style.clipPath = 'inset(0 0 0 100%)';
        e.u.classList.remove('lit');
      }
      writeProgress(0);
      emitRevealed();
    };

    return {
      start,
      advance,
      scrubTo,
      revealUpTo,
      reset,
      sizeCanvas,
      _startLoop: startLoop,
      _stopLoop: stopLoop,
      getState: () => ({ ...st.current }),
    };
  }, []);

  // Canvas/rAF lifecycle — only the active slide runs a live loop.
  useEffect(() => {
    if (isActive && !reducedMotion) {
      controller.sizeCanvas();
      controller._startLoop();
    } else {
      controller._stopLoop();
    }
    return () => controller._stopLoop();
  }, [isActive, reducedMotion, controller]);

  // Reset on poem change.
  useEffect(() => {
    controller.reset();
  }, [poemId, controller]);

  // Keep canvas sized to the stage.
  useEffect(() => {
    const onResize = () => controller.sizeCanvas();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [controller]);

  return controller;
}
