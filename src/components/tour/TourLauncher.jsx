import { Suspense, lazy, useState } from 'react';
import { Compass } from 'lucide-react';
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
// brand-new visitor's tour, but shows it to anyone signed in or with saved poems
// — so a returning reader is reminded where their collection lives.
const WHEN = {
  hasLibrary: (ctx) => !!ctx.user || ctx.savedCount > 0,
};

/**
 * TourLauncher — entry point for the branded walkthrough.
 *
 * A floating "Take a tour" chip (bottom-left) starts it; a `?tour=1` deep link
 * auto-starts it. `user` / `savedCount` drive which conditional steps appear.
 */
export default function TourLauncher({ user = null, savedCount = 0 }) {
  const [active, setActive] = useState(launchedFromURL);

  const steps = TOUR_STEPS.filter((s) => !s.when || (WHEN[s.when] ? WHEN[s.when]({ user, savedCount }) : true));

  return (
    <>
      {!active && (
        <button
          onClick={() => setActive(true)}
          aria-label="Take a tour"
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
          Take a tour
        </button>
      )}

      {active && (
        <Suspense fallback={null}>
          <SpotlightTour steps={steps} onClose={() => setActive(false)} />
        </Suspense>
      )}
    </>
  );
}
