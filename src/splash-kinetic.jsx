import React, { useState, useEffect, useRef } from 'react';
import { Moon, Sun } from 'lucide-react';

/* =============================================================================
  OPTION E: TYPOGRAPHIC DANCE

  Design Philosophy: Letters performing a kinetic ballet
  - Individual letter forms floating and dancing
  - Letters slowly come together to form "poetry" and "شعر"
  - Physics-based animation (gravity, inertia, rotation)
  - Monochrome with single accent color (indigo)
  - Letters respond to device orientation (gyroscope if available)
  - Playful yet elegant, mobile-first
  =============================================================================*/

/* =============================================================================
  LETTER PHYSICS ENGINE
  =============================================================================*/

// Physics constants
const PHYSICS = {
  gravity: 0.15,
  friction: 0.98,
  bounce: 0.6,
  attractionStrength: 0.02,
  rotationSpeed: 0.05,
  gyroInfluence: 0.3
};

// Letter component with physics
const FloatingLetter = ({
  letter,
  targetX,
  targetY,
  index,
  isArabic,
  darkMode,
  gyro,
  hasStarted
}) => {
  const [position, setPosition] = useState({
    x: typeof window !== 'undefined' ? Math.random() * window.innerWidth : 0,
    y: typeof window !== 'undefined' ? Math.random() * window.innerHeight : 0,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    rotation: Math.random() * 360,
    vr: (Math.random() - 0.5) * 2
  });

  const animationRef = useRef(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    const animate = () => {
      if (!mounted.current) return;

      setPosition(prev => {
        // Calculate attraction to target
        const dx = targetX - prev.x;
        const dy = targetY - prev.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Apply forces
        let ax = dx * PHYSICS.attractionStrength;
        let ay = dy * PHYSICS.attractionStrength + PHYSICS.gravity;

        // Add gyroscope influence
        if (gyro.x !== 0 || gyro.y !== 0) {
          ax += gyro.x * PHYSICS.gyroInfluence;
          ay += gyro.y * PHYSICS.gyroInfluence;
        }

        // Update velocity
        let newVx = (prev.vx + ax) * PHYSICS.friction;
        let newVy = (prev.vy + ay) * PHYSICS.friction;

        // Update position
        let newX = prev.x + newVx;
        let newY = prev.y + newVy;

        // Boundary collision with bounce
        const margin = 50;
        if (newX < margin || newX > window.innerWidth - margin) {
          newVx *= -PHYSICS.bounce;
          newX = Math.max(margin, Math.min(window.innerWidth - margin, newX));
        }
        if (newY < margin || newY > window.innerHeight - margin) {
          newVy *= -PHYSICS.bounce;
          newY = Math.max(margin, Math.min(window.innerHeight - margin, newY));
        }

        // Rotation
        const targetRotation = distance < 100 ? 0 : prev.rotation;
        const newVr = distance < 100
          ? (targetRotation - prev.rotation) * 0.1
          : prev.vr * 0.99;
        const newRotation = prev.rotation + newVr;

        return {
          x: newX,
          y: newY,
          vx: newVx,
          vy: newVy,
          rotation: newRotation,
          vr: newVr
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetX, targetY, gyro, hasStarted]);

  const accentColor = darkMode ? 'text-indigo-400' : 'text-indigo-600';
  const textColor = darkMode ? 'text-stone-200' : 'text-stone-800';

  return (
    <div
      className={`fixed pointer-events-none ${index % 3 === 0 ? accentColor : textColor}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: `translate(-50%, -50%) rotate(${position.rotation}deg)`,
        fontSize: isArabic ? 'clamp(2rem, 6vw, 4rem)' : 'clamp(2.5rem, 7vw, 5rem)',
        fontFamily: isArabic ? 'Amiri, serif' : 'system-ui, sans-serif',
        fontWeight: isArabic ? 700 : 900,
        opacity: hasStarted ? 0.9 : 0,
        transition: 'opacity 0.5s ease-out',
        textShadow: darkMode
          ? '0 0 20px rgba(99, 102, 241, 0.3)'
          : '0 0 20px rgba(99, 102, 241, 0.2)',
        willChange: 'transform'
      }}
    >
      {letter}
    </div>
  );
};

/* =============================================================================
  MAIN KINETIC SPLASH COMPONENT
  =============================================================================*/

export const SplashKinetic = ({ onGetStarted, darkMode, onToggleTheme }) => {
  const [hasStarted, setHasStarted] = useState(false);
  const [gyro, setGyro] = useState({ x: 0, y: 0 });
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  const bgColor = darkMode ? 'bg-black' : 'bg-stone-50';
  const textColor = darkMode ? 'text-stone-100' : 'text-stone-900';
  const accentColor = darkMode ? 'text-indigo-400' : 'text-indigo-600';
  const buttonBorder = darkMode ? 'border-stone-600' : 'border-stone-300';
  const buttonHoverBg = darkMode ? 'hover:bg-stone-900' : 'hover:bg-stone-100';

  // English letters: "poetry"
  const englishLetters = ['p', 'o', 'e', 't', 'r', 'y'];

  // Arabic letters: "شعر"
  const arabicLetters = ['ش', 'ع', 'ر'];

  // Target positions - form centered words
  const centerX = windowSize.width / 2;
  const centerY = windowSize.height / 2;

  // Calculate target positions for "poetry" (top line)
  const englishSpacing = Math.min(60, windowSize.width / 15);
  const englishStartX = centerX - (englishLetters.length * englishSpacing) / 2;
  const englishY = centerY - 50;

  // Calculate target positions for "شعر" (bottom line)
  const arabicSpacing = Math.min(80, windowSize.width / 12);
  const arabicStartX = centerX + (arabicLetters.length * arabicSpacing) / 2; // RTL
  const arabicY = centerY + 50;

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Start animation after brief delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Device orientation (gyroscope)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOrientation = (event) => {
      if (event.beta !== null && event.gamma !== null) {
        // beta: front-to-back tilt (-180 to 180)
        // gamma: left-to-right tilt (-90 to 90)
        setGyro({
          x: (event.gamma || 0) / 90, // Normalize to -1 to 1
          y: (event.beta || 0) / 180   // Normalize to -1 to 1
        });
      }
    };

    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ requires permission request
      // We'll skip this to avoid blocking the experience
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div className={`fixed inset-0 z-50 ${bgColor} overflow-hidden`}>
      {/* Subtle gradient background */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          background: darkMode
            ? 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.3), transparent 70%)'
            : 'radial-gradient(circle at 50% 50%, rgba(99, 102, 241, 0.2), transparent 70%)'
        }}
      />

      {/* Floating English letters - "poetry" */}
      {englishLetters.map((letter, i) => (
        <FloatingLetter
          key={`en-${i}`}
          letter={letter}
          targetX={englishStartX + i * englishSpacing}
          targetY={englishY}
          index={i}
          isArabic={false}
          darkMode={darkMode}
          gyro={gyro}
          hasStarted={hasStarted}
        />
      ))}

      {/* Floating Arabic letters - "شعر" (RTL) */}
      {arabicLetters.map((letter, i) => (
        <FloatingLetter
          key={`ar-${i}`}
          letter={letter}
          targetX={arabicStartX - i * arabicSpacing}
          targetY={arabicY}
          index={i + englishLetters.length}
          isArabic={true}
          darkMode={darkMode}
          gyro={gyro}
          hasStarted={hasStarted}
        />
      ))}

      {/* Theme toggle - top right */}
      <button
        onClick={onToggleTheme}
        className={`fixed top-6 right-6 z-50 w-11 h-11 rounded-full flex items-center justify-center border-2 ${buttonBorder} ${buttonHoverBg} transition-all duration-300`}
        aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {darkMode ? <Sun size={18} className={textColor} /> : <Moon size={18} className={textColor} />}
      </button>

      {/* Call to action - appears after letters settle */}
      <div
        className="fixed bottom-12 left-0 right-0 flex flex-col items-center gap-4 z-40"
        style={{
          animation: 'fadeInUp 1s ease-out 2.5s forwards',
          opacity: 0
        }}
      >
        <button
          onClick={onGetStarted}
          className={`px-8 py-3 border-2 ${buttonBorder} ${textColor} ${buttonHoverBg} transition-all duration-300 group`}
          style={{
            minHeight: '44px',
            minWidth: '44px'
          }}
        >
          <span className="block font-brand-en uppercase tracking-[0.2em] text-sm">
            Enter
          </span>
          <span className="block font-amiri text-xs mt-0.5 opacity-60">
            ادخل
          </span>
        </button>

        {/* Subtle instruction */}
        <p
          className={`text-[10px] ${textColor} opacity-40 font-brand-en uppercase tracking-widest`}
          style={{ letterSpacing: '0.2em' }}
        >
          {gyro.x !== 0 || gyro.y !== 0
            ? 'Tilt your device to play'
            : 'Watch the letters dance'
          }
        </p>
      </div>

      {/* Animation keyframes */}
      <style>{`
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
