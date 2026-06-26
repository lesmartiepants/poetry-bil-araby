import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { THEME } from '../../constants/theme.js';
import { useUIStore } from '../../stores/uiStore';
import { TOUR_STEPS } from '../../constants/tourSteps.js';

const SpotlightTour = lazy(() => import('./SpotlightTour.jsx'));

// Deep-link launch: ?tour=1 | ?tour=spotlight
const launchedFromURL = () => {
  try {
    return !!new URLSearchParams(window.location.search).get('tour');
  } catch {
    return false;
  }
};

// Predicates for conditional steps. `hasLibrary` keeps the library step out of a
// brand-new visitor's tour, but shows it to anyone signed in or with saved poems.
const WHEN = {
  hasLibrary: (ctx) => !!ctx.user || ctx.savedCount > 0,
};

function readPersisted() {
  try {
    return {
      completed: localStorage.getItem('tourCompleted') === 'true',
      step: parseInt(localStorage.getItem('tourStep') ?? '', 10),
    };
  } catch {
    return { completed: false, step: NaN };
  }
}

/**
 * TourLauncher — owns the walkthrough lifecycle:
 *  - Auto-opens on landing and resumes at the saved step, until the tour is
 *    completed. The reader can always dismiss it.
 *  - While dismissed (and not yet completed) a bottom-left "Resume tour" chip
 *    reopens it where they left off.
 *  - Once completed, the entry point becomes a small restart icon in the
 *    top-right (below the Aa text-settings pill); the final tour step highlights
 *    that icon so readers know where to find a refresher.
 */
export default function TourLauncher({ user = null, savedCount = 0 }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const steps = useMemo(
    () => TOUR_STEPS.filter((s) => !s.when || (WHEN[s.when] ? WHEN[s.when]({ user, savedCount }) : true)),
    [user, savedCount]
  );

  const [completed, setCompleted] = useState(() => readPersisted().completed);
  const [started, setStarted] = useState(() => Number.isFinite(readPersisted().step));
  const [resumeStep, setResumeStep] = useState(() => {
    const { step } = readPersisted();
    return Number.isFinite(step) ? Math.max(0, step) : 0;
  });
  // Always show on landing until completed; ?tour=… forces it open.
  const [open, setOpen] = useState(() => !readPersisted().completed || launchedFromURL());
  const [currentKey, setCurrentKey] = useState(null);

  const persistStep = useCallback(
    (i) => {
      setStarted(true);
      setResumeStep(i);
      setCurrentKey(steps[i]?.key ?? null);
      try {
        localStorage.setItem('tourStep', String(i));
      } catch {
        /* private mode — ignore */
      }
    },
    [steps]
  );

  const handleDismiss = useCallback(() => setOpen(false), []);

  const handleComplete = useCallback(() => {
    setOpen(false);
    setCompleted(true);
    try {
      localStorage.setItem('tourCompleted', 'true');
    } catch {
      /* ignore */
    }
  }, []);

  const restart = useCallback(() => {
    setResumeStep(0);
    setOpen(true);
  }, []);

  const safeResume = Math.min(Math.max(0, resumeStep), Math.max(0, steps.length - 1));
  // The corner icon is permanent once completed; it also appears on the final
  // step (so that step can spotlight it) before completion.
  const showCornerIcon = completed || (open && currentKey === 'finish');

  return (
    <>
      {open && (
        <Suspense fallback={null}>
          <SpotlightTour
            steps={steps}
            initialStep={safeResume}
            onStepChange={persistStep}
            onDismiss={handleDismiss}
            onComplete={handleComplete}
          />
        </Suspense>
      )}

      {/* Bottom-left chip — only while the tour is closed and not yet completed. */}
      {!open && !completed && (
        <button
          onClick={() => setOpen(true)}
          aria-label={started ? 'Resume tour' : 'Take a tour'}
          className="fixed bottom-4 left-4 z-[60] flex items-center gap-2 rounded-full pl-3 pr-4 py-2 border transition-transform hover:scale-105"
          style={{
            background: 'rgba(12,12,14,0.9)',
            backdropFilter: 'blur(20px) saturate(150%)',
            WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            borderColor: 'rgba(197,160,89,0.35)',
            color: 'var(--gold)',
            fontFamily: "'Forum', serif",
            fontSize: '0.85rem',
            boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
          }}
        >
          <Compass size={15} />
          {started ? 'Resume tour' : 'Take a tour'}
        </button>
      )}

      {/* Top-right restart icon — below the Aa text-settings pill. Matches the
          theme toggle / text-settings button format exactly. */}
      {showCornerIcon && (
        <div data-tour="restart" className="fixed top-[8.5rem] right-2 md:right-[25rem] z-[46]">
          <button
            onClick={restart}
            aria-label="Restart tour"
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-xl border ${theme.border} ${
              darkMode ? 'bg-black/70' : 'bg-white/80'
            } ${theme.goldHoverBg15}`}
          >
            <Compass size={18} style={{ color: theme.gold }} />
          </button>
        </div>
      )}
    </>
  );
}
