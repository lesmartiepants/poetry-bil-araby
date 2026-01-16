import React, { useState, useEffect } from 'react';
import { PenTool, Moon, Sun, X, ChevronLeft, ChevronRight } from 'lucide-react';

/* =============================================================================
  OPTION F: CONSTELLATION POETRY

  Design Philosophy: Stars forming poetry constellations
  Celestial and timeless aesthetic
  Voice: Ancient Arabic astronomy meets poetry
  Priority: Mobile-first with SVG animations
  =============================================================================*/

/* =============================================================================
  CONSTELLATION DATA
  Stars positioned to form Arabic poetry verses in the night sky
  =============================================================================*/

// Each constellation represents a word/verse from famous Arabic poetry
// Stars are positioned with x,y coordinates (0-100 range for easy SVG scaling)
const CONSTELLATIONS = [
  {
    id: 'al-hubbu',
    nameEn: 'Al-Hubb',
    nameAr: 'الحُبّ',
    meaning: 'Love',
    stars: [
      { id: 's1', x: 20, y: 30, size: 2.5, brightness: 0.9 },
      { id: 's2', x: 25, y: 25, size: 2, brightness: 0.85 },
      { id: 's3', x: 30, y: 28, size: 1.8, brightness: 0.8 },
      { id: 's4', x: 28, y: 35, size: 2.2, brightness: 0.88 },
      { id: 's5', x: 22, y: 38, size: 1.5, brightness: 0.75 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
  },
  {
    id: 'al-shawq',
    nameEn: 'Al-Shawq',
    nameAr: 'الشَوق',
    meaning: 'Longing',
    stars: [
      { id: 's6', x: 50, y: 20, size: 3, brightness: 1 },
      { id: 's7', x: 55, y: 18, size: 2.5, brightness: 0.9 },
      { id: 's8', x: 52, y: 25, size: 2, brightness: 0.85 },
      { id: 's9', x: 48, y: 27, size: 1.8, brightness: 0.8 },
      { id: 's10', x: 58, y: 24, size: 2.2, brightness: 0.87 }
    ],
    connections: [[0, 1], [0, 2], [2, 3], [1, 4]]
  },
  {
    id: 'al-qamar',
    nameEn: 'Al-Qamar',
    nameAr: 'القَمَر',
    meaning: 'The Moon',
    stars: [
      { id: 's11', x: 75, y: 35, size: 2.8, brightness: 0.95 },
      { id: 's12', x: 80, y: 32, size: 2.3, brightness: 0.88 },
      { id: 's13', x: 82, y: 38, size: 2, brightness: 0.82 },
      { id: 's14', x: 78, y: 42, size: 1.8, brightness: 0.78 },
      { id: 's15', x: 73, y: 40, size: 2.1, brightness: 0.85 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
  },
  {
    id: 'al-shir',
    nameEn: 'Al-Shi\'r',
    nameAr: 'الشِّعر',
    meaning: 'Poetry',
    stars: [
      { id: 's16', x: 35, y: 60, size: 2.6, brightness: 0.92 },
      { id: 's17', x: 40, y: 55, size: 2.2, brightness: 0.86 },
      { id: 's18', x: 42, y: 62, size: 1.9, brightness: 0.81 },
      { id: 's19', x: 38, y: 68, size: 2, brightness: 0.84 },
      { id: 's20', x: 32, y: 65, size: 1.7, brightness: 0.77 }
    ],
    connections: [[0, 1], [1, 2], [0, 3], [3, 4]]
  },
  {
    id: 'al-najm',
    nameEn: 'Al-Najm',
    nameAr: 'النَّجم',
    meaning: 'The Star',
    stars: [
      { id: 's21', x: 65, y: 70, size: 2.4, brightness: 0.89 },
      { id: 's22', x: 70, y: 68, size: 2, brightness: 0.83 },
      { id: 's23', x: 72, y: 75, size: 1.8, brightness: 0.79 },
      { id: 's24', x: 68, y: 78, size: 2.1, brightness: 0.85 },
      { id: 's25', x: 62, y: 75, size: 1.6, brightness: 0.76 }
    ],
    connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]]
  }
];

/* =============================================================================
  STAR COMPONENT - Individual twinkling star with glow
  =============================================================================*/

const Star = ({ x, y, size, brightness, delay, active }) => {
  const baseOpacity = brightness * 0.9;
  const glowSize = size * 3;

  return (
    <g>
      {/* Star glow (larger, more diffuse) */}
      <circle
        cx={x}
        cy={y}
        r={glowSize}
        fill="currentColor"
        opacity={0.08}
        style={{
          animation: `twinkle ${2 + Math.random()}s ease-in-out ${delay}s infinite alternate`
        }}
      />

      {/* Star core */}
      <circle
        cx={x}
        cy={y}
        r={size}
        fill="currentColor"
        opacity={baseOpacity}
        style={{
          animation: `twinkle ${2 + Math.random()}s ease-in-out ${delay}s infinite alternate`,
          filter: 'url(#star-glow)'
        }}
        className={active ? 'text-indigo-200' : ''}
      />

      {/* Star sparkle cross */}
      <g opacity={baseOpacity * 0.6}>
        <line
          x1={x - size * 1.5}
          y1={y}
          x2={x + size * 1.5}
          y2={y}
          stroke="currentColor"
          strokeWidth={0.5}
          style={{
            animation: `twinkle ${2.5 + Math.random()}s ease-in-out ${delay + 0.2}s infinite alternate`
          }}
        />
        <line
          x1={x}
          y1={y - size * 1.5}
          x2={x}
          y2={y + size * 1.5}
          stroke="currentColor"
          strokeWidth={0.5}
          style={{
            animation: `twinkle ${2.5 + Math.random()}s ease-in-out ${delay + 0.2}s infinite alternate`
          }}
        />
      </g>
    </g>
  );
};

/* =============================================================================
  CONSTELLATION LINE COMPONENT - Animated connecting lines
  =============================================================================*/

const ConstellationLine = ({ x1, y1, x2, y2, delay, visible }) => {
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  return (
    <line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke="currentColor"
      strokeWidth={0.5}
      opacity={0.3}
      strokeDasharray={length}
      strokeDashoffset={visible ? 0 : length}
      style={{
        transition: `stroke-dashoffset ${1.5}s ease-out ${delay}s`,
        strokeLinecap: 'round'
      }}
    />
  );
};

/* =============================================================================
  CONSTELLATION COMPONENT - Group of stars and connecting lines
  =============================================================================*/

const Constellation = ({ constellation, visible, onTouch }) => {
  const [touched, setTouched] = useState(false);

  const handleTouch = () => {
    setTouched(!touched);
    onTouch(constellation.id);
  };

  return (
    <g
      className="cursor-pointer"
      onClick={handleTouch}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Draw connecting lines first (behind stars) */}
      {visible && constellation.connections.map((connection, idx) => {
        const [startIdx, endIdx] = connection;
        const start = constellation.stars[startIdx];
        const end = constellation.stars[endIdx];

        return (
          <ConstellationLine
            key={`line-${constellation.id}-${idx}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            delay={idx * 0.2}
            visible={visible}
          />
        );
      })}

      {/* Draw stars */}
      {constellation.stars.map((star, idx) => (
        <Star
          key={star.id}
          x={star.x}
          y={star.y}
          size={star.size}
          brightness={star.brightness}
          delay={idx * 0.1}
          active={touched}
        />
      ))}

      {/* Constellation name label (appears on touch) */}
      {touched && (
        <g>
          {/* Background for text readability */}
          <rect
            x={constellation.stars[0].x - 15}
            y={constellation.stars[0].y - 12}
            width={30}
            height={10}
            rx={2}
            fill="rgba(0, 0, 0, 0.7)"
            opacity={0}
            style={{
              animation: 'fadeIn 0.3s ease-out forwards'
            }}
          />

          {/* Arabic name */}
          <text
            x={constellation.stars[0].x}
            y={constellation.stars[0].y - 4}
            textAnchor="middle"
            className="font-amiri text-[4px] md:text-[5px] fill-current"
            opacity={0}
            style={{
              animation: 'fadeIn 0.3s ease-out 0.1s forwards'
            }}
          >
            {constellation.nameAr}
          </text>
        </g>
      )}
    </g>
  );
};

/* =============================================================================
  MAIN CONSTELLATION SPLASH COMPONENT
  =============================================================================*/

export const SplashConstellation = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [visible, setVisible] = useState(false);
  const [activeConstellation, setActiveConstellation] = useState(null);

  // Trigger constellation reveal after mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleConstellationTouch = (id) => {
    setActiveConstellation(id === activeConstellation ? null : id);
  };

  // Theme colors
  const bgGradient = darkMode
    ? 'from-[#0a0a1a] via-[#0f0f2a] to-[#1a1a3a]'
    : 'from-[#0f1729] via-[#1a2642] to-[#263857]';

  const textColor = darkMode ? 'text-indigo-100' : 'text-indigo-50';
  const accentColor = darkMode ? 'text-indigo-300' : 'text-indigo-200';
  const starColor = darkMode ? 'text-indigo-200' : 'text-indigo-100';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient} overflow-hidden`}>
      {/* SVG Filters */}
      <svg width="0" height="0">
        <defs>
          {/* Star glow effect */}
          <filter id="star-glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
      </svg>

      {/* Milky Way background gradient overlay */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)'
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center border border-indigo-400/30 bg-indigo-950/40 backdrop-blur-sm hover:bg-indigo-900/40 transition-all duration-300`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className="text-indigo-200" /> : <Moon size={18} className="text-indigo-200" />}
      </button>

      {/* Constellation SVG Canvas */}
      <svg
        className={`absolute inset-0 w-full h-full ${starColor}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ minHeight: '100vh', minWidth: '100vw' }}
      >
        {CONSTELLATIONS.map((constellation, idx) => (
          <Constellation
            key={constellation.id}
            constellation={constellation}
            visible={visible}
            onTouch={handleConstellationTouch}
          />
        ))}
      </svg>

      {/* Main content overlay */}
      <div
        className="relative z-10 max-w-2xl mx-6 text-center space-y-10"
        style={{
          animation: 'fadeInUp 1.2s ease-out forwards',
          animationDelay: '0.8s',
          opacity: 0
        }}
      >
        {/* Logo with PenTool icon */}
        <div className="flex flex-col items-center gap-5">
          <div className={`${accentColor} opacity-90`}>
            <PenTool size={48} strokeWidth={1.5} />
          </div>

          <div className="flex flex-row-reverse items-center gap-3">
            <h1 className="flex items-end gap-4">
              <span
                className={`font-brand-ar font-bold ${accentColor}`}
                style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
              >
                بالعربي
              </span>
              <span
                className={`font-brand-en lowercase tracking-tighter font-bold ${textColor}`}
                style={{ fontSize: 'clamp(3rem, 9vw, 5rem)' }}
              >
                poetry
              </span>
            </h1>
          </div>
        </div>

        {/* Tagline */}
        <div className="space-y-4">
          <h2
            className={`font-brand-en font-light leading-tight ${textColor}`}
            style={{ fontSize: 'clamp(1.5rem, 4.5vw, 2.5rem)' }}
          >
            Written in the Stars
          </h2>

          <p
            className={`font-amiri leading-relaxed opacity-80 ${textColor}`}
            style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)' }}
          >
            مكتوبة في النجوم
          </p>
        </div>

        {/* Description */}
        <p
          className={`font-brand-en leading-relaxed opacity-70 max-w-md mx-auto ${textColor}`}
          style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}
        >
          In the firmament of Arabic literature, poets shine as eternal stars. Their verses form constellations of meaning—timeless patterns traced across the night sky of human experience, each word a celestial body radiating wisdom through the ages.
        </p>

        {/* Call to action */}
        <button
          onClick={onGetStarted}
          className={`group relative px-12 py-4 border-2 border-indigo-300/40 ${textColor} backdrop-blur-sm bg-indigo-950/30 hover:bg-indigo-900/40 transition-all duration-500 rounded-sm`}
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            minHeight: '44px',
            minWidth: '44px'
          }}
        >
          <span className="font-brand-en uppercase tracking-[0.3em]">Begin Journey</span>
          <span className="block font-amiri text-sm mt-1.5 opacity-70">ابدأ الرحلة</span>

          {/* Hover glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-sm" />
        </button>

        {/* Hint text */}
        <p
          className={`text-[10px] font-brand-en uppercase tracking-widest opacity-40 ${textColor}`}
          style={{ letterSpacing: '0.25em' }}
        >
          Tap stars to reveal constellation names
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes twinkle {
          from {
            opacity: 0.5;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  CONSTELLATION WALKTHROUGH GUIDE
  COMPLETE REDESIGN - Celestial navigation through poetry's cosmos

  Design Philosophy: Each step reveals a unique constellation pattern
  - Step 0: Triangle formation (3 stars) - Direction & clarity
  - Step 1: Flowing curve (5 stars) - Movement & navigation
  - Step 2: Orbital pattern (6 stars) - Rhythm & listening
  - Step 3: Complex web (8 stars) - Discovery & connections

  Matches SplashConstellation aesthetic with enhanced star animations,
  nebula effects, and step-specific constellation formations.
  =============================================================================*/

/* Background Star Component - Twinkling star field with parallax depth */
const BackgroundStar = ({ x, y, size, delay, opacity, layer = 1 }) => {
  const parallaxOffset = (layer - 1) * 0.5; // Layers 1-3 for depth

  return (
    <circle
      cx={x}
      cy={y}
      r={size}
      fill="currentColor"
      opacity={opacity * (1 - parallaxOffset * 0.2)}
      style={{
        animation: `twinkle ${2 + Math.random()}s ease-in-out ${delay}s infinite alternate`,
        transform: `translate(${parallaxOffset}px, ${parallaxOffset}px)`
      }}
    />
  );
};

/* Shooting Star Component - Cascading meteors during step transitions */
const ShootingStar = ({ visible, delay = 0, startX = 20, startY = 20 }) => {
  if (!visible) return null;

  return (
    <g
      style={{
        animation: `shootingStar 1.8s ease-out ${delay}s forwards`,
        opacity: 0
      }}
    >
      {/* Shooting star core */}
      <circle cx={startX} cy={startY} r="1.2" fill="currentColor" opacity={0.95}>
        <animate
          attributeName="opacity"
          values="0;1;0.8;0"
          dur="1.8s"
          begin={`${delay}s`}
        />
      </circle>

      {/* Shooting star trail (3 segments with gradual fade) */}
      <line
        x1={startX} y1={startY}
        x2={startX - 8} y2={startY - 8}
        stroke="currentColor"
        strokeWidth="0.6"
        opacity={0.7}
        strokeLinecap="round"
      >
        <animate
          attributeName="opacity"
          values="0;0.7;0.5;0"
          dur="1.8s"
          begin={`${delay}s`}
        />
      </line>
      <line
        x1={startX - 8} y1={startY - 8}
        x2={startX - 14} y2={startY - 14}
        stroke="currentColor"
        strokeWidth="0.4"
        opacity={0.5}
        strokeLinecap="round"
      >
        <animate
          attributeName="opacity"
          values="0;0.5;0.3;0"
          dur="1.8s"
          begin={`${delay + 0.1}s`}
        />
      </line>
      <line
        x1={startX - 14} y1={startY - 14}
        x2={startX - 18} y2={startY - 18}
        stroke="currentColor"
        strokeWidth="0.2"
        opacity={0.3}
        strokeLinecap="round"
      >
        <animate
          attributeName="opacity"
          values="0;0.3;0.15;0"
          dur="1.8s"
          begin={`${delay + 0.2}s`}
        />
      </line>
    </g>
  );
};

/* Nebula Cloud - Subtle particle clouds around key stars */
const NebulaCloud = ({ x, y, size, visible }) => {
  if (!visible) return null;

  return (
    <g opacity={0.15}>
      <circle
        cx={x}
        cy={y}
        r={size * 2}
        fill="currentColor"
        style={{
          filter: 'url(#nebula-blur)',
          animation: 'nebulaPulse 4s ease-in-out infinite alternate'
        }}
      />
      <circle
        cx={x + size * 0.5}
        cy={y - size * 0.3}
        r={size * 1.5}
        fill="currentColor"
        style={{
          filter: 'url(#nebula-blur)',
          animation: 'nebulaPulse 5s ease-in-out 0.5s infinite alternate'
        }}
      />
    </g>
  );
};

/* Constellation Line - Animated line drawing with glow */
const ConstellationProgressLine = ({ x1, y1, x2, y2, visible, delay = 0 }) => {
  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  return (
    <g>
      {/* Glow layer */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={1.2}
        opacity={0.15}
        strokeDasharray={length}
        strokeDashoffset={visible ? 0 : length}
        style={{
          transition: `stroke-dashoffset 1s ease-out ${delay}s`,
          strokeLinecap: 'round',
          filter: 'url(#line-glow)'
        }}
      />
      {/* Core line */}
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="currentColor"
        strokeWidth={0.5}
        opacity={0.6}
        strokeDasharray={length}
        strokeDashoffset={visible ? 0 : length}
        style={{
          transition: `stroke-dashoffset 1s ease-out ${delay}s`,
          strokeLinecap: 'round'
        }}
      />
    </g>
  );
};

/* Step-Specific Constellation Component */
const StepConstellation = ({ step, visible, darkMode }) => {
  const [starAnimDelay] = useState(Math.random() * 0.5);

  // Define unique constellation patterns for each step
  const constellations = {
    0: {
      // Triangle - Simple direction
      stars: [
        { x: 50, y: 35, size: 1.8 },
        { x: 43, y: 48, size: 1.5 },
        { x: 57, y: 48, size: 1.5 }
      ],
      connections: [[0, 1], [1, 2], [2, 0]]
    },
    1: {
      // Flowing curve - Movement
      stars: [
        { x: 40, y: 40, size: 1.6 },
        { x: 45, y: 45, size: 1.4 },
        { x: 52, y: 48, size: 1.7 },
        { x: 58, y: 47, size: 1.3 },
        { x: 63, y: 43, size: 1.5 }
      ],
      connections: [[0, 1], [1, 2], [2, 3], [3, 4]]
    },
    2: {
      // Orbital pattern - Rhythm
      stars: [
        { x: 50, y: 40, size: 2 }, // Center
        { x: 43, y: 43, size: 1.4 },
        { x: 43, y: 50, size: 1.3 },
        { x: 50, y: 53, size: 1.5 },
        { x: 57, y: 50, size: 1.3 },
        { x: 57, y: 43, size: 1.4 }
      ],
      connections: [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [2, 3], [3, 4], [4, 5], [5, 1]]
    },
    3: {
      // Complex web - Discovery
      stars: [
        { x: 50, y: 38, size: 1.8 },
        { x: 42, y: 42, size: 1.5 },
        { x: 58, y: 42, size: 1.5 },
        { x: 38, y: 48, size: 1.3 },
        { x: 50, y: 50, size: 1.6 },
        { x: 62, y: 48, size: 1.3 },
        { x: 44, y: 55, size: 1.4 },
        { x: 56, y: 55, size: 1.4 }
      ],
      connections: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5], [3, 6], [4, 6], [4, 7], [5, 7]]
    }
  };

  const constellation = constellations[step] || constellations[0];
  const accentColor = darkMode ? 'text-cyan-200' : 'text-cyan-100';

  return (
    <svg
      className={`absolute left-1/2 -translate-x-1/2 ${accentColor} transition-opacity duration-700`}
      style={{
        top: 'calc(50% - 180px)',
        width: '200px',
        height: '200px',
        opacity: visible ? 0.7 : 0
      }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Draw constellation lines */}
      {visible && constellation.connections.map((conn, idx) => {
        const [startIdx, endIdx] = conn;
        const start = constellation.stars[startIdx];
        const end = constellation.stars[endIdx];
        return (
          <ConstellationProgressLine
            key={`step-line-${idx}`}
            x1={start.x}
            y1={start.y}
            x2={end.x}
            y2={end.y}
            visible={visible}
            delay={idx * 0.08}
          />
        );
      })}

      {/* Draw stars with nebula */}
      {constellation.stars.map((star, idx) => (
        <g key={`step-star-${idx}`}>
          {/* Nebula cloud for larger stars */}
          {star.size >= 1.6 && (
            <NebulaCloud
              x={star.x}
              y={star.y}
              size={star.size * 2}
              visible={visible}
            />
          )}

          {/* Star glow */}
          <circle
            cx={star.x}
            cy={star.y}
            r={star.size * 2.5}
            fill="currentColor"
            opacity={0}
            style={{
              animation: visible ? `starAppear 0.8s ease-out ${idx * 0.1}s forwards, twinkle 2.5s ease-in-out ${starAnimDelay + idx * 0.15}s infinite alternate` : 'none',
              filter: 'url(#walkthrough-star-glow)'
            }}
          />

          {/* Star core */}
          <circle
            cx={star.x}
            cy={star.y}
            r={star.size}
            fill="currentColor"
            opacity={0}
            style={{
              animation: visible ? `starAppear 0.8s ease-out ${idx * 0.1}s forwards, twinkle 2s ease-in-out ${starAnimDelay + idx * 0.1}s infinite alternate` : 'none'
            }}
          />

          {/* Star sparkle */}
          <g opacity={0} style={{
            animation: visible ? `starAppear 0.8s ease-out ${idx * 0.1 + 0.2}s forwards` : 'none'
          }}>
            <line
              x1={star.x - star.size * 1.3}
              y1={star.y}
              x2={star.x + star.size * 1.3}
              y2={star.y}
              stroke="currentColor"
              strokeWidth={0.4}
              opacity={0.7}
              style={{
                animation: `twinkle 2.2s ease-in-out ${starAnimDelay}s infinite alternate`
              }}
            />
            <line
              x1={star.x}
              y1={star.y - star.size * 1.3}
              x2={star.x}
              y2={star.y + star.size * 1.3}
              stroke="currentColor"
              strokeWidth={0.4}
              opacity={0.7}
              style={{
                animation: `twinkle 2.2s ease-in-out ${starAnimDelay + 0.2}s infinite alternate`
              }}
            />
          </g>
        </g>
      ))}
    </svg>
  );
};

export const ConstellationWalkthrough = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const [showShootingStars, setShowShootingStars] = useState(false);
  const [previousStep, setPreviousStep] = useState(currentStep);
  const [constellationVisible, setConstellationVisible] = useState(true);

  // Trigger shooting stars and constellation transition on step change
  useEffect(() => {
    if (currentStep !== previousStep) {
      // Fade out old constellation
      setConstellationVisible(false);

      // Show shooting stars
      setTimeout(() => setShowShootingStars(true), 100);

      // Fade in new constellation
      setTimeout(() => {
        setConstellationVisible(true);
        setShowShootingStars(false);
        setPreviousStep(currentStep);
      }, 800);
    }
  }, [currentStep, previousStep]);

  // Initial constellation reveal
  useEffect(() => {
    const timer = setTimeout(() => setConstellationVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Generate 150 background stars with 3 depth layers for parallax
  const backgroundStars = useMemo(() => {
    return [...Array(150)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 0.18 + 0.04, // 0.04 to 0.22
      delay: Math.random() * 3,
      opacity: Math.random() * 0.5 + 0.15, // 0.15 to 0.65
      layer: Math.floor(Math.random() * 3) + 1 // Layers 1-3
    }));
  }, []);

  const steps = [
    {
      title: "Chart Your Course",
      titleAr: "ارسم مسارك النجمي",
      description: "Ancient Arab astronomers mapped the heavens. Tonight, map your journey through their verses—each poem a constellation, each word a guiding star.",
      descriptionAr: "كُن مُلاحاً في بحر النجوم"
    },
    {
      title: "Traverse Celestial Verses",
      titleAr: "جوّل بين النجوم",
      description: "Swipe through poems like an astronomer charting constellations. al-Mutanabbi here, Nizar Qabbani there—each swipe reveals another pattern of meaning written in the stars.",
      descriptionAr: "قصائد كالنجوم في السماء"
    },
    {
      title: "Hear the Music of the Spheres",
      titleAr: "اسمع أنشودة السماء",
      description: "Arabic poetry was meant to be sung under starlight. Press play and let verses cascade like meteor showers—rhythms that echo the orbits of planets.",
      descriptionAr: "أصغ إلى أنغام الكون"
    },
    {
      title: "Decode the Stellar Archive",
      titleAr: "افتح أسرار النجوم",
      description: "Every star holds a story. Tap to unlock translations, context, meter—layers of meaning radiating across centuries. The light of ancient words still reaching us, crossing the void.",
      descriptionAr: "كل نجم يحمل حكاية"
    }
  ];

  // Progress star positions (horizontal constellation line)
  const progressStarPositions = [
    { x: 30, y: 50 },
    { x: 42, y: 50 },
    { x: 54, y: 50 },
    { x: 66, y: 50 }
  ];

  const step = steps[currentStep];

  // Theme colors (matching SplashConstellation with cyan accent)
  const bgGradient = darkMode
    ? 'from-[#0a0a1a] via-[#0f0f2a] to-[#1a1a3a]'
    : 'from-[#0f1729] via-[#1a2642] to-[#263857]';
  const textColor = darkMode ? 'text-indigo-100' : 'text-indigo-50';
  const accentColor = darkMode ? 'text-indigo-300' : 'text-indigo-200';
  const starColor = darkMode ? 'text-indigo-200' : 'text-indigo-100';
  const activeStarColor = darkMode ? 'text-cyan-200' : 'text-cyan-100';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br ${bgGradient} overflow-hidden`}>
      {/* SVG Filters */}
      <svg width="0" height="0">
        <defs>
          {/* Star glow filter */}
          <filter id="walkthrough-star-glow">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Line glow filter */}
          <filter id="line-glow">
            <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Nebula blur filter */}
          <filter id="nebula-blur">
            <feGaussianBlur stdDeviation="4" />
          </filter>

          {/* Progress star gradient */}
          <radialGradient id="progress-star-gradient">
            <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
            <stop offset="70%" stopColor="currentColor" stopOpacity="0.6" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.2" />
          </radialGradient>

          {/* Active star gradient (cyan) */}
          <radialGradient id="active-star-gradient">
            <stop offset="0%" stopColor="#a5f3fc" stopOpacity="1" />
            <stop offset="70%" stopColor="#67e8f9" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
          </radialGradient>
        </defs>
      </svg>

      {/* Milky Way background gradient overlay */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          background: 'radial-gradient(ellipse at 50% 40%, rgba(99, 102, 241, 0.2) 0%, transparent 60%)'
        }}
      />

      {/* Background star field with parallax layers */}
      <svg
        className={`absolute inset-0 w-full h-full ${starColor}`}
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: 0.65 }}
      >
        {backgroundStars.map(star => (
          <BackgroundStar
            key={star.id}
            x={star.x}
            y={star.y}
            size={star.size}
            delay={star.delay}
            opacity={star.opacity}
            layer={star.layer}
          />
        ))}

        {/* Cascading shooting stars during transitions */}
        {showShootingStars && (
          <>
            <ShootingStar visible={true} delay={0} startX={25} startY={20} />
            <ShootingStar visible={true} delay={0.15} startX={50} startY={15} />
            <ShootingStar visible={true} delay={0.3} startX={75} startY={25} />
          </>
        )}
      </svg>

      {/* Step-specific constellation (centered above content) */}
      <StepConstellation
        step={currentStep}
        visible={constellationVisible}
        darkMode={darkMode}
      />

      {/* Progress constellation at top */}
      <svg
        className={`absolute top-[12%] left-1/2 -translate-x-1/2 ${accentColor}`}
        width="360"
        height="80"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        style={{ opacity: 0.9 }}
      >
        {/* Draw constellation lines between progress stars */}
        {progressStarPositions.map((pos, idx) => {
          if (idx < progressStarPositions.length - 1) {
            const nextPos = progressStarPositions[idx + 1];
            return (
              <ConstellationProgressLine
                key={`progress-line-${idx}`}
                x1={pos.x}
                y1={pos.y}
                x2={nextPos.x}
                y2={nextPos.y}
                visible={idx < currentStep}
                delay={0}
              />
            );
          }
          return null;
        })}

        {/* Draw progress stars */}
        {progressStarPositions.map((pos, idx) => (
          <g key={`progress-star-${idx}`} className={idx === currentStep ? activeStarColor : ''}>
            {/* Star glow (enhanced for active step) */}
            {idx <= currentStep && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={idx === currentStep ? 5 : 3.5}
                fill="currentColor"
                opacity={idx === currentStep ? 0.25 : 0.18}
                style={{
                  filter: 'url(#walkthrough-star-glow)',
                  animation: idx === currentStep ? 'pulse 2s ease-in-out infinite' : 'none'
                }}
              />
            )}

            {/* Star core */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={idx === currentStep ? 2.2 : 1.6}
              fill={idx === currentStep ? 'url(#active-star-gradient)' : idx <= currentStep ? 'url(#progress-star-gradient)' : 'currentColor'}
              opacity={idx <= currentStep ? 1 : 0.25}
              style={{
                transition: 'all 0.4s ease-out'
              }}
            />

            {/* Star sparkle cross for active step */}
            {idx === currentStep && (
              <g opacity={0.8}>
                <line
                  x1={pos.x - 3}
                  y1={pos.y}
                  x2={pos.x + 3}
                  y2={pos.y}
                  stroke="currentColor"
                  strokeWidth={0.35}
                  style={{
                    animation: 'twinkle 2s ease-in-out infinite alternate'
                  }}
                />
                <line
                  x1={pos.x}
                  y1={pos.y - 3}
                  x2={pos.x}
                  y2={pos.y + 3}
                  stroke="currentColor"
                  strokeWidth={0.35}
                  style={{
                    animation: 'twinkle 2s ease-in-out infinite alternate'
                  }}
                />
              </g>
            )}

            {/* Orbital rings for active step */}
            {idx === currentStep && (
              <>
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={4}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.25}
                  opacity={0.5}
                  strokeDasharray="2.5,2.5"
                  style={{
                    animation: 'rotate 8s linear infinite'
                  }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={0.18}
                  opacity={0.3}
                  strokeDasharray="3,3"
                  style={{
                    animation: 'rotate 12s linear infinite reverse'
                  }}
                />
              </>
            )}
          </g>
        ))}
      </svg>

      {/* Main content */}
      <div
        className="relative z-10 max-w-2xl mx-6 text-center px-4"
        style={{
          animation: 'fadeInUp 0.9s ease-out forwards'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute -top-14 right-0 w-11 h-11 rounded-full flex items-center justify-center border border-indigo-400/30 bg-indigo-950/40 backdrop-blur-sm hover:bg-indigo-900/40 transition-all duration-300 ${textColor}`}
          style={{ minWidth: '44px', minHeight: '44px' }}
          aria-label="Close walkthrough"
        >
          <X size={18} />
        </button>

        {/* Step content with enhanced spacing */}
        <div className="space-y-8 mt-8">
          <div className="space-y-3">
            <h2
              key={`title-${currentStep}`}
              className={`font-brand-en font-light leading-tight ${textColor}`}
              style={{
                fontSize: 'clamp(1.875rem, 5.5vw, 2.75rem)',
                animation: 'fadeIn 0.7s ease-out forwards',
                letterSpacing: '0.02em'
              }}
            >
              {step.title}
            </h2>
            <p
              key={`title-ar-${currentStep}`}
              className={`font-amiri leading-relaxed opacity-75 ${textColor}`}
              style={{
                fontSize: 'clamp(1.125rem, 3vw, 1.5rem)',
                animation: 'fadeIn 0.7s ease-out 0.1s forwards'
              }}
            >
              {step.titleAr}
            </p>
          </div>

          <p
            key={`desc-${currentStep}`}
            className={`font-brand-en leading-relaxed opacity-85 max-w-xl mx-auto ${textColor}`}
            style={{
              fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)',
              lineHeight: '1.9',
              animation: 'fadeIn 0.7s ease-out 0.2s forwards'
            }}
          >
            {step.description}
          </p>

          <p
            key={`desc-ar-${currentStep}`}
            className={`font-amiri leading-[2.2] opacity-65 ${textColor}`}
            style={{
              fontSize: 'clamp(0.9375rem, 2.25vw, 1.125rem)',
              animation: 'fadeIn 0.7s ease-out 0.3s forwards'
            }}
          >
            {step.descriptionAr}
          </p>
        </div>

        {/* Navigation with enhanced styling */}
        <div className="flex items-center gap-4 mt-14">
          {currentStep > 0 && (
            <button
              onClick={() => onStepChange(currentStep - 1)}
              className={`flex-1 group relative px-6 py-3.5 border border-indigo-300/30 ${textColor} backdrop-blur-sm bg-indigo-950/20 hover:bg-indigo-900/35 transition-all duration-300 rounded-sm flex items-center justify-center gap-2`}
              style={{ minHeight: '48px' }}
              aria-label="Previous step"
            >
              <ChevronLeft size={19} className="opacity-70 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />
              <span className="font-brand-en text-sm uppercase tracking-wider">Previous</span>
            </button>
          )}

          <button
            onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
            className={`flex-1 group relative px-8 py-3.5 border-2 border-indigo-300/40 ${textColor} backdrop-blur-sm bg-indigo-950/30 hover:bg-indigo-900/50 transition-all duration-500 rounded-sm overflow-hidden`}
            style={{ minHeight: '48px' }}
            aria-label={currentStep < steps.length - 1 ? 'Next step' : 'Start exploring'}
          >
            <div className="relative z-10 flex items-center justify-center gap-2">
              <span className="font-brand-en text-sm uppercase tracking-wider">
                {currentStep < steps.length - 1 ? 'Next' : 'Start Exploring'}
              </span>
              {currentStep < steps.length - 1 ? (
                <ChevronRight size={19} className="opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              ) : (
                <span className="font-amiri text-sm opacity-75 mr-2">ابدأ الاستكشاف</span>
              )}
            </div>

            {/* Ethereal glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </button>
        </div>

        {/* Hint text */}
        <p
          className={`text-[10px] font-brand-en uppercase tracking-widest opacity-35 ${textColor} mt-7`}
          style={{ letterSpacing: '0.28em' }}
        >
          Step {currentStep + 1} of {steps.length} • Swipe or tap to navigate
        </p>
      </div>

      {/* Enhanced CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes starAppear {
          from {
            opacity: 0;
            transform: scale(0.3);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes twinkle {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.15);
            opacity: 0.8;
          }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes shootingStar {
          0% {
            opacity: 0;
            transform: translate(-25px, -25px) scale(0.5);
          }
          15% {
            opacity: 1;
            transform: translate(0, 0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(40px, 40px) scale(0.2);
          }
        }

        @keyframes nebulaPulse {
          from {
            opacity: 0.1;
            transform: scale(0.95);
          }
          to {
            opacity: 0.2;
            transform: scale(1.05);
          }
        }

        /* Reduce motion for accessibility */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};
