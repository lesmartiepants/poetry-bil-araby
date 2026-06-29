import { useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { SPARK_COLORS } from '../utils/sparkler.js';
import {
  computeWindowTop,
  scrubResolve,
  contTop,
  commitTop,
  ttsWindowTop,
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
 * @returns {React.MutableRefObject} controller ref with { start, advance, scrubTo, ttsFollow, reset, getState }
 */
export function useSparklerReveal({
  isActive,
  poemId,
  lineCount,
  visRows = 4,
  reducedMotion = false,
  onRevealedChange,
  onBusyChange,
  refs,
}) {
  // Latest config, read inside the imperative closures so the stable controller never goes stale.
  // Updated in an effect (not during render) so we never write a ref mid-render. The controller's
  // methods only run from effects/handlers/timeouts, which fire after this effect commits.
  const cfg = useRef({
    lineCount,
    visRows,
    reducedMotion,
    onRevealedChange,
    onBusyChange,
    refs,
    isActive,
  });
  useEffect(() => {
    cfg.current = {
      lineCount,
      visRows,
      reducedMotion,
      onRevealedChange,
      onBusyChange,
      refs,
      isActive,
    };
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
    // Visible rows are dynamic: PoemReader measures how many units fit between the fixed header
    // and the scrub bar and feeds it in (so tall units with translit+translation scroll sooner).
    const VIS = () => Math.max(1, cfg.current.visRows || 4);
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
    // Busy = a pair/line is currently animating. Surfaced to React so the tap prompt only appears
    // once the current reveal settles (the reader can't run ahead of what's animated).
    const setBusy = (b) => {
      st.current.busy = b;
      cfg.current.onBusyChange?.(b);
    };

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
      setBusy(true);
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
      setBusy(false);
    };

    const advance = async () => {
      const s = st.current;
      if (s.busy || s.revealed >= total()) return;
      setBusy(true);
      // Scroll BEFORE revealing so the newest line of this tap's pair lands on the bottom row.
      const lastLine = Math.min(s.revealed + 1, total() - 1);
      const newTop = computeWindowTop(lastLine, total(), VIS(), s.windowTop);
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
      setBusy(false);
    };

    // Drag-to-seek — MONOTONIC. The reveal never un-animates: lines already revealed stay
    // revealed. Dragging left simply scrolls the window up over already-revealed lines; dragging
    // right scrolls down and only ignites NEW territory (lines past the high-water mark). The
    // high-water mark is `s.revealed`, which this never decreases. `commit=false` while dragging,
    // `true` on release (resumes the reveal from the frontier when it's in new territory).
    const scrubTo = (frac, commit) => {
      const s = st.current;
      const T = total();
      if (!T) return;
      const hw = s.revealed; // high-water mark of revealed lines at the start of this scrub
      const { line, within } = scrubResolve(frac, T);
      const uh = unitH();
      const inNewTerritory = line >= hw; // dragging into not-yet-revealed lines
      // Lines fully revealed after this scrub: never fewer than the high-water mark (monotonic).
      const effectiveFull = Math.max(hw, line);
      const ct = contTop(line, within, T, VIS());
      const track = R().trackRef?.current;
      if (track) gsap.set(track, { y: -ct * uh });
      s.windowTop = commitTop(line, T, VIS());
      for (let idx = 0; idx < T; idx++) {
        const e = els(idx);
        if (!e?.ar) continue;
        gsap.killTweensOf([e.ar].filter(Boolean));
        // Revealed lines stay at clip 0 (never reverted). Only the frontier line in new territory
        // shows a partial clip; everything past it stays hidden.
        let clip;
        if (idx < effectiveFull) clip = 0;
        else if (idx === line && inNewTerritory) clip = (1 - within) * 100;
        else clip = 100;
        paintLine(idx, clip, { lit: idx < effectiveFull });
      }
      // Head only rides the frontier when revealing new territory; in the revealed zone we just scroll.
      const head = R().headRef?.current;
      if (inNewTerritory) {
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
        if (head) head.style.opacity = '1';
        s.head.alive = !commit; // sparkle while dragging new lines; resume re-lights on commit
      } else {
        if (head) head.style.opacity = '0';
        s.head.alive = false;
      }
      s.revealed = effectiveFull; // monotonic — only ever grows
      s.revealing = -1;
      // Sync React's revealedCount so English + transliteration fade in for lines the scrub just
      // revealed (their opacity is React-driven by revealedCount). setState bails out when the
      // count is unchanged, so per-move calls are cheap.
      emitRevealed();
      writeProgress(frac);
      if (commit) {
        if (track) gsap.to(track, { y: -s.windowTop * uh, duration: 0.28, ease: 'power2.out' });
        // Only finish/resume the reveal when the frontier is in new territory; in the revealed
        // zone a release is a pure seek (no re-ignite).
        if (inNewTerritory) resumeScrub(line, within);
      }
    };

    const resumeScrub = async (line, within) => {
      const s = st.current;
      setBusy(true);
      await ignite(line, 1 - within);
      s.revealed = line + 1;
      s.revealing = -1;
      setBusy(false);
      emitRevealed();
    };

    // TTS follow-along. Called as the spoken line (`spokenLine` = currentVerseIndex) advances.
    //  • Window scrolls one line at a time, keeping the spoken line one row down from the top so a
    //    line of context shows above and the next line(s) have room below. Playback starting at
    //    line 0 scrolls the window back to the top (not clamped to a previous top).
    //  • If the spoken line catches the reveal frontier (partial-reveal case), sparkle-reveal ahead
    //    so the spoken line plus a one-line buffer are always lit. When the poem is already fully
    //    revealed (listen-after-full case) there's nothing to ignite — it only scrolls.
    const ttsFollow = async (spokenLine) => {
      const s = st.current;
      const T = total();
      if (T === 0 || spokenLine < 0) return;
      const line = Math.min(spokenLine, T - 1);
      const newTop = ttsWindowTop(line, T, VIS());
      if (newTop !== s.windowTop) {
        s.windowTop = newTop;
        const track = R().trackRef?.current;
        if (track) gsap.to(track, { y: -newTop * unitH(), duration: 0.5, ease: 'power2.inOut' });
      }
      writeProgress((line + 1) / T);
      // Sparkle-reveal ahead so the spoken line + one buffer line are revealed before they're read.
      if (!s.busy && s.revealed < T && s.revealed <= line + 1) {
        setBusy(true);
        while (s.revealed < T && s.revealed <= line + 1) {
          await ignite(s.revealed);
          s.revealed++;
          emitRevealed();
        }
        setBusy(false);
      }
    };

    // Reveal the whole poem at once (used when the reader starts listening — the full text loads
    // and the right action becomes "Poem Insights" since bayt-by-bayt advance is moot).
    const revealAll = () => {
      const s = st.current;
      const T = total();
      if (!T) return;
      if (s.activeTween) s.activeTween.kill();
      const head = R().headRef?.current;
      if (head) {
        gsap.killTweensOf(head);
        head.style.opacity = '0';
      }
      s.head.alive = false;
      for (let i = 0; i < T; i++) {
        const e = els(i);
        if (!e?.ar) continue;
        gsap.killTweensOf(e.ar);
        paintLine(i, 0, { lit: true });
      }
      s.revealed = T;
      s.windowTop = computeWindowTop(T - 1, T, VIS(), s.windowTop);
      const track = R().trackRef?.current;
      if (track) gsap.to(track, { y: -s.windowTop * unitH(), duration: 0.4, ease: 'power2.out' });
      writeProgress(1);
      emitRevealed();
    };

    const reset = () => {
      const s = st.current;
      if (s.activeTween) s.activeTween.kill();
      s.activeTween = null;
      // Clear sparks + canvas but DON'T cancel the rAF loop — its lifecycle belongs to the
      // isActive effect. (reset runs on every poem change, including mount right after the loop
      // starts; calling stopLoop here would kill the loop before its first frame, so the orb would
      // show but no sparks ever draw.)
      s.particles = [];
      s.head.alive = false;
      {
        const canvas = R().canvasRef?.current;
        const ctx = canvas?.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      s.revealed = 0;
      s.windowTop = 0;
      setBusy(false);
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
      ttsFollow,
      revealAll,
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
