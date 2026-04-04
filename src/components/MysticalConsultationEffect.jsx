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

const MysticalConsultationEffect = memo(function MysticalConsultationEffect({
  active,
  scrollY = 0,
  parallaxFactor = 0.05,
}) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  // Track latest active value inside the rAF loop without restarting the loop
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent ? parent.offsetWidth : window.innerWidth;
      canvas.height = parent ? parent.offsetHeight : window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    if (prefersReduced) {
      // Static subtle glow for reduced-motion users
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.4);
      grad.addColorStop(0, `rgba(197,160,89,${REDUCED_MOTION_OPACITY})`);
      grad.addColorStop(1, 'rgba(197,160,89,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener('resize', resize);
    }

    // Pre-allocate the full particle pool; ambient mode just renders a subset
    const particles = Array.from({ length: ACTIVE_COUNT }, () =>
      makeParticle(canvas.width, canvas.height)
    );

    const animate = () => {
      const isActive = activeRef.current;
      const visibleCount = isActive ? ACTIVE_COUNT : AMBIENT_COUNT;
      const maxOpacity = isActive ? 0.9 : 0.5;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Central radial glow — only during insight mode
      if (isActive) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.35);
        glow.addColorStop(0, 'rgba(197,160,89,0.09)');
        glow.addColorStop(0.5, 'rgba(197,160,89,0.04)');
        glow.addColorStop(1, 'rgba(197,160,89,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      for (let i = 0; i < visibleCount; i++) {
        const p = particles[i];
        p.x += p.speedX;
        p.y += p.speedY;

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

      animRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []); // Single animation loop — active changes tracked via activeRef

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{
        mixBlendMode: 'screen',
        transform: `translateY(${-(scrollY * parallaxFactor).toFixed(1)}px)`,
        willChange: 'transform',
      }}
    />
  );
});

// Only re-render when active changes — not on parent streaming state
export default MysticalConsultationEffect;
