import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { BRAND } from '../constants/design.js';
import { FEATURES } from '../constants/features.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { hasSavedPreferences } from '../utils/onboardingEntry.js';

/**
 * SplashScreen — first-visit landing screen ("Zen Haiku", design-review/splash/zen).
 *
 * A single still beat: brand mark, a breathing stroke line, a one-line tagline, an Enter pill.
 * Dismissing it hands off to the preference-onboarding flow (/onboarding) the first time a
 * reader has no saved prefs yet; a returning reader (or one with the flow disabled) goes
 * straight into the feed. There is no walkthrough baked into this screen — that lives at
 * /onboarding, reachable again later from the account menu.
 */
const SplashScreen = () => {
  const [, navigate] = useLocation();
  const isOpen = useModalStore((s) => s.splash);
  const darkMode = useUIStore((s) => s.darkMode);
  const enterButtonRef = useRef(null);

  const dismiss = (e) => {
    e.stopPropagation();
    try {
      localStorage.setItem('hasSeenOnboarding', 'true');
    } catch {}
    const needsOnboarding = FEATURES.onboardingPrefs && !hasSavedPreferences();
    // Route first, dismiss second: the destination (onboarding route, or "/") commits in the
    // same pass as the splash unmounting, so there's no frame where the splash is gone but the
    // reader is showing through with nothing routed on top of it yet.
    navigate(needsOnboarding ? '/onboarding' : '/');
    useModalStore.getState().dismissSplash();
  };

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!isOpen) return undefined;

    const focusDelay = prefersReducedMotion ? 0 : 1400;
    const timeoutId = setTimeout(() => {
      enterButtonRef.current?.focus();
    }, focusDelay);

    return () => clearTimeout(timeoutId);
  }, [isOpen, prefersReducedMotion]);

  if (!isOpen) return null;

  const bg = darkMode ? '#000000' : '#fafaf9';
  const textPrimary = darkMode ? '#ffffff' : '#000000';
  const textSecondary = darkMode ? '#a8a8a8' : '#666666';
  const borderColor = darkMode ? '#1e1e24' : '#e0e0d8';
  const strokeColor = darkMode ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.95)';

  const splashStyles = `
    @keyframes splashZenDraw { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes splashZenBreathe {
      0%, 100% { opacity: 0.95; transform: scaleX(1); }
      50% { opacity: 1; transform: scaleX(1.05); }
    }
    @keyframes splashZenFadeIn { to { opacity: 1; } }
    @keyframes splashZenPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
      50% { box-shadow: 0 0 0 6px rgba(255,255,255,0.04); }
    }
    @media (prefers-reduced-motion: reduce) {
      .splash-zen-anim { animation: none !important; opacity: 1 !important; }
    }
  `;

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        background: bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Poetry Bil-Araby"
    >
      <style>{splashStyles}</style>

      <div
        className="splash-zen-anim"
        style={{
          width: 'min(200px, 40vw)',
          height: '3px',
          background: strokeColor,
          marginBottom: '3rem',
          transformOrigin: 'left center',
          animation: prefersReducedMotion
            ? 'none'
            : 'splashZenDraw 0.7s ease-out forwards, splashZenBreathe 4s ease-in-out 1s infinite',
        }}
      />

      <div
        className="splash-zen-anim"
        style={{
          textAlign: 'center',
          opacity: prefersReducedMotion ? 1 : 0,
          animation: prefersReducedMotion ? 'none' : 'splashZenFadeIn 0.6s ease-out 0.5s forwards',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '0.35em',
            marginBottom: '24px',
          }}
        >
          <span style={{ ...BRAND.english, textTransform: 'lowercase', color: textPrimary }}>
            poetry
          </span>
          <span style={{ ...BRAND.arabic, color: textPrimary }} dir="rtl" lang="ar">
            بالعربي
          </span>
        </div>

        <p
          style={{
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.6875rem',
            textTransform: 'uppercase',
            letterSpacing: '0.4em',
            color: textSecondary,
            fontWeight: 500,
            marginBottom: '48px',
          }}
        >
          Verses Connecting Across Time and Space
        </p>

        <button
          ref={enterButtonRef}
          onClick={dismiss}
          className="splash-zen-anim"
          aria-label="Enter the app"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '14px 40px',
            minHeight: '48px',
            border: `1px solid ${borderColor}`,
            borderRadius: '999px',
            background: 'transparent',
            color: textPrimary,
            fontFamily: "'Tajawal', sans-serif",
            fontSize: '0.875rem',
            fontWeight: 500,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
            opacity: prefersReducedMotion ? 1 : 0,
            animation: prefersReducedMotion
              ? 'none'
              : 'splashZenFadeIn 0.5s ease-out 1.4s forwards, splashZenPulse 3s ease-in-out 2s infinite',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = darkMode
              ? 'rgba(255,255,255,0.06)'
              : 'rgba(0,0,0,0.04)';
            e.currentTarget.style.borderColor = textSecondary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = borderColor;
          }}
        >
          <span>Enter</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </motion.div>
  );
};

export default SplashScreen;
