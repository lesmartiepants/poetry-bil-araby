import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun, X } from 'lucide-react';

/* =============================================================================
  OPTION I: PARTICLE FIELD
  Thousands of tiny particles forming Arabic calligraphy
  Generative and modern with interactive swarm behavior
  Voice: Arabic poetry professor - scholarly, poetic, philosophical
  Theme: Verses connect like particles through time and space
  =============================================================================*/

// Simplex-like noise function for organic movement
const noise = (x, y, z) => {
  // Simple pseudo-noise using sin waves (lightweight alternative to full simplex)
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return n - Math.floor(n);
};

// Generate particle positions that form Arabic calligraphy shape
const generateParticles = (count = 800) => {
  const particles = [];

  // Define calligraphic curves for "شعر" (poetry) in stylized form
  // Using bezier-like curves to create organic shapes
  const curves = [
    // Curve 1: Right stroke (ش)
    { x: 0.7, y: 0.4, radius: 0.15, density: 0.35 },
    // Curve 2: Middle connection
    { x: 0.5, y: 0.5, radius: 0.12, density: 0.3 },
    // Curve 3: Left stroke (ر)
    { x: 0.3, y: 0.45, radius: 0.18, density: 0.35 },
  ];

  for (let i = 0; i < count; i++) {
    // Randomly select a curve
    const curve = curves[Math.floor(Math.random() * curves.length)];

    // Generate position around the curve with some randomness
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * curve.radius;

    const x = curve.x + Math.cos(angle) * distance + (Math.random() - 0.5) * 0.1;
    const y = curve.y + Math.sin(angle) * distance + (Math.random() - 0.5) * 0.1;

    particles.push({
      id: i,
      originX: x,
      originY: y,
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 0.0002,
      vy: (Math.random() - 0.5) * 0.0002,
      radius: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.3,
      noiseOffsetX: Math.random() * 1000,
      noiseOffsetY: Math.random() * 1000,
    });
  }

  return particles;
};

export const SplashParticles = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [particles, setParticles] = useState(() => generateParticles(800));
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const svgRef = useRef(null);
  const timeRef = useRef(0);
  const animationFrameRef = useRef(null);

  // Update mouse position (normalized to 0-1)
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animate particles
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.01;
      const time = timeRef.current;

      setParticles(prevParticles =>
        prevParticles.map(p => {
          // Noise-based movement
          const noiseX = noise(
            p.originX + time * 0.1,
            p.originY,
            p.noiseOffsetX
          ) - 0.5;
          const noiseY = noise(
            p.originY + time * 0.1,
            p.originX,
            p.noiseOffsetY
          ) - 0.5;

          // Mouse interaction - repel particles
          const dx = p.x - mousePos.x;
          const dy = p.y - mousePos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const minDistance = 0.15;

          let forceX = 0;
          let forceY = 0;

          if (distance < minDistance && distance > 0) {
            const force = (minDistance - distance) / minDistance;
            forceX = (dx / distance) * force * 0.002;
            forceY = (dy / distance) * force * 0.002;
          }

          // Update velocity with forces
          const newVx = p.vx + noiseX * 0.00005 + forceX;
          const newVy = p.vy + noiseY * 0.00005 + forceY;

          // Update position
          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Gentle pull back to origin
          const pullStrength = 0.001;
          newX += (p.originX - newX) * pullStrength;
          newY += (p.originY - newY) * pullStrength;

          // Damping
          const damping = 0.98;

          return {
            ...p,
            x: newX,
            y: newY,
            vx: newVx * damping,
            vy: newVy * damping,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePos]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
      {/* Theme toggle */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-8 right-8 z-50 w-12 h-12 rounded-full border ${
          darkMode
            ? 'border-stone-700 hover:bg-stone-900'
            : 'border-stone-300 hover:bg-stone-100'
        } flex items-center justify-center transition-all`}
      >
        {darkMode ? (
          <Sun size={18} className="text-stone-400" />
        ) : (
          <Moon size={18} className="text-stone-600" />
        )}
      </button>

      {/* Particle field */}
      <div className="absolute inset-0">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="xMidYMid slice"
        >
          {particles.map(p => (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={p.radius / 1000}
              fill={darkMode ? '#ffffff' : '#000000'}
              opacity={p.opacity}
            />
          ))}
        </svg>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 max-w-4xl mx-8 text-center pointer-events-none">
        {/* Logo */}
        <div className="mb-16">
          <div className="flex flex-row-reverse items-center justify-center gap-4 tracking-wide">
            <h1 className="flex items-end gap-6">
              <span
                className={`font-brand-ar text-6xl md:text-7xl font-bold mb-2 ${
                  darkMode ? 'text-white' : 'text-black'
                }`}
              >
                بالعربي
              </span>
              <span
                className={`font-brand-en text-7xl md:text-8xl lowercase tracking-tighter font-light ${
                  darkMode ? 'text-white' : 'text-black'
                }`}
              >
                poetry
              </span>
            </h1>
          </div>
        </div>

        {/* Subtitle - Scholarly voice */}
        <div
          className={`mb-16 font-brand-en text-sm uppercase tracking-[0.3em] ${
            darkMode ? 'text-stone-400' : 'text-stone-600'
          }`}
        >
          Verses Connecting Across Time and Space
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className={`pointer-events-auto px-12 py-4 border ${
            darkMode
              ? 'border-white text-white hover:bg-white hover:text-black'
              : 'border-black text-black hover:bg-black hover:text-white'
          } font-brand-en text-sm uppercase tracking-[0.25em] transition-all duration-300`}
        >
          Enter
        </button>

        {/* Interaction hint - More poetic */}
        <div
          className={`mt-12 font-brand-en text-xs tracking-wider ${
            darkMode ? 'text-stone-600' : 'text-stone-400'
          }`}
        >
          Move your cursor to disturb the field
        </div>
      </div>

      {/* Performance info (hidden, for debugging) */}
      <div className="fixed bottom-4 left-4 text-[10px] font-mono opacity-0 pointer-events-none">
        {particles.length} particles
      </div>
    </div>
  );
};

/* =============================================================================
  PARTICLE FIELD WALKTHROUGH - COMPLETE REDESIGN
  Physics-driven interactive tutorial matching particle splash aesthetic
  Features: Dynamic particle morphing, step-based physics, interactive field
  Voice: Scholarly, philosophical - verses connecting across space and time
  =============================================================================*/

export const ParticleWalkthrough = ({ onClose, darkMode, currentStep = 0, onStepChange }) => {
  /* ---------------------------------------------------------------------------
     STATE & REFS
     --------------------------------------------------------------------------- */
  const [localParticles, setLocalParticles] = useState(() => generateParticles(400));
  const [step, setStep] = useState(currentStep);
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [transitionProgress, setTransitionProgress] = useState(1);
  const timeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const svgRef = useRef(null);

  /* ---------------------------------------------------------------------------
     CONTENT CONFIGURATION - ENHANCED PHILOSOPHICAL VOICE
     --------------------------------------------------------------------------- */
  const steps = [
    {
      title: "Navigate Through Time",
      titleAr: "رحلة عبر الزمن",
      body: "Centuries of verse flow before you like particles in a stream. Each poem a moment captured, each swipe a leap through time. From the courts of Baghdad to the cafés of Damascus, the masters await.",
      instruction: "Swipe or use arrow keys",
      icon: "navigate",
      particleMode: "flow"
    },
    {
      title: "Listen to the Rhythm",
      titleAr: "استمع للإيقاع",
      body: "Poetry was meant to be heard, not just read. Let the verses wash over you in their original rhythm—the sound waves carrying meaning across the centuries, connecting ear to heart to mind.",
      instruction: "Tap play to hear recitation",
      icon: "play",
      particleMode: "wave"
    },
    {
      title: "Discover the Connections",
      titleAr: "اكتشف الترابط",
      body: "Every verse contains layers of meaning, threads connecting to history, culture, and the eternal questions. Seek insights to unveil the network of knowledge woven into each line.",
      instruction: "Press 'Seek Insight' for analysis",
      icon: "insights",
      cta: "Begin Your Journey",
      particleMode: "network"
    }
  ];

  const currentStepData = steps[step];

  /* ---------------------------------------------------------------------------
     PARTICLE PHYSICS CONFIGURATION PER STEP
     Each step has unique particle behavior matching its theme
     --------------------------------------------------------------------------- */
  const particleConfig = {
    flow: {
      // Step 0: Flowing streams (navigation through time)
      attractionStrength: 0.0015,
      flowDirection: { x: 0.003, y: 0 },
      noiseScale: 0.08,
      connectionDistance: 0.18,
      connectionOpacity: 0.15,
      particleTrails: true,
    },
    wave: {
      // Step 1: Pulsing waves (audio rhythm)
      attractionStrength: 0.0012,
      pulseFrequency: 0.05,
      pulseAmplitude: 0.02,
      noiseScale: 0.05,
      connectionDistance: 0.12,
      connectionOpacity: 0.22,
      particleTrails: false,
    },
    network: {
      // Step 2: Interconnected network (meaning and insights)
      attractionStrength: 0.0008,
      networkDensity: 0.85,
      noiseScale: 0.03,
      connectionDistance: 0.08,
      connectionOpacity: 0.32,
      particleTrails: false,
    },
  };

  const config = particleConfig[currentStepData.particleMode] || particleConfig.flow;

  /* ---------------------------------------------------------------------------
     SYNC WITH CONTROLLED STEP PROP + TRANSITION ANIMATION
     --------------------------------------------------------------------------- */
  useEffect(() => {
    if (currentStep !== step) {
      setTransitionProgress(0);
      const transitionDuration = 600;
      const startTime = Date.now();

      const animateTransition = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / transitionDuration, 1);
        setTransitionProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animateTransition);
        }
      };

      requestAnimationFrame(animateTransition);
      setStep(currentStep);
    }
  }, [currentStep]);

  /* ---------------------------------------------------------------------------
     MOUSE TRACKING FOR INTERACTION
     --------------------------------------------------------------------------- */
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setMousePos({
          x: (e.clientX - rect.left) / rect.width,
          y: (e.clientY - rect.top) / rect.height,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  /* ---------------------------------------------------------------------------
     PARTICLE ANIMATION LOOP - STEP-SPECIFIC PHYSICS
     Different behavior per step: flow, wave, or network
     --------------------------------------------------------------------------- */
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.01;
      const time = timeRef.current;

      setLocalParticles(prevParticles =>
        prevParticles.map(p => {
          // Base noise movement scaled by step config
          const noiseX = (noise(
            p.originX + time * 0.1,
            p.originY,
            p.noiseOffsetX
          ) - 0.5) * config.noiseScale;

          const noiseY = (noise(
            p.originY + time * 0.1,
            p.originX,
            p.noiseOffsetY
          ) - 0.5) * config.noiseScale;

          // Step-specific behavior
          let behaviorForceX = 0;
          let behaviorForceY = 0;

          if (currentStepData.particleMode === 'flow') {
            // Flow: Horizontal streaming motion
            behaviorForceX = config.flowDirection.x * Math.sin(time * 0.5 + p.originY * 5);
            behaviorForceY = config.flowDirection.y;
          } else if (currentStepData.particleMode === 'wave') {
            // Wave: Vertical pulsing like sound waves
            const waveY = Math.sin(time * config.pulseFrequency * 10 + p.originX * 8) * config.pulseAmplitude;
            behaviorForceY = waveY * 0.1;
          } else if (currentStepData.particleMode === 'network') {
            // Network: Particles attract to nearest neighbors
            const nearestParticle = prevParticles
              .filter(p2 => p2.id !== p.id)
              .sort((a, b) => {
                const distA = Math.sqrt(Math.pow(a.x - p.x, 2) + Math.pow(a.y - p.y, 2));
                const distB = Math.sqrt(Math.pow(b.x - p.x, 2) + Math.pow(b.y - p.y, 2));
                return distA - distB;
              })[0];

            if (nearestParticle) {
              const dx = nearestParticle.x - p.x;
              const dy = nearestParticle.y - p.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 0 && dist < 0.15) {
                behaviorForceX = (dx / dist) * 0.0003;
                behaviorForceY = (dy / dist) * 0.0003;
              }
            }
          }

          // Enhanced mouse interaction
          const dx = mousePos.x - p.x;
          const dy = mousePos.y - p.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const interactionRadius = 0.25;

          let mouseForceX = 0;
          let mouseForceY = 0;

          if (distance < interactionRadius && distance > 0) {
            const force = (interactionRadius - distance) / interactionRadius;
            mouseForceX = (dx / distance) * force * config.attractionStrength;
            mouseForceY = (dy / distance) * force * config.attractionStrength;
          }

          // Combine all forces
          const newVx = p.vx + noiseX * 0.00008 + behaviorForceX + mouseForceX;
          const newVy = p.vy + noiseY * 0.00008 + behaviorForceY + mouseForceY;

          // Update position
          let newX = p.x + newVx;
          let newY = p.y + newVy;

          // Gentle pull back to origin (weaker in network mode)
          const pullStrength = currentStepData.particleMode === 'network' ? 0.0005 : 0.001;
          newX += (p.originX - newX) * pullStrength;
          newY += (p.originY - newY) * pullStrength;

          // Damping
          const damping = 0.97;

          return {
            ...p,
            x: newX,
            y: newY,
            vx: newVx * damping,
            vy: newVy * damping,
          };
        })
      );

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [mousePos, currentStepData.particleMode, config]);

  /* ---------------------------------------------------------------------------
     NAVIGATION HANDLERS
     --------------------------------------------------------------------------- */
  const handleNext = () => {
    if (step < steps.length - 1) {
      const newStep = step + 1;
      setStep(newStep);
      onStepChange?.(newStep);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const newStep = step - 1;
      setStep(newStep);
      onStepChange?.(newStep);
    }
  };

  const handleStepClick = (idx) => {
    setStep(idx);
    onStepChange?.(idx);
  };

  /* ---------------------------------------------------------------------------
     STEP-SPECIFIC ANIMATED ICONS
     SVG animations for each tutorial step
     --------------------------------------------------------------------------- */
  const renderStepIcon = () => {
    const centerX = 50;
    const centerY = 50;

    if (currentStepData.icon === 'navigate') {
      // Swipe gesture with motion trail
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {[...Array(6)].map((_, i) => {
            const x = 15 + i * 14;
            const y = 50 + Math.sin(i * 0.6) * 8;
            const size = 3.5 - i * 0.4;
            const opacity = 1 - i * 0.12;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={size}
                fill={darkMode ? '#ffffff' : '#000000'}
                opacity={opacity}
                style={{
                  animation: `swipeTrail ${1.2 + i * 0.15}s ease-in-out infinite`,
                  animationDelay: `${i * 0.08}s`
                }}
              />
            );
          })}
          <path
            d="M 78 50 L 88 50 M 88 50 L 83 45 M 88 50 L 83 55"
            stroke={darkMode ? '#ffffff' : '#000000'}
            strokeWidth="2.5"
            fill="none"
            opacity="0.7"
            strokeLinecap="round"
          />
        </svg>
      );
    }

    if (currentStepData.icon === 'play') {
      // Audio waveform with pulsing rings
      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {[...Array(3)].map((_, i) => {
            const radius = 18 + i * 12;
            return (
              <circle
                key={i}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={darkMode ? '#ffffff' : '#000000'}
                strokeWidth="2"
                opacity={0.5 - i * 0.12}
                style={{
                  animation: `audioPulse ${1.8 + i * 0.4}s ease-in-out infinite`,
                  animationDelay: `${i * 0.25}s`
                }}
              />
            );
          })}
          <circle
            cx={centerX}
            cy={centerY}
            r="12"
            fill={darkMode ? '#ffffff' : '#000000'}
            opacity="0.9"
          />
          <path
            d="M 46 42 L 46 58 L 58 50 Z"
            fill={darkMode ? '#000000' : '#ffffff'}
            opacity="1"
          />
        </svg>
      );
    }

    if (currentStepData.icon === 'insights') {
      // Network graph with connecting nodes
      const nodes = [
        { x: 50, y: 50, r: 5 },
        { x: 28, y: 32, r: 3.5 },
        { x: 72, y: 32, r: 3.5 },
        { x: 22, y: 68, r: 3 },
        { x: 78, y: 68, r: 3 },
        { x: 50, y: 78, r: 3 }
      ];

      return (
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Connection lines */}
          {nodes.map((node, i) =>
            nodes.slice(i + 1).map((target, j) => {
              const distance = Math.sqrt(
                Math.pow(target.x - node.x, 2) + Math.pow(target.y - node.y, 2)
              );
              return (
                <line
                  key={`${i}-${j}`}
                  x1={node.x}
                  y1={node.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={darkMode ? '#ffffff' : '#000000'}
                  strokeWidth="1.5"
                  opacity="0.25"
                  style={{
                    animation: `connectionGrow ${2 + distance * 0.02}s ease-in-out infinite`,
                    animationDelay: `${(i + j) * 0.12}s`
                  }}
                />
              );
            })
          )}
          {/* Nodes */}
          {nodes.map((node, i) => (
            <circle
              key={i}
              cx={node.x}
              cy={node.y}
              r={node.r}
              fill={darkMode ? '#ffffff' : '#000000'}
              opacity="0.85"
              style={{
                animation: `nodePulse ${1.6 + i * 0.25}s ease-in-out infinite`,
                animationDelay: `${i * 0.18}s`
              }}
            />
          ))}
        </svg>
      );
    }
  };

  /* ---------------------------------------------------------------------------
     RENDER
     --------------------------------------------------------------------------- */
  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black/95' : 'bg-white/95'} backdrop-blur-2xl`}>
      {/* Enhanced particle field background - dynamic based on step */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-700"
        style={{ opacity: 0.18 + (step * 0.06) }}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1 1"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Particles with size and opacity variation for depth */}
          {localParticles.map(p => {
            const depthScale = 0.7 + (p.opacity * 0.6);
            const glowIntensity = currentStepData.particleMode === 'network' ? 1.3 : 1;

            return (
              <React.Fragment key={p.id}>
                {/* Glow effect for active particles */}
                {currentStepData.particleMode === 'network' && p.opacity > 0.5 && (
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={(p.radius * 2) / 1000}
                    fill={darkMode ? '#ffffff' : '#000000'}
                    opacity={p.opacity * 0.15}
                    style={{
                      filter: 'blur(2px)',
                    }}
                  />
                )}
                {/* Main particle */}
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={(p.radius * depthScale) / 1000}
                  fill={darkMode ? '#ffffff' : '#000000'}
                  opacity={p.opacity * 0.7 * glowIntensity}
                />
              </React.Fragment>
            );
          })}

          {/* Dynamic connection lines based on step */}
          {localParticles.map((p, i) => {
            const nearbyParticles = localParticles
              .slice(i + 1, Math.min(i + 10, localParticles.length))
              .filter(p2 => {
                const dx = p2.x - p.x;
                const dy = p2.y - p.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < config.connectionDistance;
              });

            return nearbyParticles.map((p2, j) => {
              const dx = p2.x - p.x;
              const dy = p2.y - p.y;
              const distance = Math.sqrt(dx * dx + dy * dy);
              const lineOpacity = config.connectionOpacity * (1 - distance / config.connectionDistance);

              return (
                <line
                  key={`${p.id}-${j}`}
                  x1={p.x}
                  y1={p.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={darkMode ? '#ffffff' : '#000000'}
                  strokeWidth={0.0005}
                  opacity={lineOpacity}
                  style={{
                    transition: 'opacity 0.5s ease-out',
                  }}
                />
              );
            });
          })}
        </svg>
      </div>

      {/* Content card - floating and weightless */}
      <div
        className={`relative max-w-4xl mx-6 ${
          darkMode ? 'bg-black/70' : 'bg-white/70'
        } backdrop-blur-3xl border ${
          darkMode ? 'border-stone-800/40' : 'border-stone-200/40'
        } rounded-3xl p-12 md:p-20 shadow-2xl`}
        style={{
          animation: 'floatIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          transform: `scale(${0.96 + (transitionProgress * 0.04)})`,
        }}
      >
        {/* Close button - WCAG compliant */}
        <button
          onClick={onClose}
          aria-label="Skip walkthrough"
          className={`absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full transition-all duration-400 ${
            darkMode
              ? 'text-stone-500 hover:bg-stone-900/60 hover:text-stone-200'
              : 'text-stone-500 hover:bg-stone-100/60 hover:text-stone-800'
          } hover:scale-110`}
        >
          <X size={22} />
        </button>

        {/* Particle mode indicator - subtle visual cue */}
        <div className="absolute top-8 left-8 flex items-center gap-2">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-500 ${
                i === step
                  ? darkMode ? 'bg-white' : 'bg-black'
                  : darkMode ? 'bg-stone-700' : 'bg-stone-300'
              }`}
              style={{
                transform: i === step ? 'scale(1.4)' : 'scale(1)',
              }}
            />
          ))}
        </div>

        {/* Magazine-style content */}
        <div className="flex flex-col items-center gap-10 text-center">
          {/* Step icon with enhanced entrance */}
          <div
            className="w-32 h-32 md:w-40 md:h-40 relative"
            style={{
              animation: 'iconFloat 0.8s ease-out 0.2s both',
              opacity: transitionProgress,
            }}
          >
            {renderStepIcon()}
          </div>

          {/* Titles - enhanced hierarchy */}
          <div
            className={`space-y-4 ${darkMode ? 'text-white' : 'text-black'}`}
            style={{
              animation: 'fadeInScale 0.7s ease-out 0.3s both',
              opacity: transitionProgress,
            }}
          >
            <h2 className="font-amiri text-6xl md:text-7xl font-normal leading-tight">
              {currentStepData.titleAr}
            </h2>
            <p className="text-3xl md:text-4xl font-light tracking-wide opacity-90">
              {currentStepData.title}
            </p>
          </div>

          {/* Body copy - enhanced readability */}
          <p
            className={`text-xl md:text-2xl leading-relaxed max-w-3xl ${
              darkMode ? 'text-stone-300' : 'text-stone-700'
            }`}
            style={{
              animation: 'fadeInUp 0.7s ease-out 0.4s both',
              lineHeight: '1.7em',
              opacity: transitionProgress,
            }}
          >
            {currentStepData.body}
          </p>

          {/* Instruction hint - refined styling */}
          <p
            className={`text-sm tracking-[0.4em] uppercase font-medium ${
              darkMode ? 'text-stone-600' : 'text-stone-500'
            }`}
            style={{
              animation: 'fadeInUp 0.7s ease-out 0.5s both',
              opacity: transitionProgress * 0.7,
            }}
          >
            {currentStepData.instruction}
          </p>

          {/* Progress indicator - floating particle dots */}
          <div className="flex items-center gap-4 mt-10">
            {steps.map((_, idx) => {
              const isActive = idx === step;
              const isComplete = idx < step;
              const isPending = idx > step;

              return (
                <React.Fragment key={idx}>
                  <button
                    onClick={() => handleStepClick(idx)}
                    aria-label={`Go to step ${idx + 1}`}
                    className="relative min-w-[44px] min-h-[44px] flex items-center justify-center group"
                  >
                    {/* Outer glow ring for active */}
                    {isActive && (
                      <div
                        className={`absolute rounded-full ${
                          darkMode ? 'bg-white' : 'bg-black'
                        } opacity-20`}
                        style={{
                          width: '32px',
                          height: '32px',
                          animation: 'pulseGlow 2s ease-in-out infinite',
                        }}
                      />
                    )}
                    {/* Main dot */}
                    <div
                      className={`rounded-full transition-all duration-500 ${
                        darkMode
                          ? isActive || isComplete
                            ? 'bg-white'
                            : 'bg-stone-700 group-hover:bg-stone-600'
                          : isActive || isComplete
                          ? 'bg-black'
                          : 'bg-stone-400 group-hover:bg-stone-500'
                      }`}
                      style={{
                        width: isActive ? '16px' : isComplete ? '12px' : '8px',
                        height: isActive ? '16px' : isComplete ? '12px' : '8px',
                        boxShadow: isActive
                          ? darkMode
                            ? '0 0 20px rgba(255,255,255,0.3)'
                            : '0 0 20px rgba(0,0,0,0.3)'
                          : 'none',
                      }}
                    />
                  </button>
                  {idx < steps.length - 1 && (
                    <div
                      className={`h-[2px] w-12 rounded-full transition-all duration-700 ${
                        isComplete
                          ? darkMode
                            ? 'bg-gradient-to-r from-white to-stone-700'
                            : 'bg-gradient-to-r from-black to-stone-300'
                          : darkMode
                          ? 'bg-stone-800'
                          : 'bg-stone-200'
                      }`}
                      style={{
                        opacity: isComplete ? 1 : 0.3,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Navigation buttons - enhanced floating style */}
          <div className="flex items-center gap-6 mt-12 w-full max-w-lg">
            {step > 0 && (
              <button
                onClick={handlePrev}
                aria-label="Previous step"
                className={`flex-1 min-h-[56px] px-10 py-4 border-2 rounded-2xl ${
                  darkMode
                    ? 'border-stone-700 hover:border-stone-600 hover:bg-stone-900/40 text-white'
                    : 'border-stone-300 hover:border-stone-400 hover:bg-stone-100/40 text-black'
                } text-lg font-medium tracking-wide transition-all duration-400 hover:scale-105 hover:shadow-lg backdrop-blur-sm`}
                style={{
                  animation: 'fadeInUp 0.7s ease-out 0.6s both',
                }}
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              aria-label={step < steps.length - 1 ? 'Next step' : 'Start exploring'}
              className={`flex-1 min-h-[56px] px-10 py-4 rounded-2xl ${
                darkMode
                  ? 'bg-white text-black hover:bg-stone-100'
                  : 'bg-black text-white hover:bg-stone-900'
              } text-lg font-medium tracking-wide transition-all duration-400 hover:scale-105 shadow-2xl`}
              style={{
                animation: 'fadeInUp 0.7s ease-out 0.7s both',
                boxShadow: darkMode
                  ? '0 20px 50px rgba(255,255,255,0.15)'
                  : '0 20px 50px rgba(0,0,0,0.15)',
              }}
            >
              {step < steps.length - 1 ? 'Continue' : currentStepData.cta || 'Begin Your Journey'}
            </button>
          </div>
        </div>
      </div>

      {/* Interaction hint - floats at bottom */}
      <div
        className={`fixed bottom-10 left-1/2 transform -translate-x-1/2 text-xs tracking-[0.3em] uppercase ${
          darkMode ? 'text-stone-700' : 'text-stone-400'
        } pointer-events-none`}
        style={{
          animation: 'fadeIn 1s ease-out 1s both',
        }}
      >
        Move cursor to interact with particles
      </div>

      {/* CSS Animations - Physics-inspired */}
      <style>{`
        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(50px) scale(0.94);
            filter: blur(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes iconFloat {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.8);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(25px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
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

        @keyframes pulseGlow {
          0%, 100% {
            transform: scale(1);
            opacity: 0.15;
          }
          50% {
            transform: scale(1.3);
            opacity: 0.3;
          }
        }

        /* Step icon animations */
        @keyframes swipeTrail {
          0%, 100% {
            transform: translateX(0) translateY(0);
            opacity: 0.3;
          }
          50% {
            transform: translateX(10px) translateY(-3px);
            opacity: 1;
          }
        }

        @keyframes audioPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.25;
          }
          50% {
            transform: scale(1.25);
            opacity: 0.7;
          }
        }

        @keyframes nodePulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }

        @keyframes connectionGrow {
          0%, 100% {
            stroke-dasharray: 0 100;
            opacity: 0.1;
          }
          50% {
            stroke-dasharray: 100 0;
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
};
