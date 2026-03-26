import { useState, useEffect, useRef } from 'react';
import { Feather, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { BRAND } from '../constants/design.js';
import { THEME, GOLD } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

const SplashScreen = () => {
  const isOpen = useModalStore((s) => s.splash);
  const showOnboarding = useModalStore((s) => s.onboarding);
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const onDismiss = () => {
    useModalStore.getState().dismissSplash();
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {}
  };
  // Phase: 0 = desert splash, 1 = kinetic step 0 (Arabic), 2 = kinetic step 1 (English), 3 = kinetic step 2 (count)
  const [phase, setPhase] = useState(0);
  const [fadeState, setFadeState] = useState('in');
  const starsRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);
  const particlesRef = useRef([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const [starsGenerated, setStarsGenerated] = useState(false);

  const isDark = theme === THEME.dark;

  // Generate stars for the splash desert sky
  useEffect(() => {
    if (!isOpen || phase !== 0 || starsGenerated) return;
    const container = starsRef.current;
    if (!container) return;
    const stars = [];
    for (let i = 0; i < 80; i++) {
      const size = (1 + Math.random() * 2).toFixed(1);
      stars.push({
        left: (Math.random() * 100).toFixed(1) + '%',
        top: (Math.random() * 48).toFixed(1) + '%',
        width: size + 'px',
        height: size + 'px',
        dur: (1.2 + Math.random() * 3.5).toFixed(2) + 's',
        delay: (Math.random() * 5).toFixed(2) + 's',
      });
    }
    // Build star elements imperatively for performance
    stars.forEach((s) => {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.background = '#FFF';
      el.style.borderRadius = '50%';
      el.style.left = s.left;
      el.style.top = s.top;
      el.style.width = s.width;
      el.style.height = s.height;
      el.style.animation = `splashTwinkle ${s.dur} ease-in-out infinite alternate`;
      el.style.animationDelay = s.delay;
      container.appendChild(el);
    });
    setStarsGenerated(true);
    return () => {
      // Use textContent to clear imperatively-added children safely —
      // avoids removeChild errors if React is also tearing down the tree
      if (container) container.textContent = '';
    };
  }, [isOpen, phase, starsGenerated]);

  // Particle system for kinetic walkthrough phases
  useEffect(() => {
    if (!isOpen || phase < 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const isMobile = window.innerWidth <= 768;
    const particleCount = isMobile ? 150 : 500;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
      const curve = Math.floor(Math.random() * 3);
      const curves = [
        { x: 0.7, y: 0.5, radius: 0.12 },
        { x: 0.5, y: 0.5, radius: 0.1 },
        { x: 0.3, y: 0.5, radius: 0.14 },
      ];
      const c = curves[curve];
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * c.radius;
      const px = (c.x + Math.cos(angle) * dist) * canvas.width;
      const py = (c.y + Math.sin(angle) * dist) * canvas.height;

      particles.push({
        x: px,
        y: py,
        originX: px,
        originY: py,
        vx: 0,
        vy: 0,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.4,
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: Math.random() * 0.02 + 0.01,
      });
    }
    particlesRef.current = particles;

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const handleTouchMove = (e) => {
      if (e.touches[0]) mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    let running = true;
    const animate = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mouse = mouseRef.current;

      particles.forEach((p) => {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          const f = (120 - d) / 120;
          p.vx -= (dx / d) * f * 0.8;
          p.vy -= (dy / d) * f * 0.8;
        }
        p.vx += (p.originX - p.x) * 0.001;
        p.vy += (p.originY - p.y) * 0.001;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.x += p.vx;
        p.y += p.vy;

        p.twinklePhase += p.twinkleSpeed;
        const twinkle = Math.sin(p.twinklePhase) * 0.3 + 0.7;
        const fo = p.opacity * twinkle;

        if (!isMobile) {
          ctx.beginPath();
          const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
          g1.addColorStop(0, `rgba(200, 220, 255, ${fo * 0.6})`);
          g1.addColorStop(0.3, `rgba(180, 200, 255, ${fo * 0.3})`);
          g1.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = g1;
          ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        if (isMobile) {
          ctx.fillStyle = `rgba(255, 255, 255, ${fo})`;
        } else {
          const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
          g2.addColorStop(0, `rgba(255, 255, 255, ${fo})`);
          g2.addColorStop(0.7, `rgba(240, 245, 255, ${fo * 0.5})`);
          g2.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = g2;
        }
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      running = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen, phase]);

  useEffect(() => {
    if (isOpen) {
      setFadeState('in');
      setPhase(0);
      setStarsGenerated(false);
    }
  }, [isOpen]);

  const handleDismiss = () => {
    setFadeState('out');
    setTimeout(() => {
      onDismiss();
    }, 600);
  };

  const handleSplashEnter = (e) => {
    e.stopPropagation();
    if (showOnboarding) {
      setPhase(1);
    } else {
      handleDismiss();
    }
  };

  const handleWalkthroughTap = (e) => {
    if (e.target.closest('[data-splash-finish]')) return;
    if (phase < 3) {
      setPhase(phase + 1);
    }
  };

  const handleFinish = (e) => {
    e.stopPropagation();
    handleDismiss();
  };

  if (!isOpen) return null;

  // Reduced motion check
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Injected keyframe styles
  const splashStyles = `
    @keyframes splashTwinkle { 0% { opacity: 0.1; } 100% { opacity: 0.95; } }
    @keyframes splashDune1 { to { transform: translateX(18px); } }
    @keyframes splashDune2 { to { transform: translateX(-22px); } }
    @keyframes splashDune3 { to { transform: translateX(12px); } }
    @keyframes splashDune4 { to { transform: translateX(-9px); } }
    @keyframes splashFadeIn { to { opacity: 1; } }
    @keyframes splashArabicReveal {
      from { opacity: 0; transform: scale(0.9); filter: blur(8px); }
      to { opacity: 1; transform: scale(1); filter: blur(0px); }
    }
    @keyframes splashArabicRevealMobile {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes splashLetterReveal {
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes splashCountReveal {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .splash-dune { transform: none !important; animation: none !important; }
    }
  `;

  // Computed values needed by both phases
  const desertNight = '#1A0F0A';
  const gold = GOLD.gold;
  const sandMuted = isDark ? 'rgba(232,213,183,0.5)' : 'rgba(26,15,10,0.4)';
  const dunes = isDark
    ? [
        {
          h: '25%',
          bg: '#6B3720',
          br: '55% 75% 0 0 / 100%',
          z: 4,
          anim: 'splashDune1 10s ease-in-out infinite alternate',
        },
        {
          h: '33%',
          bg: '#5A2E1A',
          br: '75% 45% 0 0 / 100%',
          z: 3,
          anim: 'splashDune2 14s ease-in-out infinite alternate',
        },
        {
          h: '40%',
          bg: '#4A2516',
          br: '45% 65% 0 0 / 100%',
          z: 2,
          anim: 'splashDune3 18s ease-in-out infinite alternate',
        },
        {
          h: '48%',
          bg: '#3A1C12',
          br: '65% 50% 0 0 / 100%',
          z: 1,
          anim: 'splashDune4 23s ease-in-out infinite alternate',
        },
      ]
    : [
        {
          h: '25%',
          bg: '#D4B896',
          br: '55% 75% 0 0 / 100%',
          z: 4,
          anim: 'splashDune1 10s ease-in-out infinite alternate',
        },
        {
          h: '33%',
          bg: '#C8A880',
          br: '75% 45% 0 0 / 100%',
          z: 3,
          anim: 'splashDune2 14s ease-in-out infinite alternate',
        },
        {
          h: '40%',
          bg: '#BC9A6E',
          br: '45% 65% 0 0 / 100%',
          z: 2,
          anim: 'splashDune3 18s ease-in-out infinite alternate',
        },
        {
          h: '48%',
          bg: '#B08C5E',
          br: '65% 50% 0 0 / 100%',
          z: 1,
          anim: 'splashDune4 23s ease-in-out infinite alternate',
        },
      ];
  const bgGradient = isDark
    ? 'linear-gradient(180deg, #0D0A14 0%, #1A0F0A 40%, #3A1C12 100%)'
    : `linear-gradient(180deg, #F5EDE0 0%, #EDE0CC 40%, #B08C5E 100%)`;
  const kineticStep = phase - 1; // 0, 1, or 2
  const progressWidth = ((Math.max(kineticStep, 0) + 1) / 3) * 100 + '%';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  // Single return — both phases always in the DOM, toggled by display.
  // This prevents React from unmounting/remounting the tree when phase changes,
  // which avoids removeChild errors from imperatively-added star DOM nodes.
  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{ display: 'contents' }}
    >
      <style>{splashStyles}</style>

      {/* DESERT SPLASH (phase 0) — hidden via display:none when phase >= 1 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: bgGradient,
          display: phase === 0 ? 'flex' : 'none',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          transition: 'opacity 1s ease-out',
          opacity: fadeState === 'out' ? 0 : 1,
        }}
        role="dialog"
        aria-label="Welcome to Poetry Bil-Araby"
      >
        {/* Sand texture SVG overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            opacity: 0.04,
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='80' height='80' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E\")",
          }}
        />

        {/* Starfield — dangerouslySetInnerHTML tells React these children are externally managed */}
        <div
          ref={starsRef}
          style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
          dangerouslySetInnerHTML={{ __html: '' }}
        />

        {/* Dunes */}
        {dunes.map((d, i) => (
          <div
            key={i}
            className="splash-dune"
            style={{
              position: 'absolute',
              bottom: 0,
              left: '-5%',
              width: '110%',
              height: d.h,
              background: d.bg,
              borderRadius: d.br,
              zIndex: d.z,
              animation: prefersReducedMotion ? 'none' : d.anim,
            }}
          />
        ))}

        {/* Brand — بالعربي + poetry + feather (uses BRAND constants) */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}
        >
          <span
            style={{
              ...BRAND.arabic,
              color: gold,
              textShadow: '0 0 40px rgba(197,160,89,0.3)',
            }}
            dir="rtl"
            lang="ar"
          >
            بالعربي
          </span>
          <span
            style={{
              ...BRAND.english,
              color: isDark ? '#D4D0C8' : '#1A1614',
            }}
          >
            poetry
          </span>
          <Feather style={{ ...BRAND.feather, color: gold }} strokeWidth={1.5} />
        </div>

        {/* Subtitle */}
        <p
          style={{
            position: 'relative',
            zIndex: 10,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: 'clamp(0.9rem, 2.5vw, 1.25rem)',
            color: sandMuted,
            marginTop: '0.5rem',
            letterSpacing: '0.1em',
            direction: 'ltr',
          }}
        >
          Desert Mirage
        </p>

        {/* Enter button */}
        <button
          onClick={handleSplashEnter}
          style={{
            position: 'relative',
            zIndex: 10,
            marginTop: '2.5rem',
            padding: '14px 40px',
            minHeight: '44px',
            background: 'transparent',
            border: `1px solid ${gold}`,
            color: gold,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.9375rem',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            opacity: 0,
            animation: 'splashFadeIn 1s 2s forwards',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = gold;
            e.currentTarget.style.color = desertNight;
            e.currentTarget.style.boxShadow = '0 0 30px rgba(197,160,89,0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = gold;
            e.currentTarget.style.boxShadow = 'none';
          }}
          aria-label="Enter the app"
        >
          Enter
        </button>
      </div>

      {/* KINETIC WALKTHROUGH (phases 1-3) — hidden via display:none until phase >= 1 */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: '#000000',
          display: phase >= 1 ? 'flex' : 'none',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'opacity 0.6s ease',
          opacity: fadeState === 'out' ? 0 : 1,
        }}
        onClick={handleWalkthroughTap}
        role="dialog"
        aria-label="Onboarding walkthrough"
      >
        {/* Particle canvas */}
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
            willChange: 'transform',
            transform: 'translateZ(0)',
          }}
        />

        {/* Kinetic stage */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            width: '100%',
            maxWidth: '600px',
            padding: '2rem',
          }}
        >
          {/* Step 0: Arabic reveal — بالعربي */}
          {kineticStep === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-0"
            >
              <div
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(3.5rem, 9vw, 6rem)',
                  color: '#ffffff',
                  direction: 'rtl',
                  lineHeight: 1.2,
                  marginBottom: '1.5rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : isMobile
                      ? 'splashArabicRevealMobile 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards'
                      : 'splashArabicReveal 1s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
                  willChange: 'transform, opacity, filter',
                  backfaceVisibility: 'hidden',
                  transform: 'translateZ(0)',
                }}
                lang="ar"
                dir="rtl"
              >
                بالعربي
              </div>
              <div
                style={{
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: '0.9375rem',
                  color: '#666666',
                  direction: 'rtl',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.6s ease-out 0.7s forwards',
                  willChange: 'opacity',
                }}
                lang="ar"
                dir="rtl"
              >
                الشعر العربي بين يديك
              </div>
            </div>
          )}

          {/* Step 1: English letter-by-letter — poetry */}
          {kineticStep === 1 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-1"
            >
              <div
                style={{
                  fontFamily: "'Forum', cursive",
                  fontSize: 'clamp(4rem, 10vw, 7rem)',
                  textTransform: 'lowercase',
                  letterSpacing: '-0.05em',
                  color: '#ffffff',
                  lineHeight: 1,
                  marginBottom: '1.5rem',
                }}
              >
                {'poetry'.split('').map((letter, i) => (
                  <span
                    key={i}
                    style={{
                      display: 'inline-block',
                      opacity: 0,
                      transform: 'translateY(30px)',
                      animation: prefersReducedMotion
                        ? 'splashFadeIn 0.01ms forwards'
                        : `splashLetterReveal ${isMobile ? '0.35s' : '0.5s'} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                      animationDelay: `${0.1 + i * 0.08}s`,
                      willChange: 'transform, opacity',
                      backfaceVisibility: 'hidden',
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
              <div
                style={{
                  fontSize: '0.8125rem',
                  letterSpacing: '0.3em',
                  textTransform: 'uppercase',
                  color: '#555555',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.6s ease-out 0.8s forwards',
                  willChange: 'opacity',
                }}
              >
                Where words become worlds
              </div>
            </div>
          )}

          {/* Step 2: Count + Explore */}
          {kineticStep === 2 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '40vh',
              }}
              key="kinetic-2"
            >
              <div
                style={{
                  fontFamily: "'Forum', cursive",
                  fontSize: 'clamp(2.5rem, 7vw, 4.5rem)',
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  marginBottom: '1rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashCountReveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                }}
              >
                84,000 verses await
              </div>
              <div
                style={{
                  fontFamily: "'Reem Kufi', sans-serif",
                  fontWeight: 700,
                  fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                  color: '#888888',
                  direction: 'rtl',
                  marginBottom: '2rem',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.5s ease-out 0.6s forwards',
                  willChange: 'opacity',
                }}
                lang="ar"
                dir="rtl"
              >
                أكثر من 84,000 بيت بانتظارك
              </div>
              <button
                data-splash-finish="true"
                onClick={handleFinish}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 40px',
                  border: '1px solid #333333',
                  borderRadius: '999px',
                  background: 'transparent',
                  color: '#ffffff',
                  fontFamily: "'Tajawal', sans-serif",
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  letterSpacing: '0.15em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease, border-color 0.3s ease',
                  minHeight: '48px',
                  opacity: 0,
                  animation: prefersReducedMotion
                    ? 'splashFadeIn 0.01ms forwards'
                    : 'splashFadeIn 0.5s ease-out 1s forwards',
                  willChange: 'opacity',
                  backfaceVisibility: 'hidden',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.borderColor = '#666666';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.borderColor = '#333333';
                }}
                aria-label="Start exploring"
              >
                <span>Explore</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Tap hint */}
        <div
          style={{
            position: 'fixed',
            bottom: '3rem',
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: '0.65rem',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            color: '#333333',
            zIndex: 5,
          }}
        >
          Tap anywhere
        </div>

        {/* Progress bar */}
        <div
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            height: '2px',
            background: 'rgba(255, 255, 255, 0.15)',
            transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 5,
            width: progressWidth,
            willChange: 'width',
            transform: 'translateZ(0)',
          }}
        />
      </div>
    </motion.div>
  );
};

export default SplashScreen;
