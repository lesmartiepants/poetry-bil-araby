import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  CINEMATIC SPLASH SCREEN - 5e Implementation

  Design Philosophy: Film noir meets classical scholarship
  Voice: Arabic poetry professor + Magazine designer
  Priority: Mobile-first, exceptional on all devices
  =============================================================================*/

/* =============================================================================
  SVG ISLAMIC GEOMETRIC PATTERNS
  Mathematical precision, authentic designs
  =============================================================================*/

// 8-Pointed Star (Khatim) - Background texture
const StarPattern = () => (
  <svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="star-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
        {/* Outer 8-pointed star */}
        <path
          d="M50 10 L57 35 L82 35 L62 50 L70 75 L50 60 L30 75 L38 50 L18 35 L43 35 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.15"
        />
        {/* Inner circle */}
        <circle cx="50" cy="50" r="20" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" />
        {/* Center octagon */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const angle = (i * 45 * Math.PI) / 180;
          const nextAngle = ((i + 1) * 45 * Math.PI) / 180;
          const r = 12;
          const x1 = 50 + r * Math.cos(angle);
          const y1 = 50 + r * Math.sin(angle);
          const x2 = 50 + r * Math.cos(nextAngle);
          const y2 = 50 + r * Math.sin(nextAngle);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.08"
            />
          );
        })}
      </pattern>
    </defs>
  </svg>
);

// Corner Frame - Film aspect ratio markers with interlocking octagons
const CornerFrame = ({ position = 'top-left', darkMode }) => {
  const color = darkMode ? 'rgb(82, 82, 82)' : 'rgb(168, 162, 158)';

  const corners = {
    'top-left': { rotation: 0, x: 8, y: 8 },
    'top-right': { rotation: 90, x: 'calc(100% - 8px)', y: 8 },
    'bottom-left': { rotation: 270, x: 8, y: 'calc(100% - 8px)' },
    'bottom-right': { rotation: 180, x: 'calc(100% - 8px)', y: 'calc(100% - 8px)' }
  };

  const { rotation, x, y } = corners[position];

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: position.includes('left') ? x : 'auto',
        right: position.includes('right') ? 8 : 'auto',
        top: position.includes('top') ? y : 'auto',
        bottom: position.includes('bottom') ? 8 : 'auto',
        transform: `rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
    >
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        {/* L-shaped corner frame */}
        <path
          d="M2 2 L2 18 M2 2 L18 2"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="square"
          opacity="0.4"
        />
        {/* Octagonal embellishment */}
        <path
          d="M6 6 L10 6 L12 8 L12 12 L10 14 L6 14 L4 12 L4 8 Z"
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          opacity="0.25"
        />
        {/* Geometric accent lines */}
        <line x1="8" y1="6" x2="8" y2="3" stroke={color} strokeWidth="1" opacity="0.2" />
        <line x1="6" y1="8" x2="3" y2="8" stroke={color} strokeWidth="1" opacity="0.2" />
      </svg>
    </div>
  );
};

/* =============================================================================
  MAIN CINEMATIC SPLASH COMPONENT
  =============================================================================*/

export const SplashCinematic = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const bgColor = darkMode ? 'bg-black' : 'bg-stone-50';
  const textColor = darkMode ? 'text-stone-100' : 'text-stone-900';
  const accentColor = darkMode ? 'text-indigo-300' : 'text-indigo-600';
  const frameColor = darkMode ? 'text-stone-600' : 'text-stone-400';
  const buttonBorder = darkMode ? 'border-stone-600' : 'border-stone-400';
  const buttonHoverBg = darkMode ? 'hover:bg-stone-900' : 'hover:bg-stone-100';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* SVG Pattern Definitions */}
      <StarPattern />

      {/* Background: Islamic geometric pattern texture */}
      <div
        className={`absolute inset-0 ${frameColor}`}
        style={{
          backgroundImage: 'url(#star-pattern)',
          opacity: 0.02
        }}
      />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '100px 100px'
        }}
      />

      {/* Corner frames - Film aspect ratio markers */}
      <CornerFrame position="top-left" darkMode={darkMode} />
      <CornerFrame position="top-right" darkMode={darkMode} />
      <CornerFrame position="bottom-left" darkMode={darkMode} />
      <CornerFrame position="bottom-right" darkMode={darkMode} />

      {/* Theme toggle - minimal, top-right */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center border-2 ${buttonBorder} ${buttonHoverBg} transition-all duration-300`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={textColor} /> : <Moon size={18} className={textColor} />}
      </button>

      {/* Main content - Center-weighted, dramatic */}
      <div
        className="relative max-w-xl mx-6 text-center space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000"
        style={{ animationDelay: '200ms' }}
      >
        {/* Logo with PenTool icon */}
        <div className="flex flex-col items-center gap-4">
          <div className={`${accentColor} opacity-90`}>
            <PenTool size={44} strokeWidth={1.5} />
          </div>

          <div className="flex flex-row-reverse items-center gap-3">
            <h1 className="flex items-end gap-4">
              <span
                className={`font-brand-ar font-bold ${accentColor}`}
                style={{ fontSize: 'clamp(2.5rem, 6vw, 3.5rem)' }}
              >
                بالعربي
              </span>
              <span
                className={`font-brand-en lowercase tracking-tighter ${textColor}`}
                style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)' }}
              >
                poetry
              </span>
            </h1>
          </div>
        </div>

        {/* Headline - Scholarly, evocative */}
        <div className="space-y-4">
          <h2
            className={`font-serif italic font-light leading-tight ${textColor}`}
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Where Words Transcend Time
          </h2>

          <p
            className={`font-amiri leading-relaxed opacity-70 ${textColor}`}
            style={{ fontSize: 'clamp(1.5rem, 4vw, 2.25rem)' }}
          >
            حيث تتجاوز الكلمات الزمن
          </p>
        </div>

        {/* Body copy - Magazine editorial voice */}
        <div className="max-w-md mx-auto">
          <p
            className={`font-brand-en leading-relaxed opacity-70 ${textColor}`}
            style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}
          >
            Journey through centuries of Arabic verse—from the golden age of the <em>Mu'allaqat</em> to the modern masters. Each poem a portal, each line a bridge between souls across time.
          </p>
        </div>

        {/* Call to action - Minimal, cinematic */}
        <button
          onClick={onGetStarted}
          className={`group relative px-10 py-4 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} transition-all duration-500 min-w-[44px] min-h-[44px]`}
          style={{
            fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
            animation: 'fadeIn 0.8s ease-in forwards 0.6s',
            opacity: 0
          }}
        >
          <span className="font-brand-en uppercase tracking-[0.3em]">Enter the Collection</span>
          <span className="block font-amiri text-xs mt-1 opacity-60">ادخل المجموعة</span>

          {/* Subtle hover effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-stone-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>

        {/* Metadata - Film credit style */}
        <div
          className={`text-[10px] font-brand-en uppercase tracking-widest opacity-30 ${textColor}`}
          style={{ letterSpacing: '0.2em' }}
        >
          A Digital Anthology
        </div>
      </div>

      {/* Fade-in animation keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
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
