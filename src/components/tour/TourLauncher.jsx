import { Suspense, lazy, useCallback, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { THEME } from '../../constants/theme.js';
import { useUIStore } from '../../stores/uiStore';
import { useModalStore } from '../../stores/modalStore';
import { TOUR_STEPS } from '../../constants/tourSteps.js';
import { readTourProgress } from '../../utils/tourProgress.js';

const SpotlightTour = lazy(() => import('./SpotlightTour.jsx'));

// Predicates for conditional steps. `hasLibrary` keeps the library step out of a
// brand-new visitor's tour, but shows it to anyone signed in or with saved poems.
const WHEN = {
  hasLibrary: (ctx) => !!ctx.user || ctx.savedCount > 0,
};

/**
 * TourLauncher — owns the walkthrough lifecycle, but never starts it.
 *
 * The reader asks for the tour from the account menu ("Take the tour" / "Resume
 * tour"); modalStore.tour is the single open/closed flag, and it only starts
 * true for an explicit `?tour=…` deep link or the dev-only FEATURES.forceTour.
 * A first-time visitor gets a poem, not a seven-step modal over it.
 *
 * Resuming still works: the step index is persisted, so reopening picks up where
 * they stopped. Once completed, a small restart icon appears in the top-right
 * (below the Aa pill) — the final tour step spotlights that icon.
 */
export default function TourLauncher({ user = null, savedCount = 0, onDemoRecite }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const steps = useMemo(
    () =>
      TOUR_STEPS.filter(
        (s) => !s.when || (WHEN[s.when] ? WHEN[s.when]({ user, savedCount }) : true)
      ),
    [user, savedCount]
  );

  const [completed, setCompleted] = useState(() => readTourProgress().completed);
  const [resumeStep, setResumeStep] = useState(() => {
    const { completed: done, step } = readTourProgress();
    // A finished tour reopens from the top; an abandoned one resumes in place.
    return !done && Number.isFinite(step) ? Math.max(0, step) : 0;
  });
  const open = useModalStore((s) => s.tour);
  const closeTour = useModalStore((s) => s.closeTour);
  const openTour = useModalStore((s) => s.openTour);
  const [currentKey, setCurrentKey] = useState(null);

  const persistStep = useCallback(
    (i) => {
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

  const handleComplete = useCallback(() => {
    closeTour();
    setCompleted(true);
    try {
      localStorage.setItem('tourCompleted', 'true');
    } catch {
      /* ignore */
    }
  }, [closeTour]);

  // Reaching the finish step IS completion. If the reader closes the tour from
  // that step by ANY path (×, Esc, or a Done tap a lingering auth overlay might
  // otherwise swallow), persist completion defensively so the restart icon — not
  // the "Resume tour" chip — shows next time (#610c).
  const handleDismiss = useCallback(() => {
    if (currentKey === 'finish') {
      handleComplete();
      return;
    }
    closeTour();
  }, [currentKey, handleComplete, closeTour]);

  const restart = useCallback(() => {
    setResumeStep(0);
    openTour();
  }, [openTour]);

  const safeResume = Math.min(Math.max(0, resumeStep), Math.max(0, steps.length - 1));
  // The corner icon is permanent once completed; it also appears on the final
  // step (so that step can spotlight it) before completion.
  const showCornerIcon = completed || (open && currentKey === 'finish');

  // No automation guard is needed any more: nothing opens the tour on its own, so it
  // cannot block an e2e flow. The tour's own spec still opts in with ?tour=1.
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
            onDemoRecite={onDemoRecite}
            isSignedIn={!!user}
          />
        </Suspense>
      )}

      {/* The floating "Resume tour" pill is gone — the entry point lives in the
          account menu now, beside Explore Poems, instead of floating over the poem. */}

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
