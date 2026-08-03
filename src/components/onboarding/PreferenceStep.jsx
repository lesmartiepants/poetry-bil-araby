import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import gsap from 'gsap';

/**
 * PreferenceStep — one full-screen question in the onboarding flow.
 *
 * This is the surviving visual work from PR #517, generalised. #517 hardcoded a
 * separate component per question, each carrying its own copy of the shell, the
 * GSAP ink-blot canvas, the staggered grid and the pill CTA — and each carrying
 * its own hardcoded list of taxonomy keys, which is exactly the part that turned
 * out to be wrong. The chrome and the motion are kept; the data is now passed in
 * from the live categorization API.
 *
 * Everything a step renders comes from `options`, so adding a taxonomy value (or
 * a whole new dimension) needs no change here.
 *
 * Layouts:
 *   'constellation' — scattered nodes joined by faint lines. For sets of ~12-16
 *                     where the choice is associative rather than ordinal.
 *   'rows'          — staggered rows of chips. For compact sets (families).
 *   'stack'         — full-width cards with a hint line. For the two ordinal
 *                     steps (era, difficulty) whose labels need a subtitle.
 */

const GOLD = '#c5a059';
const INK = '#0a0a0f';

/**
 * Deterministic scatter. A seeded hash keeps node positions stable across
 * re-renders (a random layout that reshuffles under the cursor is unusable),
 * while still looking unplanned.
 */
const scatter = (key, index, count) => {
  let h = 0;
  for (let i = 0; i < key.length; i += 1) h = (h * 31 + key.charCodeAt(i)) | 0;
  const jitter = ((h >>> 8) % 1000) / 1000;
  const jitter2 = ((h >>> 18) % 1000) / 1000;
  // Two rings so the middle doesn't crowd; outer ring holds the majority.
  const ring = index % 3 === 0 ? 0.42 : 0.82;
  const angle = (Math.PI * 2 * index) / count + (jitter - 0.5) * 0.55;
  return {
    x: 50 + Math.cos(angle) * ring * 38 + (jitter2 - 0.5) * 5,
    y: 50 + Math.sin(angle) * ring * 34 + (jitter - 0.5) * 5,
  };
};

const chunkRows = (items, per = 3) => {
  const rows = [];
  for (let i = 0; i < items.length; i += per) {
    rows.push({ items: items.slice(i, i + per), shiftLeft: rows.length % 2 === 0 });
  }
  return rows;
};

/** Node scale from poem_count, so the shape of the corpus is legible at a glance. */
const weightScale = (count, max) => {
  if (!max || !Number.isFinite(count)) return 1;
  // sqrt keeps the 24x spread between the rarest and commonest mood from making
  // the small ones illegible.
  return 0.78 + 0.42 * Math.sqrt(Math.max(0, count) / max);
};

const PreferenceStep = ({
  testId,
  titleAr,
  titleEn,
  options = [],
  layout = 'rows',
  value = [],
  onChange,
  onNext,
  onBack,
  stepIndex = 0,
  stepCount = 5,
  optional = false,
  multi = true,
  loading = false,
  emptyAr = 'لم تُحمَّل التصنيفات بعد',
  emptyEn = 'Categories are not available yet',
}) => {
  const canvasRef = useRef(null);
  // Seeded once from the incoming value. Every caller mounts a step under a
  // stable `key` per question, so a step remounts (and re-seeds) when the
  // question changes — no effect-based prop sync needed.
  const [selected, setSelected] = useState(value);

  const maxCount = useMemo(
    () => options.reduce((m, o) => Math.max(m, o.poem_count || 0), 0),
    [options]
  );

  // Ink-blot burst on select — #517's signature interaction, kept verbatim in
  // spirit: a radial core flash plus eight sub-blobs thrown outward.
  const spawnInkBlot = useCallback((x, y, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const core = { x, y, r: 0, opacity: 0 };
    gsap.to(core, {
      r: 30 + Math.random() * 30,
      opacity: 1,
      duration: 0.3,
      ease: 'power2.out',
      onUpdate: () => {
        const grad = ctx.createRadialGradient(core.x, core.y, 0, core.x, core.y, core.r);
        grad.addColorStop(0, `${color}cc`);
        grad.addColorStop(0.6, `${color}44`);
        grad.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.fillStyle = grad;
        ctx.arc(core.x, core.y, core.r, 0, Math.PI * 2);
        ctx.fill();
      },
    });
    gsap.to(core, { opacity: 0, duration: 0.3, delay: 0.3 });

    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + (Math.random() - 0.5) * 0.4;
      const dist = 40 + Math.random() * 50;
      const blob = { x, y, r: 4 + Math.random() * 8, opacity: 0.7 };
      gsap.to(blob, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        r: 2,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.03,
        ease: 'power2.out',
        onUpdate: () => {
          ctx.beginPath();
          ctx.fillStyle = `${color}${Math.round(blob.opacity * 255)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.arc(blob.x, blob.y, blob.r, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }, []);

  // Fade the canvas continuously so blots dissipate like ink in water.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    const ctx = canvas.getContext('2d');
    let raf;
    const tick = () => {
      if (ctx) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const toggle = (option, event) => {
    const next = multi
      ? selected.includes(option.key)
        ? selected.filter((k) => k !== option.key)
        : [...selected, option.key]
      : [option.key];
    setSelected(next);
    onChange?.(next);
    if (event?.currentTarget) {
      const rect = event.currentTarget.getBoundingClientRect();
      spawnInkBlot(rect.left + rect.width / 2, rect.top + rect.height / 2, option.color || GOLD);
    }
  };

  const hasChoice = selected.length > 0;
  const ctaAr = hasChoice ? 'التالي' : optional ? 'تخطَّ' : 'تخطَّ';
  const ctaEn = hasChoice ? 'Next' : 'Skip';

  const renderOption = (option, extraStyle = {}, index = 0) => {
    const isSelected = selected.includes(option.key);
    const color = option.color || GOLD;
    const scale = layout === 'constellation' ? weightScale(option.poem_count, maxCount) : 1;
    return (
      <button
        key={option.key}
        data-testid={`${testId}-option`}
        data-option-key={option.key}
        onClick={(e) => toggle(option, e)}
        aria-pressed={isSelected}
        aria-label={`${option.label_ar} — ${option.label_en}${
          option.poem_count != null ? ` (${option.poem_count})` : ''
        }`}
        style={{
          background: isSelected ? `${color}1f` : 'transparent',
          border: `1px solid ${isSelected ? color : 'rgba(255,255,255,0.10)'}`,
          borderRadius: layout === 'stack' ? '14px' : '999px',
          cursor: 'pointer',
          padding: layout === 'stack' ? '14px 18px' : '10px 16px',
          display: 'flex',
          flexDirection: layout === 'stack' ? 'row' : 'column',
          alignItems: 'center',
          justifyContent: layout === 'stack' ? 'space-between' : 'center',
          gap: layout === 'stack' ? '12px' : '2px',
          minHeight: '48px',
          transition: 'transform .22s ease, background .22s ease, border-color .22s ease',
          transform: `scale(${isSelected ? scale * 1.06 : scale})`,
          animation: `obFadeIn .45s ease ${index * 0.03}s both`,
          ...extraStyle,
        }}
      >
        <span
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: layout === 'stack' ? 'flex-end' : 'center',
            gap: '2px',
          }}
        >
          <span
            lang="ar"
            dir="rtl"
            style={{
              fontFamily: "'Tajawal', sans-serif",
              fontSize: layout === 'stack' ? '1.15rem' : '1.05rem',
              fontWeight: 600,
              color: isSelected ? '#fff' : 'rgba(255,255,255,0.78)',
              lineHeight: 1.35,
            }}
          >
            {option.label_ar}
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              letterSpacing: '0.05em',
              color: isSelected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.36)',
            }}
          >
            {option.label_en}
          </span>
          {option.hint_ar && (
            <span
              lang="ar"
              dir="rtl"
              style={{
                fontSize: '0.75rem',
                color: 'rgba(255,255,255,0.42)',
                fontFamily: "'Tajawal', sans-serif",
              }}
            >
              {option.hint_ar}
            </span>
          )}
        </span>
        {option.poem_count != null && (
          <span
            data-testid={`${testId}-count`}
            style={{
              fontSize: '0.6875rem',
              color: isSelected ? color : 'rgba(255,255,255,0.30)',
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {option.poem_count.toLocaleString('en-US')}
          </span>
        )}
      </button>
    );
  };

  const body = () => {
    if (loading) {
      return (
        <p data-testid={`${testId}-loading`} style={{ color: 'rgba(255,255,255,0.4)' }}>
          …
        </p>
      );
    }
    if (!options.length) {
      // Pre-migration (`/api/categories` -> empty) or a network failure. Show an
      // honest empty state and let the reader skip through, rather than hanging.
      return (
        <div data-testid={`${testId}-empty`} style={{ padding: '2rem 0' }}>
          <p
            lang="ar"
            dir="rtl"
            style={{
              fontFamily: "'Tajawal', sans-serif",
              color: 'rgba(255,255,255,0.55)',
              marginBottom: '.35rem',
            }}
          >
            {emptyAr}
          </p>
          <p style={{ fontSize: '.8125rem', color: 'rgba(255,255,255,0.3)' }}>{emptyEn}</p>
        </div>
      );
    }
    if (layout === 'constellation') {
      const positions = options.map((o, i) => ({ o, ...scatter(o.key, i, options.length) }));
      return (
        <div style={{ position: 'relative', width: '100%', height: 'min(58vh, 460px)' }}>
          <svg
            aria-hidden="true"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          >
            {positions.map((p, i) => {
              const n = positions[(i + 1) % positions.length];
              return (
                <line
                  key={p.o.key}
                  x1={`${p.x}%`}
                  y1={`${p.y}%`}
                  x2={`${n.x}%`}
                  y2={`${n.y}%`}
                  stroke="rgba(197,160,89,0.13)"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
          {positions.map((p, i) =>
            renderOption(
              p.o,
              {
                position: 'absolute',
                left: `${p.x}%`,
                top: `${p.y}%`,
                transformOrigin: 'center',
                translate: '-50% -50%',
              },
              i
            )
          )}
        </div>
      );
    }
    if (layout === 'stack') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.7rem', width: '100%' }}>
          {options.map((o, i) => renderOption(o, { width: '100%' }, i))}
        </div>
      );
    }
    return (
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', alignItems: 'center' }}
      >
        {chunkRows(options).map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'flex',
              gap: '.6rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
              transform: row.shiftLeft ? 'translateX(-10px)' : 'translateX(10px)',
            }}
          >
            {row.items.map((o, i) => renderOption(o, {}, ri * 3 + i))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      data-testid={testId}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: INK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflowY: 'auto',
      }}
    >
      <style>{`@keyframes obFadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1}}`}</style>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          width: '100%',
          maxWidth: layout === 'constellation' ? '760px' : '480px',
          padding: '2rem 1.5rem',
        }}
      >
        {/* Progress rail */}
        <div
          data-testid={`${testId}-progress`}
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stepCount}
          aria-label={`الخطوة ${stepIndex + 1} من ${stepCount}`}
          style={{
            display: 'flex',
            gap: '6px',
            justifyContent: 'center',
            marginBottom: '1.6rem',
            direction: 'rtl',
          }}
        >
          {Array.from({ length: stepCount }, (_, i) => (
            <span
              key={i}
              style={{
                width: i === stepIndex ? '22px' : '6px',
                height: '6px',
                borderRadius: '999px',
                background: i <= stepIndex ? GOLD : 'rgba(255,255,255,0.14)',
                transition: 'width .3s ease, background .3s ease',
              }}
            />
          ))}
        </div>

        <h2
          lang="ar"
          dir="rtl"
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 'clamp(1.5rem, 4vw, 2rem)',
            color: GOLD,
            marginBottom: '.25rem',
          }}
        >
          {titleAr}
        </h2>
        <p
          style={{
            fontSize: '.875rem',
            color: 'rgba(255,255,255,0.4)',
            marginBottom: '2rem',
          }}
        >
          {titleEn}
        </p>

        {body()}

        <div
          style={{
            marginTop: '2.2rem',
            display: 'flex',
            gap: '.75rem',
            justifyContent: 'center',
            alignItems: 'center',
            direction: 'rtl',
          }}
        >
          <button
            data-testid={`${testId}-continue`}
            onClick={() => onNext?.(selected)}
            style={{
              opacity: hasChoice || optional || !options.length ? 1 : 0.55,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 36px',
              border: `1px solid ${GOLD}`,
              borderRadius: '999px',
              background: 'transparent',
              color: GOLD,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '.9375rem',
              cursor: 'pointer',
              minHeight: '48px',
            }}
          >
            <span>{ctaAr}</span>
            <span style={{ fontSize: '.6875rem', opacity: 0.6 }}>{ctaEn}</span>
            <ArrowLeft size={16} />
          </button>
          {onBack && (
            <button
              data-testid={`${testId}-back`}
              onClick={onBack}
              aria-label="رجوع — Back"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 18px',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '999px',
                background: 'transparent',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: "'Tajawal', sans-serif",
                fontSize: '.875rem',
                cursor: 'pointer',
                minHeight: '48px',
              }}
            >
              <ArrowRight size={14} />
              <span>رجوع</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PreferenceStep;
