import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const GOLD = '#c5a059';
const LAPIS = '#1E3A5F';

const CLASSICAL_ERAS = [
  {
    slug: 'pre-islamic',
    name_ar: '\u0645\u0627 \u0642\u0628\u0644 \u0627\u0644\u0625\u0633\u0644\u0627\u0645',
    name_en: 'Pre-Islamic',
  },
  {
    slug: 'early-islamic',
    name_ar: '\u0635\u062f\u0631 \u0627\u0644\u0625\u0633\u0644\u0627\u0645',
    name_en: 'Early Islamic',
  },
  { slug: 'umayyad', name_ar: '\u0623\u0645\u0648\u064a', name_en: 'Umayyad' },
  { slug: 'abbasid', name_ar: '\u0639\u0628\u0627\u0633\u064a', name_en: 'Abbasid' },
  { slug: 'andalusian', name_ar: '\u0623\u0646\u062f\u0644\u0633\u064a', name_en: 'Andalusian' },
  { slug: 'ottoman', name_ar: '\u0639\u062b\u0645\u0627\u0646\u064a', name_en: 'Ottoman' },
];

const MODERN_ERAS = [
  { slug: 'modern', name_ar: '\u062d\u062f\u064a\u062b', name_en: 'Modern (1900\u20131970)' },
  { slug: 'contemporary', name_ar: '\u0645\u0639\u0627\u0635\u0631', name_en: 'Contemporary' },
];

const EraPicker = ({ onNext, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const [classicalOpen, setClassicalOpen] = useState(false);
  const [modernOpen, setModernOpen] = useState(false);
  const canvasRef = useRef(null);
  const classicalChipsRef = useRef(null);
  const modernChipsRef = useRef(null);

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

    const hasClassical = selected.some((s) => CLASSICAL_ERAS.find((e) => e.slug === s));
    const hasModern = selected.some((s) => MODERN_ERAS.find((e) => e.slug === s));

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

  // Stagger chips on portal open
  useEffect(() => {
    if (classicalOpen && classicalChipsRef.current) {
      const chips = classicalChipsRef.current.querySelectorAll('[data-era-chip]');
      gsap.fromTo(
        chips,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.6)' }
      );
    }
  }, [classicalOpen]);

  useEffect(() => {
    if (modernOpen && modernChipsRef.current) {
      const chips = modernChipsRef.current.querySelectorAll('[data-era-chip]');
      gsap.fromTo(
        chips,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration: 0.4, stagger: 0.06, ease: 'back.out(1.6)' }
      );
    }
  }, [modernOpen]);

  const toggleEra = (slug) => {
    setSelected((prev) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]));
  };

  const handleNext = () => {
    onNext(selected);
  };

  const chipStyle = (isSelected, isClassical) => ({
    padding: '8px 18px',
    borderRadius: '999px',
    border: `1px solid ${isSelected ? (isClassical ? GOLD : LAPIS) : 'rgba(255,255,255,0.15)'}`,
    background: isSelected ? (isClassical ? `${GOLD}22` : `${LAPIS}33`) : 'rgba(255,255,255,0.04)',
    color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.6)',
    fontFamily: "'Tajawal', sans-serif",
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    direction: 'rtl',
  });

  const portalStyle = (isOpen, borderColor, bgColor) => ({
    width: '100%',
    maxWidth: '200px',
    padding: '1.25rem',
    borderRadius: '16px',
    background: bgColor,
    border: `1px solid ${borderColor}44`,
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

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          width: '100%',
          maxWidth: '500px',
          padding: '2rem',
        }}
      >
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
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Classical Portal */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <button
              data-testid="era-portal"
              onClick={() => setClassicalOpen((p) => !p)}
              style={portalStyle(classicalOpen, GOLD, 'rgba(40, 28, 10, 0.85)')}
              aria-expanded={classicalOpen}
              aria-label="Classical eras portal"
            >
              <span
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: '1.5rem',
                  color: GOLD,
                  fontWeight: 700,
                }}
                lang="ar"
              >
                {'\u0627\u0644\u062a\u0631\u0627\u062b'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.1em',
                }}
              >
                Classical
              </span>
            </button>

            {classicalOpen && (
              <div
                ref={classicalChipsRef}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  maxWidth: '220px',
                }}
              >
                {CLASSICAL_ERAS.map((era) => (
                  <button
                    key={era.slug}
                    data-era-chip
                    onClick={() => toggleEra(era.slug)}
                    style={chipStyle(selected.includes(era.slug), true)}
                    lang="ar"
                    aria-pressed={selected.includes(era.slug)}
                  >
                    {era.name_ar}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modern Portal */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.75rem',
            }}
          >
            <button
              data-testid="era-portal"
              onClick={() => setModernOpen((p) => !p)}
              style={portalStyle(modernOpen, LAPIS, 'rgba(10, 20, 45, 0.85)')}
              aria-expanded={modernOpen}
              aria-label="Modern eras portal"
            >
              <span
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontSize: '1.5rem',
                  color: '#7EB3E0',
                  fontWeight: 700,
                }}
                lang="ar"
              >
                {'\u0627\u0644\u062d\u062f\u064a\u062b'}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.5)',
                  letterSpacing: '0.1em',
                }}
              >
                Modern
              </span>
            </button>

            {modernOpen && (
              <div
                ref={modernChipsRef}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                  justifyContent: 'center',
                  maxWidth: '220px',
                }}
              >
                {MODERN_ERAS.map((era) => (
                  <button
                    key={era.slug}
                    data-era-chip
                    onClick={() => toggleEra(era.slug)}
                    style={chipStyle(selected.includes(era.slug), false)}
                    lang="ar"
                    aria-pressed={selected.includes(era.slug)}
                  >
                    {era.name_ar}
                  </button>
                ))}
              </div>
            )}
          </div>
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
            aria-label={
              selected.length >= 1
                ? '\u0627\u0644\u062a\u0627\u0644\u064a'
                : '\u062a\u062e\u0637\u0649'
            }
          >
            <span>
              {selected.length >= 1
                ? '\u0627\u0644\u062a\u0627\u0644\u064a'
                : '\u062a\u062e\u0637\u0649'}
            </span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default EraPicker;
