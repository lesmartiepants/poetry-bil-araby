import { useRef, useEffect, memo } from 'react';

const GOLD_COLORS = ['#c5a059', '#D4B463', '#E2C67A', '#B8922E', '#c5a059'];

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

const MysticalConsultationEffect = memo(function MysticalConsultationEffect({ active }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!active) return;

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
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.4);
      grad.addColorStop(0, 'rgba(197,160,89,0.15)');
      grad.addColorStop(1, 'rgba(197,160,89,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return () => window.removeEventListener('resize', resize);
    }

    const particles = Array.from({ length: 50 }, () => makeParticle(canvas.width, canvas.height));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Central radial glow
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, canvas.width * 0.35);
      glow.addColorStop(0, 'rgba(197,160,89,0.09)');
      glow.addColorStop(0.5, 'rgba(197,160,89,0.04)');
      glow.addColorStop(1, 'rgba(197,160,89,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;

        // Wrap at edges
        if (p.y < -5) {
          p.y = canvas.height + 5;
          p.x = Math.random() * canvas.width;
        }
        if (p.x < -5) p.x = canvas.width + 5;
        if (p.x > canvas.width + 5) p.x = -5;

        const alpha = p.opacity;
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
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
});

// Only re-render when active changes — not on parent streaming state
export default MysticalConsultationEffect;
