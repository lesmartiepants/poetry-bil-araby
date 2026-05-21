import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import gsap from 'gsap';

const GOLD = '#c5a059';

const TOPICS = [
  { slug: 'love', name_ar: '\u0627\u0644\u062d\u0628', name_en: 'Love', color: '#e8647a' },
  {
    slug: 'longing',
    name_ar: '\u0627\u0644\u0634\u0648\u0642',
    name_en: 'Longing',
    color: '#c084fc',
  },
  { slug: 'grief', name_ar: '\u0627\u0644\u062d\u0632\u0646', name_en: 'Grief', color: '#94a3b8' },
  {
    slug: 'nature',
    name_ar: '\u0627\u0644\u0637\u0628\u064a\u0639\u0629',
    name_en: 'Nature',
    color: '#4ade80',
  },
  {
    slug: 'homeland',
    name_ar: '\u0627\u0644\u0648\u0637\u0646',
    name_en: 'Homeland',
    color: '#22c55e',
  },
  {
    slug: 'spirituality',
    name_ar: '\u0627\u0644\u0631\u0648\u062d\u0627\u0646\u064a\u0629',
    name_en: 'Spirituality',
    color: '#818cf8',
  },
  {
    slug: 'wisdom',
    name_ar: '\u0627\u0644\u062d\u0643\u0645\u0629',
    name_en: 'Wisdom',
    color: '#38bdf8',
  },
  {
    slug: 'freedom',
    name_ar: '\u0627\u0644\u062d\u0631\u064a\u0629',
    name_en: 'Freedom',
    color: '#f59e0b',
  },
  { slug: 'war', name_ar: '\u0627\u0644\u062d\u0631\u0628', name_en: 'War', color: '#ef4444' },
  { slug: 'sea', name_ar: '\u0627\u0644\u0628\u062d\u0631', name_en: 'Sea', color: '#0ea5e9' },
  { slug: 'wine', name_ar: '\u0627\u0644\u062e\u0645\u0631', name_en: 'Wine', color: '#a16207' },
  {
    slug: 'praise',
    name_ar: '\u0627\u0644\u0645\u062f\u064a\u062d',
    name_en: 'Praise',
    color: '#c5a059',
  },
];

// Desktop positions (% of container)
const POSITIONS = [
  { x: 20, y: 15 }, // love
  { x: 50, y: 8 }, // longing
  { x: 78, y: 18 }, // grief
  { x: 10, y: 40 }, // nature
  { x: 38, y: 32 }, // homeland
  { x: 65, y: 30 }, // spirituality
  { x: 85, y: 45 }, // wisdom
  { x: 25, y: 62 }, // freedom
  { x: 55, y: 58 }, // war
  { x: 15, y: 78 }, // sea
  { x: 72, y: 72 }, // wine
  { x: 42, y: 85 }, // praise
];

// Connection lines between adjacent nodes (indices)
const CONNECTIONS = [
  [0, 1],
  [1, 2],
  [0, 3],
  [0, 4],
  [1, 4],
  [1, 5],
  [2, 5],
  [2, 6],
  [3, 7],
  [4, 7],
  [4, 8],
  [5, 8],
  [5, 6],
  [7, 9],
  [8, 10],
];

const TopicsPicker = ({ selectedMoods, selectedEras, onComplete, initialValue = [] }) => {
  const [selected, setSelected] = useState(() => initialValue);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener('resize', check, { passive: true });
    return () => window.removeEventListener('resize', check);
  }, []);

  // Particle spray on selection
  const spawnParticles = useCallback((x, y, color) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const count = 8 + Math.floor(Math.random() * 5);

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
      const dist = 30 + Math.random() * 40;
      const particle = { x, y, r: 2 + Math.random() * 3, opacity: 0.9 };

      gsap.to(particle, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        r: 0.5,
        opacity: 0,
        duration: 0.5,
        delay: i * 0.02,
        ease: 'power2.out',
        onUpdate: () => {
          ctx.beginPath();
          ctx.fillStyle = `${color}${Math.round(particle.opacity * 255)
            .toString(16)
            .padStart(2, '0')}`;
          ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
          ctx.fill();
        },
      });
    }
  }, []);

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

  const toggleTopic = (slug, color, event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    setSelected((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((s) => s !== slug);
      }
      spawnParticles(cx, cy, color);
      return [...prev, slug];
    });
  };

  const handleComplete = () => {
    onComplete({
      moods: selectedMoods || [],
      eras: selectedEras || [],
      topics: selected,
    });
  };

  // Get connections for a given node index
  const getNodeConnections = (idx) => CONNECTIONS.filter(([a, b]) => a === idx || b === idx);

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
      {/* Particle canvas */}
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
          width: '100%',
          maxWidth: '600px',
          padding: '1.5rem 1rem',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1rem', paddingTop: '1rem' }}>
          <h2
            style={{
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 'clamp(1.25rem, 3.5vw, 1.75rem)',
              color: GOLD,
              marginBottom: '0.5rem',
              direction: 'rtl',
            }}
            lang="ar"
            dir="rtl"
          >
            {
              '\u0627\u062e\u062a\u0631 \u0645\u0627 \u064a\u062b\u064a\u0631 \u0641\u0636\u0648\u0644\u0643'
            }
          </h2>
        </div>

        {/* Constellation / Grid */}
        <div
          ref={containerRef}
          style={
            isMobile
              ? {
                  display: 'flex',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  padding: '1rem',
                }
              : {
                  position: 'relative',
                  width: '100%',
                  height: '500px',
                }
          }
        >
          {/* SVG connection lines (desktop only) */}
          {!isMobile && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
              }}
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {CONNECTIONS.map(([a, b], i) => {
                const pa = POSITIONS[a];
                const pb = POSITIONS[b];
                const aSelected = selected.includes(TOPICS[a].slug);
                const bSelected = selected.includes(TOPICS[b].slug);
                const active = aSelected || bSelected;

                return (
                  <line
                    key={i}
                    x1={pa.x}
                    y1={pa.y}
                    x2={pb.x}
                    y2={pb.y}
                    stroke={active ? 'rgba(197,160,89,0.35)' : 'rgba(255,255,255,0.06)'}
                    strokeWidth={active ? '0.3' : '0.15'}
                    style={{
                      transition: 'stroke 0.3s ease, stroke-width 0.3s ease',
                    }}
                  />
                );
              })}
            </svg>
          )}

          {/* Topic nodes */}
          {TOPICS.map((topic, idx) => {
            const isSelected = selected.includes(topic.slug);
            const pos = POSITIONS[idx];

            const nodeStyle = isMobile
              ? {
                  width: 'calc(33.33% - 0.5rem)',
                  minWidth: '90px',
                  padding: '1rem 0.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                }
              : {
                  position: 'absolute',
                  left: `${pos.x}%`,
                  top: `${pos.y}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.75rem',
                };

            return (
              <button
                key={topic.slug}
                data-testid="topic-node"
                onClick={(e) => toggleTopic(topic.slug, topic.color, e)}
                style={nodeStyle}
                aria-pressed={isSelected}
                aria-label={`${topic.name_ar} \u2014 ${topic.name_en}`}
              >
                {/* Glow ring */}
                <div
                  style={{
                    width: isMobile ? '52px' : '56px',
                    height: isMobile ? '52px' : '56px',
                    borderRadius: '50%',
                    border: `2px solid ${isSelected ? topic.color : 'rgba(255,255,255,0.12)'}`,
                    boxShadow: isSelected
                      ? `0 0 16px ${topic.color}44, 0 0 32px ${topic.color}22`
                      : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.25s ease',
                    background: isSelected ? `${topic.color}11` : 'transparent',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Tajawal', sans-serif",
                      fontSize: isMobile ? '0.875rem' : '1rem',
                      fontWeight: 600,
                      color: isSelected ? '#ffffff' : 'rgba(255,255,255,0.65)',
                      direction: 'rtl',
                      transition: 'color 0.2s',
                    }}
                    lang="ar"
                  >
                    {topic.name_ar}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '0.625rem',
                    color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)',
                    letterSpacing: '0.04em',
                    transition: 'color 0.2s',
                    marginTop: '2px',
                  }}
                >
                  {topic.name_en}
                </span>
              </button>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            textAlign: 'center',
            marginTop: isMobile ? '1.5rem' : '2rem',
            paddingBottom: '2rem',
          }}
        >
          <button
            data-testid="show-poetry-btn"
            onClick={handleComplete}
            style={{
              opacity: selected.length >= 1 ? 1 : 0.5,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 40px',
              border: `1px solid ${GOLD}`,
              borderRadius: '999px',
              background: `${GOLD}15`,
              color: GOLD,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background 0.3s ease, transform 0.2s ease, opacity 0.2s ease',
              minHeight: '52px',
              direction: 'rtl',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = `${GOLD}33`;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = `${GOLD}15`;
              e.currentTarget.style.transform = 'scale(1)';
            }}
            aria-label={
              selected.length >= 1
                ? '\u0623\u0631\u0646\u064a \u0634\u0639\u0631\u064b\u0627'
                : '\u062a\u062e\u0637\u0649'
            }
          >
            <span>
              {selected.length >= 1
                ? '\u0623\u0631\u0646\u064a \u0634\u0639\u0631\u064b\u0627'
                : '\u062a\u062e\u0637\u0649'}
            </span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default TopicsPicker;
