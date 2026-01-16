import React, { useState, useEffect } from 'react';
import { Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  OPTION C: GEOMETRIC POETRY - Islamic Art meets M.C. Escher

  Design Philosophy: Mathematical precision, animated tessellations
  Voice: Sacred geometry reveals poetry through transformation
  Priority: Pure SVG animations, optical illusion of depth
  Color Palette: Gold (#C5A059) / Indigo (#4F46E5)
  =============================================================================*/

/* =============================================================================
  SVG ANIMATED GEOMETRIC PATTERNS
  8-pointed stars (Khatim) that morph into poetic forms
  =============================================================================*/

// Animated 8-pointed star that morphs and rotates
const AnimatedStar = ({ delay = 0, size = 120, color = 'currentColor' }) => {
  const center = size / 2;
  const outerRadius = size * 0.4;
  const innerRadius = size * 0.18;

  // Generate 8-pointed star path
  const points = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i * 45 * Math.PI) / 180;
    const outerX = center + outerRadius * Math.cos(angle);
    const outerY = center + outerRadius * Math.sin(angle);
    points.push(`${outerX},${outerY}`);

    const innerAngle = ((i + 0.5) * 45 * Math.PI) / 180;
    const innerX = center + innerRadius * Math.cos(innerAngle);
    const innerY = center + innerRadius * Math.sin(innerAngle);
    points.push(`${innerX},${innerY}`);
  }

  const starPath = `M${points.join(' L')} Z`;

  return (
    <g style={{ animation: `rotate 30s linear infinite ${delay}s` }}>
      {/* Outer star */}
      <path
        d={starPath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.4"
        style={{ animation: `pulse 4s ease-in-out infinite ${delay}s` }}
      />

      {/* Inner octagon */}
      <path
        d={(() => {
          const octPoints = [];
          for (let i = 0; i < 8; i++) {
            const angle = (i * 45 * Math.PI) / 180;
            const x = center + innerRadius * 0.7 * Math.cos(angle);
            const y = center + innerRadius * 0.7 * Math.sin(angle);
            octPoints.push(`${x},${y}`);
          }
          return `M${octPoints.join(' L')} Z`;
        })()}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.3"
        style={{ animation: `pulse 4s ease-in-out infinite ${delay + 0.5}s` }}
      />

      {/* Center circle */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius * 0.3}
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0.25"
      />

      {/* Radiating lines from center */}
      {[0, 45, 90, 135].map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = center + innerRadius * 0.35 * Math.cos(rad);
        const y1 = center + innerRadius * 0.35 * Math.sin(rad);
        const x2 = center + innerRadius * 0.65 * Math.cos(rad);
        const y2 = center + innerRadius * 0.65 * Math.sin(rad);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth="1"
            opacity="0.2"
          />
        );
      })}
    </g>
  );
};

// Tessellation grid that creates depth illusion
const TessellationGrid = ({ darkMode }) => {
  const gold = '#C5A059';
  const indigo = '#4F46E5';
  const gridSize = 6;
  const cellSize = 100;

  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox={`0 0 ${gridSize * cellSize} ${gridSize * cellSize}`}
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: darkMode ? 0.15 : 0.12 }}
    >
      <defs>
        {/* Gradient for depth effect */}
        <radialGradient id="depthGradient" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={indigo} stopOpacity="0.3" />
          <stop offset="50%" stopColor={gold} stopOpacity="0.2" />
          <stop offset="100%" stopColor={indigo} stopOpacity="0.1" />
        </radialGradient>
      </defs>

      {/* Grid of animated stars */}
      {Array.from({ length: gridSize * gridSize }).map((_, i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;
        const x = col * cellSize;
        const y = row * cellSize;
        const delay = (row + col) * 0.5;
        const color = (row + col) % 2 === 0 ? gold : indigo;

        return (
          <g key={i} transform={`translate(${x}, ${y})`}>
            <AnimatedStar delay={delay} size={cellSize} color={color} />
          </g>
        );
      })}

      {/* Overlay gradient for depth illusion */}
      <rect
        width="100%"
        height="100%"
        fill="url(#depthGradient)"
        style={{ animation: 'breathe 8s ease-in-out infinite' }}
      />
    </svg>
  );
};

// Morphing geometric shape that reveals poetry
const MorphingPoetry = ({ darkMode }) => {
  const gold = '#C5A059';
  const indigo = '#4F46E5';

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid slice"
      style={{ opacity: darkMode ? 0.08 : 0.06 }}
    >
      <defs>
        {/* Define morph animation paths */}
        <path
          id="star-shape"
          d="M500 200 L550 400 L750 400 L590 520 L650 720 L500 600 L350 720 L410 520 L250 400 L450 400 Z"
          fill="none"
          stroke={gold}
          strokeWidth="2"
        />

        {/* Kaleidoscope effect */}
        <g id="kaleidoscope">
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <g
              key={i}
              transform={`rotate(${angle} 500 500)`}
              opacity="0.5"
            >
              <path
                d="M500 500 L500 200 L600 300 Z"
                fill="none"
                stroke={i % 2 === 0 ? gold : indigo}
                strokeWidth="1.5"
                style={{ animation: `morph 6s ease-in-out infinite ${i * 0.5}s` }}
              />
            </g>
          ))}
        </g>
      </defs>

      {/* Animated kaleidoscope */}
      <use
        href="#kaleidoscope"
        style={{ animation: 'rotate 40s linear infinite' }}
      />

      {/* Central morphing star */}
      <use
        href="#star-shape"
        style={{ animation: 'morph 8s ease-in-out infinite' }}
      />

      {/* Interlocking octagonal rings */}
      {[250, 350, 450].map((radius, i) => (
        <g key={i} style={{ animation: `rotate 25s linear infinite ${i * 2}s reverse` }}>
          {Array.from({ length: 8 }).map((_, j) => {
            const angle = (j * 45 * Math.PI) / 180;
            const x = 500 + radius * Math.cos(angle);
            const y = 500 + radius * Math.sin(angle);
            return (
              <circle
                key={j}
                cx={x}
                cy={y}
                r="30"
                fill="none"
                stroke={j % 2 === 0 ? gold : indigo}
                strokeWidth="1.5"
                opacity="0.3"
                style={{ animation: `pulse 3s ease-in-out infinite ${j * 0.2}s` }}
              />
            );
          })}
        </g>
      ))}
    </svg>
  );
};

// Parallax layer for subtle depth on scroll
const ParallaxLayer = ({ darkMode, scrollY }) => {
  const gold = '#C5A059';
  const indigo = '#4F46E5';

  const transform = `translateY(${scrollY * 0.5}px)`;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ transform, transition: 'transform 0.1s ease-out' }}
    >
      <svg
        className="w-full h-full"
        viewBox="0 0 800 800"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: darkMode ? 0.1 : 0.08 }}
      >
        {/* Floating geometric shapes */}
        {[
          { x: 100, y: 100, size: 80, delay: 0 },
          { x: 700, y: 150, size: 60, delay: 1 },
          { x: 200, y: 600, size: 100, delay: 2 },
          { x: 650, y: 650, size: 70, delay: 1.5 }
        ].map((shape, i) => (
          <g
            key={i}
            transform={`translate(${shape.x}, ${shape.y})`}
            style={{ animation: `float 6s ease-in-out infinite ${shape.delay}s` }}
          >
            <AnimatedStar
              size={shape.size}
              color={i % 2 === 0 ? gold : indigo}
              delay={shape.delay}
            />
          </g>
        ))}
      </svg>
    </div>
  );
};

/* =============================================================================
  MAIN GEOMETRIC SPLASH COMPONENT
  =============================================================================*/

export const SplashGeometric = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = (e) => {
      if (e.touches) {
        setScrollY(e.touches[0].clientY - window.innerHeight / 2);
      }
    };

    const handleMouseMove = (e) => {
      const centerY = window.innerHeight / 2;
      const offset = (e.clientY - centerY) * 0.1;
      setScrollY(offset);
    };

    window.addEventListener('touchmove', handleScroll, { passive: true });
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('touchmove', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  const bgColor = darkMode ? 'bg-[#0a0a0c]' : 'bg-[#FDFCF8]';
  const textColor = darkMode ? 'text-stone-100' : 'text-stone-900';
  const goldColor = darkMode ? 'text-[#C5A059]' : 'text-[#8B7355]';
  const indigoColor = darkMode ? 'text-indigo-400' : 'text-indigo-600';
  const buttonBorder = darkMode ? 'border-[#C5A059]/40' : 'border-[#8B7355]/40';
  const buttonHoverBg = darkMode ? 'hover:bg-[#C5A059]/10' : 'hover:bg-[#8B7355]/10';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* Background tessellation grid */}
      <TessellationGrid darkMode={darkMode} />

      {/* Morphing geometric poetry */}
      <MorphingPoetry darkMode={darkMode} />

      {/* Parallax layer with subtle movement */}
      <ParallaxLayer darkMode={darkMode} scrollY={scrollY} />

      {/* Radial gradient overlay for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'radial-gradient(circle at center, transparent 0%, rgba(10, 10, 12, 0.4) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, rgba(253, 252, 248, 0.4) 100%)'
        }}
      />

      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center border-2 ${buttonBorder} ${buttonHoverBg} transition-all duration-300 backdrop-blur-sm`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={goldColor} /> : <Moon size={18} className={indigoColor} />}
      </button>

      {/* Main content */}
      <div
        className="relative max-w-2xl mx-6 text-center space-y-8 md:space-y-12 z-10"
        style={{ animation: 'fadeIn 1.2s ease-out forwards' }}
      >
        {/* Animated geometric logo */}
        <div className="flex justify-center" style={{ animation: 'fadeIn 1.5s ease-out 0.3s forwards', opacity: 0 }}>
          <svg
            width="120"
            height="120"
            viewBox="0 0 120 120"
            className={goldColor}
            style={{ animation: 'rotate 20s linear infinite' }}
          >
            <AnimatedStar size={120} color="currentColor" delay={0} />
          </svg>
        </div>

        {/* Brand - Geometric precision */}
        <div style={{ animation: 'fadeIn 1.5s ease-out 0.5s forwards', opacity: 0 }}>
          <div className="flex flex-row-reverse items-center justify-center gap-4 mb-6">
            <h1
              className={`font-brand-ar font-bold ${goldColor}`}
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 4rem)',
                textShadow: darkMode ? '0 0 30px rgba(197, 160, 89, 0.3)' : '0 0 30px rgba(139, 115, 85, 0.2)'
              }}
            >
              بالعربي
            </h1>
            <span
              className={`font-brand-en lowercase tracking-tight ${indigoColor}`}
              style={{
                fontSize: 'clamp(3rem, 9vw, 5rem)',
                textShadow: darkMode ? '0 0 30px rgba(79, 70, 229, 0.3)' : '0 0 30px rgba(79, 70, 229, 0.2)'
              }}
            >
              poetry
            </span>
          </div>
        </div>

        {/* Headline - Mathematical Poetry */}
        <div className="space-y-6" style={{ animation: 'fadeIn 1.5s ease-out 0.7s forwards', opacity: 0 }}>
          <h2
            className={`font-serif font-light leading-tight ${textColor}`}
            style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}
          >
            Where <span className={goldColor}>Mathematics</span> Meets <span className={indigoColor}>Meaning</span>
          </h2>

          <p
            className={`font-amiri leading-relaxed opacity-80 ${textColor}`}
            style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)' }}
          >
            حيث تلتقي الرياضيات بالمعنى
          </p>
        </div>

        {/* Body copy - Sacred geometry philosophy */}
        <div className="max-w-lg mx-auto" style={{ animation: 'fadeIn 1.5s ease-out 0.9s forwards', opacity: 0 }}>
          <p
            className={`font-brand-en leading-relaxed opacity-75 ${textColor}`}
            style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}
          >
            Poetry is architecture in time. Each <em>bahr</em> meter repeats with crystalline precision, verses tessellate like mosaic tiles, and meaning unfolds through perfect symmetry—where classical Arabic forms reveal the mathematical beauty of human expression.
          </p>
        </div>

        {/* Call to action - Geometric button */}
        <button
          onClick={onGetStarted}
          className={`group relative px-12 py-4 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} backdrop-blur-sm transition-all duration-500`}
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            animation: 'fadeIn 1.5s ease-out 1.1s forwards',
            opacity: 0,
            minHeight: '44px',
            minWidth: '44px',
            clipPath: 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)'
          }}
        >
          <span className="font-brand-en uppercase tracking-[0.25em]">Enter the Form</span>
          <span className={`block font-amiri text-sm mt-1.5 ${goldColor}`}>ادخل الشكل</span>

          {/* Geometric hover overlay */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: darkMode
                ? 'linear-gradient(135deg, rgba(197, 160, 89, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(139, 115, 85, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%)',
              clipPath: 'polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)'
            }}
          />
        </button>

        {/* Metadata - Mathematical precision */}
        <div
          className={`text-[10px] font-brand-en uppercase tracking-[0.3em] opacity-40 ${textColor}`}
          style={{ animation: 'fadeIn 1.5s ease-out 1.3s forwards', opacity: 0 }}
        >
          Formal Perfection · Classical Forms
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.05);
          }
        }

        @keyframes morph {
          0%, 100% {
            d: path("M500 200 L550 400 L750 400 L590 520 L650 720 L500 600 L350 720 L410 520 L250 400 L450 400 Z");
          }
          33% {
            d: path("M500 250 L600 350 L700 450 L600 550 L600 650 L500 600 L400 650 L400 550 L300 450 L400 350 Z");
          }
          66% {
            d: path("M500 200 L600 300 L700 400 L650 500 L700 600 L500 550 L300 600 L350 500 L300 400 L400 300 Z");
          }
        }

        @keyframes breathe {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.3; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  GEOMETRIC WALKTHROUGH GUIDE
  Architecture of Poetry - Tessellating forms reveal the structure of meaning
  =============================================================================*/

// Evolving kaleidoscope background that morphs between steps
const KaleidoscopeBackground = ({ step, darkMode }) => {
  const gold = darkMode ? '#C5A059' : '#8B7355';
  const indigo = darkMode ? '#4F46E5' : '#6366F1';
  const baseOpacity = darkMode ? 0.15 : 0.1;

  // Calculate rotation based on step for smooth kaleidoscope turning
  const rotation = step * 120; // Each step rotates 120 degrees

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden transition-all duration-[2000ms] ease-in-out"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1200 1200"
        preserveAspectRatio="xMidYMid slice"
        style={{ opacity: baseOpacity }}
      >
        {/* Central mandala that expands with each step */}
        <defs>
          <radialGradient id={`kaleido-gradient-${step}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={gold} stopOpacity="0.4" />
            <stop offset="50%" stopColor={indigo} stopOpacity="0.3" />
            <stop offset="100%" stopColor={gold} stopOpacity="0.2" />
          </radialGradient>
        </defs>

        {/* Step 1: Foundation Grid - 6 radial arms */}
        {step === 0 && (
          <g transform="translate(600, 600)">
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                {Array.from({ length: 4 }).map((_, j) => (
                  <g key={j} transform={`translate(0, ${-100 - j * 120})`}>
                    <AnimatedStar
                      size={80}
                      color={i % 2 === 0 ? gold : indigo}
                      delay={i * 0.4 + j * 0.2}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        )}

        {/* Step 2: Interlocking Tessellation - 8 arms with offset stars */}
        {step === 1 && (
          <g transform="translate(600, 600)">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                {Array.from({ length: 5 }).map((_, j) => (
                  <g
                    key={j}
                    transform={`translate(${j % 2 === 0 ? 0 : 60}, ${-80 - j * 100})`}
                  >
                    <AnimatedStar
                      size={70}
                      color={j % 2 === 0 ? gold : indigo}
                      delay={i * 0.3 + j * 0.15}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        )}

        {/* Step 3: Infinite Complexity - Dense nested kaleidoscope */}
        {step === 2 && (
          <g transform="translate(600, 600)">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
              <g key={i} transform={`rotate(${angle})`}>
                {Array.from({ length: 7 }).map((_, j) => (
                  <g
                    key={j}
                    transform={`translate(${(j % 3) * 40 - 40}, ${-60 - j * 80})`}
                    style={{ animation: `breathe ${6 + j}s ease-in-out infinite ${i * 0.2}s` }}
                  >
                    <AnimatedStar
                      size={60}
                      color={(i + j) % 3 === 0 ? gold : indigo}
                      delay={i * 0.2 + j * 0.1}
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        )}

        {/* Overlay gradient for depth */}
        <rect
          width="100%"
          height="100%"
          fill={`url(#kaleido-gradient-${step})`}
          style={{
            animation: 'breathe 10s ease-in-out infinite',
            mixBlendMode: darkMode ? 'lighten' : 'multiply'
          }}
        />
      </svg>
    </div>
  );
};

// Architectural progress indicator - 8-pointed star fills like liquid geometry
const ArchitecturalProgress = ({ currentStep, totalSteps, darkMode }) => {
  const gold = darkMode ? '#C5A059' : '#8B7355';
  const indigo = darkMode ? '#4F46E5' : '#6366F1';
  const inactive = darkMode ? '#404040' : '#D1D5DB';

  const progress = (currentStep + 1) / totalSteps;
  const segmentsLit = Math.ceil(progress * 8);

  return (
    <div className="relative">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="transform transition-transform duration-700"
        style={{
          filter: darkMode
            ? 'drop-shadow(0 0 20px rgba(197, 160, 89, 0.35))'
            : 'drop-shadow(0 0 15px rgba(139, 115, 85, 0.25))',
          transform: `rotate(${currentStep * 45}deg)`
        }}
      >
        {/* Outer architectural ring with 8 segments */}
        {Array.from({ length: 8 }).map((_, i) => {
          const angle = (i * 45 - 90) * Math.PI / 180;
          const nextAngle = ((i + 1) * 45 - 90) * Math.PI / 180;
          const outerR = 90;
          const innerR = 70;
          const cx = 100;
          const cy = 100;

          const x1Outer = cx + outerR * Math.cos(angle);
          const y1Outer = cy + outerR * Math.sin(angle);
          const x2Outer = cx + outerR * Math.cos(nextAngle);
          const y2Outer = cy + outerR * Math.sin(nextAngle);

          const x1Inner = cx + innerR * Math.cos(angle);
          const y1Inner = cy + innerR * Math.sin(angle);
          const x2Inner = cx + innerR * Math.cos(nextAngle);
          const y2Inner = cy + innerR * Math.sin(nextAngle);

          const isActive = i < segmentsLit;
          const isCurrent = i === segmentsLit - 1;

          return (
            <g key={i}>
              {/* Ring segment */}
              <path
                d={`M ${x1Inner} ${y1Inner} L ${x1Outer} ${y1Outer} L ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} Z`}
                fill={isActive ? gold : 'none'}
                stroke={isActive ? indigo : inactive}
                strokeWidth={isActive ? 2.5 : 1.5}
                opacity={isActive ? 0.5 : 0.2}
                className="transition-all duration-1000"
                style={{
                  animation: isCurrent ? 'pulse 2s ease-in-out infinite' : 'none'
                }}
              />

              {/* Radial line from center */}
              <line
                x1={cx}
                y1={cy}
                x2={x1Outer}
                y2={y1Outer}
                stroke={isActive ? gold : inactive}
                strokeWidth={isActive ? 2 : 1}
                opacity={isActive ? 0.6 : 0.15}
                className="transition-all duration-1000"
              />

              {/* Glowing node at outer edge */}
              {isActive && (
                <circle
                  cx={x1Outer}
                  cy={y1Outer}
                  r={isCurrent ? 5 : 3}
                  fill={gold}
                  opacity="0.9"
                  style={{
                    animation: isCurrent
                      ? 'pulse 1.5s ease-in-out infinite'
                      : 'none',
                    filter: `drop-shadow(0 0 8px ${gold})`
                  }}
                />
              )}
            </g>
          );
        })}

        {/* Central nested octagons */}
        {[50, 35, 20].map((radius, i) => (
          <g key={i}>
            {Array.from({ length: 8 }).map((_, j) => {
              const angle = (j * 45) * Math.PI / 180;
              const x = 100 + radius * Math.cos(angle);
              const y = 100 + radius * Math.sin(angle);

              return (
                <circle
                  key={j}
                  cx={x}
                  cy={y}
                  r={4 - i}
                  fill={i === 0 ? indigo : gold}
                  opacity={0.4 - i * 0.1}
                  style={{
                    animation: `pulse ${4 + i}s ease-in-out infinite ${j * 0.1}s`
                  }}
                />
              );
            })}
          </g>
        ))}

        {/* Central nucleus - pulsing mathematical core */}
        <circle
          cx="100"
          cy="100"
          r="15"
          fill="none"
          stroke={gold}
          strokeWidth="2"
          opacity="0.5"
          style={{ animation: 'breathe 4s ease-in-out infinite' }}
        />
        <circle
          cx="100"
          cy="100"
          r="8"
          fill={indigo}
          opacity="0.7"
          style={{ animation: 'pulse 3s ease-in-out infinite' }}
        />

        {/* Four cardinal axes */}
        {[0, 90, 180, 270].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = 100 + 10 * Math.cos(rad);
          const y1 = 100 + 10 * Math.sin(rad);
          const x2 = 100 + 18 * Math.cos(rad);
          const y2 = 100 + 18 * Math.sin(rad);

          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={gold}
              strokeWidth="2"
              opacity="0.6"
            />
          );
        })}
      </svg>

      {/* Orbiting geometric elements */}
      {currentStep > 0 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            animation: 'rotate 20s linear infinite',
            animationDirection: currentStep === 1 ? 'normal' : 'reverse'
          }}
        >
          {[0, 120, 240].map((angle, i) => (
            <div
              key={i}
              className="absolute"
              style={{
                left: '50%',
                top: '50%',
                transform: `rotate(${angle}deg) translateY(-120px) translateX(-12px)`,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <AnimatedStar
                  size={24}
                  color={i % 2 === 0 ? gold : indigo}
                  delay={i * 0.3}
                />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Architectural frame that breathes with content
const ArchitecturalFrame = ({ children, darkMode, step }) => {
  const gold = darkMode ? '#C5A059' : '#8B7355';
  const indigo = darkMode ? '#4F46E5' : '#6366F1';

  return (
    <div className="relative">
      {/* Corner architectural ornaments */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 800 800"
        preserveAspectRatio="none"
        style={{
          opacity: darkMode ? 0.25 : 0.2,
          animation: 'breathe 8s ease-in-out infinite'
        }}
      >
        {/* Top-left corner */}
        <g transform="translate(0, 0)">
          <AnimatedStar size={100} color={gold} delay={0} />
          <line x1="50" y1="50" x2="150" y2="50" stroke={indigo} strokeWidth="2" opacity="0.4" />
          <line x1="50" y1="50" x2="50" y2="150" stroke={indigo} strokeWidth="2" opacity="0.4" />
        </g>

        {/* Top-right corner */}
        <g transform="translate(700, 0)">
          <AnimatedStar size={100} color={indigo} delay={0.2} />
          <line x1="50" y1="50" x2="-50" y2="50" stroke={gold} strokeWidth="2" opacity="0.4" />
          <line x1="50" y1="50" x2="50" y2="150" stroke={gold} strokeWidth="2" opacity="0.4" />
        </g>

        {/* Bottom-left corner */}
        <g transform="translate(0, 700)">
          <AnimatedStar size={100} color={indigo} delay={0.4} />
          <line x1="50" y1="50" x2="150" y2="50" stroke={gold} strokeWidth="2" opacity="0.4" />
          <line x1="50" y1="50" x2="50" y2="-50" stroke={gold} strokeWidth="2" opacity="0.4" />
        </g>

        {/* Bottom-right corner */}
        <g transform="translate(700, 700)">
          <AnimatedStar size={100} color={gold} delay={0.6} />
          <line x1="50" y1="50" x2="-50" y2="50" stroke={indigo} strokeWidth="2" opacity="0.4" />
          <line x1="50" y1="50" x2="50" y2="-50" stroke={indigo} strokeWidth="2" opacity="0.4" />
        </g>

        {/* Center connecting lines forming sacred geometry */}
        <line x1="100" y1="100" x2="700" y2="100" stroke={gold} strokeWidth="1" opacity="0.15" strokeDasharray="5,10" />
        <line x1="100" y1="700" x2="700" y2="700" stroke={gold} strokeWidth="1" opacity="0.15" strokeDasharray="5,10" />
        <line x1="100" y1="100" x2="100" y2="700" stroke={indigo} strokeWidth="1" opacity="0.15" strokeDasharray="5,10" />
        <line x1="700" y1="100" x2="700" y2="700" stroke={indigo} strokeWidth="1" opacity="0.15" strokeDasharray="5,10" />
      </svg>

      {children}
    </div>
  );
};

export const WalkthroughGeometric = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const bgColor = darkMode ? 'bg-[#0a0a0c]' : 'bg-[#FDFCF8]';
  const textColor = darkMode ? 'text-stone-100' : 'text-stone-900';
  const goldColor = darkMode ? 'text-[#C5A059]' : 'text-[#8B7355]';
  const indigoColor = darkMode ? 'text-indigo-400' : 'text-indigo-600';
  const borderColor = darkMode ? 'border-[#C5A059]/25' : 'border-[#8B7355]/25';
  const glassBg = darkMode ? 'bg-[#0a0a0c]/90' : 'bg-[#FDFCF8]/90';
  const buttonBorder = darkMode ? 'border-[#C5A059]/40' : 'border-[#8B7355]/40';
  const buttonHoverBg = darkMode ? 'hover:bg-[#C5A059]/15' : 'hover:bg-[#8B7355]/12';

  const steps = [
    {
      subtitle: "Foundation",
      subtitleAr: "الأساس",
      title: "The Architecture of Navigation",
      titleAr: "عمارة التصفح",
      description: "Poetry is structure. Each verse is a tessellation, repeating patterns that create infinite beauty. Swipe to traverse centuries—al-Mutanabbi's precision, Nizar Qabbani's passion—all laid out in perfect geometric order.",
      descriptionAr: "كل بيت كالبلاط المتكرر"
    },
    {
      subtitle: "Resonance",
      subtitleAr: "الصدى",
      title: "Acoustic Patterns in Space",
      titleAr: "أنماط صوتية في الفضاء",
      description: "Press play. Hear how classical meters echo like architectural rhythms—<em>bahr al-kamil</em>, <em>bahr al-tawil</em>—mathematical perfection in sound. Each syllable interlocks, creating harmonics that span centuries.",
      descriptionAr: "البحور كأنماط رياضية صوتية"
    },
    {
      subtitle: "Infinite Form",
      subtitleAr: "الشكل اللامتناهي",
      title: "Meanings That Tessellate",
      titleAr: "معانٍ متشابكة",
      description: "Unlock translations, historical context, poetic meter. Watch how meanings interlock like Islamic geometric patterns—simple rules creating infinite complexity. Every verse contains multitudes, fractal wisdom.",
      descriptionAr: "حكمة كسورية في كل بيت"
    }
  ];

  const step = steps[currentStep];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* Evolving kaleidoscope background */}
      <KaleidoscopeBackground step={currentStep} darkMode={darkMode} />

      {/* Radial depth vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at center, transparent 20%, rgba(10, 10, 12, 0.6) 80%)'
            : 'radial-gradient(ellipse at center, transparent 20%, rgba(253, 252, 248, 0.6) 80%)'
        }}
      />

      {/* Close button - octagonal */}
      <button
        onClick={onClose}
        className={`fixed top-6 right-6 z-50 w-12 h-12 flex items-center justify-center border-2 ${buttonBorder} ${buttonHoverBg} transition-all duration-300 backdrop-blur-sm`}
        style={{
          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
          minWidth: '48px',
          minHeight: '48px'
        }}
        aria-label="Close walkthrough"
      >
        <X size={20} className={textColor} />
      </button>

      {/* Main architectural container */}
      <div
        className="relative max-w-4xl mx-6 md:mx-12"
        key={currentStep}
        style={{
          animation: 'morphIn 1s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        <ArchitecturalFrame darkMode={darkMode} step={currentStep}>
          <div
            className={`relative ${glassBg} backdrop-blur-2xl border-2 ${borderColor} p-8 md:p-16 shadow-2xl`}
            style={{
              clipPath: 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)'
            }}
          >
            {/* Content grid */}
            <div className="flex flex-col items-center gap-12 text-center relative z-10">

              {/* Architectural progress indicator */}
              <div
                className="relative"
                style={{ animation: 'scaleIn 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s backwards' }}
              >
                <ArchitecturalProgress
                  currentStep={currentStep}
                  totalSteps={steps.length}
                  darkMode={darkMode}
                />
              </div>

              {/* Step hierarchy */}
              <div
                className="space-y-3"
                style={{ animation: 'fadeIn 0.8s ease-out 0.4s backwards' }}
              >
                {/* Subtitle - architectural label */}
                <div className={`flex items-center justify-center gap-4 ${textColor} opacity-40`}>
                  <div
                    className={`h-px w-12 ${darkMode ? 'bg-[#C5A059]' : 'bg-[#8B7355]'}`}
                    style={{ animation: 'expandWidth 0.6s ease-out 0.5s backwards' }}
                  />
                  <div className="font-brand-en uppercase tracking-[0.4em] text-[10px]">
                    {step.subtitle}
                  </div>
                  <div
                    className={`h-px w-12 ${darkMode ? 'bg-[#C5A059]' : 'bg-[#8B7355]'}`}
                    style={{ animation: 'expandWidth 0.6s ease-out 0.5s backwards' }}
                  />
                </div>

                {/* Main title - architectural statement */}
                <h2
                  className={`font-brand-en font-light tracking-tight leading-[1.1] ${textColor}`}
                  style={{ fontSize: 'clamp(2rem, 6vw, 3.5rem)' }}
                >
                  {step.title}
                </h2>

                {/* Arabic title - calligraphic echo */}
                <p
                  className={`font-amiri font-bold ${goldColor}`}
                  style={{
                    fontSize: 'clamp(1.25rem, 4vw, 2rem)',
                    textShadow: darkMode
                      ? '0 0 20px rgba(197, 160, 89, 0.3)'
                      : '0 0 15px rgba(139, 115, 85, 0.2)'
                  }}
                >
                  {step.titleAr}
                </p>
              </div>

              {/* Body copy - architectural precision */}
              <div
                className={`max-w-xl ${textColor} space-y-5`}
                style={{ animation: 'fadeIn 0.8s ease-out 0.6s backwards' }}
              >
                <p
                  className="font-brand-en leading-relaxed opacity-90"
                  style={{ fontSize: 'clamp(0.9375rem, 2.5vw, 1.125rem)' }}
                  dangerouslySetInnerHTML={{ __html: step.description }}
                />
                <p
                  className={`font-amiri leading-loose opacity-60 ${indigoColor}`}
                  style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}
                >
                  {step.descriptionAr}
                </p>
              </div>

              {/* Navigation matrix */}
              <div
                className="flex flex-col items-center gap-8 w-full max-w-md mt-4"
                style={{ animation: 'fadeIn 0.8s ease-out 0.8s backwards' }}
              >

                {/* Step indicators - octagonal sequence */}
                <div className="flex items-center justify-center gap-3">
                  {steps.map((_, idx) => {
                    const isActive = idx === currentStep;
                    const isPast = idx < currentStep;

                    return (
                      <button
                        key={idx}
                        onClick={() => onStepChange(idx)}
                        className={`relative transition-all duration-700 ${
                          isActive
                            ? `${goldColor} scale-110`
                            : isPast
                            ? `${indigoColor} opacity-50`
                            : `${textColor} opacity-20`
                        }`}
                        style={{
                          width: isActive ? '16px' : '12px',
                          height: isActive ? '16px' : '12px',
                          clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                          minWidth: '44px',
                          minHeight: '44px',
                          padding: '16px'
                        }}
                        aria-label={`Go to step ${idx + 1}: ${steps[idx].subtitle}`}
                      >
                        <div
                          className={`absolute inset-0 m-auto ${
                            isActive
                              ? 'bg-current'
                              : isPast
                              ? 'border-2 border-current bg-current'
                              : 'border border-current'
                          }`}
                          style={{
                            width: isActive ? '16px' : '12px',
                            height: isActive ? '16px' : '12px',
                            clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                            animation: isActive ? 'pulse 2.5s ease-in-out infinite' : 'none'
                          }}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Architectural navigation buttons */}
                <div className="flex items-center gap-4 w-full">
                  {currentStep > 0 && (
                    <button
                      onClick={() => onStepChange(currentStep - 1)}
                      className={`flex-1 px-6 py-4 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} backdrop-blur-sm transition-all duration-300 group`}
                      style={{
                        clipPath: 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)',
                        minHeight: '56px'
                      }}
                    >
                      <span className="font-brand-en uppercase tracking-[0.3em] text-xs font-medium">
                        Previous
                      </span>
                      <span className={`block font-amiri text-xs mt-1.5 opacity-50 group-hover:opacity-70 transition-opacity`}>
                        السابق
                      </span>
                    </button>
                  )}

                  <button
                    onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
                    className={`flex-1 px-6 py-4 border-2 ${buttonBorder} ${textColor} backdrop-blur-sm transition-all duration-300 group relative overflow-hidden`}
                    style={{
                      clipPath: 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)',
                      minHeight: '56px',
                      backgroundColor: darkMode ? 'rgba(197, 160, 89, 0.2)' : 'rgba(139, 115, 85, 0.15)'
                    }}
                  >
                    {/* Animated geometric fill on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                      style={{
                        background: darkMode
                          ? 'linear-gradient(135deg, rgba(197, 160, 89, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%)'
                          : 'linear-gradient(135deg, rgba(139, 115, 85, 0.08) 0%, rgba(79, 70, 229, 0.08) 100%)',
                        clipPath: 'polygon(5% 0%, 95% 0%, 100% 5%, 100% 95%, 95% 100%, 5% 100%, 0% 95%, 0% 5%)'
                      }}
                    />

                    <span className="relative font-brand-en uppercase tracking-[0.3em] text-xs font-semibold">
                      {currentStep < steps.length - 1 ? 'Continue' : 'Enter'}
                    </span>
                    <span className={`relative block font-amiri text-xs mt-1.5 ${goldColor}`}>
                      {currentStep < steps.length - 1 ? 'متابعة' : 'ادخل'}
                    </span>
                  </button>
                </div>

                {/* Architectural metadata */}
                <div className={`flex items-center gap-4 text-[10px] font-brand-en uppercase tracking-[0.35em] opacity-25 ${textColor}`}>
                  <span>Step {currentStep + 1}</span>
                  <span className="opacity-50">·</span>
                  <span className={goldColor}>Form {currentStep + 1}/{steps.length}</span>
                </div>
              </div>

            </div>
          </div>
        </ArchitecturalFrame>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes morphIn {
          0% {
            opacity: 0;
            transform: scale(0.9) rotateZ(-5deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateZ(0deg);
          }
        }

        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.5) rotate(-45deg);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotate(0deg);
          }
        }

        @keyframes fadeIn {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes expandWidth {
          0% {
            width: 0;
          }
          100% {
            width: 3rem;
          }
        }

        @keyframes breathe {
          0%, 100% {
            opacity: 0.8;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.05);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.6;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.15);
          }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Respect reduced motion preferences */
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};
