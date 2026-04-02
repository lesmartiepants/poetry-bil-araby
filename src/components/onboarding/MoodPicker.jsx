import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const GOLD = '#c5a059';

const MOODS = [
  { slug: 'joy',        name_ar: '\u0641\u0631\u062d',   name_en: 'Joy',        color: '#c5a059' },
  { slug: 'melancholy', name_ar: '\u0643\u0622\u0628\u0629',  name_en: 'Melancholy', color: '#1E3A6E' },
  { slug: 'anger',      name_ar: '\u063a\u0636\u0628',   name_en: 'Anger',      color: '#8B2500' },
  { slug: 'hope',       name_ar: '\u0623\u0645\u0644',   name_en: 'Hope',       color: '#4A7C59' },
  { slug: 'despair',    name_ar: '\u064a\u0623\u0633',   name_en: 'Despair',    color: '#4A4A4A' },
  { slug: 'wonder',     name_ar: '\u062f\u0647\u0634\u0629',  name_en: 'Wonder',     color: '#6A4C93' },
  { slug: 'pride',      name_ar: '\u0641\u062e\u0631',   name_en: 'Pride',      color: '#B8860B' },
  { slug: 'loneliness', name_ar: '\u0648\u062d\u062f\u0629',  name_en: 'Loneliness', color: '#2E3A5F' },
  { slug: 'nostalgia',  name_ar: '\u062d\u0646\u064a\u0646',  name_en: 'Nostalgia',  color: '#8B7355' },
];

// Staggered grid: rows of [0,1,2], [3,4,5], [6,7,8]
// Odd rows shift right, even rows shift left
const ROWS = [
  { indices: [0, 1, 2], shiftLeft: true },
  { indices: [3, 4, 5], shiftLeft: false },
  { indices: [6, 7, 8], shiftLeft: true },
];

const MoodPicker = ({ onNext, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const canvasRef = useRef(null);

  const spawnInkBlot = useCallback((x, y, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Core circle flash
    const core = { x, y, r: 0, opacity: 0 };
    const coreRadius = 30 + Math.random() * 30;
    gsap.to(core, {
      r: coreRadius,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        ctx.beginPath();
        const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, core.r);
        grad.addColorStop(0, color + 'cc');
        grad.addColorStop(0.6, color + '44');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.arc(core.x, core.y, core.r, 0, Math.PI * 2);
        ctx.fill();
      },
    });
    gsap.to(core, {
      opacity: 0,
      duration: 0.3,
      delay: 0.3,
    });

    // 8 sub-blobs
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const dist = 40 + Math.random() * 50;
      const blob = { x, y, r: 4 + Math.random() * 8, opacity: 0.7 };
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist;

      gsap.to(blob, {
        x: targetX,
        y: targetY,
        r: 2,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.03,
        ease: 'power2.out',
        onUpdate: () => {
          ctx.beginPath();
          const g = ctx.createRadialGradient(blob.x, blob.y, 0, blob.x, blob.y, blob.r);
          g.addColorStop(0, color + 'aa');
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }, []);

  // Size canvas on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  const toggleMood = (slug, color, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setSelected((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      spawnInkBlot(cx, cy, color);
      return [...prev, slug];
    });
  };

  const handleNext = () => {
    onNext(selected);
  };

  return (
    <motion.div
      data-testid="mood-picker"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: '#0a0a0f',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Ink blot canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '460px', padding: '2rem' }}>
        {/* Title */}
        <h2
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            color: GOLD,
            marginBottom: '0.25rem',
            direction: 'rtl',
          }}
          lang="ar"
          dir="rtl"
        >
          {'\u0643\u064a\u0641 \u062a\u0634\u0639\u0631 \u0627\u0644\u0622\u0646\u061f'}
        </h2>
        <p
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '2.5rem',
          }}
        >
          How are you feeling?
        </p>

        {/* 3x3 staggered grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
          {ROWS.map((row, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                gap: '0.75rem',
                justifyContent: 'center',
                transform: row.shiftLeft ? 'translateX(-12px)' : 'translateX(12px)',
              }}
            >
              {row.indices.map((idx) => {
                const mood = MOODS[idx];
                const isSelected = selected.includes(mood.slug);
                return (
                  <button
                    key={mood.slug}
                    data-testid="mood-item"
                    onClick={(e) => toggleMood(mood.slug, mood.color, e)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '0.75rem 0.5rem',
                      minWidth: '80px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px',
                      position: 'relative',
                      transition: 'transform 0.2s ease',
                      transform: isSelected ? 'scale(1.1)' : 'scale(1)',
                    }}
                    aria-label={`${mood.name_ar} \u2014 ${mood.name_en}`}
                    aria-pressed={isSelected}
                  >
                    <span
                      style={{
                        fontFamily: "'Tajawal', sans-serif",
                        fontSize: '1.25rem',
                        fontWeight: 600,
                        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)',
                        direction: 'rtl',
                        transition: 'color 0.2s',
                      }}
                      lang="ar"
                    >
                      {mood.name_ar}
                    </span>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.35)',
                        letterSpacing: '0.05em',
                        transition: 'color 0.2s',
                      }}
                    >
                      {mood.name_en}
                    </span>
                    {/* Underline bar */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        left: '50%',
                        transform: `translateX(-50%) scaleX(${isSelected ? 1 : 0})`,
                        width: '60%',
                        height: '2px',
                        background: mood.color,
                        borderRadius: '1px',
                        transition: 'transform 0.25s ease',
                        transformOrigin: 'center',
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            data-testid="mood-continue"
            onClick={handleNext}
            style={{
              opacity: selected.length >= 1 ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 36px',
              border: `1px solid ${GOLD}`,
              borderRadius: '999px',
              background: 'transparent',
              color: GOLD,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.3s ease, border-color 0.3s ease, opacity 0.2s ease',
              minHeight: '48px',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${GOLD}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={selected.length >= 1 ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}
          >
            <span>{selected.length >= 1 ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MoodPicker;
