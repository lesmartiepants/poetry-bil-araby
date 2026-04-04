import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

/* ============================================
   TOPICS_CONFIG — all visual constants
   ============================================ */
const TOPICS_CONFIG = {
  gold: '#c5a059',
  goldDim: 'rgba(197,160,89,0.7)',
  node: {
    size: 44,
    borderWidth: 1.5,
    defaultBg: 'rgba(197,160,89,0.06)',
    defaultBorder: 'rgba(197,160,89,0.25)',
    hoverBorder: 'rgba(197,160,89,0.50)',
    hoverShadow: '0 0 10px rgba(197,160,89,0.18)',
    selectedBg: 'rgba(197,160,89,0.18)',
    selectedBorder: 'rgba(197,160,89,0.9)',
    selectedShadow: '0 0 14px rgba(197,160,89,0.45), 0 0 32px rgba(197,160,89,0.18)',
    outerRingOffset: 6,
  },
  line: {
    color: '#c5a059',
    defaultOpacity: 0.08,
    activeOpacity: 0.55,
    defaultWidth: 1,
    activeWidth: 1.5,
    dashArray: '4 6',
  },
  particle: {
    countMin: 12,
    countMax: 20,
    speedMin: 1.2,
    speedMax: 4.0,
    sizeMin: 1.5,
    sizeMax: 4.0,
    lifeDecay: 0.025,
    friction: 0.93,
    color: [197, 160, 89],
  },
  entrance: {
    baseDelay: 0.4,
    stagger: 0.055,
    duration: 0.55,
    ease: 'back.out(1.7)',
  },
  label: {
    arFont: "'Reem Kufi', 'Tajawal', sans-serif",
    arSize: '0.72rem',
    enSize: '0.58rem',
  },
  counter: {
    dotSize: 6,
    maxSelections: 5,
    minSelections: 1,
  },
};

const TOPICS = [
  { slug: 'love',         name_ar: '\u0627\u0644\u062d\u0628',      name_en: 'Love',         color: '#e8647a' },
  { slug: 'longing',      name_ar: '\u0627\u0644\u0634\u0648\u0642',     name_en: 'Longing',      color: '#c084fc' },
  { slug: 'grief',        name_ar: '\u0627\u0644\u062d\u0632\u0646',     name_en: 'Grief',        color: '#94a3b8' },
  { slug: 'nature',       name_ar: '\u0627\u0644\u0637\u0628\u064a\u0639\u0629',   name_en: 'Nature',       color: '#4ade80' },
  { slug: 'homeland',     name_ar: '\u0627\u0644\u0648\u0637\u0646',     name_en: 'Homeland',     color: '#22c55e' },
  { slug: 'spirituality', name_ar: '\u0627\u0644\u0631\u0648\u062d\u0627\u0646\u064a\u0629', name_en: 'Spirituality', color: '#818cf8' },
  { slug: 'wisdom',       name_ar: '\u0627\u0644\u062d\u0643\u0645\u0629',    name_en: 'Wisdom',       color: '#38bdf8' },
  { slug: 'freedom',      name_ar: '\u0627\u0644\u062d\u0631\u064a\u0629',    name_en: 'Freedom',      color: '#f59e0b' },
  { slug: 'war',          name_ar: '\u0627\u0644\u062d\u0631\u0628',     name_en: 'War',          color: '#ef4444' },
  { slug: 'sea',          name_ar: '\u0627\u0644\u0628\u062d\u0631',     name_en: 'Sea',          color: '#0ea5e9' },
  { slug: 'wine',         name_ar: '\u0627\u0644\u062e\u0645\u0631',     name_en: 'Wine',         color: '#a16207' },
  { slug: 'praise',       name_ar: '\u0627\u0644\u0645\u062f\u064a\u062d',    name_en: 'Praise',       color: '#c5a059' },
];

// Desktop positions (% of container)
const POSITIONS = [
  { x: 20, y: 15 },  // love
  { x: 50, y: 8 },   // longing
  { x: 78, y: 18 },  // grief
  { x: 10, y: 40 },  // nature
  { x: 38, y: 32 },  // homeland
  { x: 65, y: 30 },  // spirituality
  { x: 85, y: 45 },  // wisdom
  { x: 25, y: 62 },  // freedom
  { x: 55, y: 58 },  // war
  { x: 15, y: 78 },  // sea
  { x: 72, y: 72 },  // wine
  { x: 42, y: 85 },  // praise
];

// Connection lines between adjacent nodes (indices)
const CONNECTIONS = [
  [0, 1], [1, 2], [0, 3], [0, 4], [1, 4],
  [1, 5], [2, 5], [2, 6], [3, 7], [4, 7],
  [4, 8], [5, 8], [5, 6], [7, 9], [8, 10],
];

/* ============================================
   CSS Keyframes (injected once)
   ============================================ */
const KEYFRAMES_ID = '__topics-constellation-keyframes';

function injectKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes lineFlow { 0% { stroke-dashoffset: 0; } 100% { stroke-dashoffset: -40; } }
@keyframes linePulse {
  0%   { opacity: 0.08; stroke-width: 1px; }
  40%  { opacity: 0.8;  stroke-width: 2.5px; }
  100% { opacity: 0.55; stroke-width: 1.5px; }
}
`;
  document.head.appendChild(style);
}

/* ============================================
   Particle System
   ============================================ */
function createParticleSystem(canvas) {
  const ctx = canvas.getContext('2d');
  const particles = [];
  let rafId = null;

  function spawn(cx, cy) {
    const { countMin, countMax, speedMin, speedMax, sizeMin, sizeMax, lifeDecay, color } = TOPICS_CONFIG.particle;
    const count = countMin + Math.floor(Math.random() * (countMax - countMin + 1));
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      const life = 0.7 + Math.random() * 0.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        life,
        maxLife: life,
        decay: lifeDecay + Math.random() * 0.01,
        r: color[0], g: color[1], b: color[2],
        alpha: 0.9 + Math.random() * 0.1,
      });
    }
    if (!rafId) tick();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { friction } = TOPICS_CONFIG.particle;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= friction;
      p.vy *= friction;
      p.life -= p.decay;
      if (p.life <= 0) { particles.splice(i, 1); continue; }
      const ratio = p.life / p.maxLife;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${p.alpha * ratio})`;
      ctx.arc(p.x, p.y, p.size * ratio, 0, Math.PI * 2);
      ctx.fill();
    }
    if (particles.length > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
    }
  }

  function destroy() {
    if (rafId) cancelAnimationFrame(rafId);
    particles.length = 0;
  }

  return { spawn, destroy };
}

/* ============================================
   TopicsPicker Component
   ============================================ */
const TopicsPicker = ({ selectedMoods, selectedEras, onComplete, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const [pulsingLines, setPulsingLines] = useState(new Set());
  const [hoveredNode, setHoveredNode] = useState(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nodeRefs = useRef([]);
  const circleRefs = useRef([]);
  const lineRefs = useRef(new Map());
  const particleSystem = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  // Inject CSS keyframes
  useEffect(() => { injectKeyframes(); }, []);

  // Mobile check
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Initialize particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    particleSystem.current = createParticleSystem(canvas);
    return () => { if (particleSystem.current) particleSystem.current.destroy(); };
  }, []);

  // Resize canvas to match container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Reposition SVG lines on resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updateLines = () => {
      const rect = container.getBoundingClientRect();
      lineRefs.current.forEach((lineEl, key) => {
        const [a, b] = key.split('-').map(Number);
        const pa = POSITIONS[a];
        const pb = POSITIONS[b];
        lineEl.setAttribute('x1', (pa.x / 100) * rect.width);
        lineEl.setAttribute('y1', (pa.y / 100) * rect.height);
        lineEl.setAttribute('x2', (pb.x / 100) * rect.width);
        lineEl.setAttribute('y2', (pb.y / 100) * rect.height);
      });
    };
    updateLines();
    window.addEventListener('resize', updateLines, { passive: true });
    return () => window.removeEventListener('resize', updateLines);
  }, []);

  // GSAP entrance animation for nodes
  useEffect(() => {
    const { baseDelay, stagger, duration, ease } = TOPICS_CONFIG.entrance;
    nodeRefs.current.forEach((el, i) => {
      if (!el) return;
      gsap.fromTo(el,
        { opacity: 0, y: 20, scale: 0.8 },
        { opacity: 1, y: 0, scale: 1, duration, delay: baseDelay + i * stagger, ease }
      );
    });
  }, []);

  const sprayParticles = useCallback((nodeIdx) => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !particleSystem.current) return;
    const rect = container.getBoundingClientRect();
    const pos = POSITIONS[nodeIdx];
    const cx = (pos.x / 100) * rect.width;
    const cy = (pos.y / 100) * rect.height;
    particleSystem.current.spawn(cx, cy);
  }, []);

  const pulseConnectedLines = useCallback((nodeIdx) => {
    const connectedKeys = CONNECTIONS
      .filter(([a, b]) => a === nodeIdx || b === nodeIdx)
      .map(([a, b]) => `${a}-${b}`);
    setPulsingLines(new Set(connectedKeys));
    setTimeout(() => setPulsingLines(new Set()), 700);
  }, []);

  const toggleTopic = (slug, idx) => {
    const isCurrentlySelected = selected.includes(slug);
    if (isCurrentlySelected) {
      // Deselect — gentle scale-down
      const circleEl = circleRefs.current[idx];
      if (circleEl) {
        gsap.to(circleEl, { scale: 1, duration: 0.25, ease: 'power2.out' });
      }
      setSelected((prev) => prev.filter((s) => s !== slug));
    } else {
      // Select — bounce keyframe animation
      const circleEl = circleRefs.current[idx];
      if (circleEl) {
        gsap.fromTo(circleEl, { scale: 1.0 }, {
          keyframes: [
            { scale: 1.25, duration: 0.12, ease: 'power2.out' },
            { scale: 1.0, duration: 0.22, ease: 'back.out(2.5)' },
          ],
        });
      }
      sprayParticles(idx);
      pulseConnectedLines(idx);
      setSelected((prev) => [...prev, slug]);
    }
  };

  const handleComplete = () => {
    onComplete({
      moods: selectedMoods || [],
      eras: selectedEras || [],
      topics: selected,
    });
  };

  // Determine line state
  const getLineState = (a, b) => {
    const aSelected = selected.includes(TOPICS[a].slug);
    const bSelected = selected.includes(TOPICS[b].slug);
    const key = `${a}-${b}`;
    const isPulsing = pulsingLines.has(key);
    const bothSelected = aSelected && bSelected;
    return { bothSelected, isPulsing };
  };

  const { gold, goldDim, node: nodeConfig, line: lineConfig, label: labelConfig, counter: counterConfig } = TOPICS_CONFIG;

  return (
    <motion.div
      data-testid="topics-picker"
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
        overflow: 'auto',
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '600px', padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem', paddingTop: '1rem', flexShrink: 0 }}>
          <h2
            style={{
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
              color: gold,
              marginBottom: '0.5rem',
              direction: 'rtl',
            }}
            lang="ar"
            dir="rtl"
          >
            {'\u0627\u062e\u062a\u0631 \u0645\u0627 \u064a\u062b\u064a\u0631 \u0641\u0636\u0648\u0644\u0643'}
          </h2>
        </div>

        {/* Constellation Stage */}
        <div
          ref={containerRef}
          style={{
            position: 'relative',
            width: '100%',
            flex: 1,
            minHeight: isMobile ? '380px' : '420px',
          }}
        >
          {/* Particle canvas — absolute inside container */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 2,
            }}
          />

          {/* SVG Connection Lines */}
          <svg
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              overflow: 'visible',
            }}
          >
            {CONNECTIONS.map(([a, b]) => {
              const key = `${a}-${b}`;
              const { bothSelected, isPulsing } = getLineState(a, b);
              const pa = POSITIONS[a];
              const pb = POSITIONS[b];

              let lineStyle = {};
              let strokeDasharray = lineConfig.dashArray;
              let opacity = lineConfig.defaultOpacity;
              let strokeWidth = lineConfig.defaultWidth;

              if (bothSelected) {
                strokeDasharray = 'none';
                opacity = lineConfig.activeOpacity;
                strokeWidth = lineConfig.activeWidth;
                lineStyle = {
                  animation: 'lineFlow 2s linear infinite',
                };
              } else if (isPulsing) {
                lineStyle = {
                  animation: 'linePulse 0.6s ease-out forwards',
                };
                strokeDasharray = lineConfig.dashArray;
                strokeWidth = lineConfig.defaultWidth;
              }

              return (
                <line
                  key={key}
                  ref={(el) => { if (el) lineRefs.current.set(key, el); }}
                  x1={`${pa.x}%`}
                  y1={`${pa.y}%`}
                  x2={`${pb.x}%`}
                  y2={`${pb.y}%`}
                  stroke={lineConfig.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={strokeDasharray}
                  opacity={opacity}
                  style={{
                    transition: bothSelected ? 'none' : 'opacity 0.3s ease, stroke-width 0.3s ease',
                    ...lineStyle,
                  }}
                />
              );
            })}
          </svg>

          {/* Topic Nodes */}
          {TOPICS.map((topic, idx) => {
            const isSelected = selected.includes(topic.slug);
            const isHovered = hoveredNode === idx;
            const pos = POSITIONS[idx];

            return (
              <button
                key={topic.slug}
                data-testid="topic-node"
                ref={(el) => { nodeRefs.current[idx] = el; }}
                onClick={() => toggleTopic(topic.slug, idx)}
                onMouseEnter={() => setHoveredNode(idx)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '10px',
                  margin: '-10px',
                  zIndex: 3,
                  opacity: 0, // GSAP will animate this in
                  borderRadius: '50%',
                }}
                aria-pressed={isSelected}
                aria-label={`${topic.name_ar} \u2014 ${topic.name_en}`}
              >
                {/* Circle with Arabic text inside */}
                <div
                  ref={(el) => { circleRefs.current[idx] = el; }}
                  style={{
                    width: `${nodeConfig.size}px`,
                    height: `${nodeConfig.size}px`,
                    borderRadius: '50%',
                    border: `${nodeConfig.borderWidth}px solid ${isSelected ? nodeConfig.selectedBorder : (isHovered ? nodeConfig.hoverBorder : nodeConfig.defaultBorder)}`,
                    background: isSelected ? nodeConfig.selectedBg : nodeConfig.defaultBg,
                    boxShadow: isSelected ? nodeConfig.selectedShadow : (isHovered ? nodeConfig.hoverShadow : 'none'),
                    transition: 'background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    willChange: 'transform',
                  }}
                >
                  {/* Arabic label inside circle */}
                  <span
                    style={{
                      fontFamily: labelConfig.arFont,
                      fontSize: labelConfig.arSize,
                      fontWeight: 700,
                      color: isSelected ? gold : 'rgba(255,255,255,0.85)',
                      direction: 'rtl',
                      transition: 'color 0.2s ease',
                      lineHeight: 1,
                      textAlign: 'center',
                      pointerEvents: 'none',
                      userSelect: 'none',
                    }}
                    lang="ar"
                  >
                    {topic.name_ar}
                  </span>
                </div>
                {/* English label below */}
                <span
                  style={{
                    fontSize: labelConfig.enSize,
                    color: isSelected ? goldDim : 'rgba(255,255,255,0.25)',
                    letterSpacing: '0.04em',
                    transition: 'color 0.2s ease',
                    lineHeight: 1,
                    textAlign: 'center',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    maxWidth: '70px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {topic.name_en}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom bar: counter + CTA */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: isMobile ? '0 24px 48px' : '0 24px 32px',
          gap: '12px',
        }}>
          {/* Counter row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                fontFamily: "'Tajawal', sans-serif",
                fontSize: '0.8rem',
                color: selected.length >= counterConfig.minSelections ? goldDim : 'rgba(255,255,255,0.4)',
                transition: 'color 0.3s ease',
                direction: 'rtl',
              }}
              lang="ar"
            >
              {selected.length === 0
                ? '\u0627\u062e\u062a\u0631 \u0645\u0648\u0636\u0648\u0639\u064b\u0627 \u0648\u0627\u062d\u062f\u064b\u0627 \u0639\u0644\u0649 \u0627\u0644\u0623\u0642\u0644'
                : `${selected.length} \u0645\u0646 ${counterConfig.maxSelections} \u0645\u0648\u0627\u0636\u064a\u0639 \u0645\u062e\u062a\u0627\u0631\u0629`}
            </span>
            {/* Counter dots */}
            <div style={{ display: 'flex', gap: '4px', direction: 'ltr' }}>
              {Array.from({ length: counterConfig.maxSelections }, (_, i) => (
                <div
                  key={i}
                  style={{
                    width: `${counterConfig.dotSize}px`,
                    height: `${counterConfig.dotSize}px`,
                    borderRadius: '50%',
                    border: `1px solid ${nodeConfig.defaultBorder}`,
                    background: i < selected.length ? gold : 'transparent',
                    transition: 'background 0.2s ease',
                  }}
                />
              ))}
            </div>
          </div>

          {/* CTA button */}
          <button
            data-testid="show-poetry-btn"
            onClick={handleComplete}
            style={{
              opacity: selected.length >= counterConfig.minSelections ? 1 : 0,
              pointerEvents: selected.length >= counterConfig.minSelections ? 'auto' : 'none',
              transform: selected.length >= counterConfig.minSelections ? 'translateY(0)' : 'translateY(8px)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 40px',
              border: `1px solid ${gold}`,
              borderRadius: '999px',
              background: `${gold}15`,
              color: gold,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.3s ease, transform 0.3s ease, opacity 0.3s ease',
              minHeight: '52px',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${gold}33`;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${gold}15`;
              e.currentTarget.style.transform = selected.length >= counterConfig.minSelections ? 'scale(1)' : 'translateY(8px)';
            }}
            aria-label={selected.length >= counterConfig.minSelections ? '\u0623\u0631\u0646\u064a \u0634\u0639\u0631\u064b\u0627' : '\u062a\u062e\u0637\u0649'}
          >
            <span>{selected.length >= counterConfig.minSelections ? '\u0623\u0631\u0646\u064a \u0634\u0639\u0631\u064b\u0627' : '\u062a\u062e\u0637\u0649'}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TopicsPicker;
