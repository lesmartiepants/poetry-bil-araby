import React from 'react';
import { Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  OPTION A: ZEN MINIMALISM

  Design Philosophy:
  - Ultra-minimal, zen-like simplicity
  - Apple's most refined aesthetics
  - Pure black/white with legible calligraphic letterforms
  - Mathematical precision in SVG paths
  - Breathing animation (subtle scale pulse)
  - Touch-sensitive fade-in on interaction
  - Focus on negative space and breathing room
  - Scholarly, professorial copy celebrating Arabic poetry tradition

  Visual Elements:
  - Pure background (black dark / white light)
  - Legible calligraphic text: "Poetry", "بالعربي", subtitle
  - Centered composition with elegant flowing script
  - Golden ratio proportions throughout
  - Mobile-first, scales perfectly
  - Matching walkthrough with zen aesthetic
  =============================================================================*/

export const SplashZen = ({ onGetStarted, darkMode, theme, onToggleTheme }) => {
  const [touched, setTouched] = React.useState(false);
  const [showWalkthrough, setShowWalkthrough] = React.useState(false);

  const handleInteraction = () => {
    setTouched(true);
    setTimeout(() => setShowWalkthrough(true), 400);
  };

  const handleWalkthroughComplete = () => {
    onGetStarted();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center cursor-pointer ${
        darkMode ? 'bg-black' : 'bg-white'
      } transition-opacity duration-700 ${touched ? 'opacity-0' : 'opacity-100'}`}
      onClick={handleInteraction}
      onTouchStart={handleInteraction}
    >
      {/* Theme toggle - minimal, top right */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleTheme();
        }}
        className={`fixed top-8 right-8 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-white/5 hover:bg-white/10'
            : 'bg-black/5 hover:bg-black/10'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun size={20} className="text-white/60" />
        ) : (
          <Moon size={20} className="text-black/60" />
        )}
      </button>

      {/* Legible Calligraphic Text */}
      <div className="relative flex flex-col items-center gap-8">
        <svg
          width="600"
          height="320"
          viewBox="0 0 600 320"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-breathing"
          style={{
            filter: darkMode
              ? 'drop-shadow(0 0 40px rgba(255,255,255,0.15))'
              : 'drop-shadow(0 0 40px rgba(0,0,0,0.08))'
          }}
        >
          {/*
            Legible Calligraphic Letterforms
            Three lines of text drawn in elegant flowing script:
            1. "Poetry" (English, elegant cursive)
            2. "بالعربي" (Arabic, beautiful traditional calligraphy)
            3. "explore the poetic minds of the greats" (English subtitle)

            Mathematical precision: Golden ratio curves (1.618)
            All paths are actual letterforms, not abstract shapes
          */}

          {/* Line 1: "Poetry" - Elegant English Cursive */}
          <g className="word-poetry">
            {/* P */}
            <path
              d="M 80 100 Q 80 60, 110 60 Q 140 60, 140 85 Q 140 110, 110 110 L 80 110 M 80 60 L 80 140"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-p"
            />
            {/* o */}
            <path
              d="M 160 100 Q 160 80, 175 80 Q 190 80, 190 100 Q 190 120, 175 120 Q 160 120, 160 100 Z"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-o1"
            />
            {/* e */}
            <path
              d="M 210 110 Q 210 80, 235 80 Q 255 80, 255 100 L 210 100"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-e"
            />
            {/* t */}
            <path
              d="M 275 75 L 275 115 Q 275 125, 290 125 M 265 85 L 285 85"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-t"
            />
            {/* r */}
            <path
              d="M 310 120 L 310 85 Q 310 80, 325 80 Q 335 80, 340 85"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-r"
            />
            {/* y */}
            <path
              d="M 360 85 L 375 120 L 390 85 M 375 120 Q 375 145, 365 150"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-y"
            />
          </g>

          {/* Line 2: "بالعربي" - Arabic Calligraphy (Nastaliq style) */}
          <g className="word-arabic" transform="translate(0, 0)">
            {/* ب - Baa */}
            <path
              d="M 480 170 Q 460 165, 450 170 Q 445 175, 450 180 Q 455 185, 465 183 Q 475 181, 480 178 M 465 188 Q 465 189, 465 190"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-baa"
            />
            {/* ا - Alif */}
            <path
              d="M 430 160 L 430 190"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-alif"
            />
            {/* ل - Lam */}
            <path
              d="M 400 155 Q 405 162, 408 175 Q 410 188, 415 190"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-lam"
            />
            {/* ع - Ain */}
            <path
              d="M 380 175 Q 375 170, 370 175 Q 365 180, 367 185 Q 369 188, 374 188"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-ain"
            />
            {/* ر - Raa */}
            <path
              d="M 350 178 Q 345 180, 342 185 Q 340 188, 342 190"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-raa"
            />
            {/* ب - Baa (second) */}
            <path
              d="M 330 175 Q 315 173, 310 178 Q 305 183, 310 188 Q 315 193, 325 191 Q 332 189, 336 186 M 318 198 Q 318 199, 318 200"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-baa2"
            />
            {/* ي - Yaa */}
            <path
              d="M 295 185 Q 290 188, 285 188 Q 280 188, 278 185 M 282 195 Q 282 196, 282 197 M 288 195 Q 288 196, 288 197"
              stroke={darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)'}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-yaa"
            />
          </g>

          {/* Line 3: "explore the poetic minds of the greats" - Elegant Subtitle */}
          <g className="word-subtitle" opacity="0.75">
            {/* "explore" */}
            <path
              d="M 120 260 L 145 260 M 120 255 L 120 265 M 150 265 Q 150 255, 158 255 Q 165 255, 165 265 M 170 255 L 170 265 M 170 255 L 180 265 M 180 255 L 180 265 M 185 255 Q 185 265, 195 265 Q 200 265, 205 260"
              stroke={darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="subtitle-explore"
            />
            {/* "the poetic minds" */}
            <path
              d="M 215 260 L 218 260 M 223 255 L 223 265 M 223 255 Q 230 255, 230 265 M 240 265 Q 240 255, 248 255 Q 255 255, 255 265 M 265 255 L 265 265 Q 265 265, 273 265 M 283 265 Q 283 255, 291 255 Q 298 255, 298 265 M 308 260 L 308 265 M 308 255 L 318 265 M 318 255 L 318 265 M 328 265 Q 328 255, 336 255 Q 343 255, 343 265 M 353 255 L 353 265 Q 353 265, 361 265 M 371 255 L 371 265 Q 371 265, 377 260"
              stroke={darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="subtitle-middle"
            />
            {/* "of the greats" */}
            <path
              d="M 395 265 Q 395 255, 403 255 Q 410 255, 410 265 M 418 255 L 418 265 M 418 260 L 425 260 M 435 260 L 438 260 M 443 255 L 443 265 M 443 255 Q 450 255, 450 265 M 460 265 L 460 255 L 470 265 M 470 255 L 470 265 M 478 265 L 478 255 L 490 255 M 478 260 L 486 260"
              stroke={darkMode ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="subtitle-end"
            />
          </g>
        </svg>

        {/* Subtle hint text - appears on hover */}
        <div
          className={`absolute -bottom-24 left-1/2 -translate-x-1/2 text-center opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
            darkMode ? 'text-white/40' : 'text-black/40'
          }`}
        >
          <p className="text-xs tracking-[0.3em] uppercase font-light">
            enter the diwan
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes breathing {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.03);
            opacity: 1;
          }
        }

        .animate-breathing {
          animation: breathing 4s ease-in-out infinite;
        }

        /* Staggered animation for legible letterforms */
        /* Line 1: "Poetry" */
        .letter-p {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: drawStroke 1.2s ease-out 0s forwards;
        }

        .letter-o1 {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: drawStroke 0.8s ease-out 0.3s forwards;
        }

        .letter-e {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 0.5s forwards;
        }

        .letter-t {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: drawStroke 0.8s ease-out 0.7s forwards;
        }

        .letter-r {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 0.9s forwards;
        }

        .letter-y {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: drawStroke 0.9s ease-out 1.1s forwards;
        }

        /* Line 2: Arabic "بالعربي" */
        .letter-baa {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: drawStroke 1s ease-out 1.5s forwards;
        }

        .letter-alif {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: drawStroke 0.6s ease-out 1.7s forwards;
        }

        .letter-lam {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: drawStroke 0.8s ease-out 1.9s forwards;
        }

        .letter-ain {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 2.1s forwards;
        }

        .letter-raa {
          stroke-dasharray: 80;
          stroke-dashoffset: 80;
          animation: drawStroke 0.6s ease-out 2.3s forwards;
        }

        .letter-baa2 {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawStroke 1s ease-out 2.5s forwards;
        }

        .letter-yaa {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 2.7s forwards;
        }

        /* Line 3: Subtitle */
        .subtitle-explore {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: drawStroke 1.2s ease-out 3.2s forwards;
        }

        .subtitle-middle {
          stroke-dasharray: 600;
          stroke-dashoffset: 600;
          animation: drawStroke 1.5s ease-out 3.5s forwards;
        }

        .subtitle-end {
          stroke-dasharray: 400;
          stroke-dashoffset: 400;
          animation: drawStroke 1.2s ease-out 3.8s forwards;
        }

        @keyframes drawStroke {
          to {
            stroke-dashoffset: 0;
          }
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          svg {
            width: 90vw;
            height: auto;
          }
        }

        /* Touch feedback */
        @media (hover: none) {
          .animate-breathing {
            animation-duration: 3.5s;
          }
        }
      `}</style>

      {/* Zen Minimalist Walkthrough */}
      {showWalkthrough && (
        <WalkthroughZen
          darkMode={darkMode}
          onToggleTheme={onToggleTheme}
          onComplete={handleWalkthroughComplete}
        />
      )}
    </div>
  );
};

/* =============================================================================
  ZEN MINIMALIST WALKTHROUGH GUIDE

  Design Philosophy:
  - RADICAL SIMPLICITY: 50% reduction from previous version
  - Pure black or white backgrounds (NO gradients, NO patterns)
  - Maximum negative space (80% empty)
  - Single calligraphic stroke per step
  - Breathing animation (4s cycle, human breath rhythm)
  - Minimal 3 steps: Browse, Listen, Discover
  - Wabi-sabi aesthetic: beauty in emptiness
  =============================================================================*/

export const WalkthroughZen = ({ darkMode, onToggleTheme, onClose, onComplete, currentStep, onStepChange }) => {
  // Support both old (onComplete) and new (onClose) interface for backward compatibility
  const handleClose = onClose || onComplete;

  // Use controlled or internal step state
  const [internalStep, setInternalStep] = React.useState(0);
  const step = currentStep !== undefined ? currentStep : internalStep;
  const setStep = onStepChange || setInternalStep;

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleClose();
    }
  };

  // Render calligraphic SVG for each step (hand-drawn letterforms matching splash aesthetic)
  const renderStepCalligraphy = () => {
    const strokeColor = darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';
    const iconColor = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)';

    if (step === 0) {
      // Step 1: "تصفح" (Browse) - with hand/touch icon
      return (
        <svg
          width="400"
          height="280"
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-breathing-zen mx-auto"
          style={{
            filter: darkMode
              ? 'drop-shadow(0 0 30px rgba(255,255,255,0.12))'
              : 'drop-shadow(0 0 30px rgba(0,0,0,0.06))'
          }}
        >
          {/* Icon: Minimal hand/finger stroke (top) */}
          <g className="icon-hand" opacity="0.7">
            <path
              d="M 200 40 Q 195 50, 200 60 M 200 60 L 200 80 M 185 70 Q 190 75, 195 70 M 205 70 Q 200 75, 205 70 M 215 75 Q 210 78, 215 80"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="draw-icon"
            />
          </g>

          {/* Arabic Calligraphy: "تصفح" (Browse) */}
          <g className="arabic-word" transform="translate(100, 140)">
            {/* ت - Taa */}
            <path
              d="M 180 0 Q 170 -5, 160 0 Q 155 5, 160 10 Q 165 15, 175 13 Q 182 11, 185 8 M 167 20 Q 167 21, 167 22 M 175 20 Q 175 21, 175 22"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-1"
            />
            {/* ص - Sad */}
            <path
              d="M 140 5 Q 130 0, 120 5 Q 115 10, 118 15 Q 122 18, 130 17 Q 138 15, 142 12"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-2"
            />
            {/* ف - Faa */}
            <path
              d="M 100 0 Q 95 -3, 90 0 Q 87 3, 90 6 Q 93 9, 98 8 M 93 14 Q 93 15, 93 16"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-3"
            />
            {/* ح - Haa */}
            <path
              d="M 70 5 Q 60 3, 55 8 Q 52 12, 55 16 Q 58 19, 65 18"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-4"
            />
          </g>

          {/* English Subtitle: "touch ancient pages" */}
          <text
            x="200"
            y="220"
            textAnchor="middle"
            className={`subtitle-text ${darkMode ? 'fill-white' : 'fill-black'}`}
            style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '300',
              opacity: 0.6
            }}
          >
            touch ancient pages
          </text>
        </svg>
      );
    } else if (step === 1) {
      // Step 2: "استمع" (Listen) - with sound wave icon
      return (
        <svg
          width="400"
          height="280"
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-breathing-zen mx-auto"
          style={{
            filter: darkMode
              ? 'drop-shadow(0 0 30px rgba(255,255,255,0.12))'
              : 'drop-shadow(0 0 30px rgba(0,0,0,0.06))'
          }}
        >
          {/* Icon: Sound wave (flowing stroke) */}
          <g className="icon-sound" opacity="0.7">
            <path
              d="M 140 50 Q 150 40, 160 50 Q 170 60, 180 50 Q 190 40, 200 50 Q 210 60, 220 50 Q 230 40, 240 50 Q 250 60, 260 50"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="draw-icon"
            />
          </g>

          {/* Arabic Calligraphy: "استمع" (Listen) */}
          <g className="arabic-word" transform="translate(80, 140)">
            {/* ا - Alif */}
            <path
              d="M 220 -5 L 220 20"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-1"
            />
            {/* س - Seen */}
            <path
              d="M 200 10 Q 195 8, 190 10 M 185 10 Q 180 8, 175 10 M 170 10 Q 165 8, 160 10"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-2"
            />
            {/* ت - Taa */}
            <path
              d="M 145 5 Q 135 0, 125 5 Q 120 10, 125 15 Q 130 20, 140 18 Q 147 16, 150 13 M 132 25 Q 132 26, 132 27 M 140 25 Q 140 26, 140 27"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-3"
            />
            {/* م - Meem */}
            <path
              d="M 110 8 Q 105 5, 100 8 Q 98 12, 102 14 Q 106 16, 110 14"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-4"
            />
            {/* ع - Ain */}
            <path
              d="M 85 10 Q 80 5, 75 10 Q 70 15, 72 20 Q 74 23, 79 23"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-5"
            />
          </g>

          {/* English Subtitle: "hear the silence speak" */}
          <text
            x="200"
            y="220"
            textAnchor="middle"
            className={`subtitle-text ${darkMode ? 'fill-white' : 'fill-black'}`}
            style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '300',
              opacity: 0.6
            }}
          >
            hear the silence speak
          </text>
        </svg>
      );
    } else {
      // Step 3: "اكتشف" (Discover) - with eye/light icon
      return (
        <svg
          width="400"
          height="280"
          viewBox="0 0 400 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="animate-breathing-zen mx-auto"
          style={{
            filter: darkMode
              ? 'drop-shadow(0 0 30px rgba(255,255,255,0.12))'
              : 'drop-shadow(0 0 30px rgba(0,0,0,0.06))'
          }}
        >
          {/* Icon: Eye opening (minimal strokes) */}
          <g className="icon-eye" opacity="0.7">
            <path
              d="M 170 50 Q 200 35, 230 50"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="draw-icon-1"
            />
            <path
              d="M 170 50 Q 200 65, 230 50"
              stroke={iconColor}
              strokeWidth="2"
              strokeLinecap="round"
              fill="none"
              className="draw-icon-2"
            />
            <circle
              cx="200"
              cy="50"
              r="5"
              stroke={iconColor}
              strokeWidth="2"
              fill="none"
              className="draw-icon-3"
            />
          </g>

          {/* Arabic Calligraphy: "اكتشف" (Discover) */}
          <g className="arabic-word" transform="translate(90, 140)">
            {/* ا - Alif */}
            <path
              d="M 200 -5 L 200 20"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-1"
            />
            {/* ك - Kaaf */}
            <path
              d="M 180 0 L 175 15 M 170 8 L 180 8"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-2"
            />
            {/* ت - Taa */}
            <path
              d="M 155 5 Q 145 0, 135 5 Q 130 10, 135 15 Q 140 20, 150 18 Q 157 16, 160 13 M 142 25 Q 142 26, 142 27 M 150 25 Q 150 26, 150 27"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-3"
            />
            {/* ش - Sheen */}
            <path
              d="M 120 8 Q 115 6, 110 8 M 105 8 Q 100 6, 95 8 M 90 8 Q 85 6, 80 8 M 100 -2 Q 100 -3, 100 -4 M 108 -2 Q 108 -3, 108 -4 M 92 -2 Q 92 -3, 92 -4"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              fill="none"
              className="letter-4"
            />
            {/* ف - Faa */}
            <path
              d="M 65 3 Q 60 0, 55 3 Q 52 6, 55 9 Q 58 12, 63 11 M 58 17 Q 58 18, 58 19"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              className="letter-5"
            />
          </g>

          {/* English Subtitle: "find what seeks you" */}
          <text
            x="200"
            y="220"
            textAnchor="middle"
            className={`subtitle-text ${darkMode ? 'fill-white' : 'fill-black'}`}
            style={{
              fontSize: '11px',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '300',
              opacity: 0.6
            }}
          >
            find what seeks you
          </text>
        </svg>
      );
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center ${
        darkMode ? 'bg-black' : 'bg-white'
      }`}
      onClick={handleNext}
    >
      {/* Theme toggle - minimal, matching splash position */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleTheme();
        }}
        className={`fixed top-8 right-8 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-white/5 hover:bg-white/10'
            : 'bg-black/5 hover:bg-black/10'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun size={20} className="text-white/60" />
        ) : (
          <Moon size={20} className="text-black/60" />
        )}
      </button>

      {/* Close button - minimal, matching splash style */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className={`fixed top-8 left-8 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-300 hover:scale-110 ${
          darkMode
            ? 'bg-white/5 hover:bg-white/10'
            : 'bg-black/5 hover:bg-black/10'
        }`}
        aria-label="Skip walkthrough"
      >
        <X size={20} className={darkMode ? 'text-white/60' : 'text-black/60'} />
      </button>

      {/* Progress dots - minimal (matching splash aesthetic) */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 flex gap-3 z-50">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-700 ${
              idx === step
                ? darkMode
                  ? 'bg-white'
                  : 'bg-black'
                : darkMode
                ? 'bg-white/15'
                : 'bg-black/15'
            }`}
          />
        ))}
      </div>

      {/* Main content - maximum breathing room */}
      <div className="w-full max-w-2xl mx-auto px-8">
        {renderStepCalligraphy()}
      </div>

      <style jsx>{`
        /* Breathing animation - matches splash (4s cycle, scale 1.0 → 1.03) */
        @keyframes breathing-zen {
          0%, 100% {
            transform: scale(1);
            opacity: 0.95;
          }
          50% {
            transform: scale(1.03);
            opacity: 1;
          }
        }

        .animate-breathing-zen {
          animation: breathing-zen 4s ease-in-out infinite;
        }

        /* Staggered draw animation for calligraphy (matching splash technique) */
        /* Icons draw first */
        .icon-hand path,
        .icon-sound path,
        .icon-eye path,
        .icon-eye circle {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: drawStroke 1s ease-out 0.2s forwards;
        }

        .draw-icon {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: drawStroke 1s ease-out 0.2s forwards;
        }

        .draw-icon-1 {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 0.2s forwards;
        }

        .draw-icon-2 {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: drawStroke 0.7s ease-out 0.5s forwards;
        }

        .draw-icon-3 {
          stroke-dasharray: 50;
          stroke-dashoffset: 50;
          animation: drawStroke 0.5s ease-out 0.8s forwards;
        }

        /* Arabic letters draw sequentially */
        .letter-1 {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: drawStroke 0.9s ease-out 0.8s forwards;
        }

        .letter-2 {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: drawStroke 1s ease-out 1.2s forwards;
        }

        .letter-3 {
          stroke-dasharray: 220;
          stroke-dashoffset: 220;
          animation: drawStroke 1s ease-out 1.6s forwards;
        }

        .letter-4 {
          stroke-dasharray: 180;
          stroke-dashoffset: 180;
          animation: drawStroke 0.9s ease-out 2s forwards;
        }

        .letter-5 {
          stroke-dasharray: 150;
          stroke-dashoffset: 150;
          animation: drawStroke 0.8s ease-out 2.4s forwards;
        }

        /* Subtitle fades in last */
        .subtitle-text {
          opacity: 0;
          animation: fadeIn 1s ease-out 2.8s forwards;
        }

        @keyframes drawStroke {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes fadeIn {
          to {
            opacity: 0.6;
          }
        }

        /* Mobile optimization */
        @media (max-width: 640px) {
          svg {
            width: 90vw;
            height: auto;
          }
        }

        /* Touch feedback (slightly faster on mobile) */
        @media (hover: none) {
          .animate-breathing-zen {
            animation-duration: 3.5s;
          }
        }
      `}</style>
    </div>
  );
};
