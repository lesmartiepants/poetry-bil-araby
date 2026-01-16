import React from 'react';
import { PenTool, Moon, Sun, X, BookOpen, Play, Search, Sparkles } from 'lucide-react';

/* =============================================================================
  OPTION J: BREATHING MANDALA

  Sacred geometry meets classical Arabic poetry. A meditation on the mathematical
  perfection underlying poetic meters and the divine patterns in verse structure.

  Design Philosophy:
  - Islamic mandala patterns represent the mathematical precision of classical meters
  - Breathing animations mirror the rhythm of recitation (in/out, expansion/contraction)
  - Circular/radial layouts reflect the cyclical nature of Arabic prosody
  - Meditative pace honors the contemplative tradition of poetry analysis
  - Sacred geometry connects mathematical beauty to poetic beauty

  Features:
  - Complex SVG mandala pattern with nested geometric shapes
  - Synchronized breathing animation (expand/contract) - mimics tajweed recitation
  - Layers animate at different rates (parallax effect) - depth like layers of meaning
  - Gold/indigo on black (dark) / indigo on cream (light)
  - Hypnotic, calming effect for deep contemplation
  - Matching WalkthroughGuide with mandala-themed interactions
  - Mobile-first responsive design
  =============================================================================*/

export const SplashMandala = ({ onGetStarted, darkMode, onToggleTheme }) => {
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-[#FDFCF8]'} overflow-hidden`}>
      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-12 h-12 rounded-full border-2 ${
          darkMode
            ? 'border-amber-600/40 hover:border-amber-600/60 bg-black/40'
            : 'border-indigo-600/40 hover:border-indigo-600/60 bg-white/40'
        } backdrop-blur-sm flex items-center justify-center transition-all duration-300`}
      >
        {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-indigo-600" />}
      </button>

      {/* Central mandala pattern */}
      <div className="relative w-full h-full flex items-center justify-center">

        {/* Outer rotating ring - slowest */}
        <svg
          className="absolute w-[90vw] h-[90vw] md:w-[600px] md:h-[600px] opacity-20"
          viewBox="0 0 400 400"
          style={{
            animation: 'breatheSlow 8s ease-in-out infinite, rotateSlow 40s linear infinite'
          }}
        >
          {/* Outer circle with petals */}
          <g transform="translate(200, 200)">
            {[...Array(12)].map((_, i) => (
              <g key={`outer-${i}`} transform={`rotate(${i * 30})`}>
                <ellipse
                  cx="0"
                  cy="-160"
                  rx="30"
                  ry="60"
                  fill="none"
                  stroke={darkMode ? '#C5A059' : '#4F46E5'}
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              </g>
            ))}
          </g>
        </svg>

        {/* Middle geometric layer - medium speed */}
        <svg
          className="absolute w-[70vw] h-[70vw] md:w-[480px] md:h-[480px] opacity-30"
          viewBox="0 0 400 400"
          style={{
            animation: 'breatheMedium 6s ease-in-out infinite, rotateReverse 30s linear infinite'
          }}
        >
          <g transform="translate(200, 200)">
            {/* Sacred geometry - 8-pointed star */}
            {[...Array(8)].map((_, i) => (
              <g key={`middle-${i}`} transform={`rotate(${i * 45})`}>
                <path
                  d="M 0,-120 L 15,-100 L 0,-80 L -15,-100 Z"
                  fill={darkMode ? '#C5A059' : '#4F46E5'}
                  opacity="0.4"
                />
                <circle
                  cx="0"
                  cy="-100"
                  r="8"
                  fill="none"
                  stroke={darkMode ? '#C5A059' : '#4F46E5'}
                  strokeWidth="1"
                />
              </g>
            ))}
          </g>
        </svg>

        {/* Inner mandala core - fastest breathing */}
        <svg
          className="absolute w-[50vw] h-[50vw] md:w-[360px] md:h-[360px] opacity-40"
          viewBox="0 0 400 400"
          style={{
            animation: 'breatheFast 4s ease-in-out infinite'
          }}
        >
          <g transform="translate(200, 200)">
            {/* Central rosette */}
            <circle
              cx="0"
              cy="0"
              r="60"
              fill="none"
              stroke={darkMode ? '#6366F1' : '#818CF8'}
              strokeWidth="1"
              opacity="0.8"
            />
            <circle
              cx="0"
              cy="0"
              r="45"
              fill="none"
              stroke={darkMode ? '#C5A059' : '#4F46E5'}
              strokeWidth="1.5"
            />

            {/* Inner petals - 6-fold symmetry */}
            {[...Array(6)].map((_, i) => (
              <g key={`inner-${i}`} transform={`rotate(${i * 60})`}>
                <path
                  d="M 0,-45 Q 15,-60 0,-75 Q -15,-60 0,-45"
                  fill={darkMode ? '#C5A059' : '#4F46E5'}
                  opacity="0.5"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-80"
                  stroke={darkMode ? '#C5A059' : '#4F46E5'}
                  strokeWidth="1"
                  opacity="0.6"
                />
              </g>
            ))}

            {/* Center point */}
            <circle
              cx="0"
              cy="0"
              r="8"
              fill={darkMode ? '#C5A059' : '#4F46E5'}
              opacity="0.8"
            />
          </g>
        </svg>

        {/* Innermost pulse - accent color */}
        <svg
          className="absolute w-[30vw] h-[30vw] md:w-[240px] md:h-[240px]"
          viewBox="0 0 400 400"
          style={{
            animation: 'pulse 3s ease-in-out infinite'
          }}
        >
          <g transform="translate(200, 200)">
            <circle
              cx="0"
              cy="0"
              r="50"
              fill="none"
              stroke={darkMode ? '#6366F1' : '#818CF8'}
              strokeWidth="2"
              opacity="0.4"
              style={{
                animation: 'breatheFast 3s ease-in-out infinite'
              }}
            />
            <circle
              cx="0"
              cy="0"
              r="30"
              fill="none"
              stroke={darkMode ? '#A78BFA' : '#6366F1'}
              strokeWidth="1.5"
              opacity="0.6"
            />
          </g>
        </svg>

        {/* Content overlay - centered above mandala */}
        <div className="relative z-10 text-center max-w-md px-8">
          {/* Logo */}
          <div className="mb-12">
            <div className="flex flex-row-reverse items-center justify-center gap-3 tracking-wide">
              <PenTool
                size={36}
                className={darkMode ? 'text-amber-500' : 'text-indigo-600'}
                strokeWidth={1.5}
                style={{
                  animation: 'breatheFast 4s ease-in-out infinite',
                  transformOrigin: 'center'
                }}
              />
              <h1 className="flex items-end gap-4">
                <span
                  className={`font-brand-ar text-4xl md:text-5xl font-bold mb-1 ${darkMode ? 'text-amber-500' : 'text-indigo-600'}`}
                  style={{
                    animation: 'breatheFast 4s ease-in-out infinite'
                  }}
                >
                  بالعربي
                </span>
                <span
                  className={`font-brand-en text-5xl md:text-6xl lowercase tracking-tighter ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}
                  style={{
                    animation: 'breatheFast 4s ease-in-out infinite'
                  }}
                >
                  poetry
                </span>
              </h1>
            </div>
          </div>

          {/* Sacred Poetry Text - Professor's Voice */}
          <div
            className={`mb-8 ${darkMode ? 'text-stone-400' : 'text-stone-600'} font-brand-en text-sm tracking-wide`}
            style={{
              animation: 'fadeInOut 6s ease-in-out infinite'
            }}
          >
            <p className="leading-relaxed italic">
              Where sacred geometry meets classical meter
            </p>
            <p className="font-amiri text-base mt-2 leading-[2]">
              الهندسة المقدسة والعروض الكلاسيكي
            </p>
            <p className="text-xs mt-3 opacity-70 leading-relaxed">
              Each mandala pattern reflects the mathematical perfection<br />
              underlying the rhythms of Arabic poetry
            </p>
          </div>

          {/* CTA Button */}
          <button
            onClick={onGetStarted}
            className={`px-10 py-3 rounded-full border-2 ${
              darkMode
                ? 'border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-black'
                : 'border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white'
            } font-brand-en text-sm uppercase tracking-[0.3em] transition-all duration-500 backdrop-blur-sm`}
            style={{
              animation: 'breatheFast 4s ease-in-out infinite'
            }}
          >
            Enter the Sacred Circle
          </button>
        </div>
      </div>

      {/* Ambient glow effects */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          darkMode
            ? 'bg-gradient-radial from-amber-900/20 via-transparent to-transparent'
            : 'bg-gradient-radial from-indigo-200/30 via-transparent to-transparent'
        }`}
        style={{
          animation: 'breatheSlow 8s ease-in-out infinite'
        }}
      />

      <style jsx>{`
        @keyframes breatheSlow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.08); opacity: 0.25; }
        }

        @keyframes breatheMedium {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.12); opacity: 0.4; }
        }

        @keyframes breatheFast {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }

        @supports (background: paint(id)) {
          .bg-gradient-radial {
            background: radial-gradient(circle at center, var(--tw-gradient-stops));
          }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  MANDALA WALKTHROUGH GUIDE - REDESIGNED

  An immersive 3-step journey through sacred geometry and poetic wisdom.
  Completely redesigned to match the breathing mandala splash aesthetic with
  enhanced geometric patterns, radial layouts, and spiritual storytelling.

  Design Philosophy:
  - Sacred geometry progression: 6-fold (harmony) → 8-fold (breath) → 12-fold (completion)
  - All elements breathe in sync with 4s cycle (human breath rhythm)
  - Full-screen rotating mandala backgrounds evolve with each step
  - Radial progress indicator mirrors mandala complexity
  - Nested circular content layout (mandala-inspired information hierarchy)
  - Spiritual yet scholarly voice reflecting classical poetry tradition

  Enhanced Features:
  - Dynamic multi-layer background mandala matching step symmetry
  - Prominent geometric patterns around icon (not subtle)
  - Color evolution through amber/indigo/violet spectrum
  - Breathing rhythm synchronized across all animated elements
  - Geometric step indicators (mandala petals, not simple dots)
  - Seamless visual continuation from splash screen
  =============================================================================*/

export const MandalaWalkthroughGuide = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const steps = [
    {
      icon: BookOpen,
      title: "Navigate",
      titleAr: "تصفح",
      description: "Journey through circles of poetic wisdom. Explore verses that flow like sacred patterns through time.",
      descriptionAr: "دوائر الحكمة الشعرية",
      longDescriptionAr: "اسبح في بحور الشعر العربي الكلاسيكي",
      symmetry: 6, // Hexagonal - balance and harmony in navigation
      color: darkMode ? "#C5A059" : "#4F46E5",
      meaning: "Six-fold symmetry represents balance, the harmony found in navigating wisdom."
    },
    {
      icon: Play,
      title: "Listen",
      titleAr: "استمع",
      description: "Breathe with the rhythm of classical recitation. Let the verses resonate as they were meant to be heard.",
      descriptionAr: "نبض الإيقاع",
      longDescriptionAr: "استمع إلى الإيقاع والنغم والتجويد",
      symmetry: 8, // Octagonal - eight breath cycles, rhythm of recitation
      color: darkMode ? "#6366F1" : "#818CF8",
      meaning: "Eight-fold symmetry mirrors the cycles of breath, the rhythm of tajweed."
    },
    {
      icon: Sparkles,
      title: "Discover",
      titleAr: "اكتشف",
      description: "Unveil the hidden geometry of meaning. Translations, meters, context—layers within layers unfold.",
      descriptionAr: "طبقات المعنى",
      longDescriptionAr: "الظاهر والباطن في الشعر العربي",
      symmetry: 12, // 12-pointed star - completeness, all dimensions revealed
      color: darkMode ? "#A78BFA" : "#6366F1",
      meaning: "Twelve-fold symmetry represents completion, the unveiling of all hidden layers."
    }
  ];

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-[#FDFCF8]'} overflow-hidden`}>

      {/* Full-screen rotating mandala background - highly visible, evolving with each step */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* Outermost ring - largest, slowest */}
        <svg
          className="absolute w-[140vw] h-[140vh] max-w-[1600px] max-h-[1600px]"
          viewBox="0 0 800 800"
          style={{
            animation: 'rotateSlow 60s linear infinite, breatheSlow 8s ease-in-out infinite'
          }}
        >
          <g transform="translate(400, 400)">
            {[...Array(step.symmetry * 3)].map((_, i, arr) => (
              <g key={`mega-${i}`} transform={`rotate(${i * (360 / arr.length)})`}>
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="-380"
                  stroke={step.color}
                  strokeWidth="0.5"
                  opacity="0.08"
                />
                <ellipse
                  cx="0"
                  cy="-340"
                  rx="25"
                  ry="50"
                  fill="none"
                  stroke={step.color}
                  strokeWidth="0.8"
                  opacity="0.06"
                />
              </g>
            ))}
          </g>
        </svg>

        {/* Large outer ring */}
        <svg
          className="absolute w-[110vw] h-[110vh] max-w-[1200px] max-h-[1200px]"
          viewBox="0 0 700 700"
          style={{
            animation: 'rotateReverse 45s linear infinite, breatheMedium 6s ease-in-out infinite'
          }}
        >
          <g transform="translate(350, 350)">
            {[...Array(step.symmetry * 2)].map((_, i, arr) => (
              <g key={`outer-${i}`} transform={`rotate(${i * (360 / arr.length)})`}>
                <line x1="0" y1="0" x2="0" y2="-320" stroke={step.color} strokeWidth="1" opacity="0.12" />
                <circle cx="0" cy="-280" r="10" fill="none" stroke={step.color} strokeWidth="1" opacity="0.1" />
                <path
                  d="M 0,-260 Q 18,-280 0,-300 Q -18,-280 0,-260"
                  fill="none"
                  stroke={step.color}
                  strokeWidth="1"
                  opacity="0.08"
                />
              </g>
            ))}
          </g>
        </svg>

        {/* Middle geometric ring */}
        <svg
          className="absolute w-[85vw] h-[85vh] max-w-[900px] max-h-[900px]"
          viewBox="0 0 600 600"
          style={{
            animation: 'rotateSlow 35s linear infinite, breatheFast 4s ease-in-out infinite'
          }}
        >
          <g transform="translate(300, 300)">
            {[...Array(step.symmetry)].map((_, i, arr) => (
              <g key={`mid-${i}`} transform={`rotate(${i * (360 / arr.length)})`}>
                <line x1="0" y1="0" x2="0" y2="-240" stroke={step.color} strokeWidth="1.5" opacity="0.15" />
                <path
                  d="M -12,-220 L 0,-240 L 12,-220 Z"
                  fill="none"
                  stroke={step.color}
                  strokeWidth="1.5"
                  opacity="0.12"
                />
                <circle cx="0" cy="-200" r="14" fill="none" stroke={step.color} strokeWidth="1.2" opacity="0.15" />
              </g>
            ))}
            <circle cx="0" cy="0" r="120" fill="none" stroke={step.color} strokeWidth="1" opacity="0.1" />
          </g>
        </svg>

        {/* Inner decorative ring */}
        <svg
          className="absolute w-[60vw] h-[60vh] max-w-[650px] max-h-[650px]"
          viewBox="0 0 500 500"
          style={{
            animation: 'rotateReverse 25s linear infinite, breatheFast 4s ease-in-out infinite'
          }}
        >
          <g transform="translate(250, 250)">
            {[...Array(step.symmetry)].map((_, i, arr) => (
              <g key={`inner-ring-${i}`} transform={`rotate(${i * (360 / arr.length)})`}>
                <path
                  d="M 0,-150 Q 20,-170 0,-190 Q -20,-170 0,-150"
                  fill={step.color}
                  opacity="0.08"
                />
                <line x1="0" y1="-100" x2="0" y2="-180" stroke={step.color} strokeWidth="1" opacity="0.15" />
              </g>
            ))}
            <circle cx="0" cy="0" r="90" fill="none" stroke={step.color} strokeWidth="1.5" opacity="0.12" />
          </g>
        </svg>
      </div>

      {/* Main content card - rounded, elevated, centered */}
      <div className={`relative max-w-2xl w-full mx-6 ${darkMode ? 'bg-black/85' : 'bg-white/90'} backdrop-blur-3xl border-2 ${darkMode ? 'border-stone-800/80' : 'border-stone-200/80'} rounded-[2.5rem] p-8 md:p-16 shadow-2xl overflow-hidden`}>

        {/* Subtle card-level mandala overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
          <svg
            width="500"
            height="500"
            viewBox="0 0 500 500"
            style={{
              animation: 'breatheSlow 4s ease-in-out infinite, rotateReverse 50s linear infinite'
            }}
          >
            <g transform="translate(250, 250)">
              {[...Array(step.symmetry)].map((_, i) => (
                <g key={i} transform={`rotate(${i * (360 / step.symmetry)})`}>
                  <line x1="0" y1="0" x2="0" y2="-200" stroke={step.color} strokeWidth="2" opacity="0.7" />
                  <circle cx="0" cy="-160" r="18" fill="none" stroke={step.color} strokeWidth="2" />
                </g>
              ))}
              <circle cx="0" cy="0" r="100" fill="none" stroke={step.color} strokeWidth="2.5" opacity="0.5" />
            </g>
          </svg>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Skip walkthrough and enter app"
          className={`absolute top-6 right-6 p-3 ${darkMode ? 'text-stone-400 hover:text-amber-400' : 'text-stone-600 hover:text-indigo-600'} hover:scale-110 transition-all duration-300 rounded-full backdrop-blur-sm ${darkMode ? 'bg-black/60 border border-stone-800' : 'bg-white/80 border border-stone-200'} z-20 min-w-[44px] min-h-[44px] flex items-center justify-center`}
        >
          <X size={20} />
        </button>

        {/* Content - vertically centered, mandala-inspired circular layout */}
        <div className="relative z-10 flex flex-col items-center text-center space-y-10">

          {/* Prominent geometric mandala icon - the visual centerpiece */}
          <div className="relative">
            {/* Multi-layer rotating patterns - HIGHLY VISIBLE */}

            {/* Outermost rotating ring */}
            <svg
              className="absolute -inset-20 w-56 h-56"
              viewBox="0 0 200 200"
              style={{
                animation: 'breatheMedium 4s ease-in-out infinite, rotateSlow 40s linear infinite'
              }}
            >
              <g transform="translate(100, 100)">
                {[...Array(step.symmetry)].map((_, i) => (
                  <g key={`outer-${i}`} transform={`rotate(${i * (360 / step.symmetry)})`}>
                    <line x1="0" y1="30" x2="0" y2="90" stroke={step.color} strokeWidth="2" opacity="0.3" />
                    <circle cx="0" cy="85" r="6" fill={step.color} opacity="0.25" />
                  </g>
                ))}
                <circle cx="0" cy="0" r="75" fill="none" stroke={step.color} strokeWidth="1.5" opacity="0.2" />
              </g>
            </svg>

            {/* Middle rotating pattern */}
            <svg
              className="absolute -inset-14 w-44 h-44"
              viewBox="0 0 180 180"
              style={{
                animation: 'breatheFast 4s ease-in-out infinite, rotateReverse 30s linear infinite'
              }}
            >
              <g transform="translate(90, 90)">
                {[...Array(step.symmetry)].map((_, i) => (
                  <g key={`mid-${i}`} transform={`rotate(${i * (360 / step.symmetry)})`}>
                    <path
                      d="M 0,-55 Q 10,-65 0,-75 Q -10,-65 0,-55"
                      fill={step.color}
                      opacity="0.25"
                    />
                    <line x1="0" y1="0" x2="0" y2="-75" stroke={step.color} strokeWidth="2" opacity="0.35" />
                  </g>
                ))}
              </g>
            </svg>

            {/* Inner geometric accent */}
            <svg
              className="absolute -inset-8 w-32 h-32"
              viewBox="0 0 150 150"
              style={{
                animation: 'breatheFast 4s ease-in-out infinite, rotateSlow 20s linear infinite'
              }}
            >
              <g transform="translate(75, 75)">
                {[...Array(step.symmetry)].map((_, i) => (
                  <g key={`inner-${i}`} transform={`rotate(${i * (360 / step.symmetry)})`}>
                    <circle cx="0" cy="-55" r="5" fill="none" stroke={step.color} strokeWidth="1.5" opacity="0.4" />
                    <path
                      d="M -4,-60 L 0,-70 L 4,-60"
                      fill="none"
                      stroke={step.color}
                      strokeWidth="1.5"
                      opacity="0.35"
                    />
                  </g>
                ))}
                <circle cx="0" cy="0" r="45" fill="none" stroke={step.color} strokeWidth="2" opacity="0.25" />
              </g>
            </svg>

            {/* Icon container - breathing circle */}
            <div
              className={`relative p-8 ${darkMode ? 'bg-stone-900/80' : 'bg-white/90'} rounded-full border-2 shadow-2xl z-10`}
              style={{
                borderColor: step.color,
                animation: 'breatheFast 4s ease-in-out infinite',
                boxShadow: `0 0 40px ${step.color}40, 0 0 80px ${step.color}20`
              }}
            >
              <Icon size={56} style={{ color: step.color }} strokeWidth={1.5} />
            </div>

            {/* Multiple pulsing rings */}
            <div
              className="absolute inset-0 rounded-full border-2"
              style={{
                borderColor: step.color,
                opacity: 0.15,
                animation: 'pulseRing 4s ease-in-out infinite'
              }}
            />
            <div
              className="absolute -inset-3 rounded-full border"
              style={{
                borderColor: step.color,
                opacity: 0.1,
                animation: 'pulseRingSlow 4s ease-in-out infinite 0.5s'
              }}
            />
          </div>

          {/* Typography - bilingual, spiritual */}
          <div className={`space-y-3 ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
            <h3
              className="font-brand-en text-5xl md:text-6xl font-bold tracking-tight"
              style={{
                color: step.color,
                animation: 'fadeIn 0.6s ease-out'
              }}
            >
              {step.title}
            </h3>
            <p
              className="font-amiri text-2xl md:text-3xl opacity-80 leading-[2.2]"
              style={{
                animation: 'fadeIn 0.8s ease-out'
              }}
            >
              {step.titleAr}
            </p>
            <p
              className="font-amiri text-base md:text-lg opacity-50 leading-[2] italic"
              style={{
                animation: 'fadeIn 1s ease-out'
              }}
            >
              {step.longDescriptionAr}
            </p>
          </div>

          {/* Description text */}
          <div
            className={`space-y-3 ${darkMode ? 'text-stone-300' : 'text-stone-700'} max-w-lg px-4`}
            style={{
              animation: 'fadeIn 1.2s ease-out'
            }}
          >
            <p className="font-brand-en text-base md:text-lg leading-relaxed">
              {step.description}
            </p>
            <p className={`font-brand-en text-xs md:text-sm italic opacity-60 ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
              {step.meaning}
            </p>
          </div>

          {/* Enhanced mandala-style circular progress indicator */}
          <div className="relative mt-6">
            <svg width="140" height="140" viewBox="0 0 140 140" className="transform -rotate-90">
              {/* Outermost decorative ring */}
              <circle
                cx="70"
                cy="70"
                r="65"
                fill="none"
                stroke={darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}
                strokeWidth="1"
              />

              {/* Progress track */}
              <circle
                cx="70"
                cy="70"
                r="55"
                fill="none"
                stroke={darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}
                strokeWidth="3"
              />

              {/* Progress arc with breathing animation */}
              <circle
                cx="70"
                cy="70"
                r="55"
                fill="none"
                stroke={step.color}
                strokeWidth="4"
                strokeDasharray={`${((currentStep + 1) / steps.length) * 345.58} 345.58`}
                strokeLinecap="round"
                style={{
                  transition: 'stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                  animation: 'breatheFast 4s ease-in-out infinite',
                  filter: `drop-shadow(0 0 8px ${step.color}80)`
                }}
              />

              {/* Geometric mandala pattern in center - evolves with step */}
              <g transform="translate(70, 70)">
                {[...Array(step.symmetry)].map((_, i) => {
                  const angle = i * (360 / step.symmetry);
                  return (
                    <g key={i} transform={`rotate(${angle})`}>
                      <line
                        x1="0"
                        y1="-25"
                        x2="0"
                        y2="-40"
                        stroke={step.color}
                        strokeWidth="2"
                        opacity="0.4"
                      />
                      <circle
                        cx="0"
                        cy="-32"
                        r="3"
                        fill={step.color}
                        opacity="0.5"
                      />
                    </g>
                  );
                })}
                <circle cx="0" cy="0" r="18" fill="none" stroke={step.color} strokeWidth="1.5" opacity="0.3" />
                <circle cx="0" cy="0" r="8" fill={step.color} opacity="0.3" />
                <circle cx="0" cy="0" r="4" fill={step.color} opacity="0.6" />
              </g>
            </svg>

            {/* Step counter - breathing */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`font-brand-en text-base font-bold ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}
                style={{
                  animation: 'breatheFast 4s ease-in-out infinite',
                  color: step.color
                }}
              >
                {currentStep + 1} / {steps.length}
              </span>
            </div>
          </div>

          {/* Geometric step indicators - mandala petals instead of dots */}
          <div className="flex items-center justify-center gap-4 mt-4">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => onStepChange(idx)}
                aria-label={`Go to step ${idx + 1}: ${s.title}`}
                className="transition-all duration-500 min-w-[44px] min-h-[44px] flex items-center justify-center p-3"
              >
                <svg
                  width={idx === currentStep ? '32' : '24'}
                  height={idx === currentStep ? '32' : '24'}
                  viewBox="0 0 40 40"
                  style={{
                    transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: idx === currentStep ? 'breatheFast 4s ease-in-out infinite' : 'none'
                  }}
                >
                  <g transform="translate(20, 20)">
                    {/* Petal pattern based on step symmetry */}
                    {[...Array(s.symmetry)].map((_, i) => (
                      <path
                        key={i}
                        d="M 0,-8 Q 3,-12 0,-16 Q -3,-12 0,-8"
                        transform={`rotate(${i * (360 / s.symmetry)})`}
                        fill={
                          idx === currentStep
                            ? s.color
                            : idx < currentStep
                            ? `${s.color}90`
                            : darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
                        }
                        opacity={idx === currentStep ? 0.8 : 0.5}
                      />
                    ))}
                    <circle
                      cx="0"
                      cy="0"
                      r={idx === currentStep ? '5' : '3.5'}
                      fill={
                        idx === currentStep
                          ? s.color
                          : idx < currentStep
                          ? `${s.color}90`
                          : darkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.15)'
                      }
                    />
                  </g>
                </svg>
              </button>
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center gap-4 mt-8 w-full max-w-md">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                aria-label="Go to previous step"
                className={`flex-1 px-7 py-4 border-2 rounded-2xl hover:scale-105 transition-all duration-300 font-brand-en text-base font-medium min-w-[44px] min-h-[44px] backdrop-blur-sm`}
                style={{
                  borderColor: `${step.color}60`,
                  color: step.color,
                  backgroundColor: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'
                }}
              >
                Previous
              </button>
            )}
            <button
              onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
              aria-label={currentStep < steps.length - 1 ? 'Continue to next step' : 'Start exploring poetry'}
              className="flex-1 px-7 py-4 rounded-2xl hover:scale-105 transition-all duration-300 font-brand-en text-base font-bold shadow-2xl min-w-[44px] min-h-[44px]"
              style={{
                backgroundColor: step.color,
                color: darkMode ? '#000' : '#fff',
                boxShadow: `0 12px 32px ${step.color}50, 0 4px 16px ${step.color}40`
              }}
            >
              {currentStep < steps.length - 1 ? 'Continue Journey' : 'Enter the Circle'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes breatheSlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.08;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.12;
          }
        }

        @keyframes breatheMedium {
          0%, 100% {
            transform: scale(1);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.4;
          }
        }

        @keyframes breatheFast {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.08);
          }
        }

        @keyframes pulseRing {
          0%, 100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.4);
            opacity: 0;
          }
        }

        @keyframes pulseRingSlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.1;
          }
          50% {
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes rotateSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes rotateReverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
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
