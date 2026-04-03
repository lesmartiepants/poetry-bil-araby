import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

/* ============================================
   MOOD_CONFIG — all tunable constants
   ============================================ */
const MOOD_CONFIG = {
  gold: '#c5a059',
  blobCount: 10,
  baseRMultiplier: 0.42,
  flashRadiusScale: 0.25,
  flashAlpha: 0.45,
  flashFadeFactor: 0.3,
  flashInDuration: 0.12,
  flashFadeDuration: 0.6,
  subBlobBaseDuration: 0.5,
  subBlobDurationJitter: 0.4,
  subBlobDelayJitter: 0.2,
  subBlobMinAlpha: 0.18,
  subBlobAlphaJitter: 0.14,
  subBlobRxRange: [0.5, 0.5],   // min + random range
  subBlobRyRange: [0.4, 0.5],
  subBlobDistRange: [0.15, 0.4],
  subBlobAngleJitter: 0.8,
  luminanceThreshold: 0.35,
  luminanceBoostBase: 1.6,
  luminanceBoostScale: 2,
  ctaActiveOpacity: 1,
  ctaInactiveOpacity: 0.5,
};

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

const ROWS = [
  { indices: [0, 1, 2], shiftLeft: true },
  { indices: [3, 4, 5], shiftLeft: false },
  { indices: [6, 7, 8], shiftLeft: true },
];

/* ============================================
   Helpers
   ============================================ */
function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function brightenForInk(hex) {
  let { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance < MOOD_CONFIG.luminanceThreshold) {
    const boost = MOOD_CONFIG.luminanceBoostBase +
      (MOOD_CONFIG.luminanceThreshold - luminance) * MOOD_CONFIG.luminanceBoostScale;
    r = Math.min(255, Math.round(r * boost));
    g = Math.min(255, Math.round(g * boost));
    b = Math.min(255, Math.round(b * boost));
  }
  return { r, g, b };
}

function paintInk(ctx, blobs, w, h) {
  ctx.clearRect(0, 0, w, h);
  for (const blob of blobs) {
    for (const sub of blob.subBlobs) {
      ctx.save();
      ctx.translate(blob.cx + sub.ox, blob.cy + sub.oy);
      ctx.rotate(sub.rot);
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, sub.rx);
      grad.addColorStop(0, `rgba(${blob.color},${sub.alpha})`);
      grad.addColorStop(0.6, `rgba(${blob.color},${sub.alpha * 0.6})`);
      grad.addColorStop(1, `rgba(${blob.color},0)`);
      ctx.scale(1, sub.ry / sub.rx);
      ctx.beginPath();
      ctx.arc(0, 0, sub.rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }
}

/* ============================================
   MoodPicker Component
   ============================================ */
const MoodPicker = ({ onNext, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const canvasRef = useRef(null);
  const inkBlobsRef = useRef([]);
  const inkDirtyRef = useRef(false);
  const rafIdRef = useRef(null);

  // rAF paint loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function loop() {
      if (inkDirtyRef.current) {
        paintInk(ctx, inkBlobsRef.current, canvas.width, canvas.height);
        inkDirtyRef.current = false;
      }
      rafIdRef.current = requestAnimationFrame(loop);
    }
    rafIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  // Size canvas with devicePixelRatio on mount / resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      inkDirtyRef.current = true;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  const addInkBlob = useCallback((cx, cy, color) => {
    const { r, g, b } = brightenForInk(color);
    const subBlobs = [];
    const baseR = Math.min(window.innerWidth, window.innerHeight) * MOOD_CONFIG.baseRMultiplier;
    const COUNT = MOOD_CONFIG.blobCount;

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + Math.random() * MOOD_CONFIG.subBlobAngleJitter;
      const dist = (MOOD_CONFIG.subBlobDistRange[0] + Math.random() * MOOD_CONFIG.subBlobDistRange[1]) * baseR;
      const rx = baseR * (MOOD_CONFIG.subBlobRxRange[0] + Math.random() * MOOD_CONFIG.subBlobRxRange[1]);
      const ry = baseR * (MOOD_CONFIG.subBlobRyRange[0] + Math.random() * MOOD_CONFIG.subBlobRyRange[1]);
      const rot = Math.random() * Math.PI;
      subBlobs.push({
        ox: Math.cos(angle) * dist,
        oy: Math.sin(angle) * dist,
        rx, ry, rot,
        alpha: 0,
        targetAlpha: MOOD_CONFIG.subBlobMinAlpha + Math.random() * MOOD_CONFIG.subBlobAlphaJitter,
      });
    }
    // Center flash blob
    subBlobs.push({
      ox: 0, oy: 0,
      rx: baseR * MOOD_CONFIG.flashRadiusScale,
      ry: baseR * MOOD_CONFIG.flashRadiusScale,
      rot: 0,
      alpha: 0,
      targetAlpha: MOOD_CONFIG.flashAlpha,
      isFlash: true,
    });

    const blob = { cx, cy, color: `${r},${g},${b}`, subBlobs, progress: 0 };
    inkBlobsRef.current.push(blob);

    // Animate sub-blobs in via GSAP
    for (const sub of blob.subBlobs) {
      if (sub.isFlash) {
        gsap.timeline()
          .to(sub, {
            alpha: sub.targetAlpha,
            duration: MOOD_CONFIG.flashInDuration,
            ease: 'power2.out',
            onUpdate: () => { inkDirtyRef.current = true; },
          })
          .to(sub, {
            alpha: sub.targetAlpha * MOOD_CONFIG.flashFadeFactor,
            duration: MOOD_CONFIG.flashFadeDuration,
            ease: 'power2.inOut',
            onUpdate: () => { inkDirtyRef.current = true; },
          });
      } else {
        gsap.to(sub, {
          alpha: sub.targetAlpha,
          duration: MOOD_CONFIG.subBlobBaseDuration + Math.random() * MOOD_CONFIG.subBlobDurationJitter,
          ease: 'power2.out',
          delay: Math.random() * MOOD_CONFIG.subBlobDelayJitter,
          onUpdate: () => { inkDirtyRef.current = true; },
        });
      }
    }
  }, []);

  const toggleMood = (slug, color, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setSelected((prev) => {
      if (prev.includes(slug)) {
        // Deselect — ink persists, no clear
        return prev.filter((s) => s !== slug);
      }
      addInkBlob(cx, cy, color);
      return [...prev, slug];
    });
  };

  const handleNext = () => {
    onNext(selected);
  };

  const hasSelection = selected.length >= 1;

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
      {/* Ink canvas — position: fixed, inset: 0 */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
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
            color: MOOD_CONFIG.gold,
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

        {/* CTA — always visible */}
        <div style={{ marginTop: '2.5rem' }}>
          <button
            data-testid="mood-continue"
            onClick={handleNext}
            style={{
              opacity: hasSelection ? MOOD_CONFIG.ctaActiveOpacity : MOOD_CONFIG.ctaInactiveOpacity,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 36px',
              border: `1px solid ${MOOD_CONFIG.gold}`,
              borderRadius: '999px',
              background: 'transparent',
              color: MOOD_CONFIG.gold,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '0.9375rem',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background 0.3s ease, border-color 0.3s ease, opacity 0.2s ease',
              minHeight: '48px',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${MOOD_CONFIG.gold}22`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
            aria-label={hasSelection ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}
          >
            <span>{hasSelection ? '\u0627\u0644\u062a\u0627\u0644\u064a' : '\u062a\u062e\u0637\u0649'}</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MoodPicker;
