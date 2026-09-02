/**
 * sparkler — a reusable canvas spark emitter.
 *
 * Recovered from the SparklerStage reader (#580), which #737 replaced with the flow column. The
 * teleprompter, its scrub rail and the reveal-window maths went with it and are not missed; the
 * spark emitter was the good part and was deleted along with them. It now lives here as a plain
 * controller with no React and no knowledge of what it is decorating, so any surface can drive it:
 * the splash note's word reveal today, a verse reveal or a celebration burst tomorrow.
 *
 * The caller owns the geometry. Each frame it tells the sparkler where the burn point is
 * (`setHead`) and whether it is currently burning (`setEmitting`); the sparkler owns the particle
 * lifecycle, the draw and the rAF loop.
 *
 *   const s = createSparkler(canvasEl, { direction: 1 });
 *   s.resize();
 *   s.start();
 *   s.setHead(x, y);          // CSS px, relative to the canvas box
 *   s.setEmitting(true);      // spray while the reveal moves
 *   s.stop();                 // cancels the loop and clears the canvas
 *
 * Particles are drawn as a cross plus a core dot under `globalCompositeOperation = 'lighter'`,
 * which is what makes them read as sparks rather than as dots: overlapping ones bloom white.
 */

/** Shiny gold → white-hot spark palette (no amber/ember/multicolour). */
export const SPARK_COLORS = ['#ffffff', '#fff6da', '#ffe6a3', '#ffd277', '#e9c069'];

const DEFAULTS = {
  /** Sparks born per frame while emitting. The single biggest cost knob. */
  emitPerFrame: 8,
  /** Hard ceiling, so a long reveal on a slow device cannot accumulate unbounded particles. */
  maxParticles: 360,
  /** +1 when the burn point travels right (LTR text), -1 when it travels left (RTL). */
  direction: 1,
  /** Cap on devicePixelRatio; a 3x phone gains nothing visible here and pays 2.25x the fill. */
  maxDpr: 2,
  /** Gravity per ms. */
  gravity: 0.013,
  colors: SPARK_COLORS,
};

/**
 * @param {HTMLCanvasElement} canvas - sized by CSS; `resize()` maps the backing store to it.
 * @param {object} [options] - see DEFAULTS.
 * @returns {{start:Function,stop:Function,resize:Function,setHead:Function,setEmitting:Function,isRunning:Function}}
 */
export function createSparkler(canvas, options = {}) {
  const cfg = { ...DEFAULTS, ...options };
  // Defensive: jsdom and other non-painting environments either return null here or throw. A
  // reusable decoration must never be the reason a component fails to mount, so a missing context
  // degrades to a controller whose methods are all no-ops.
  let ctx = null;
  try {
    ctx = canvas?.getContext?.('2d') ?? null;
  } catch {
    ctx = null;
  }

  let particles = [];
  let head = { x: 0, y: 0 };
  let emitting = false;
  let rafId = null;
  let last = 0;

  const resize = () => {
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.maxDpr);
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const spawn = () => {
    // A forward semicircle spray, biased along the direction of travel and slightly upward, so the
    // sparks look thrown off a moving point rather than puffed out of a static one.
    const ang = Math.PI * 0.5 + Math.random() * Math.PI;
    const sp = 1.6 + Math.random() * 4.8;
    return {
      x: head.x + (Math.random() - 0.5) * 4,
      y: head.y + (Math.random() - 0.5) * 4,
      vx: Math.cos(ang) * sp + 1.1 * cfg.direction,
      vy: Math.sin(ang) * sp - 1.0,
      life: 1,
      decay: 0.008 + Math.random() * 0.013,
      size: 1.0 + Math.random() * 2.2,
      tw: Math.random() * 6.28,
      color: cfg.colors[(Math.random() * cfg.colors.length) | 0],
    };
  };

  const frame = (now) => {
    if (!ctx) return;
    const dt = Math.min(40, now - last);
    last = now;

    const w = canvas.width;
    const h = canvas.height;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.restore();

    if (emitting && particles.length < cfg.maxParticles) {
      for (let k = 0; k < cfg.emitPerFrame; k++) particles.push(spawn());
    }

    ctx.globalCompositeOperation = 'lighter';
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= p.decay * dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.vy += cfg.gravity * dt;
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

    // Keep running while anything is still alive, so the last sparks finish their arc instead of
    // being cut off the moment the reveal ends.
    if (emitting || particles.length) {
      rafId = requestAnimationFrame(frame);
    } else {
      rafId = null;
    }
  };

  return {
    resize,
    setHead: (x, y) => {
      head.x = x;
      head.y = y;
    },
    setEmitting: (on) => {
      emitting = !!on;
      if (emitting && rafId == null && ctx) {
        last = performance.now();
        rafId = requestAnimationFrame(frame);
      }
    },
    start: () => {
      if (rafId != null || !ctx) return;
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    },
    stop: () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      emitting = false;
      particles = [];
      if (ctx) {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
      }
    },
    isRunning: () => rafId != null,
  };
}
