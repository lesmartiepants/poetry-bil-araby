import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const GOLD = '#c5a059';
const LAPIS = '#1E3A5F';

const EraPicker = ({ onNext, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const canvasRef = useRef(null);

  // Resize canvas
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

  // Ambient gradient based on selections
  const paintAmbient = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const hasClassical = selected.includes('classical');
    const hasModern = selected.includes('modern');

    if (hasClassical) {
      const g = ctx.createRadialGradient(w * 0.3, h * 0.5, 0, w * 0.3, h * 0.5, w * 0.5);
      g.addColorStop(0, 'rgba(139, 115, 85, 0.15)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (hasModern) {
      const g = ctx.createRadialGradient(w * 0.7, h * 0.5, 0, w * 0.7, h * 0.5, w * 0.5);
      g.addColorStop(0, 'rgba(30, 58, 95, 0.2)');
      g.addColorStop(1, 'transparent');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
  }, [selected]);

  useEffect(() => {
    paintAmbient();
  }, [paintAmbient]);

  const togglePortal = (portal) => {
    setSelected((prev) =>
      prev.includes(portal) ? prev.filter((s) => s !== portal) : [...prev, portal]
    );
  };

  const handleNext = () => {
    onNext(selected);
  };

  const portalStyle = (isSelected, borderColor, bgColor) => ({
    width: '100%',
    minWidth: '180px',
    maxWidth: '220px',
    padding: '2rem 1.5rem',
    borderRadius: '16px',
    background: bgColor,
    border: `2px solid ${isSelected ? borderColor : `${borderColor}44`}`,
    boxShadow: isSelected ? `0 0 24px ${borderColor}33` : 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
  });

  return (
    <motion.div
      data-testid="era-picker"
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
        overflow: 'auto',
      }}
    >
      {/* Ambient canvas */}
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

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', width: '100%', maxWidth: '500px', padding: '2rem' }}>
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
          {'\u0623\u064a \u0639\u0635\u0631 \u064a\u0633\u062a\u0647\u0648\u064a\u0643\u061f'}
        </h2>
        <p
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.875rem',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '2rem',
          }}
        >
          Classical or Modern?
        </p>

        {/* Portals */}
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Classical Portal */}
          <button
            data-testid="era-portal"
            onClick={() => togglePortal('classical')}
            style={portalStyle(selected.includes('classical'), GOLD, 'rgba(40, 28, 10, 0.85)')}
            aria-pressed={selected.includes('classical')}
            aria-label="Classical eras portal"
          >
            <span
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontSize: '1.75rem',
                color: GOLD,
                fontWeight: 700,
              }}
              lang="ar"
            >
              {'\u0627\u0644\u062a\u0631\u0627\u062b'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
              Classical
            </span>
          </button>

          {/* Modern Portal */}
          <button
            data-testid="era-portal"
            onClick={() => togglePortal('modern')}
            style={portalStyle(selected.includes('modern'), LAPIS, 'rgba(10, 20, 45, 0.85)')}
            aria-pressed={selected.includes('modern')}
            aria-label="Modern eras portal"
          >
            <span
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontSize: '1.75rem',
                color: '#7EB3E0',
                fontWeight: 700,
              }}
              lang="ar"
            >
              {'\u0627\u0644\u062d\u062f\u064a\u062b'}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
              Modern
            </span>
          </button>
        </div>

        {/* CTA */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            data-testid="era-continue"
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
              transition: 'background 0.3s ease, opacity 0.2s ease',
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

export default EraPicker;
