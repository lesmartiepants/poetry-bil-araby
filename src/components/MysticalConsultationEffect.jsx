import { useRef, useEffect, memo } from 'react';

const GOLD_COLORS = ['#c5a059', '#D4B463', '#E2C67A', '#B8922E', '#c5a059'];

// Ambient mode: fewer particles, gentler opacity cap
const AMBIENT_COUNT = 35;
const ACTIVE_COUNT = 60;
const REDUCED_MOTION_OPACITY = 0.08;

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function makeParticle(width, height) {
  return {
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.5 + 0.5,
    speedY: -(Math.random() * 0.35 + 0.08),
    speedX: (Math.random() - 0.5) * 0.25,
    opacity: Math.random() * 0.55 + 0.2,
    color: GOLD_COLORS[Math.floor(Math.random() * GOLD_COLORS.length)],
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

const MysticalConsultationEffect = memo(function MysticalConsultationEffect({
  active,
  // Sparkle controls (from uiStore)
  sparkleEnabled = true,
  sparkleGlow = false,
  sparkleBrightness = 1.0,
  sparkleSpeed = 1.0,
  sparkleAmount = AMBIENT_COUNT,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  // Track latest values inside the rAF loop without restarting the loop
  const activeRef = useRef(active);
  const ctrlRef = useRef({
    sparkleEnabled,
    sparkleGlow,
    sparkleBrightness,
    sparkleSpeed,
    sparkleAmount,
  });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    ctrlRef.current = {
      sparkleEnabled,
      sparkleGlow,
      sparkleBrightness,
      sparkleSpeed,
      sparkleAmount,
    };
  }, [sparkleEnabled, sparkleGlow, sparkleBrightness, sparkleSpeed, sparkleAmount]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Guard for test environments where matchMedia is unavailable
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    const particles = Array.from({ length: ACTIVE_COUNT }, () =>
      makeParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      const isActive = activeRef.current;
      const ctrl = ctrlRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Central radial glow — during insight mode OR when sparkleGlow toggle is on
      if (isActive || ctrl.sparkleGlow) {
        const glowOpacity = isActive ? 0.09 : 0.06;
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.35);
        glow.addColorStop(0, `rgba(197,160,89,${glowOpacity})`);
        glow.addColorStop(0.5, `rgba(197,160,89,${glowOpacity * 0.44})`);
        glow.addColorStop(1, 'rgba(197,160,89,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      if (ctrl.sparkleEnabled) {
        const visibleCount = isActive ? ACTIVE_COUNT : Math.min(ACTIVE_COUNT, ctrl.sparkleAmount);
        const maxOpacity = Math.min(1, (isActive ? 0.9 : 0.5) * ctrl.sparkleBrightness);
        const speedMul = ctrl.sparkleSpeed;

        for (let i = 0; i < visibleCount; i++) {
          const p = particles[i];
          p.x += p.speedX * speedMul;
          p.y += p.speedY * speedMul;

          // Wrap at edges
          if (p.y < -5) {
            p.y = canvas.height + 5;
            p.x = Math.random() * canvas.width;
          }
          if (p.x < -5) p.x = canvas.width + 5;
          if (p.x > canvas.width + 5) p.x = -5;

          const alpha = Math.min(p.opacity, maxOpacity);
          const drawSize = p.size;
          const rgb = hexToRgb(p.color);

          // Outer glow halo
          if (drawSize > 1.2) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, drawSize * 3.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${rgb},${alpha * 0.12})`;
            ctx.fill();
          }

          // Core particle
          ctx.beginPath();
          ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${alpha})`;
          ctx.fill();
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

  // Canvas is fixed — does not move with scroll (no parallax on sparkles)
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

export default MysticalConsultationEffect;
