import React, { useState, useEffect } from 'react';
import { PenTool, Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  OPTION B: INK DIFFUSION SPLASH SCREEN + WALKTHROUGH

  Design Direction: Organic, fluid ink spreading through water
  Cinematic and mesmerizing - like watching calligraphy ink bloom

  Technical Approach:
  - Animated SVG gradient meshes simulating ink diffusion
  - Dark indigo ink spreading through cream background (light mode)
  - Black ink through white (dark mode)
  - SVG filters: feGaussianBlur, feColorMatrix, feTurbulence
  - Text fades in after ink settles (~2.5s)
  - "Enter the Tradition" button emerges from the ink
  - Matching walkthrough guide with ink wash aesthetics
  - Mobile-first responsive design

  Inspiration: Cinematic title sequences + Arabic calligraphy ink + ancient manuscripts
  =============================================================================*/

/* =============================================================================
  SVG INK DIFFUSION ANIMATION COMPONENTS
  =============================================================================*/

// Animated ink blob that expands and diffuses
const InkBlob = ({ delay = 0, scale = 1, x = 50, y = 50, darkMode }) => {
  const inkColor = darkMode ? '#1e1b4b' : '#312e81'; // indigo-950/900
  const edgeColor = darkMode ? '#4c1d95' : '#4338ca'; // purple-900/indigo-700

  return (
    <g style={{
      animation: `inkExpand 3s ease-out ${delay}s forwards`,
      transformOrigin: `${x}% ${y}%`,
      opacity: 0
    }}>
      {/* Main ink blob with radial gradient */}
      <ellipse
        cx={`${x}%`}
        cy={`${y}%`}
        rx="0"
        ry="0"
        fill={`url(#inkGradient-${x}-${y})`}
        filter="url(#inkDiffusion)"
        style={{
          animation: `blobGrow 3s ease-out ${delay}s forwards`
        }}
      />

      {/* Gradient definition for this blob */}
      <defs>
        <radialGradient id={`inkGradient-${x}-${y}`}>
          <stop offset="0%" stopColor={inkColor} stopOpacity="0.9" />
          <stop offset="40%" stopColor={edgeColor} stopOpacity="0.6" />
          <stop offset="70%" stopColor={edgeColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={edgeColor} stopOpacity="0" />
        </radialGradient>
      </defs>
    </g>
  );
};

// Ink tendrils that spread outward organically
const InkTendril = ({ startX, startY, endX, endY, delay = 0, darkMode }) => {
  const inkColor = darkMode ? 'rgba(30, 27, 75, 0.4)' : 'rgba(49, 46, 129, 0.4)';

  return (
    <path
      d={`M ${startX},${startY} Q ${(startX + endX) / 2 + Math.random() * 20 - 10},${(startY + endY) / 2 + Math.random() * 20 - 10} ${endX},${endY}`}
      stroke={inkColor}
      strokeWidth="2"
      fill="none"
      strokeLinecap="round"
      filter="url(#tendrilBlur)"
      style={{
        strokeDasharray: 200,
        strokeDashoffset: 200,
        animation: `tendrilDraw 2s ease-out ${delay}s forwards`
      }}
    />
  );
};

/* =============================================================================
  MAIN INK DIFFUSION SPLASH COMPONENT
  =============================================================================*/

export const SplashInk = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [showContent, setShowContent] = useState(false);
  const [inkSettled, setInkSettled] = useState(false);

  // Show text content after ink starts spreading
  useEffect(() => {
    const contentTimer = setTimeout(() => setShowContent(true), 1500);
    const settleTimer = setTimeout(() => setInkSettled(true), 2500);

    return () => {
      clearTimeout(contentTimer);
      clearTimeout(settleTimer);
    };
  }, []);

  const bgColor = darkMode ? 'bg-stone-950' : 'bg-stone-50';
  const textColor = darkMode ? 'text-stone-100' : 'text-stone-900';
  const accentColor = darkMode ? 'text-indigo-300' : 'text-indigo-700';
  const buttonBorder = darkMode ? 'border-stone-100/20' : 'border-stone-900/20';
  const buttonBg = darkMode ? 'bg-stone-900/40' : 'bg-white/40';
  const buttonHoverBg = darkMode ? 'hover:bg-stone-900/60' : 'hover:bg-white/60';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* SVG Ink Animation Layer */}
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Ink diffusion filter - creates organic spreading effect */}
          <filter id="inkDiffusion" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.02"
              numOctaves="3"
              seed="1"
            >
              <animate
                attributeName="baseFrequency"
                from="0.02"
                to="0.01"
                dur="3s"
                fill="freeze"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="15">
              <animate
                attributeName="scale"
                from="15"
                to="25"
                dur="3s"
                fill="freeze"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="0.5">
              <animate
                attributeName="stdDeviation"
                from="0.5"
                to="2"
                dur="3s"
                fill="freeze"
              />
            </feGaussianBlur>
          </filter>

          {/* Tendril blur filter - softer edges for spreading paths */}
          <filter id="tendrilBlur">
            <feGaussianBlur stdDeviation="1.5" />
            <feColorMatrix type="saturate" values="1.3" />
          </filter>

          {/* Color adjustment for organic ink look */}
          <filter id="inkColor">
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0
                      0 0.9 0 0 0
                      0 0 1.1 0 0
                      0 0 0 1 0"
            />
          </filter>
        </defs>

        {/* Central ink drop - main diffusion point */}
        <InkBlob delay={0} scale={1.5} x={50} y={50} darkMode={darkMode} />

        {/* Secondary blobs create organic spreading pattern */}
        <InkBlob delay={0.3} scale={1} x={45} y={45} darkMode={darkMode} />
        <InkBlob delay={0.4} scale={0.8} x={55} y={48} darkMode={darkMode} />
        <InkBlob delay={0.5} scale={0.9} x={52} y={55} darkMode={darkMode} />
        <InkBlob delay={0.6} scale={0.7} x={48} y={53} darkMode={darkMode} />

        {/* Tertiary detail blobs for complexity */}
        <InkBlob delay={0.8} scale={0.6} x={43} y={50} darkMode={darkMode} />
        <InkBlob delay={0.9} scale={0.5} x={57} y={52} darkMode={darkMode} />
        <InkBlob delay={1.0} scale={0.55} x={50} y={47} darkMode={darkMode} />

        {/* Ink tendrils spreading outward from center */}
        <g style={{ opacity: darkMode ? 0.5 : 0.6 }}>
          <InkTendril startX={50} startY={50} endX={30} endY={35} delay={0.5} darkMode={darkMode} />
          <InkTendril startX={50} startY={50} endX={70} endY={40} delay={0.6} darkMode={darkMode} />
          <InkTendril startX={50} startY={50} endX={45} endY={70} delay={0.7} darkMode={darkMode} />
          <InkTendril startX={50} startY={50} endX={60} endY={65} delay={0.8} darkMode={darkMode} />
          <InkTendril startX={50} startY={50} endX={35} endY={55} delay={0.9} darkMode={darkMode} />
          <InkTendril startX={50} startY={50} endX={65} endY={50} delay={1.0} darkMode={darkMode} />
        </g>

        {/* Subtle overlay texture for paper effect */}
        <rect
          width="100%"
          height="100%"
          fill={darkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'}
          style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }}
        />
      </svg>

      {/* Theme toggle - minimal, top-right */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center border ${buttonBorder} backdrop-blur-sm ${buttonBg} ${buttonHoverBg} transition-all duration-300`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={textColor} /> : <Moon size={18} className={textColor} />}
      </button>

      {/* Main content - fades in after ink starts spreading */}
      <div
        className={`relative max-w-2xl mx-6 text-center space-y-6 md:space-y-8 transition-all duration-1000 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Logo with PenTool icon */}
        <div className="flex flex-col items-center gap-4">
          <div className={`${accentColor} opacity-90`}>
            <PenTool size={48} strokeWidth={1.5} />
          </div>

          {/* Brand lockup */}
          <div className="flex flex-row-reverse items-center gap-3">
            <h1 className="flex items-end gap-3">
              <span
                className={`font-brand-ar font-bold ${accentColor}`}
                style={{ fontSize: 'clamp(2.5rem, 7vw, 4rem)' }}
              >
                بالعربي
              </span>
              <span
                className={`font-brand-en lowercase tracking-tight ${textColor}`}
                style={{ fontSize: 'clamp(3rem, 8vw, 4.5rem)' }}
              >
                poetry
              </span>
            </h1>
          </div>
        </div>

        {/* Headline - scholarly and reverent */}
        <div className="space-y-3 px-4">
          <h2
            className={`font-serif italic font-light leading-tight ${textColor}`}
            style={{ fontSize: 'clamp(1.75rem, 5vw, 3rem)' }}
          >
            The Art of the Written Word
          </h2>

          <p
            className={`font-amiri leading-relaxed opacity-75 ${textColor}`}
            style={{ fontSize: 'clamp(1.25rem, 3.5vw, 2rem)' }}
            dir="rtl"
          >
            فن الكلمة المكتوبة
          </p>
        </div>

        {/* Descriptive copy - professor voice */}
        <div className="max-w-lg mx-auto px-4">
          <p
            className={`font-brand-en leading-relaxed opacity-70 ${textColor}`}
            style={{ fontSize: 'clamp(0.875rem, 2.5vw, 1.125rem)' }}
          >
            For centuries, the calligrapher's brush has been the vessel of wisdom—
            ink flowing through reed and sinew to crystallize thought into beauty.
            Each stroke, a meditation. Each verse, a sacred act.
          </p>
        </div>

        {/* Call to action - emerges from the ink after it settles */}
        <div
          className={`transition-all duration-700 ${
            inkSettled ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <button
            onClick={onGetStarted}
            className={`group relative px-12 py-4 border-2 ${buttonBorder} backdrop-blur-md ${buttonBg} ${buttonHoverBg} ${textColor} transition-all duration-500 shadow-lg`}
            style={{
              fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
              minHeight: '44px',
              minWidth: '44px'
            }}
          >
            <span className="font-brand-en uppercase tracking-[0.25em] block">Enter the Tradition</span>
            <span className="font-amiri text-sm mt-1 opacity-70 block">ادخل التقليد</span>

            {/* Ink ripple effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
              <div
                className={`absolute inset-0 ${darkMode ? 'bg-indigo-900/20' : 'bg-indigo-600/10'}`}
                style={{
                  animation: 'ripple 1.5s ease-out infinite'
                }}
              />
            </div>
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes inkExpand {
          0% {
            opacity: 0;
            transform: scale(0);
          }
          10% {
            opacity: 0.8;
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes blobGrow {
          0% {
            rx: 0;
            ry: 0;
          }
          100% {
            rx: 30%;
            ry: 30%;
          }
        }

        @keyframes tendrilDraw {
          0% {
            strokeDashoffset: 200;
            opacity: 0;
          }
          20% {
            opacity: 1;
          }
          100% {
            strokeDashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes ripple {
          0% {
            transform: scale(1);
            opacity: 0.3;
          }
          100% {
            transform: scale(1.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  INK CALLIGRAPHY WALKTHROUGH GUIDE - COMPLETE REDESIGN V2

  Immersive, fluid implementation fully matching SplashInk aesthetic

  Features:
  - Dramatic ink diffusion reveals between steps (matching splash)
  - Watercolor wash transitions with morphing clouds
  - Floating calligraphic symbols (Arabic letters, not just dots)
  - Brush stroke progress with hand-painted texture
  - Organic ink border and corner splatters
  - Paper texture overlay on content card
  - Ink underline strokes beneath titles
  - Fluid animations respecting reduced motion preferences

  Steps:
  1. Navigate & Discover - Browse poems with swipe gestures
  2. Play & Listen - Audio recitation feature
  3. Seek Insights - AI-powered analysis
  =============================================================================*/

// Floating calligraphic symbol - actual Arabic letter shapes drifting like ink residue
const FloatingCalligraphy = ({ delay = 0, x = 50, y = 50, letter = 'ن', darkMode }) => {
  const inkColor = darkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(79, 70, 229, 0.10)';

  // Simple Arabic letter paths (stylized)
  const letterPaths = {
    'ن': 'M10 15 Q15 10 20 15 M15 18 L15 20', // noon
    'ع': 'M10 15 Q15 12 20 15 Q15 18 10 15', // ain
    'م': 'M8 12 Q10 10 12 12 Q14 10 16 12 L16 18', // meem
    'ل': 'M14 8 L14 18 Q12 20 10 18', // lam
    'ا': 'M15 10 L15 20', // alif
  };

  return (
    <g
      style={{
        transformOrigin: `${x}px ${y}px`,
        animation: `calligraphyFloat ${5 + Math.random() * 4}s ease-in-out infinite ${delay}s`,
        opacity: 0
      }}
    >
      <path
        d={letterPaths[letter] || letterPaths['ن']}
        stroke={inkColor}
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
        filter="url(#particleBlur)"
        transform={`translate(${x - 15}, ${y - 15}) scale(0.8)`}
      />
    </g>
  );
};

// Animated ink particle - small organic drops
const InkParticle = ({ delay = 0, x = 50, y = 50, size = 2, darkMode }) => {
  const inkColor = darkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.12)';

  return (
    <ellipse
      cx={x}
      cy={y}
      rx={size}
      ry={size * 1.5}
      fill={inkColor}
      filter="url(#particleBlur)"
      style={{
        transformOrigin: `${x}px ${y}px`,
        animation: `inkFloat ${4 + Math.random() * 3}s ease-in-out infinite ${delay}s`,
        opacity: 0
      }}
    />
  );
};

// Brush stroke for progress indicator with hand-painted texture
const BrushStroke = ({ progress, index, darkMode }) => {
  const strokeColor = darkMode ? '#a78bfa' : '#6366f1'; // purple-400 / indigo-500
  const isActive = progress > index;
  const isCurrent = Math.floor(progress) === index;
  const isCompleted = progress > index;

  return (
    <g>
      {/* Background stroke path */}
      <path
        d={`M${index * 80 + 10},12 Q${index * 80 + 40},8 ${index * 80 + 70},12`}
        stroke={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />

      {/* Active brush stroke with gradient and texture */}
      <path
        d={`M${index * 80 + 10},12 Q${index * 80 + 40},8 ${index * 80 + 70},12`}
        stroke={`url(#brushStrokeGradient-${index})`}
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
        strokeDasharray="62"
        strokeDashoffset={isActive ? 0 : 62}
        style={{
          transition: 'stroke-dashoffset 800ms cubic-bezier(0.4, 0, 0.2, 1)',
          filter: isCurrent
            ? 'drop-shadow(0 0 6px rgba(168, 85, 247, 0.7)) drop-shadow(0 0 12px rgba(168, 85, 247, 0.4))'
            : isCompleted
            ? 'drop-shadow(0 0 2px rgba(168, 85, 247, 0.3))'
            : 'none'
        }}
      />

      {/* Ink drip on current stroke */}
      {isCurrent && (
        <path
          d={`M${index * 80 + 40},12 Q${index * 80 + 41},18 ${index * 80 + 40},22`}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
          style={{
            animation: 'inkDrip 2s ease-in-out infinite'
          }}
        />
      )}

      {/* Shimmer effect on completed strokes */}
      {isCompleted && !isCurrent && (
        <ellipse
          cx={index * 80 + 40}
          cy={10}
          rx="3"
          ry="2"
          fill={strokeColor}
          opacity="0"
          style={{
            animation: 'shimmer 3s ease-in-out infinite'
          }}
        />
      )}

      <defs>
        <linearGradient id={`brushStrokeGradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="30%" stopColor={strokeColor} stopOpacity="0.8" />
          <stop offset="50%" stopColor={strokeColor} stopOpacity="1" />
          <stop offset="70%" stopColor={strokeColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </g>
  );
};

export const WalkthroughGuideInk = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayStep, setDisplayStep] = useState(currentStep);

  // Handle step transitions with ink diffusion reveal
  useEffect(() => {
    if (displayStep !== currentStep) {
      setIsTransitioning(true);
      const transitionTimer = setTimeout(() => {
        setDisplayStep(currentStep);
        setIsTransitioning(false);
      }, 600); // Ink spreads, then content changes
      return () => clearTimeout(transitionTimer);
    }
  }, [currentStep, displayStep]);

  // Use app THEME constants for consistency
  const bgOverlay = darkMode ? 'bg-stone-950/98' : 'bg-stone-50/98';
  const textPrimary = darkMode ? 'text-stone-100' : 'text-stone-900';
  const textSecondary = darkMode ? 'text-stone-300' : 'text-stone-700';
  const accentText = darkMode ? 'text-indigo-300' : 'text-indigo-700';
  const accentBg = darkMode ? 'bg-indigo-900/20' : 'bg-indigo-100/40';
  const cardBg = darkMode ? 'bg-stone-900/95' : 'bg-white/95';
  const cardBorder = darkMode ? 'border-stone-700/40' : 'border-stone-300/40';
  const buttonPrimary = darkMode
    ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
    : 'bg-indigo-700 hover:bg-indigo-600 text-white';
  const buttonSecondary = darkMode
    ? 'bg-stone-800/60 hover:bg-stone-800/80 text-stone-200 border border-stone-700/50'
    : 'bg-white/60 hover:bg-white/80 text-stone-900 border border-stone-300/50';

  const steps = [
    {
      titleEn: "Navigate & Discover",
      titleAr: "تصفح واكتشف",
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Flowing page turn with ink flourish */}
          <path d="M12 48 Q20 36 28 40 Q36 44 44 32" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
          <path d="M44 32 L50 26" strokeLinecap="round" opacity="0.6" />
          <circle cx="47" cy="29" r="5" opacity="0.15" fill="currentColor" />
          <path d="M16 52 Q24 48 32 52" strokeLinecap="round" opacity="0.4" />
          <path d="M10 20 Q18 16 26 20" strokeLinecap="round" opacity="0.3" />
        </svg>
      ),
      descEn: "Journey through fourteen centuries of Arabic poetry. Swipe left or right to explore masterworks from al-Mutanabbi, Ibn al-Farid, Nizar Qabbani, Mahmoud Darwish, and beyond.",
      contextEn: "Each gesture honors the tradition—as deliberate as a calligrapher's brush gliding between verses, as reverent as turning illuminated manuscript pages."
    },
    {
      titleEn: "Play & Listen",
      titleAr: "شغل واستمع",
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Sound waves flowing like ink ripples */}
          <path d="M18 26 L18 38" strokeLinecap="round" opacity="0.35" />
          <path d="M24 22 L24 42" strokeLinecap="round" opacity="0.55" />
          <path d="M30 16 L30 48" strokeLinecap="round" opacity="0.75" />
          <path d="M36 12 L36 52" strokeLinecap="round" opacity="1" />
          <path d="M42 16 L42 48" strokeLinecap="round" opacity="0.75" />
          <path d="M48 22 L48 42" strokeLinecap="round" opacity="0.55" />
          <circle cx="32" cy="32" r="24" opacity="0.08" fill="currentColor" />
        </svg>
      ),
      descEn: "Experience verses as they were meant to be heard. Press play to immerse yourself in the rhythmic pulse and melodic cadence of traditional Arabic recitation.",
      contextEn: "Poetry lives in the voice—in قافية (qafiyah), the rhyme that dances on the tongue, and وَزْن (wazn), the meter that pulses like a heartbeat."
    },
    {
      titleEn: "Seek Insights",
      titleAr: "اطلب البصيرة",
      icon: (
        <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
          {/* Open book with radiating wisdom */}
          <circle cx="32" cy="32" r="20" opacity="0.8" />
          <path d="M32 16 L32 32 L42 36" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
          <circle cx="32" cy="32" r="3.5" fill="currentColor" opacity="0.4" />
          <path d="M18 32 Q25 26 32 32 Q39 38 46 32" opacity="0.35" strokeLinecap="round" />
          <circle cx="32" cy="12" r="2.5" fill="currentColor" opacity="0.6" />
          <path d="M22 14 L26 18" strokeLinecap="round" opacity="0.4" />
          <path d="M42 14 L38 18" strokeLinecap="round" opacity="0.4" />
        </svg>
      ),
      descEn: "Unlock deep understanding with instant translations, historical context, poetic meter analysis, and the intricate البديع (al-badīʿ)—the literary embellishments woven through each verse.",
      contextEn: "Every line contains البلاغة (al-balāghah)—the art of eloquent rhetoric, perfected and refined across fourteen centuries of tradition."
    }
  ];

  const currentStepData = steps[displayStep];
  const progress = displayStep;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* Backdrop with ink diffusion effect */}
      <div className={`absolute inset-0 ${bgOverlay} backdrop-blur-xl transition-colors duration-700`} />

      {/* Background SVG ink animation layer */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Enhanced ink diffusion filter - matches splash quality */}
          <filter id="inkDiffuse" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.018"
              numOctaves="4"
              seed={displayStep * 7 + 3}
            >
              <animate
                attributeName="baseFrequency"
                values="0.018;0.022;0.018"
                dur="10s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" scale="30">
              <animate
                attributeName="scale"
                values="30;35;30"
                dur="10s"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
            <feGaussianBlur stdDeviation="2">
              <animate
                attributeName="stdDeviation"
                values="2;2.5;2"
                dur="10s"
                repeatCount="indefinite"
              />
            </feGaussianBlur>
          </filter>

          {/* Transition diffusion - dramatic spread on step change */}
          <filter id="transitionBlast" x="-100%" y="-100%" width="300%" height="300%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.025"
              numOctaves="5"
              seed={currentStep * 11}
            />
            <feDisplacementMap in="SourceGraphic" scale="60" />
            <feGaussianBlur stdDeviation="4" />
          </filter>

          {/* Particle blur */}
          <filter id="particleBlur">
            <feGaussianBlur stdDeviation="1" />
            <feColorMatrix type="saturate" values="1.2" />
          </filter>

          {/* Watercolor gradient for ink clouds - step-dependent colors */}
          <radialGradient id="inkCloud1">
            <stop
              offset="0%"
              stopColor={darkMode ? '#4c1d95' : '#4338ca'}
              stopOpacity={displayStep === 0 ? '0.2' : displayStep === 1 ? '0.15' : '0.12'}
            >
              <animate attributeName="stop-opacity" values="0.15;0.22;0.15" dur="8s" repeatCount="indefinite" />
            </stop>
            <stop
              offset="50%"
              stopColor={darkMode ? '#312e81' : '#6366f1'}
              stopOpacity="0.08"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="inkCloud2">
            <stop
              offset="0%"
              stopColor={darkMode ? '#6366f1' : '#818cf8'}
              stopOpacity={displayStep === 1 ? '0.18' : '0.12'}
            >
              <animate attributeName="stop-opacity" values="0.12;0.18;0.12" dur="9s" repeatCount="indefinite" />
            </stop>
            <stop
              offset="60%"
              stopColor={darkMode ? '#4338ca' : '#6366f1'}
              stopOpacity="0.06"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="inkCloud3">
            <stop
              offset="0%"
              stopColor={darkMode ? '#7c3aed' : '#a78bfa'}
              stopOpacity={displayStep === 2 ? '0.2' : '0.13'}
            >
              <animate attributeName="stop-opacity" values="0.13;0.2;0.13" dur="7s" repeatCount="indefinite" />
            </stop>
            <stop
              offset="55%"
              stopColor={darkMode ? '#6366f1' : '#818cf8'}
              stopOpacity="0.07"
            />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Dramatic transition ink blast - spreads from center on step change */}
        {isTransitioning && (
          <circle
            cx="50"
            cy="50"
            r="0"
            fill={darkMode ? 'rgba(49, 46, 129, 0.3)' : 'rgba(79, 70, 229, 0.25)'}
            filter="url(#transitionBlast)"
            style={{
              animation: 'inkBlast 1200ms cubic-bezier(0.4, 0, 0.2, 1) forwards'
            }}
          />
        )}

        {/* Animated ink clouds - shift position and intensity per step */}
        <circle
          cx={28 + displayStep * 6}
          cy={32}
          r="38"
          fill="url(#inkCloud1)"
          filter="url(#inkDiffuse)"
          style={{
            transformOrigin: `${28 + displayStep * 6}% 32%`,
            animation: 'breathe 9s ease-in-out infinite',
            transition: 'cx 800ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <circle
          cx={68 - displayStep * 4}
          cy={62}
          r="32"
          fill="url(#inkCloud2)"
          filter="url(#inkDiffuse)"
          style={{
            transformOrigin: `${68 - displayStep * 4}% 62%`,
            animation: 'breathe 11s ease-in-out infinite 2s',
            transition: 'cx 800ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
        <circle
          cx={50}
          cy={22 + displayStep * 3}
          r="28"
          fill="url(#inkCloud3)"
          filter="url(#inkDiffuse)"
          style={{
            transformOrigin: '50% 22%',
            animation: 'breathe 10s ease-in-out infinite 4s',
            transition: 'cy 800ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />

        {/* Floating calligraphic symbols */}
        {['ن', 'ع', 'م', 'ل', 'ا'].map((letter, i) => (
          <FloatingCalligraphy
            key={`cal-${i}-${displayStep}`}
            delay={i * 0.4}
            x={15 + i * 18}
            y={20 + (i * 13) % 60}
            letter={letter}
            darkMode={darkMode}
          />
        ))}

        {/* Floating ink particles - smaller organic drops */}
        {[...Array(16)].map((_, i) => (
          <InkParticle
            key={`particle-${i}`}
            delay={i * 0.4}
            x={12 + (i * 5.5) % 86}
            y={18 + (i * 8) % 78}
            size={0.6 + Math.random() * 1.2}
            darkMode={darkMode}
          />
        ))}
      </svg>

      {/* Main content card */}
      <div
        className={`relative max-w-2xl mx-6 ${cardBg} backdrop-blur-2xl border-2 ${cardBorder} rounded-3xl overflow-hidden transition-all duration-700 ${
          isTransitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'
        }`}
        style={{
          boxShadow: darkMode
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(99, 102, 241, 0.1)'
            : '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(79, 70, 229, 0.08)'
        }}
      >
        {/* Paper texture overlay */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '150px 150px'
          }}
        />

        {/* Ink splatter corner decorations */}
        <div className={`absolute top-0 left-0 w-32 h-32 ${accentText} opacity-[0.08] pointer-events-none`}>
          <svg viewBox="0 0 128 128" fill="currentColor">
            {/* Organic ink splatter shape */}
            <path d="M12 8 Q8 6 10 4 Q14 2 18 6 Q22 4 26 8 Q28 6 32 10 L32 28 Q28 32 24 28 Q20 32 16 28 Q12 30 10 26 L10 12 Q8 10 12 8" opacity="0.6" />
            <circle cx="20" cy="16" r="3" opacity="0.8" />
            <ellipse cx="28" cy="22" rx="2" ry="4" opacity="0.5" />
            <circle cx="14" cy="24" r="1.5" opacity="0.7" />
            {/* Ink drip trails */}
            <path d="M18 6 Q17 10 18 14" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
            <path d="M26 8 Q25 12 26 16" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.3" />
          </svg>
        </div>
        <div className={`absolute bottom-0 right-0 w-32 h-32 ${accentText} opacity-[0.08] pointer-events-none rotate-180`}>
          <svg viewBox="0 0 128 128" fill="currentColor">
            <path d="M12 8 Q8 6 10 4 Q14 2 18 6 Q22 4 26 8 Q28 6 32 10 L32 28 Q28 32 24 28 Q20 32 16 28 Q12 30 10 26 L10 12 Q8 10 12 8" opacity="0.6" />
            <circle cx="20" cy="16" r="3" opacity="0.8" />
            <ellipse cx="28" cy="22" rx="2" ry="4" opacity="0.5" />
            <circle cx="14" cy="24" r="1.5" opacity="0.7" />
            <path d="M18 6 Q17 10 18 14" stroke="currentColor" strokeWidth="1" fill="none" opacity="0.4" />
            <path d="M26 8 Q25 12 26 16" stroke="currentColor" strokeWidth="0.8" fill="none" opacity="0.3" />
          </svg>
        </div>

        {/* Subtle ink border accent - organic stroke effect */}
        <div className="absolute inset-0 pointer-events-none">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <rect
              x="1"
              y="1"
              width="calc(100% - 2px)"
              height="calc(100% - 2px)"
              rx="22"
              fill="none"
              stroke={darkMode ? 'rgba(99, 102, 241, 0.15)' : 'rgba(79, 70, 229, 0.12)'}
              strokeWidth="1"
              strokeDasharray="8 4"
              opacity="0.5"
            />
          </svg>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 p-2.5 ${textSecondary} hover:${textPrimary} transition-all duration-300 rounded-full z-10 group`}
          style={{ minHeight: '44px', minWidth: '44px' }}
          aria-label="Close walkthrough"
        >
          <X size={22} className="group-hover:rotate-90 transition-transform duration-300" />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center text-center px-8 py-16 md:px-24 md:py-24 gap-10">
          {/* Icon with animated glow and ink halo */}
          <div className="relative">
            <div
              className={`absolute inset-0 ${accentBg} rounded-full blur-3xl`}
              style={{ animation: 'glowPulse 4.5s ease-in-out infinite' }}
            />
            <div className={`relative ${accentBg} p-10 rounded-full border-2 ${cardBorder} ${accentText} transition-all duration-500`}>
              {currentStepData.icon}
            </div>
            {/* Orbiting ink droplets around icon */}
            <div className="absolute inset-0 pointer-events-none">
              <div
                className={`absolute top-2 left-1/2 w-1.5 h-1.5 rounded-full ${accentBg} opacity-60`}
                style={{ animation: 'orbit 6s linear infinite' }}
              />
              <div
                className={`absolute bottom-2 left-1/2 w-1 h-1 rounded-full ${accentBg} opacity-40`}
                style={{ animation: 'orbit 6s linear infinite 3s' }}
              />
            </div>
          </div>

          {/* Step title - bilingual with ink underline */}
          <div className="space-y-4">
            <div className="relative inline-block">
              <h2 className={`font-serif text-4xl md:text-5xl font-light italic ${textPrimary} leading-tight relative z-10`}>
                {currentStepData.titleEn}
              </h2>
              {/* Ink brush stroke underline */}
              <svg className="absolute -bottom-2 left-0 w-full h-3 pointer-events-none" preserveAspectRatio="none">
                <path
                  d="M0,6 Q25,4 50,5 T100,6"
                  fill="none"
                  stroke={darkMode ? 'rgba(167, 139, 250, 0.3)' : 'rgba(99, 102, 241, 0.25)'}
                  strokeWidth="2"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
            <p className={`font-amiri text-3xl md:text-4xl ${textSecondary} opacity-75 leading-relaxed`} dir="rtl">
              {currentStepData.titleAr}
            </p>
          </div>

          {/* Description copy with enhanced spacing */}
          <div className="space-y-6 max-w-xl">
            {/* Primary feature description */}
            <p className={`font-light text-lg md:text-xl leading-[1.75] ${textPrimary} tracking-wide`}>
              {currentStepData.descEn}
            </p>
            {/* Scholarly context in italic serif with subtle ink accent */}
            <div className="relative">
              <div className={`absolute -left-4 top-0 w-1 h-full ${accentBg} rounded-full opacity-50`} />
              <p className={`font-serif italic text-base md:text-lg leading-[1.85] ${textSecondary} opacity-85 pl-2`}>
                {currentStepData.contextEn}
              </p>
            </div>
          </div>

          {/* Brush stroke progress indicator */}
          <div className="mt-6">
            <svg width="220" height="32" viewBox="0 0 220 32" className="mb-8">
              <BrushStroke progress={progress} index={0} darkMode={darkMode} />
              <BrushStroke progress={progress} index={1} darkMode={darkMode} />
              <BrushStroke progress={progress} index={2} darkMode={darkMode} />
            </svg>

            {/* Step navigation - ink droplets */}
            <div className="flex items-center justify-center gap-4 mt-2">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onStepChange(idx)}
                  className="flex items-center justify-center transition-all group"
                  style={{ minHeight: '44px', minWidth: '44px' }}
                  aria-label={`Go to step ${idx + 1}`}
                  disabled={isTransitioning}
                >
                  {/* Ink droplet shape */}
                  <div className="relative">
                    <svg
                      width="20"
                      height="24"
                      viewBox="0 0 20 24"
                      className={`transition-all duration-500 ${
                        idx === displayStep
                          ? 'scale-125'
                          : 'scale-100 group-hover:scale-110'
                      }`}
                    >
                      <path
                        d="M10 2 Q6 8 6 13 Q6 18 10 20 Q14 18 14 13 Q14 8 10 2 Z"
                        fill={
                          idx === displayStep
                            ? darkMode ? 'rgba(167, 139, 250, 0.9)' : 'rgba(99, 102, 241, 0.8)'
                            : idx < displayStep
                            ? darkMode ? 'rgba(167, 139, 250, 0.5)' : 'rgba(99, 102, 241, 0.4)'
                            : darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)'
                        }
                        className="transition-all duration-500"
                      />
                      {idx === displayStep && (
                        <circle
                          cx="10"
                          cy="12"
                          r="3"
                          fill={darkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.5)'}
                          opacity="0"
                          style={{ animation: 'dropletPulse 2s ease-in-out infinite' }}
                        />
                      )}
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Navigation buttons with ink ripple effect */}
          <div className="flex items-center gap-4 mt-8 w-full max-w-md">
            {displayStep > 0 && (
              <button
                onClick={() => onStepChange(displayStep - 1)}
                disabled={isTransitioning}
                className={`flex-1 px-6 py-4 ${buttonSecondary} rounded-xl transition-all duration-300 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ minHeight: '44px' }}
              >
                <span className="relative z-10 font-medium tracking-wide">Previous</span>
                {/* Subtle ink wash on hover */}
                <div className={`absolute inset-0 ${accentBg} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              </button>
            )}
            <button
              onClick={displayStep < steps.length - 1 ? () => onStepChange(displayStep + 1) : onClose}
              disabled={isTransitioning}
              className={`flex-1 px-8 py-5 ${buttonPrimary} rounded-xl shadow-lg transition-all duration-300 group relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed`}
              style={{ minHeight: '44px' }}
            >
              <span className="relative z-10 font-medium tracking-wider block">
                {displayStep < steps.length - 1 ? 'Continue' : 'Begin Exploring'}
              </span>
              <span className="relative z-10 font-amiri text-sm mt-1 opacity-90 block" dir="rtl">
                {displayStep < steps.length - 1 ? 'استمر' : 'ابدأ الاستكشاف'}
              </span>
              {/* Ink ripple on hover */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{
                  background: darkMode
                    ? 'radial-gradient(circle at center, rgba(139, 92, 246, 0.3) 0%, transparent 70%)'
                    : 'radial-gradient(circle at center, rgba(99, 102, 241, 0.2) 0%, transparent 70%)',
                  animation: 'rippleExpand 1.5s ease-out infinite'
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1) translate(0, 0);
            opacity: 0.18;
          }
          50% {
            transform: scale(1.12) translate(1.5%, 1.5%);
            opacity: 0.28;
          }
        }

        @keyframes inkBlast {
          0% {
            r: 0;
            opacity: 0.5;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            r: 120;
            opacity: 0;
          }
        }

        @keyframes calligraphyFloat {
          0%, 100% {
            transform: translateY(0) translateX(0) rotate(0deg);
            opacity: 0.12;
          }
          25% {
            opacity: 0.18;
          }
          50% {
            transform: translateY(-20px) translateX(8px) rotate(5deg);
            opacity: 0.15;
          }
          75% {
            opacity: 0.1;
          }
        }

        @keyframes inkFloat {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.12;
          }
          25% {
            opacity: 0.2;
          }
          50% {
            transform: translateY(-18px) translateX(6px);
            opacity: 0.16;
          }
          75% {
            opacity: 0.08;
          }
        }

        @keyframes inkDrip {
          0%, 100% {
            transform: translateY(0) scaleY(1);
            opacity: 0.6;
          }
          50% {
            transform: translateY(4px) scaleY(1.3);
            opacity: 0.4;
          }
        }

        @keyframes shimmer {
          0%, 100% {
            opacity: 0;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.5);
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.35;
          }
          50% {
            transform: scale(1.25);
            opacity: 0.22;
          }
        }

        @keyframes orbit {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) translateX(60px) rotate(0deg);
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
          100% {
            transform: translate(-50%, -50%) rotate(360deg) translateX(60px) rotate(-360deg);
            opacity: 0.3;
          }
        }

        @keyframes dropletPulse {
          0%, 100% {
            opacity: 0;
            r: 2;
          }
          50% {
            opacity: 0.5;
            r: 4;
          }
        }

        @keyframes rippleExpand {
          0% {
            transform: scale(0.8);
            opacity: 0.4;
          }
          100% {
            transform: scale(1.8);
            opacity: 0;
          }
        }

        /* Respect reduced motion preference */
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
