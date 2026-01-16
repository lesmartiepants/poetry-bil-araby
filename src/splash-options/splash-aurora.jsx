import React from 'react';
import { PenTool, Moon, Sun, X, Sparkles, ChevronRight, Volume2 } from 'lucide-react';

/* =============================================================================
  OPTION H: AURORA BOREALIS SPLASH SCREEN

  Design Philosophy: Flowing aurora colors representing poetic inspiration
  Voice: Ethereal and mesmerizing
  Priority: Mobile-first, no hard edges - all organic flows
  =============================================================================*/

/* =============================================================================
  SVG AURORA GRADIENTS & EFFECTS
  Advanced gradient meshes creating northern lights effect
  =============================================================================*/

const AuroraGradients = () => (
  <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Primary Aurora Wave - Indigo to Purple */}
      <radialGradient id="aurora-wave-1" cx="30%" cy="20%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4">
          <animate
            attributeName="stop-opacity"
            values="0.4;0.6;0.4"
            dur="4s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.25">
          <animate
            attributeName="stop-opacity"
            values="0.25;0.4;0.25"
            dur="5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
      </radialGradient>

      {/* Secondary Aurora Wave - Purple to Teal */}
      <radialGradient id="aurora-wave-2" cx="70%" cy="30%">
        <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.35">
          <animate
            attributeName="stop-opacity"
            values="0.35;0.55;0.35"
            dur="6s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#2dd4bf" stopOpacity="0.2">
          <animate
            attributeName="stop-opacity"
            values="0.2;0.35;0.2"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
      </radialGradient>

      {/* Tertiary Aurora Wave - Teal to Indigo */}
      <radialGradient id="aurora-wave-3" cx="50%" cy="60%">
        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.3">
          <animate
            attributeName="stop-opacity"
            values="0.3;0.5;0.3"
            dur="5.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#6366f1" stopOpacity="0.15">
          <animate
            attributeName="stop-opacity"
            values="0.15;0.3;0.15"
            dur="6.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
      </radialGradient>

      {/* Light Mode Aurora - Softer colors */}
      <radialGradient id="aurora-light-1" cx="30%" cy="20%">
        <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25">
          <animate
            attributeName="stop-opacity"
            values="0.25;0.4;0.25"
            dur="4s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.15">
          <animate
            attributeName="stop-opacity"
            values="0.15;0.25;0.15"
            dur="5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="aurora-light-2" cx="70%" cy="30%">
        <stop offset="0%" stopColor="#c4b5fd" stopOpacity="0.2">
          <animate
            attributeName="stop-opacity"
            values="0.2;0.35;0.2"
            dur="6s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#5eead4" stopOpacity="0.12">
          <animate
            attributeName="stop-opacity"
            values="0.12;0.2;0.12"
            dur="4.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="aurora-light-3" cx="50%" cy="60%">
        <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.18">
          <animate
            attributeName="stop-opacity"
            values="0.18;0.3;0.18"
            dur="5.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="50%" stopColor="#818cf8" stopOpacity="0.1">
          <animate
            attributeName="stop-opacity"
            values="0.1;0.18;0.1"
            dur="6.5s"
            repeatCount="indefinite"
          />
        </stop>
        <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
      </radialGradient>

      {/* Shimmer effect - Linear gradient for text */}
      <linearGradient id="shimmer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
        <stop offset="33%" stopColor="#8b5cf6" stopOpacity="0.9" />
        <stop offset="66%" stopColor="#14b8a6" stopOpacity="0.8" />
        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.7" />
      </linearGradient>

      {/* Gaussian blur for soft edges */}
      <filter id="aurora-blur">
        <feGaussianBlur in="SourceGraphic" stdDeviation="40" />
        <feColorMatrix type="saturate" values="1.5" />
      </filter>

      <filter id="aurora-blur-light">
        <feGaussianBlur in="SourceGraphic" stdDeviation="50" />
        <feColorMatrix type="saturate" values="1.3" />
      </filter>
    </defs>
  </svg>
);

/* =============================================================================
  FLOWING AURORA SHAPES
  Organic blob shapes with animated transforms
  =============================================================================*/

const AuroraShapes = ({ darkMode }) => {
  const filter = darkMode ? 'url(#aurora-blur)' : 'url(#aurora-blur-light)';
  const wave1 = darkMode ? 'url(#aurora-wave-1)' : 'url(#aurora-light-1)';
  const wave2 = darkMode ? 'aurora-wave-2' : 'aurora-light-2';
  const wave3 = darkMode ? 'aurora-wave-3' : 'aurora-light-3';

  return (
    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* First Aurora Layer - Top */}
      <ellipse
        cx="30%"
        cy="20%"
        rx="40%"
        ry="25%"
        fill={wave1}
        filter={filter}
        style={{
          animation: 'aurora-drift-1 20s ease-in-out infinite',
          transformOrigin: '30% 20%'
        }}
      />

      {/* Second Aurora Layer - Right */}
      <ellipse
        cx="70%"
        cy="35%"
        rx="35%"
        ry="30%"
        fill={`url(#${wave2})`}
        filter={filter}
        style={{
          animation: 'aurora-drift-2 25s ease-in-out infinite',
          transformOrigin: '70% 35%'
        }}
      />

      {/* Third Aurora Layer - Bottom */}
      <ellipse
        cx="50%"
        cy="65%"
        rx="45%"
        ry="28%"
        fill={`url(#${wave3})`}
        filter={filter}
        style={{
          animation: 'aurora-drift-3 22s ease-in-out infinite',
          transformOrigin: '50% 65%'
        }}
      />

      {/* Fourth Aurora Layer - Overlay blend */}
      <ellipse
        cx="40%"
        cy="50%"
        rx="38%"
        ry="32%"
        fill={wave1}
        filter={filter}
        opacity="0.4"
        style={{
          animation: 'aurora-drift-4 18s ease-in-out infinite',
          transformOrigin: '40% 50%'
        }}
      />
    </svg>
  );
};

/* =============================================================================
  SHIMMER STARS
  Subtle twinkling particles
  =============================================================================*/

const ShimmerStars = ({ darkMode }) => {
  const starColor = darkMode ? 'rgba(139, 92, 246, 0.4)' : 'rgba(139, 92, 246, 0.25)';
  const stars = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    delay: Math.random() * 3
  }));

  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      {stars.map((star) => (
        <circle
          key={star.id}
          cx={`${star.x}%`}
          cy={`${star.y}%`}
          r={star.size}
          fill={starColor}
          style={{
            animation: `shimmer-twinkle 3s ease-in-out ${star.delay}s infinite`
          }}
        />
      ))}
    </svg>
  );
};

/* =============================================================================
  MAIN AURORA SPLASH COMPONENT
  =============================================================================*/

export const SplashAurora = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const bgColor = darkMode ? 'bg-[#0a0a0f]' : 'bg-[#f8f9fc]';
  const textColor = darkMode ? 'text-white' : 'text-stone-900';
  const subtleText = darkMode ? 'text-stone-300' : 'text-stone-600';
  const buttonBorder = darkMode ? 'border-indigo-400/40' : 'border-indigo-500/30';
  const buttonHoverBg = darkMode ? 'hover:bg-indigo-500/10' : 'hover:bg-indigo-50';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* SVG Gradient Definitions */}
      <AuroraGradients />

      {/* Flowing Aurora Background */}
      <div className="absolute inset-0">
        <AuroraShapes darkMode={darkMode} />
      </div>

      {/* Shimmer Stars */}
      <ShimmerStars darkMode={darkMode} />

      {/* Vignette effect - soften edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at center, transparent 0%, rgba(10, 10, 15, 0.4) 100%)'
            : 'radial-gradient(ellipse at center, transparent 0%, rgba(248, 249, 252, 0.3) 100%)'
        }}
      />

      {/* Theme toggle - minimal, top-right */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center backdrop-blur-md border ${buttonBorder} ${buttonHoverBg} transition-all duration-300`}
        style={{
          background: darkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)'
        }}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={textColor} /> : <Moon size={18} className={textColor} />}
      </button>

      {/* Main content - Emerges from the light */}
      <div
        className="relative max-w-2xl mx-6 text-center space-y-10 md:space-y-12"
        style={{
          animation: 'aurora-emerge 1.5s ease-out forwards',
          zIndex: 10
        }}
      >
        {/* Logo with PenTool - Glowing effect */}
        <div className="flex flex-col items-center gap-5">
          <div
            className="relative"
            style={{
              filter: darkMode
                ? 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))'
                : 'drop-shadow(0 0 15px rgba(139, 92, 246, 0.3))'
            }}
          >
            <PenTool
              size={52}
              strokeWidth={1.5}
              className="text-indigo-400"
            />
          </div>

          <div className="flex flex-row-reverse items-center gap-4">
            <h1 className="flex items-end gap-5">
              <span
                className={`font-brand-ar font-bold ${textColor}`}
                style={{
                  fontSize: 'clamp(2.75rem, 7vw, 4rem)',
                  textShadow: darkMode
                    ? '0 0 30px rgba(139, 92, 246, 0.4)'
                    : '0 0 20px rgba(139, 92, 246, 0.2)'
                }}
              >
                بالعربي
              </span>
              <span
                className={`font-brand-en lowercase tracking-tight ${textColor}`}
                style={{
                  fontSize: 'clamp(3.25rem, 9vw, 5rem)',
                  textShadow: darkMode
                    ? '0 0 30px rgba(99, 102, 241, 0.4)'
                    : '0 0 20px rgba(99, 102, 241, 0.2)'
                }}
              >
                poetry
              </span>
            </h1>
          </div>
        </div>

        {/* Headline - Luminous and professorial */}
        <div className="space-y-5">
          <h2
            className={`font-serif italic font-light leading-tight ${textColor}`}
            style={{
              fontSize: 'clamp(2rem, 5.5vw, 3.75rem)',
              opacity: 0.95
            }}
          >
            Where Verses Illuminate the Soul
          </h2>

          <p
            className={`font-amiri leading-relaxed ${subtleText}`}
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              opacity: 0.8
            }}
          >
            حيث تضيء الأبيات الروح
          </p>
        </div>

        {/* Body copy - Academic yet luminous */}
        <div className="max-w-lg mx-auto">
          <p
            className={`font-brand-en leading-relaxed ${subtleText}`}
            style={{
              fontSize: 'clamp(0.9rem, 2.5vw, 1.15rem)',
              opacity: 0.75
            }}
          >
            Great verses possess an ethereal luminescence—illuminating darkness with beauty, wisdom radiating through cascading words. Each poem flows like celestial light across consciousness, revealing truths that shimmer between the written and the felt.
          </p>
        </div>

        {/* Call to action - Soft glow effect */}
        <button
          onClick={onGetStarted}
          className={`group relative px-12 py-4 border-2 ${buttonBorder} backdrop-blur-xl ${textColor} ${buttonHoverBg} transition-all duration-500 overflow-hidden`}
          style={{
            fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
            animation: 'aurora-emerge 1.5s ease-out 0.4s forwards',
            opacity: 0,
            minHeight: '44px',
            minWidth: '44px',
            borderRadius: '9999px',
            background: darkMode
              ? 'rgba(99, 102, 241, 0.06)'
              : 'rgba(99, 102, 241, 0.04)'
          }}
        >
          <span className="relative z-10 font-brand-en uppercase tracking-[0.25em]">
            Enter the Flow
          </span>
          <span className="relative z-10 block font-amiri text-sm mt-1.5 opacity-70">
            ادخل التدفق
          </span>

          {/* Animated shimmer on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(139, 92, 246, 0.15), rgba(20, 184, 166, 0.15))',
              animation: 'shimmer-slide 3s ease-in-out infinite'
            }}
          />
        </button>

        {/* Metadata - Subtle ethereal text */}
        <div
          className={`text-[10px] font-brand-en uppercase tracking-widest ${subtleText}`}
          style={{
            letterSpacing: '0.25em',
            opacity: 0.4
          }}
        >
          An Ethereal Experience
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes aurora-emerge {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
            filter: blur(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0px);
          }
        }

        @keyframes aurora-drift-1 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(8%, -5%) scale(1.1) rotate(2deg);
          }
          66% {
            transform: translate(-6%, 4%) scale(0.95) rotate(-1deg);
          }
        }

        @keyframes aurora-drift-2 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(-7%, 6%) scale(1.05) rotate(-2deg);
          }
          66% {
            transform: translate(5%, -4%) scale(0.98) rotate(1deg);
          }
        }

        @keyframes aurora-drift-3 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          33% {
            transform: translate(6%, -7%) scale(0.92) rotate(1.5deg);
          }
          66% {
            transform: translate(-8%, 5%) scale(1.08) rotate(-1.5deg);
          }
        }

        @keyframes aurora-drift-4 {
          0%, 100% {
            transform: translate(0, 0) scale(1) rotate(0deg);
          }
          50% {
            transform: translate(-5%, 6%) scale(1.05) rotate(1deg);
          }
        }

        @keyframes shimmer-twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.5);
          }
        }

        @keyframes shimmer-slide {
          0% {
            transform: translateX(-100%) translateY(-100%) rotate(45deg);
          }
          100% {
            transform: translateX(100%) translateY(100%) rotate(45deg);
          }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  AURORA WALKTHROUGH GUIDE - ETHEREAL NARRATIVE FLOW REDESIGN

  Design Philosophy: Floating through the aurora - each step is a new wave of light
  Three-act journey: Dawn (indigo) → Dusk (purple) → Night (teal)
  Enhanced with: liquid transitions, floating cards, aurora-responsive icons, poetic copy
  =============================================================================*/

export const AuroraWalkthrough = ({ onClose, darkMode, currentStep = 0, onStepChange }) => {
  // Theme constants matching splash screen
  const bgColor = darkMode ? 'bg-[#0a0a0f]' : 'bg-[#f8f9fc]';
  const textColor = darkMode ? 'text-white' : 'text-stone-900';
  const subtleText = darkMode ? 'text-stone-300' : 'text-stone-600';
  const glassColor = darkMode ? 'bg-stone-900/30' : 'bg-white/50';
  const borderColor = darkMode ? 'border-indigo-400/30' : 'border-indigo-500/20';
  const buttonBorder = darkMode ? 'border-indigo-400/40' : 'border-indigo-500/30';
  const buttonHoverBg = darkMode ? 'hover:bg-indigo-500/10' : 'hover:bg-indigo-50';

  // 3-step narrative with enhanced poetic copy & aurora definitions
  const steps = [
    {
      // ACT 1: DAWN - Awakening
      title: "Journey Through Verses",
      titleAr: "رحلة عبر الأبيات",
      body: "Journey through luminous verses that span centuries. Each swipe reveals another constellation of words—from al-Mutanabbi's brilliance to Qabbani's passion.",
      // Cool indigo aurora (dawn scene) - positioned left/top
      auroraGradient: darkMode
        ? 'radial-gradient(ellipse at 35% 25%, rgba(99, 102, 241, 0.6) 0%, rgba(139, 92, 246, 0.35) 40%, transparent 75%)'
        : 'radial-gradient(ellipse at 35% 25%, rgba(99, 102, 241, 0.4) 0%, rgba(139, 92, 246, 0.2) 40%, transparent 75%)',
      cardGradient: darkMode
        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.22), rgba(139, 92, 246, 0.12), transparent 65%)'
        : 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.08), transparent 65%)',
      iconColor: 'text-indigo-400',
      iconGlow: darkMode
        ? 'drop-shadow(0 0 30px rgba(99, 102, 241, 0.8))'
        : 'drop-shadow(0 0 20px rgba(99, 102, 241, 0.6))',
      pulseColors: darkMode
        ? 'rgba(99, 102, 241, 0.6), rgba(139, 92, 246, 0.4)'
        : 'rgba(99, 102, 241, 0.4), rgba(139, 92, 246, 0.25)',
      ringGradient: 'conic-gradient(from 0deg, rgba(99, 102, 241, 0.8), rgba(139, 92, 246, 0.8), rgba(99, 102, 241, 0.8))',
      dotGradient: 'from-indigo-500 to-purple-500',
      icon: 'swipe',
      auroraTransform: 'translate(0%, 0%)'
    },
    {
      // ACT 2: DUSK - Immersion
      title: "Hear the Verses Flow",
      titleAr: "اسمع تدفق الأبيات",
      body: "Let ancient words cascade through sound. Press play and feel the rhythm of verses as they were meant to resonate—spoken, sung, eternal.",
      // Warm purple aurora (dusk scene) - positioned center
      auroraGradient: darkMode
        ? 'radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.65) 0%, rgba(192, 132, 252, 0.4) 40%, transparent 75%)'
        : 'radial-gradient(ellipse at 50% 30%, rgba(139, 92, 246, 0.45) 0%, rgba(192, 132, 252, 0.25) 40%, transparent 75%)',
      cardGradient: darkMode
        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(192, 132, 252, 0.15), transparent 65%)'
        : 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(192, 132, 252, 0.1), transparent 65%)',
      iconColor: 'text-purple-400',
      iconGlow: darkMode
        ? 'drop-shadow(0 0 30px rgba(139, 92, 246, 0.9))'
        : 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.7))',
      pulseColors: darkMode
        ? 'rgba(139, 92, 246, 0.65), rgba(192, 132, 252, 0.45)'
        : 'rgba(139, 92, 246, 0.45), rgba(192, 132, 252, 0.3)',
      ringGradient: 'conic-gradient(from 120deg, rgba(139, 92, 246, 0.9), rgba(192, 132, 252, 0.9), rgba(139, 92, 246, 0.9))',
      dotGradient: 'from-purple-500 to-fuchsia-500',
      icon: 'audio',
      auroraTransform: 'translate(5%, -3%)'
    },
    {
      // ACT 3: NIGHT - Revelation
      title: "Unveil the Depths",
      titleAr: "اكشف الأعماق",
      body: "Dive beneath the surface into layered meanings. Unlock translations, historical echoes, and the intricate patterns woven through each verse.",
      // Bright teal aurora (night scene) - positioned right/lower
      auroraGradient: darkMode
        ? 'radial-gradient(ellipse at 65% 35%, rgba(20, 184, 166, 0.7) 0%, rgba(94, 234, 212, 0.45) 40%, transparent 75%)'
        : 'radial-gradient(ellipse at 65% 35%, rgba(20, 184, 166, 0.5) 0%, rgba(94, 234, 212, 0.3) 40%, transparent 75%)',
      cardGradient: darkMode
        ? 'linear-gradient(135deg, rgba(20, 184, 166, 0.28), rgba(94, 234, 212, 0.18), transparent 65%)'
        : 'linear-gradient(135deg, rgba(20, 184, 166, 0.18), rgba(94, 234, 212, 0.1), transparent 65%)',
      iconColor: 'text-teal-400',
      iconGlow: darkMode
        ? 'drop-shadow(0 0 30px rgba(20, 184, 166, 1))'
        : 'drop-shadow(0 0 20px rgba(20, 184, 166, 0.8))',
      pulseColors: darkMode
        ? 'rgba(20, 184, 166, 0.7), rgba(94, 234, 212, 0.5)'
        : 'rgba(20, 184, 166, 0.5), rgba(94, 234, 212, 0.35)',
      ringGradient: 'conic-gradient(from 240deg, rgba(20, 184, 166, 0.95), rgba(94, 234, 212, 0.95), rgba(20, 184, 166, 0.95))',
      dotGradient: 'from-teal-500 to-cyan-400',
      icon: 'insights',
      auroraTransform: 'translate(-5%, 4%)',
      cta: "Start Exploring",
      ctaAr: "ابدأ الاستكشاف"
    }
  ];

  const step = steps[currentStep];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* Aurora Background - Reuse splash components with step-responsive positioning */}
      <AuroraGradients />
      <div
        className="absolute inset-0 transition-transform duration-1200 ease-in-out"
        style={{
          transform: step.auroraTransform
        }}
      >
        <AuroraShapes darkMode={darkMode} />
      </div>
      <ShimmerStars darkMode={darkMode} />

      {/* Step-specific aurora overlay with cinematic 1200ms transitions */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-1200 ease-in-out"
        style={{
          background: step.auroraGradient,
          opacity: 1
        }}
      />

      {/* Ripple effect on step change */}
      <div
        key={currentStep}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 30%, rgba(139, 92, 246, 0.15) 70%, transparent 100%)',
          animation: 'aurora-ripple 1s ease-out forwards'
        }}
      />

      {/* Vignette for content focus */}
      <div
        className="absolute inset-0 backdrop-blur-sm pointer-events-none"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at center, rgba(10, 10, 15, 0.6) 0%, rgba(10, 10, 15, 0.85) 100%)'
            : 'radial-gradient(ellipse at center, rgba(248, 249, 252, 0.65) 0%, rgba(248, 249, 252, 0.9) 100%)'
        }}
      />

      {/* Skip button - top left */}
      <button
        onClick={onClose}
        className={`fixed top-6 left-6 z-50 rounded-full flex items-center gap-2.5 px-5 py-2.5 backdrop-blur-md border ${buttonBorder} ${buttonHoverBg} transition-all duration-300`}
        style={{
          background: darkMode ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.05)',
          minWidth: '44px',
          minHeight: '44px'
        }}
        aria-label="Skip walkthrough and start exploring"
      >
        <X size={18} className={textColor} />
        <span className={`text-xs uppercase tracking-[0.2em] font-medium ${textColor}`}>Skip</span>
      </button>

      {/* Main floating glass morphism card */}
      <div
        className={`relative max-w-2xl mx-6 ${glassColor} backdrop-blur-2xl border-2 ${borderColor} rounded-3xl shadow-2xl overflow-hidden`}
        style={{
          animation: 'aurora-float 6s ease-in-out infinite, aurora-emerge 1.2s ease-out forwards',
          zIndex: 10,
          padding: 'clamp(2.5rem, 6vw, 4rem)'
        }}
      >
        {/* Shimmering border effect */}
        <div
          className="absolute inset-0 pointer-events-none rounded-3xl"
          style={{
            background: `linear-gradient(135deg, transparent 0%, ${darkMode ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)'} 50%, transparent 100%)`,
            animation: 'aurora-border-shimmer 8s ease-in-out infinite'
          }}
        />

        {/* Flowing gradient background within card - shifts with step */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute w-full h-full transition-all duration-1200 ease-in-out"
            style={{
              background: step.cardGradient,
              opacity: 1,
              animation: 'aurora-card-flow 12s ease-in-out infinite'
            }}
          />
        </div>

        {/* Content - Staggered reveal */}
        <div className="flex flex-col items-center gap-8 text-center relative z-10">
          {/* Icon with ethereal aurora glow + rotating gradient ring */}
          <div
            key={`icon-${currentStep}`}
            className="relative transition-all duration-1200 ease-in-out"
            style={{
              filter: step.iconGlow,
              animation: 'aurora-icon-reveal 0.8s ease-out forwards'
            }}
          >
            <div className="relative p-8 rounded-full">
              {/* Rotating aurora ring */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: step.ringGradient,
                  animation: 'aurora-ring-rotate 8s linear infinite',
                  transform: 'scale(1.8)',
                  opacity: darkMode ? 0.3 : 0.2
                }}
              />

              {/* Multi-layer pulsing aurora halo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${step.pulseColors}, transparent 70%)`,
                  animation: 'aurora-pulse-slow 4s ease-in-out infinite',
                  transform: 'scale(1.5)'
                }}
              />
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: `radial-gradient(circle, ${step.pulseColors}, transparent 60%)`,
                  animation: 'aurora-pulse-fast 3s ease-in-out infinite 0.5s',
                  transform: 'scale(1.2)'
                }}
              />

              {/* Icon with smooth cross-fade transitions */}
              <div className="relative z-10 transition-all duration-1200">
                {step.icon === 'swipe' && (
                  <ChevronRight
                    size={56}
                    strokeWidth={1.5}
                    className={`${step.iconColor} transition-all duration-1200`}
                  />
                )}
                {step.icon === 'audio' && (
                  <Volume2
                    size={56}
                    strokeWidth={1.5}
                    className={`${step.iconColor} transition-all duration-1200`}
                  />
                )}
                {step.icon === 'insights' && (
                  <Sparkles
                    size={56}
                    strokeWidth={1.5}
                    className={`${step.iconColor} transition-all duration-1200`}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Typography - Cinematic hierarchy with staggered reveal */}
          <div
            key={`title-${currentStep}`}
            className={`space-y-4 ${textColor}`}
            style={{
              animation: 'aurora-text-reveal 0.8s ease-out 0.2s forwards',
              opacity: 0
            }}
          >
            <h3
              className="font-amiri leading-tight"
              style={{
                fontSize: 'clamp(2.25rem, 5.5vw, 3.5rem)',
                animation: 'aurora-breathe 5s ease-in-out infinite',
                textShadow: darkMode
                  ? '0 0 25px rgba(139, 92, 246, 0.4)'
                  : '0 0 15px rgba(139, 92, 246, 0.25)'
              }}
            >
              {step.titleAr}
            </h3>
            <p
              className="font-brand-en font-light tracking-wide opacity-95"
              style={{
                fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)'
              }}
            >
              {step.title}
            </p>
          </div>

          {/* Body copy - Editorial flow with staggered reveal */}
          <div
            key={`body-${currentStep}`}
            className={`${subtleText} max-w-xl`}
            style={{
              animation: 'aurora-text-reveal 0.8s ease-out 0.4s forwards',
              opacity: 0
            }}
          >
            <p
              className="leading-relaxed opacity-90"
              style={{
                fontSize: 'clamp(0.95rem, 2.2vw, 1.25rem)',
                lineHeight: '1.75'
              }}
            >
              {step.body}
            </p>
          </div>

          {/* Radial progress indicator with aurora glow */}
          <div className="relative mt-8 w-full max-w-xs">
            {/* Step dots with gradient fills */}
            <div className="flex items-center justify-center gap-3.5">
              {steps.map((s, idx) => {
                const isActive = idx === currentStep;
                const isComplete = idx < currentStep;

                return (
                  <div
                    key={idx}
                    className={`relative transition-all duration-500 ease-out bg-gradient-to-r ${s.dotGradient}`}
                    style={{
                      width: isActive ? '52px' : '14px',
                      height: '14px',
                      borderRadius: '7px',
                      opacity: isComplete || isActive ? 1 : 0.25,
                      filter: isActive
                        ? darkMode
                          ? 'drop-shadow(0 0 12px rgba(139, 92, 246, 0.9))'
                          : 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.7))'
                        : 'none'
                    }}
                  />
                );
              })}
            </div>

            {/* Step counter - ethereal typography */}
            <div
              className={`text-center mt-5 uppercase tracking-[0.3em] ${subtleText}`}
              style={{
                fontSize: '10px',
                opacity: 0.45,
                letterSpacing: '0.3em'
              }}
            >
              Step {currentStep + 1} of {steps.length}
            </div>
          </div>

          {/* Navigation buttons - Touch-optimized with aurora effects */}
          <div className="flex items-center gap-4 mt-8 w-full">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                className={`flex-1 px-7 py-3.5 border-2 ${borderColor} rounded-full backdrop-blur-md transition-all duration-300 ${buttonHoverBg} font-medium ${textColor}`}
                style={{
                  background: darkMode ? 'rgba(99, 102, 241, 0.06)' : 'rgba(99, 102, 241, 0.04)',
                  minHeight: '50px',
                  fontSize: 'clamp(0.85rem, 2vw, 1rem)'
                }}
                aria-label="Go to previous step"
              >
                Previous
              </button>
            )}

            <button
              onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
              className={`flex-1 px-7 py-3.5 rounded-full transition-all duration-300 hover:scale-105 font-semibold shadow-xl ${textColor} relative overflow-hidden`}
              style={{
                background: `linear-gradient(135deg, ${step.pulseColors})`,
                boxShadow: darkMode
                  ? '0 4px 30px rgba(139, 92, 246, 0.5)'
                  : '0 4px 25px rgba(139, 92, 246, 0.35)',
                minHeight: '50px',
                fontSize: 'clamp(0.85rem, 2vw, 1rem)'
              }}
              aria-label={currentStep < steps.length - 1 ? 'Continue to next step' : 'Start exploring poetry'}
            >
              {/* Aurora shimmer on hover */}
              <div
                className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-700"
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.2), transparent 50%, rgba(255, 255, 255, 0.2))',
                  animation: 'aurora-shimmer-slide 3s ease-in-out infinite'
                }}
              />

              <div className="flex flex-col items-center gap-1 relative z-10">
                <span className="font-brand-en uppercase tracking-wider">
                  {currentStep < steps.length - 1 ? 'Continue' : step.cta}
                </span>
                {step.ctaAr && currentStep === steps.length - 1 && (
                  <span className="font-amiri text-sm opacity-75">{step.ctaAr}</span>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Animation keyframes - Enhanced with new effects */}
        <style>{`
          @keyframes aurora-float {
            0%, 100% {
              transform: translateY(-8px) rotate(-0.5deg) scale(0.995);
            }
            50% {
              transform: translateY(8px) rotate(0.5deg) scale(1.005);
            }
          }

          @keyframes aurora-breathe {
            0%, 100% {
              transform: scale(1);
              opacity: 1;
            }
            50% {
              transform: scale(1.015);
              opacity: 0.96;
            }
          }

          @keyframes aurora-card-flow {
            0%, 100% {
              transform: translate(0, 0) scale(1) rotate(0deg);
              opacity: 1;
            }
            33% {
              transform: translate(10%, -6%) scale(1.12) rotate(2deg);
              opacity: 0.95;
            }
            66% {
              transform: translate(-10%, 6%) scale(0.92) rotate(-2deg);
              opacity: 0.85;
            }
          }

          @keyframes aurora-pulse-slow {
            0%, 100% {
              opacity: 0.3;
              transform: scale(1.5);
            }
            50% {
              opacity: 0.6;
              transform: scale(1.7);
            }
          }

          @keyframes aurora-pulse-fast {
            0%, 100% {
              opacity: 0.4;
              transform: scale(1.2);
            }
            50% {
              opacity: 0.8;
              transform: scale(1.4);
            }
          }

          @keyframes aurora-ring-rotate {
            0% {
              transform: rotate(0deg) scale(1.8);
            }
            100% {
              transform: rotate(360deg) scale(1.8);
            }
          }

          @keyframes aurora-ripple {
            0% {
              transform: scale(0);
              opacity: 0.8;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }

          @keyframes aurora-icon-reveal {
            0% {
              opacity: 0;
              transform: scale(0.8) translateY(10px);
              filter: blur(8px);
            }
            100% {
              opacity: 1;
              transform: scale(1) translateY(0);
              filter: blur(0px);
            }
          }

          @keyframes aurora-text-reveal {
            0% {
              opacity: 0;
              transform: translateY(15px);
              filter: blur(4px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
              filter: blur(0px);
            }
          }

          @keyframes aurora-border-shimmer {
            0%, 100% {
              opacity: 0.3;
              transform: translateX(-100%);
            }
            50% {
              opacity: 0.6;
              transform: translateX(100%);
            }
          }

          @keyframes aurora-shimmer-slide {
            0% {
              transform: translateX(-100%) translateY(-100%) rotate(45deg);
            }
            100% {
              transform: translateX(100%) translateY(100%) rotate(45deg);
            }
          }
        `}</style>
      </div>
    </div>
  );
};
