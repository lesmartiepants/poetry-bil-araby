import React, { useEffect, useState } from 'react';
import { Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  SPLASH OPTION D: LIGHT & SHADOW

  Design Philosophy: Chiaroscuro lighting meets mashrabiya screens
  Inspiration: Caravaggio + mosque lighting + dappled sunlight through lattice
  Technique: Pure light simulation with SVG gradients, masks, and time-based animation
  Priority: Mobile-first, dramatic, high contrast
  =============================================================================*/

/* =============================================================================
  SVG LIGHT SIMULATION COMPONENTS
  =============================================================================*/

// Mashrabiya Lattice Pattern - Creates shadow pattern
const MashrabiyaPattern = () => (
  <svg width="0" height="0" style={{ position: 'absolute' }}>
    <defs>
      {/* Geometric lattice pattern for masking */}
      <pattern id="lattice-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        {/* Octagonal openings with connecting lines */}
        <g opacity="1">
          {/* Center octagon */}
          <path
            d="M25 15 L35 15 L40 20 L40 30 L35 35 L25 35 L20 30 L20 20 Z"
            fill="black"
          />
          {/* Connecting lines (shadow areas) */}
          <rect x="0" y="22" width="20" height="6" fill="white" opacity="0.3" />
          <rect x="40" y="22" width="40" height="6" fill="white" opacity="0.3" />
          <rect x="22" y="0" width="6" height="20" fill="white" opacity="0.3" />
          <rect x="22" y="35" width="6" height="45" fill="white" opacity="0.3" />

          {/* Small decorative circles at intersections */}
          <circle cx="10" cy="25" r="4" fill="black" />
          <circle cx="50" cy="25" r="4" fill="black" />
          <circle cx="25" cy="10" r="4" fill="black" />
          <circle cx="25" cy="50" r="4" fill="black" />
        </g>
      </pattern>

      {/* Light ray gradient - warm to dark */}
      <linearGradient id="light-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="rgba(255, 235, 180, 0.9)" />
        <stop offset="30%" stopColor="rgba(255, 220, 150, 0.7)" />
        <stop offset="60%" stopColor="rgba(255, 200, 120, 0.4)" />
        <stop offset="100%" stopColor="rgba(255, 180, 100, 0)" />
      </linearGradient>

      {/* Radial gradient for light source */}
      <radialGradient id="light-source" cx="50%" cy="0%" r="70%">
        <stop offset="0%" stopColor="rgba(255, 240, 200, 0.8)" />
        <stop offset="40%" stopColor="rgba(255, 220, 150, 0.5)" />
        <stop offset="70%" stopColor="rgba(255, 200, 120, 0.2)" />
        <stop offset="100%" stopColor="rgba(255, 180, 100, 0)" />
      </radialGradient>

      {/* Shadow gradient - deep shadows */}
      <linearGradient id="shadow-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="rgba(0, 0, 0, 0.9)" />
        <stop offset="50%" stopColor="rgba(0, 0, 0, 0.7)" />
        <stop offset="100%" stopColor="rgba(0, 0, 0, 0.85)" />
      </linearGradient>

      {/* Mask for dappled light effect */}
      <mask id="light-mask">
        <rect width="100%" height="100%" fill="url(#lattice-pattern)" />
      </mask>
    </defs>
  </svg>
);

// Animated Light Rays Component
const LightRays = ({ darkMode, animationPhase }) => {
  // Calculate light position based on animation phase (simulates sun movement)
  const lightX = 20 + (animationPhase * 60); // Move from left (20%) to right (80%)
  const lightY = -10 + (animationPhase * 30); // Slight vertical movement for realism

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: darkMode ? 'screen' : 'multiply' }}
    >
      {/* Main light source with radial gradient */}
      <ellipse
        cx={`${lightX}%`}
        cy={`${lightY}%`}
        rx="40%"
        ry="60%"
        fill="url(#light-source)"
        opacity={darkMode ? 0.6 : 0.4}
        style={{
          transition: 'cx 8s ease-in-out, cy 8s ease-in-out',
          filter: 'blur(40px)'
        }}
      />

      {/* Multiple light rays passing through lattice */}
      {[0, 1, 2, 3, 4].map((i) => {
        const angle = -20 + (i * 10) + (animationPhase * 15); // Rays spread and rotate
        const offsetX = lightX + (i - 2) * 8;

        return (
          <g key={i} mask="url(#light-mask)">
            <rect
              x={`${offsetX - 5}%`}
              y="-10%"
              width="10%"
              height="120%"
              fill="url(#light-gradient)"
              opacity={0.6 - (Math.abs(i - 2) * 0.1)}
              style={{
                transformOrigin: `${offsetX}% 0%`,
                transform: `rotate(${angle}deg) skewX(${angle / 4}deg)`,
                transition: 'transform 8s ease-in-out, opacity 8s ease-in-out',
                filter: 'blur(3px)'
              }}
            />
          </g>
        );
      })}

      {/* Dappled light pools on ground */}
      {[0, 1, 2, 3].map((i) => {
        const poolX = 15 + (i * 22) + (animationPhase * 10);
        const poolY = 60 + (Math.sin(animationPhase * Math.PI + i) * 10);

        return (
          <ellipse
            key={`pool-${i}`}
            cx={`${poolX}%`}
            cy={`${poolY}%`}
            rx="12%"
            ry="8%"
            fill="url(#light-source)"
            opacity={0.4 - (i * 0.05)}
            mask="url(#light-mask)"
            style={{
              transition: 'cx 8s ease-in-out, cy 8s ease-in-out',
              filter: 'blur(8px)'
            }}
          />
        );
      })}
    </svg>
  );
};

// Shadow Layer with Lattice Pattern
const ShadowLayer = ({ darkMode }) => {
  const shadowOpacity = darkMode ? 0.85 : 0.4;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Base shadow layer */}
      <div
        className="absolute inset-0"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at 50% 30%, rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.95))'
            : 'radial-gradient(ellipse at 50% 30%, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.4))',
        }}
      />

      {/* Lattice shadow pattern overlay */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: shadowOpacity }}>
        <rect
          width="100%"
          height="100%"
          fill="url(#shadow-gradient)"
          mask="url(#light-mask)"
          style={{ mixBlendMode: 'multiply' }}
        />
      </svg>

      {/* Ambient occlusion in corners */}
      <div
        className="absolute inset-0"
        style={{
          background: darkMode
            ? 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.7) 100%)'
            : 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(0, 0, 0, 0.3) 100%)',
        }}
      />
    </div>
  );
};

/* =============================================================================
  MAIN SPLASH COMPONENT
  =============================================================================*/

export const SplashLight = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [animationPhase, setAnimationPhase] = useState(0);
  const [textVisible, setTextVisible] = useState(false);

  // Time-based animation - light moves slowly across screen (8 second cycle)
  useEffect(() => {
    const startTime = Date.now();
    const duration = 8000; // 8 seconds for full cycle

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const phase = (elapsed % duration) / duration; // 0 to 1
      setAnimationPhase(phase);
      requestAnimationFrame(animate);
    };

    const animationFrame = requestAnimationFrame(animate);

    // Text emerges from shadows after 600ms
    const textTimer = setTimeout(() => setTextVisible(true), 600);

    return () => {
      cancelAnimationFrame(animationFrame);
      clearTimeout(textTimer);
    };
  }, []);

  const bgColor = darkMode ? 'bg-[#0a0a0a]' : 'bg-[#2a2520]';
  const textColor = darkMode ? 'text-stone-200' : 'text-stone-100';
  const accentColor = darkMode ? 'text-amber-200' : 'text-amber-100';
  const buttonBorder = darkMode ? 'border-stone-600' : 'border-stone-400';
  const buttonHoverBg = darkMode ? 'hover:bg-stone-900/50' : 'hover:bg-stone-800/50';

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${bgColor} overflow-hidden`}>
      {/* SVG Pattern Definitions */}
      <MashrabiyaPattern />

      {/* Shadow base layer */}
      <ShadowLayer darkMode={darkMode} />

      {/* Animated light rays */}
      <LightRays darkMode={darkMode} animationPhase={animationPhase} />

      {/* Theme toggle - subtle in corner */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center border ${buttonBorder} ${buttonHoverBg} backdrop-blur-sm transition-all duration-300`}
        style={{
          background: darkMode ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.2)',
        }}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={textColor} /> : <Moon size={18} className={textColor} />}
      </button>

      {/* Main content - emerges from shadows */}
      <div
        className="relative max-w-2xl mx-6 text-center space-y-10 md:space-y-12 z-10"
        style={{
          opacity: textVisible ? 1 : 0,
          transform: textVisible ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 2s ease-out, transform 2s ease-out',
        }}
      >
        {/* Logo - illuminated by light */}
        <div
          className="space-y-3"
          style={{
            textShadow: darkMode
              ? '0 0 40px rgba(255, 235, 180, 0.3), 0 0 80px rgba(255, 220, 150, 0.2)'
              : '0 0 20px rgba(255, 240, 200, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex flex-row-reverse items-center justify-center gap-4">
            <h1
              className={`font-brand-ar font-bold ${accentColor}`}
              style={{
                fontSize: 'clamp(3rem, 8vw, 5rem)',
                letterSpacing: '0.02em',
              }}
            >
              بالعربي
            </h1>
            <span
              className={`font-brand-en lowercase tracking-tight ${textColor}`}
              style={{
                fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
                fontWeight: 300,
              }}
            >
              poetry
            </span>
          </div>
        </div>

        {/* Arabic poetry text - emerges from shadows with dramatic lighting */}
        <div
          className="space-y-4"
          style={{
            textShadow: darkMode
              ? '0 2px 20px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 235, 180, 0.2)'
              : '0 2px 12px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 240, 200, 0.3)',
          }}
        >
          <p
            className={`font-amiri leading-relaxed ${textColor}`}
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
              fontWeight: 400,
              opacity: 0.95,
            }}
          >
            بين النور والظل تتجلى الحكمة
          </p>
          <p
            className={`font-brand-en italic leading-relaxed ${textColor}`}
            style={{
              fontSize: 'clamp(1rem, 2.5vw, 1.5rem)',
              fontWeight: 300,
              opacity: 0.75,
            }}
          >
            Between light and shadow, wisdom reveals itself
          </p>
        </div>

        {/* Subheadline - partially in shadow */}
        <p
          className={`font-brand-en leading-relaxed max-w-lg mx-auto ${textColor}`}
          style={{
            fontSize: 'clamp(0.875rem, 2vw, 1.125rem)',
            opacity: 0.7,
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
          }}
        >
          Poetry lives in the tension between illumination and obscurity. Like sunlight through a mashrabiya screen, meaning reveals itself layer by layer—some truths emerge brilliant and clear, while others retreat into shadow, awaiting the patient reader's eye.
        </p>

        {/* Call to action - illuminated button */}
        <button
          onClick={onGetStarted}
          className={`group relative px-10 py-4 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} backdrop-blur-sm transition-all duration-500`}
          style={{
            fontSize: 'clamp(0.875rem, 2vw, 1rem)',
            minHeight: '44px',
            minWidth: '44px',
            background: darkMode ? 'rgba(0, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: darkMode
              ? '0 0 30px rgba(255, 235, 180, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
              : '0 0 20px rgba(255, 240, 200, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          }}
        >
          <span className="font-brand-en uppercase tracking-[0.25em]">
            Step Into Light
          </span>
          <span className="block font-amiri text-sm mt-1 opacity-70">
            ادخل إلى النور
          </span>

          {/* Light sweep on hover */}
          <div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(255, 235, 180, 0.2), transparent)',
              animation: 'lightSweep 2s ease-in-out infinite',
            }}
          />
        </button>

        {/* Metadata - barely visible in shadows */}
        <div
          className={`text-xs font-brand-en uppercase tracking-widest ${textColor}`}
          style={{
            opacity: 0.3,
            letterSpacing: '0.2em',
            textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
          }}
        >
          Where Depth Emerges from Darkness
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes lightSweep {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};

/* =============================================================================
  WALKTHROUGH GUIDE - LIGHT & SHADOW THEME (REDESIGNED)

  Design Philosophy: Living light that breathes through mashrabiya lattice
  - Continuous light animation using requestAnimationFrame (matches splash)
  - Light rays sweep across content organically (8-second breathing cycle)
  - Mashrabiya shadows dance over modal with dappled effect
  - Progressive illumination: Dawn → Golden Hour → Zenith
  - Typography lit from within with dynamic text shadows
  - Radiant progress indicator with actual ray simulation

  Editorial Flow:
  Step 0 (Navigate): Dawn breaking through lattice, tentative exploration
  Step 1 (Listen): Golden hour warmth, full immersion
  Step 2 (Discover): Zenith light, complete revelation and clarity

  3 Steps: Journey Through Light → Hear the Radiance → Unveil the Luminous
  =============================================================================*/

// Breathing Light Rays Component - Continuous animation matching splash
const BreathingLightRays = ({ darkMode, currentStep, animationPhase }) => {
  // Light position based on step + continuous breathing animation
  const lightScenes = [
    { baseX: 15, baseY: 20, spread: 50 },  // Dawn (left)
    { baseX: 50, baseY: 10, spread: 70 },  // Golden Hour (center)
    { baseX: 85, baseY: 25, spread: 55 }   // Zenith (right)
  ];

  const scene = lightScenes[currentStep];

  // Add subtle breathing movement (±8% oscillation)
  const breathX = scene.baseX + (Math.sin(animationPhase * Math.PI * 2) * 8);
  const breathY = scene.baseY + (Math.cos(animationPhase * Math.PI * 2) * 4);

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Main radial light source with breathing */}
      <div
        className="absolute w-full h-full"
        style={{
          background: darkMode
            ? `radial-gradient(ellipse ${scene.spread}% ${scene.spread * 0.8}% at ${breathX}% ${breathY}%, rgba(255, 235, 180, 0.28), rgba(255, 220, 150, 0.14) 40%, transparent 70%)`
            : `radial-gradient(ellipse ${scene.spread}% ${scene.spread * 0.8}% at ${breathX}% ${breathY}%, rgba(255, 240, 200, 0.38), rgba(255, 220, 150, 0.20) 40%, transparent 70%)`,
          transition: 'background 1.8s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: 'blur(clamp(40px, 8vw, 70px))',
        }}
      />

      {/* Animated light rays through lattice */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{
          mixBlendMode: darkMode ? 'screen' : 'multiply',
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const angle = -25 + (i * 12) + (animationPhase * 10);
          const offsetX = breathX + (i - 2) * 7;

          return (
            <g key={i} mask="url(#light-mask)">
              <rect
                x={`${offsetX - 4.5}%`}
                y="-10%"
                width="9%"
                height="120%"
                fill="url(#light-gradient)"
                opacity={0.5 - (Math.abs(i - 2) * 0.1)}
                style={{
                  transformOrigin: `${offsetX}% ${breathY}%`,
                  transform: `rotate(${angle}deg) skewX(${angle / 4}deg)`,
                  transition: 'opacity 8s ease-in-out',
                  filter: 'blur(3px)',
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Dappled light pools on content area */}
      {[0, 1, 2].map((i) => {
        const poolX = 25 + (i * 25) + (animationPhase * 8);
        const poolY = 55 + (Math.sin(animationPhase * Math.PI * 2 + i) * 8);

        return (
          <ellipse
            key={`pool-${i}`}
            cx={`${poolX}%`}
            cy={`${poolY}%`}
            rx="14%"
            ry="10%"
            fill="url(#light-source)"
            opacity={0.35 - (i * 0.07)}
            mask="url(#light-mask)"
            style={{
              filter: 'blur(12px)',
            }}
          />
        );
      })}
    </div>
  );
};

// Lattice Shadow Overlay - Dances over content with parallax
const LatticeOverlay = ({ darkMode, parallaxOffset, currentStep }) => {
  // Shadow opacity decreases as light increases per step
  const shadowIntensity = 0.7 - (currentStep * 0.15);

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        transform: `translate(${-parallaxOffset.x * 0.3}px, ${-parallaxOffset.y * 0.3}px)`,
        transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Mashrabiya pattern shadow */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: shadowIntensity }}>
        <rect
          width="100%"
          height="100%"
          fill={darkMode ? 'rgba(0, 0, 0, 0.6)' : 'rgba(42, 37, 32, 0.4)'}
          mask="url(#light-mask)"
          style={{
            mixBlendMode: 'multiply',
            transition: 'fill 1.8s ease-in-out',
          }}
        />
      </svg>

      {/* Ambient occlusion */}
      <div
        className="absolute inset-0"
        style={{
          background: darkMode
            ? `radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0, 0, 0, ${0.5 - currentStep * 0.1}) 100%)`
            : `radial-gradient(ellipse at 50% 50%, transparent 20%, rgba(0, 0, 0, ${0.3 - currentStep * 0.08}) 100%)`,
          transition: 'background 1.8s ease-in-out',
        }}
      />
    </div>
  );
};

// Illuminated Step Icons - Light breaks through per step
const IlluminatedStepIcon = ({ currentStep, darkMode, accentColor, animationPhase }) => {
  // Icon glow pulses with breathing animation
  const glowIntensity = 0.4 + (Math.sin(animationPhase * Math.PI * 2) * 0.15);

  return (
    <div
      className="relative"
      style={{
        filter: darkMode
          ? `drop-shadow(0 0 ${28 + currentStep * 6}px rgba(255, 235, 180, ${glowIntensity}))`
          : `drop-shadow(0 0 ${22 + currentStep * 5}px rgba(255, 240, 200, ${glowIntensity + 0.1}))`,
        transition: 'filter 0.3s ease-out',
      }}
    >
      {currentStep === 0 && (
        // Journey Through Light - Light breaking through pages
        <svg width="90" height="90" viewBox="0 0 90 90" className={accentColor}>
          {/* Light rays behind pages */}
          {[0, 1, 2].map((i) => (
            <line
              key={`ray-${i}`}
              x1="45"
              y1="30"
              x2={45 + (i - 1) * 25}
              y2="10"
              stroke="currentColor"
              strokeWidth="2"
              opacity={0.3}
              strokeLinecap="round"
            />
          ))}
          {/* Layered pages with increasing light */}
          <rect x="40" y="25" width="32" height="42" rx="3" fill="currentColor" opacity="0.20" />
          <rect x="30" y="30" width="32" height="42" rx="3" fill="currentColor" opacity="0.45" />
          <rect x="20" y="35" width="32" height="42" rx="3" fill="currentColor" opacity="0.90" />
          {/* Light beam content */}
          <rect x="25" y="42" width="22" height="3" rx="1.5" fill="white" opacity="0.8" />
          <rect x="25" y="49" width="18" height="2.5" rx="1" fill="white" opacity="0.6" />
          <rect x="25" y="56" width="20" height="2.5" rx="1" fill="white" opacity="0.6" />
        </svg>
      )}

      {currentStep === 1 && (
        // Hear the Radiance - Sound waves as light
        <svg width="90" height="90" viewBox="0 0 90 90" className={accentColor}>
          {/* Light radiating from center */}
          <circle cx="45" cy="45" r="14" fill="currentColor" opacity="0.95" />
          <circle cx="45" cy="45" r="9" fill="white" opacity="0.4" />
          <path d="M39 37 L39 53 L55 45 Z" fill="white" opacity="0.95" />
          {/* Radiant sound waves */}
          <circle cx="45" cy="45" r="22" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.65" />
          <circle cx="45" cy="45" r="30" fill="none" stroke="currentColor" strokeWidth="2.5" opacity="0.50" />
          <circle cx="45" cy="45" r="38" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35" />
          <circle cx="45" cy="45" r="45" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.20" />
        </svg>
      )}

      {currentStep === 2 && (
        // Unveil the Luminous - Zenith light revelation
        <svg width="90" height="90" viewBox="0 0 90 90" className={accentColor}>
          {/* Central brilliance */}
          <circle cx="45" cy="45" r="16" fill="currentColor" opacity="0.95" />
          <circle cx="45" cy="45" r="11" fill="white" opacity="0.5" />
          <circle cx="45" cy="45" r="6" fill="white" opacity="0.3" />
          {/* Radiant rays (12 directions) */}
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const x1 = 45 + 21 * Math.cos(rad);
            const y1 = 45 + 21 * Math.sin(rad);
            const x2 = 45 + 42 * Math.cos(rad);
            const y2 = 45 + 42 * Math.sin(rad);
            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                opacity="0.75"
              />
            );
          })}
          {/* Revelation rings */}
          <circle cx="45" cy="45" r="26" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" strokeDasharray="4 4" />
          <circle cx="45" cy="45" r="33" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.18" strokeDasharray="4 4" />
        </svg>
      )}
    </div>
  );
};

// Radiant Progress Indicator - Light beams instead of bars
const RadiantProgressIndicator = ({ steps, currentStep, onStepChange, darkMode, animationPhase }) => {
  return (
    <div className="flex items-center justify-center gap-4 pt-2">
      {steps.map((_, idx) => {
        const isActive = idx === currentStep;
        const isPast = idx < currentStep;

        // Active beam pulses with breathing animation
        const pulseIntensity = isActive ? 0.6 + (Math.sin(animationPhase * Math.PI * 2) * 0.2) : 0;

        return (
          <button
            key={idx}
            onClick={() => onStepChange(idx)}
            className="relative transition-all duration-700 ease-out"
            aria-label={`Go to step ${idx + 1}`}
            style={{
              width: isActive ? '56px' : '36px',
              height: '5px',
              background: isActive
                ? `linear-gradient(90deg, ${darkMode ? 'rgba(255, 235, 180, 0.90)' : 'rgba(255, 240, 200, 1.0)'}, ${darkMode ? 'rgba(255, 220, 150, 0.50)' : 'rgba(255, 200, 120, 0.60)'})`
                : isPast
                ? darkMode ? 'rgba(255, 235, 180, 0.40)' : 'rgba(255, 240, 200, 0.50)'
                : darkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.30)',
              boxShadow: isActive
                ? `0 0 ${28 + pulseIntensity * 10}px ${darkMode ? `rgba(255, 235, 180, ${pulseIntensity})` : `rgba(255, 240, 200, ${pulseIntensity + 0.1})`}, inset 0 1px 2px rgba(255, 255, 255, 0.3)`
                : isPast
                ? `0 0 8px ${darkMode ? 'rgba(255, 235, 180, 0.3)' : 'rgba(255, 240, 200, 0.4)'}`
                : 'none',
              borderRadius: '3px',
            }}
          />
        );
      })}
    </div>
  );
};

export const LightShadowWalkthrough = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const [animationPhase, setAnimationPhase] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Continuous breathing light animation (matches splash 8-second cycle)
  useEffect(() => {
    setIsVisible(true);

    const startTime = Date.now();
    const duration = 8000; // 8 seconds

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const phase = (elapsed % duration) / duration; // 0 to 1
      setAnimationPhase(phase);
      requestAnimationFrame(animate);
    };

    const animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  // Smooth parallax effect for depth
  useEffect(() => {
    const handleMouseMove = (e) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const offsetX = (e.clientX - centerX) / 30; // Gentler parallax
      const offsetY = (e.clientY - centerY) / 30;
      setParallaxOffset({ x: offsetX, y: offsetY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const steps = [
    {
      title: "Journey Through Light",
      titleAr: "رحلة عبر النور",
      description: "Navigate centuries of poetic wisdom. Each swipe reveals verses from masters like al-Mutanabbi and Nizar Qabbani, illuminated by time and beauty.",
      descriptionAr: "تصفح قرون من الحكمة الشعرية المضيئة",
      instruction: "Swipe or use arrows to explore"
    },
    {
      title: "Hear the Radiance",
      titleAr: "استمع للإشراق",
      description: "Let recited verses wash over you. Press play and immerse yourself in the rhythm, the melody, the radiant soul of Arabic poetry.",
      descriptionAr: "دع القصائد المتلوة تغمرك بنورها",
      instruction: "Tap play to hear the recitation"
    },
    {
      title: "Unveil the Luminous",
      titleAr: "اكشف المضيء",
      description: "Seek deeper truths. Unlock translations, historical context, poetic meter, and the luminous meanings woven into each verse.",
      descriptionAr: "اكشف الحقائق العميقة والمعاني المضيئة",
      instruction: "Seek Insight to reveal hidden depths"
    }
  ];

  const step = steps[currentStep];
  const textColor = darkMode ? 'text-stone-200' : 'text-stone-100';
  const accentColor = darkMode ? 'text-amber-200' : 'text-amber-100';
  const buttonBorder = darkMode ? 'border-stone-600' : 'border-stone-400';
  const buttonHoverBg = darkMode ? 'hover:bg-stone-900/50' : 'hover:bg-stone-800/50';

  // Dynamic text shadow based on light position (follows animation)
  const lightX = [15, 50, 85][currentStep] + (Math.sin(animationPhase * Math.PI * 2) * 8);
  const shadowOffsetX = (lightX - 50) * 0.3; // Text shadow follows light
  const shadowOffsetY = -2 - (currentStep * 1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
      {/* SVG Pattern Definitions */}
      <MashrabiyaPattern />

      {/* Base background */}
      <div
        className="absolute inset-0"
        style={{
          background: darkMode ? '#0a0a0a' : '#2a2520',
        }}
      />

      {/* Breathing light rays (continuous animation) */}
      <BreathingLightRays
        darkMode={darkMode}
        currentStep={currentStep}
        animationPhase={animationPhase}
      />

      {/* Lattice shadow overlay with parallax */}
      <LatticeOverlay
        darkMode={darkMode}
        parallaxOffset={parallaxOffset}
        currentStep={currentStep}
      />

      {/* Main modal with dramatic lighting */}
      <div
        className="relative max-w-3xl mx-6 z-10"
        style={{
          transform: `translate(${parallaxOffset.x * 0.2}px, ${parallaxOffset.y * 0.2}px)`,
          opacity: isVisible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.8s ease-out',
        }}
      >
        {/* Backdrop with glass morphism and light glow */}
        <div
          className="absolute inset-0 backdrop-blur-3xl rounded-3xl"
          style={{
            background: darkMode
              ? 'linear-gradient(135deg, rgba(0, 0, 0, 0.78) 0%, rgba(0, 0, 0, 0.94) 100%)'
              : 'linear-gradient(135deg, rgba(42, 37, 32, 0.87) 0%, rgba(42, 37, 32, 0.96) 100%)',
            boxShadow: darkMode
              ? `0 0 ${70 + currentStep * 25}px rgba(255, 235, 180, ${0.15 + currentStep * 0.06}), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)`
              : `0 0 ${55 + currentStep * 20}px rgba(255, 240, 200, ${0.18 + currentStep * 0.06}), 0 20px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.18)`,
            border: `1px solid ${darkMode ? 'rgba(255, 235, 180, 0.30)' : 'rgba(255, 240, 200, 0.40)'}`,
            transition: 'box-shadow 1.8s cubic-bezier(0.4, 0, 0.2, 1), border 1.8s ease-in-out',
          }}
        />

        {/* Corner flourishes with light accents */}
        {[
          { top: -12, left: -12, rotate: 0 },
          { top: -12, right: -12, rotate: 90 },
          { bottom: -12, right: -12, rotate: 180 },
          { bottom: -12, left: -12, rotate: 270 },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute pointer-events-none opacity-50"
            style={{
              ...pos,
              transform: `rotate(${pos.rotate}deg)`,
              filter: darkMode
                ? 'drop-shadow(0 0 6px rgba(255, 235, 180, 0.4))'
                : 'drop-shadow(0 0 5px rgba(255, 240, 200, 0.5))',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" className={accentColor}>
              <path
                d="M0 0 L15 0 Q20 0 20 5 L20 15 Q15 20 10 20 L5 20 Q0 15 0 10 Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.4" />
            </svg>
          </div>
        ))}

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 z-50 w-10 h-10 rounded-full flex items-center justify-center border ${buttonBorder} ${buttonHoverBg} backdrop-blur-sm transition-all duration-300`}
          style={{
            background: darkMode ? 'rgba(0, 0, 0, 0.65)' : 'rgba(255, 255, 255, 0.28)',
          }}
          aria-label="Close walkthrough"
        >
          <X size={18} className={textColor} />
        </button>

        {/* Content */}
        <div className="relative p-10 md:p-14 space-y-8">
          {/* Illuminated icon */}
          <div className="flex justify-center">
            <IlluminatedStepIcon
              currentStep={currentStep}
              darkMode={darkMode}
              accentColor={accentColor}
              animationPhase={animationPhase}
            />
          </div>

          {/* Step content with light-responsive shadows */}
          <div className="space-y-5 text-center">
            {/* Title - lit from within */}
            <div className="space-y-2">
              <h2
                className={`font-brand-en text-3xl md:text-4xl font-light ${textColor}`}
                style={{
                  textShadow: darkMode
                    ? `${shadowOffsetX}px ${shadowOffsetY}px ${22 + currentStep * 5}px rgba(255, 235, 180, ${0.28 + currentStep * 0.09}), 0 0 ${40 + currentStep * 8}px rgba(255, 235, 180, ${0.15 + currentStep * 0.05})`
                    : `${shadowOffsetX}px ${shadowOffsetY}px ${18 + currentStep * 4}px rgba(255, 240, 200, ${0.35 + currentStep * 0.09}), 0 0 ${35 + currentStep * 6}px rgba(255, 240, 200, ${0.18 + currentStep * 0.05})`,
                  transition: 'text-shadow 1.8s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {step.title}
              </h2>
              <p
                className={`font-amiri text-xl opacity-70 ${textColor}`}
                style={{
                  textShadow: darkMode
                    ? '0 2px 12px rgba(0, 0, 0, 0.7), 0 0 20px rgba(255, 235, 180, 0.15)'
                    : '0 2px 10px rgba(0, 0, 0, 0.6), 0 0 18px rgba(255, 240, 200, 0.2)',
                }}
              >
                {step.titleAr}
              </p>
            </div>

            {/* Description */}
            <div className="space-y-3 max-w-xl mx-auto">
              <p
                className={`font-brand-en text-base md:text-lg leading-relaxed ${textColor}`}
                style={{
                  opacity: 0.90,
                  lineHeight: '1.8',
                  textShadow: darkMode
                    ? '0 1px 8px rgba(0, 0, 0, 0.8)'
                    : '0 1px 6px rgba(0, 0, 0, 0.7)',
                }}
              >
                {step.description}
              </p>
              <p
                className={`font-amiri text-sm opacity-60 ${textColor}`}
                style={{
                  textShadow: '0 1px 6px rgba(0, 0, 0, 0.9)',
                }}
              >
                {step.descriptionAr}
              </p>

              {/* Feature instruction */}
              <p
                className={`text-[10px] tracking-[0.4em] uppercase opacity-38 ${textColor} mt-5`}
                style={{
                  textShadow: '0 1px 5px rgba(0, 0, 0, 0.95)',
                }}
              >
                {step.instruction}
              </p>
            </div>
          </div>

          {/* Radiant progress indicator */}
          <RadiantProgressIndicator
            steps={steps}
            currentStep={currentStep}
            onStepChange={onStepChange}
            darkMode={darkMode}
            animationPhase={animationPhase}
          />

          {/* Navigation buttons with light sweep */}
          <div className="flex items-center gap-4 pt-3">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                className={`flex-1 px-8 py-4 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} backdrop-blur-sm transition-all duration-300 text-sm md:text-base`}
                style={{
                  minHeight: '44px',
                  background: darkMode ? 'rgba(0, 0, 0, 0.45)' : 'rgba(255, 255, 255, 0.18)',
                  borderRadius: '12px',
                }}
              >
                <span className="font-brand-en uppercase tracking-wider">Previous</span>
                <span className="block font-amiri text-xs mt-1 opacity-60">السابق</span>
              </button>
            )}
            <button
              onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
              className={`flex-1 px-8 py-4 border-2 ${buttonBorder} ${textColor} backdrop-blur-sm transition-all duration-500 text-sm md:text-base relative overflow-hidden group`}
              style={{
                minHeight: '44px',
                background: darkMode ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 255, 255, 0.24)',
                boxShadow: darkMode
                  ? '0 0 38px rgba(255, 235, 180, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.14)'
                  : '0 0 30px rgba(255, 240, 200, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.22)',
                borderRadius: '12px',
              }}
            >
              <span className="relative z-10 font-brand-en uppercase tracking-wider">
                {currentStep < steps.length - 1 ? 'Continue' : 'Begin'}
              </span>
              <span className="relative z-10 block font-amiri text-xs mt-1 opacity-60">
                {currentStep < steps.length - 1 ? 'استمر' : 'ابدأ'}
              </span>
              {/* Light sweep on hover (matches splash) */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                style={{
                  background: darkMode
                    ? 'linear-gradient(90deg, transparent, rgba(255, 235, 180, 0.4), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(255, 240, 200, 0.5), transparent)',
                  animation: 'lightSweep 2s ease-in-out infinite',
                }}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Floating light particles - dust motes in sunbeams */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(18)].map((_, i) => {
          const size = Math.random() * 4 + 1.5;
          const x = Math.random() * 100;
          const y = Math.random() * 100;
          const delay = Math.random() * 4;
          const duration = Math.random() * 6 + 4;

          return (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${size}px`,
                height: `${size}px`,
                left: `${x}%`,
                top: `${y}%`,
                background: darkMode ? 'rgba(255, 235, 180, 0.50)' : 'rgba(255, 240, 200, 0.60)',
                boxShadow: darkMode
                  ? '0 0 14px rgba(255, 235, 180, 0.70)'
                  : '0 0 12px rgba(255, 240, 200, 0.80)',
                animation: `floatLightParticle ${duration}s ease-in-out infinite`,
                animationDelay: `${delay}s`,
              }}
            />
          );
        })}
      </div>

      <style>{`
        @keyframes floatLightParticle {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          15% {
            opacity: 0.7;
          }
          50% {
            transform: translateY(-40px) translateX(15px);
            opacity: 0.9;
          }
          85% {
            opacity: 0.7;
          }
        }
      `}</style>
    </div>
  );
};
