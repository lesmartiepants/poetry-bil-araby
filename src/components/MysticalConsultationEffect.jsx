import { useRef, useEffect, memo } from 'react';

const DEFAULT_SPARKLE_COLOR = '#c5a059';

// Generates a small palette of shades around the given base hex colour
function buildColorPalette(hex) {
  // Fallback to default gold if hex is not a valid 6-digit hex string
  const isValid = /^#[0-9A-Fa-f]{6}$/.test(hex);
  const safeHex = isValid ? hex : DEFAULT_SPARKLE_COLOR;
  // Clamp helper
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const r = parseInt(safeHex.slice(1, 3), 16);
  const g = parseInt(safeHex.slice(3, 5), 16);
  const b = parseInt(safeHex.slice(5, 7), 16);
  const toHex = (rv, gv, bv) =>
    `#${clamp(rv).toString(16).padStart(2, '0')}${clamp(gv).toString(16).padStart(2, '0')}${clamp(bv).toString(16).padStart(2, '0')}`;
  return [
    toHex(r, g, b),
    toHex(r + 15, g + 14, b + 10),
    toHex(r + 28, g + 26, b + 18),
    toHex(r - 11, g - 12, b - 8),
    toHex(r, g, b),
  ];
}

// Ambient mode: fewer particles, gentler opacity cap
const AMBIENT_COUNT = 35;
const ACTIVE_COUNT = 60;
const REDUCED_MOTION_OPACITY = 0.08;

// L&S ray-tracing mode: original maxSparkles from design-review/e2e/gen-3/ls2-ray-tracing.html
const LS_MAX_SPARKLES = 120;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function makeParticle(width, height, colors) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5 + 0.5,
    speedY: -(Math.random() * 0.35 + 0.08),
    speedX: (Math.random() - 0.5) * 0.25,
    opacity: Math.random() * 0.55 + 0.2,
    color: colors[Math.floor(Math.random() * colors.length)],
  };
}

// L&S sparkle particle factory — exact algorithm from ls2-ray-tracing.html
function makeLsSparkle(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.35,
    vy: -0.1 - Math.random() * 0.3,
    size: 0.4 + Math.random() * 1.6,
    life: 0.7 + Math.random() * 0.3,
    decay: 0.001 + Math.random() * 0.004,
    flickerPhase: Math.random() * Math.PI * 2,
    flickerSpeed: 1.5 + Math.random() * 3,
    warmth: Math.random(),
  };
}

// Re-draws the static radial glow used for prefers-reduced-motion and as ambient glow
function drawStaticGlow(ctx, canvas, opacity) {
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.4);
  grad.addColorStop(0, `rgba(197,160,89,${opacity})`);
  grad.addColorStop(1, 'rgba(197,160,89,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// Sparkles float in the "air" — halfway between background and text in depth.
// Half of default bgParallax (0.08) to position sparkles between background and foreground.
const SPARKLE_PARALLAX_FACTOR = 0.04;

const MysticalConsultationEffect = memo(function MysticalConsultationEffect({
  active,
  scrollY = 0,
  // Sparkle controls (from uiStore)
  sparkleEnabled = true,
  sparkleMode = 'particles', // 'particles' | 'ray-tracing'
  sparkleGlow = false,
  sparkleBrightness = 1.0,
  sparkleSpeed = 1.0,
  sparkleAmount = AMBIENT_COUNT,
  sparkleColor = DEFAULT_SPARKLE_COLOR,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  // Track latest values inside the rAF loop without restarting the loop
  const activeRef = useRef(active);
  const ctrlRef = useRef({
    sparkleEnabled,
    sparkleMode,
    sparkleGlow,
    sparkleBrightness,
    sparkleSpeed,
    sparkleAmount,
    sparkleColor,
  });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    ctrlRef.current = {
      sparkleEnabled,
      sparkleMode,
      sparkleGlow,
      sparkleBrightness,
      sparkleSpeed,
      sparkleAmount,
      sparkleColor,
    };
  }, [
    sparkleEnabled,
    sparkleMode,
    sparkleGlow,
    sparkleBrightness,
    sparkleSpeed,
    sparkleAmount,
    sparkleColor,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Guard for test environments where matchMedia is unavailable
    const prefersReduced =
      window?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent ? parent.offsetWidth : window.innerWidth;
      canvas.height = parent ? parent.offsetHeight : window.innerHeight;
      if (prefersReduced) {
        // Re-draw static glow after resize (changing dimensions clears the canvas)
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawStaticGlow(ctx, canvas, REDUCED_MOTION_OPACITY);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    if (prefersReduced) {
      return () => window.removeEventListener('resize', resize);
    }

    // Pre-allocate the full particle pool; ambient mode just renders a subset
    const currentColors = buildColorPalette(ctrlRef.current.sparkleColor || DEFAULT_SPARKLE_COLOR);
    const particles = Array.from({ length: ACTIVE_COUNT }, () =>
      makeParticle(canvas.width, canvas.height, currentColors)
    );

    // Spawn-and-die pool for L&S ray-tracing mode
    const lsSparkles = [];

    const animate = () => {
      const isActive = activeRef.current;
      const ctrl = ctrlRef.current;
      const w = canvas.width;
      const h = canvas.height;

      ctx.clearRect(0, 0, w, h);

      // Central radial glow — during insight mode OR when sparkleGlow toggle is on
      if (isActive || ctrl.sparkleGlow) {
        const glowOpacity = isActive ? 0.09 : 0.06;
        const cx = w / 2;
        const cy = h / 2;
        const glowRgb = hexToRgb(ctrl.sparkleColor || DEFAULT_SPARKLE_COLOR);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, w * 0.35);
        glow.addColorStop(0, `rgba(${glowRgb},${glowOpacity})`);
        glow.addColorStop(0.5, `rgba(${glowRgb},${glowOpacity * 0.44})`);
        glow.addColorStop(1, `rgba(${glowRgb},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, w, h);
      }

      if (ctrl.sparkleEnabled) {
        if (ctrl.sparkleMode === 'ray-tracing') {
          // L&S ray-tracing algorithm — exact port from ls2-ray-tracing.html
          const now = Date.now() * 0.001;
          const cx = w * 0.5;
          const cy = h * 0.5;
          const centerR = Math.min(w, h) * 0.25;

          const speedMul = ctrl.sparkleSpeed;

          if (lsSparkles.length < LS_MAX_SPARKLES && Math.random() < 0.3) {
            lsSparkles.push(makeLsSparkle(w, h));
          }

          for (let i = lsSparkles.length - 1; i >= 0; i--) {
            const s = lsSparkles[i];
            s.x += s.vx * speedMul;
            s.y += s.vy * speedMul;
            s.life -= s.decay;

            if (s.x < -10) s.x = w + 10;
            if (s.x > w + 10) s.x = -10;
            if (s.life <= 0 || s.y < -20 || s.y > h + 20) {
              lsSparkles.splice(i, 1);
              continue;
            }

            const flicker = 0.4 + 0.6 * Math.sin(now * s.flickerSpeed + s.flickerPhase);
            const alpha = s.life * (0.25 + flicker * 0.75) * ctrl.sparkleBrightness;

            const dx = s.x - cx;
            const dy = s.y - cy;
            const distFromCenter = Math.sqrt(dx * dx + dy * dy);
            let dimFactor;
            if (distFromCenter < centerR) {
              dimFactor = 0.08 + (distFromCenter / centerR) * 0.27;
            } else {
              const edgeDist = Math.min(w, h) * 0.5;
              dimFactor = 0.35 + Math.min((distFromCenter - centerR) / edgeDist, 1.0) * 0.65;
            }

            const r = 255;
            const g = Math.round(245 - s.warmth * 40);
            const b = Math.round(220 - s.warmth * 100);

            ctx.save();
            ctx.globalAlpha = alpha * dimFactor;
            ctx.shadowColor = `rgba(${r},${g},${b},0.5)`;
            ctx.shadowBlur = 4 + flicker * 8;
            ctx.fillStyle = `rgba(${r},${g},${b},1)`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.size * (0.5 + s.life * 0.5), 0, Math.PI * 2);
            ctx.fill();

            if (flicker > 0.75) {
              ctx.globalAlpha = alpha * dimFactor * 0.5 * ((flicker - 0.75) / 0.25);
              ctx.shadowBlur = 12 + flicker * 6;
              ctx.beginPath();
              ctx.arc(s.x, s.y, s.size * 0.25, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.restore();
          }
        } else {
          // Particles mode (gold ambient/insight)
          const visibleCount = isActive ? ACTIVE_COUNT : Math.min(ACTIVE_COUNT, ctrl.sparkleAmount);
          const maxOpacity = Math.min(1, (isActive ? 0.9 : 0.5) * ctrl.sparkleBrightness);
          const speedMul = ctrl.sparkleSpeed;

          for (let i = 0; i < visibleCount; i++) {
            const p = particles[i];
            p.x += p.speedX * speedMul;
            p.y += p.speedY * speedMul;

            if (p.y < -5) {
              p.y = h + 5;
              p.x = Math.random() * w;
              // Re-colour respawned particle with current colour setting
              const palette = buildColorPalette(ctrl.sparkleColor || DEFAULT_SPARKLE_COLOR);
              p.color = palette[Math.floor(Math.random() * palette.length)];
            }
            if (p.x < -5) p.x = w + 5;
            if (p.x > w + 5) p.x = -5;

            const alpha = Math.min(p.opacity, maxOpacity);
            const drawSize = p.size;
            const rgb = hexToRgb(p.color);

            if (drawSize > 1.2) {
              ctx.beginPath();
              ctx.arc(p.x, p.y, drawSize * 3.5, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(${rgb},${alpha * 0.12})`;
              ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb},${alpha})`;
            ctx.fill();
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []); // Single animation loop — live values tracked via refs

  // Sparkles drift at SPARKLE_PARALLAX_FACTOR × scroll speed — floats between
  // the SVG background (slowest) and the text (fastest), creating mid-air depth.
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        mixBlendMode: 'screen',
        transform: `translateY(${-scrollY * SPARKLE_PARALLAX_FACTOR}px)`,
        willChange: 'transform',
      }}
    />
  );
});

export default MysticalConsultationEffect;
