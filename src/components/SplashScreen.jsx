import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BRAND } from '../constants/design.js';
import { useModalStore } from '../stores/modalStore';
import MoodPicker from './onboarding/MoodPicker';
import EraPicker from './onboarding/EraPicker';
import SubEraPicker from './onboarding/SubEraPicker';
import TopicsPicker from './onboarding/TopicsPicker';

// ── Phase 0 (Ray-Tracing Splash) — all design/animation constants ──────────
const PHASE0 = {
  // Palette
  BG: '#000000',
  WARM: '#fbbf24',          // amber-400: Arabic brand text + button accent
  STONE: '#a8a29e',         // stone-400: English brand text (muted)

  // Primary light ray
  RAY_WIDTH: 140,           // px width of the ray div
  RAY_BLUR: 30,             // px gaussian blur
  LIGHT_X_CENTER: 50,       // % horizontal center of sweep
  LIGHT_X_RANGE: 30,        // ±% horizontal sweep amplitude
  RAY_ANGLE_CENTER: -8,     // deg base tilt
  RAY_ANGLE_RANGE: 12,      // ±deg tilt oscillation

  // Secondary light ray (depth)
  RAY2_WIDTH: 80,
  RAY2_BLUR: 25,
  LIGHT_X2_PHASE_OFFSET: 0.4, // cycle offset from primary
  LIGHT_X2_RANGE: 25,
  RAY2_ANGLE_CENTER: 6,
  RAY2_ANGLE_RANGE: 8,

  // Animation
  CYCLE_DURATION: 12000,    // ms for one full left-right sweep
  CONTENT_FADE_DELAY: '1s', // brand lockup fade-in delay
  BTN_FADE_DELAY: '2s',     // enter button fade-in delay

  // Dust particles
  MAX_PARTICLES: 80,
  SPAWN_RATE: 0.35,         // probability per frame of spawning a particle
  BEAM_RANGE: 20,           // % proximity to beam that boosts particle brightness
};

const SplashScreen = () => {
  const isOpen = useModalStore((s) => s.splash);
  const showOnboarding = useModalStore((s) => s.onboarding);
  const onDismiss = () => {
    useModalStore.getState().dismissSplash();
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {}
  };
  // Phase: 0=ray splash, 1=MoodPicker, 2=EraPicker, 3=SubEraPicker, 4=TopicsPicker
  const [phase, setPhase] = useState(0);
  const [fadeState, setFadeState] = useState('in');
  // Phase 0 ray-tracing refs
  const phase0WrapperRef = useRef(null);
  const dustCanvasRef = useRef(null);
  const phase0AnimRef = useRef(null);
  const [selectedMoods, setSelectedMoods] = useState([]);
  const [selectedEraPortals, setSelectedEraPortals] = useState([]);
  const [selectedSubEras, setSelectedSubEras] = useState([]);

  // Phase 0: animated ray-tracing light sweep + floating dust particles
  useEffect(() => {
    if (!isOpen || phase !== 0) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const wrapper = phase0WrapperRef.current;
    const canvas = dustCanvasRef.current;
    if (!wrapper || !canvas) return;

    const ctx = canvas.getContext('2d');
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const startTime = Date.now();
    const particles = [];
    const TAU = Math.PI * 2;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const cyclePhase = (elapsed % PHASE0.CYCLE_DURATION) / PHASE0.CYCLE_DURATION;

      // Update CSS custom properties driving the ray divs
      const lightX = PHASE0.LIGHT_X_CENTER + Math.sin(cyclePhase * TAU) * PHASE0.LIGHT_X_RANGE;
      const rayAngle = PHASE0.RAY_ANGLE_CENTER + Math.sin(cyclePhase * TAU) * PHASE0.RAY_ANGLE_RANGE;
      const lightX2 = PHASE0.LIGHT_X_CENTER + Math.sin((cyclePhase + PHASE0.LIGHT_X2_PHASE_OFFSET) * TAU) * PHASE0.LIGHT_X2_RANGE;
      const rayAngle2 = PHASE0.RAY2_ANGLE_CENTER + Math.cos(cyclePhase * TAU) * PHASE0.RAY2_ANGLE_RANGE;

      wrapper.style.setProperty('--light-x', lightX + '%');
      wrapper.style.setProperty('--ray-angle', rayAngle + 'deg');
      wrapper.style.setProperty('--light-x2', lightX2 + '%');
      wrapper.style.setProperty('--ray-angle2', rayAngle2 + 'deg');

      // Dust particle system
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (particles.length < PHASE0.MAX_PARTICLES && Math.random() < PHASE0.SPAWN_RATE) {
        particles.push({
          x: Math.random() * canvas.width,
          y: canvas.height + 10,
          size: 0.5 + Math.random() * 2,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.15 - Math.random() * 0.5,
          life: 0.5 + Math.random() * 0.5,
          decay: 0.001 + Math.random() * 0.003,
          brightness: 0.4 + Math.random() * 0.6,
        });
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;

        if (p.life <= 0 || p.y < -10) { particles.splice(i, 1); continue; }

        const distFromLight = Math.abs((p.x / canvas.width) * 100 - lightX);
        const beamBrightness = Math.max(0, 1 - distFromLight / PHASE0.BEAM_RANGE);

        ctx.globalAlpha = p.life * (0.3 + beamBrightness * 0.6) * p.brightness;
        ctx.fillStyle = 'rgba(255,245,220,1)';
        ctx.shadowColor = 'rgba(255,245,220,0.8)';
        ctx.shadowBlur = beamBrightness * 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;

      phase0AnimRef.current = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      if (phase0AnimRef.current) cancelAnimationFrame(phase0AnimRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isOpen, phase]);

  useEffect(() => {
    if (isOpen) {
      setFadeState('in');
      setPhase(0);
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

  if (!isOpen) return null;

  // Injected keyframe styles
  const splashStyles = `
    @keyframes splashFadeIn { to { opacity: 1; } }
    @keyframes phase0FadeUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;

  // Single return — both phases always in the DOM, toggled by display.
  // This prevents React from unmounting/remounting the tree when phase changes,
  // which avoids removeChild errors from imperatively-added star DOM nodes.
  return (
    <motion.div
      data-testid="splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{ display: 'contents' }}
    >
      <style>{splashStyles}</style>

      {/* PHASE 0: Ray-Tracing Splash — hidden via display:none when phase >= 1 */}
      <div
        ref={phase0WrapperRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 60,
          background: PHASE0.BG,
          display: phase === 0 ? 'block' : 'none',
          transition: 'opacity 0.8s ease',
          opacity: fadeState === 'out' ? 0 : 1,
          // CSS custom properties for JS-driven ray animation (initial values)
          '--light-x': '50%',
          '--ray-angle': '-8deg',
          '--light-x2': '70%',
          '--ray-angle2': '6deg',
        }}
        role="dialog"
        aria-label="Welcome to Poetry Bil-Araby"
      >
        {/* Primary light ray — wide warm sweep */}
        <div
          style={{
            position: 'absolute',
            width: PHASE0.RAY_WIDTH + 'px',
            height: '150%',
            left: `calc(var(--light-x) - ${PHASE0.RAY_WIDTH / 2}px)`,
            top: '-25%',
            background: 'linear-gradient(180deg, rgba(255,245,220,0.45) 0%, rgba(255,235,200,0.3) 15%, rgba(255,225,180,0.2) 30%, rgba(255,215,160,0.12) 45%, rgba(255,205,140,0.08) 60%, rgba(255,195,120,0.04) 80%, transparent 100%)',
            filter: `blur(${PHASE0.RAY_BLUR}px)`,
            zIndex: 1,
            transformOrigin: 'center top',
            transform: 'rotate(var(--ray-angle)) skewX(-2deg)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            willChange: 'left, transform',
          }}
        />

        {/* Secondary light ray — narrower, offset phase */}
        <div
          style={{
            position: 'absolute',
            width: PHASE0.RAY2_WIDTH + 'px',
            height: '130%',
            left: `calc(var(--light-x2) - ${PHASE0.RAY2_WIDTH / 2}px)`,
            top: '-15%',
            background: 'linear-gradient(180deg, rgba(255,245,220,0.2) 0%, rgba(255,235,200,0.12) 30%, rgba(255,215,160,0.05) 60%, transparent 100%)',
            filter: `blur(${PHASE0.RAY2_BLUR}px)`,
            zIndex: 1,
            transformOrigin: 'center top',
            transform: 'rotate(var(--ray-angle2))',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            opacity: 0.6,
            willChange: 'left, transform',
          }}
        />

        {/* Dust particle canvas */}
        <canvas
          ref={dustCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />

        {/* Brand + CTA — fades up after 1s */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: '2rem',
            textAlign: 'center',
            opacity: 0,
            animation: `phase0FadeUp ${PHASE0.CONTENT_FADE_DELAY === '1s' ? '2s ease 1s' : '2s ease'} forwards`,
          }}
        >
          {/* Brand lockup: بالعربي + poetry (row-reverse so Arabic leads) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row-reverse',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '16px',
              marginBottom: '3rem',
            }}
          >
            <span
              style={{
                ...BRAND.arabic,
                color: PHASE0.WARM,
                textShadow: '0 0 60px rgba(251,191,36,0.5), 0 0 100px rgba(255,235,180,0.3), 0 5px 25px rgba(0,0,0,1)',
              }}
              dir="rtl"
              lang="ar"
            >
              بالعربي
            </span>
            <span
              style={{
                ...BRAND.english,
                color: PHASE0.STONE,
                textShadow: '0 0 40px rgba(168,162,158,0.2), 0 5px 20px rgba(0,0,0,1)',
              }}
            >
              poetry
            </span>
          </div>

          {/* Enter button — appears after 2s */}
          <button
            onClick={handleSplashEnter}
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '18px 48px',
              minHeight: '44px',
              background: 'rgba(0,0,0,0.6)',
              border: '2px solid rgba(251,191,36,0.3)',
              color: PHASE0.WARM,
              fontFamily: "'Tajawal', sans-serif",
              fontSize: 'clamp(0.875rem, 2vw, 1rem)',
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              fontWeight: 400,
              cursor: 'pointer',
              transition: 'all 0.5s ease',
              boxShadow: '0 0 40px rgba(251,191,36,0.25)',
              borderRadius: '2px',
              opacity: 0,
              animation: `splashFadeIn 0.8s ease ${PHASE0.BTN_FADE_DELAY} forwards`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.8)';
              e.currentTarget.style.borderColor = 'rgba(251,191,36,0.6)';
              e.currentTarget.style.boxShadow = '0 0 60px rgba(251,191,36,0.4), 0 0 100px rgba(255,235,180,0.2)';
              e.currentTarget.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0,0,0,0.6)';
              e.currentTarget.style.borderColor = 'rgba(251,191,36,0.3)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(251,191,36,0.25)';
              e.currentTarget.style.transform = 'none';
            }}
            aria-label="Enter the app"
          >
            <span style={{ display: 'block' }}>Enter</span>
            <span
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontSize: '0.875rem',
                opacity: 0.7,
                marginTop: '0.25rem',
                display: 'block',
                letterSpacing: 'normal',
              }}
              lang="ar"
              dir="rtl"
            >
              ادخل إلى النور
            </span>
          </button>
        </div>
      </div>

      {/* ONBOARDING PHASES 1-4 — mood, era, sub-era, topics pickers */}
      <AnimatePresence mode="wait">
        {phase === 1 && (
          <MoodPicker
            key="mood"
            onNext={(moods) => {
              setSelectedMoods(moods);
              setPhase(2);
            }}
          />
        )}
        {phase === 2 && (
          <EraPicker
            key="era"
            onNext={(portals) => {
              setSelectedEraPortals(portals);
              setPhase(3);
            }}
          />
        )}
        {phase === 3 && (
          <SubEraPicker
            key="sub-era"
            selectedPortals={selectedEraPortals}
            onNext={(subEras) => {
              setSelectedSubEras(subEras);
              setPhase(4);
            }}
          />
        )}
        {phase === 4 && (
          <TopicsPicker
            key="topics"
            selectedMoods={selectedMoods}
            selectedEraPortals={selectedEraPortals}
            selectedSubEras={selectedSubEras}
            onComplete={(prefs) => {
              useModalStore.getState().completeOnboarding(prefs);
            }}
          />
        )}
      </AnimatePresence>

      {/* Progress dots for phases 1-4 */}
      {phase >= 1 && phase <= 4 && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '8px',
            zIndex: 70,
          }}
        >
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: phase >= step ? '#c5a059' : 'rgba(255,255,255,0.2)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default SplashScreen;
