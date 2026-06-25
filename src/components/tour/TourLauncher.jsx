import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { Compass, Sparkles, X } from 'lucide-react';
import { TOUR_STEPS } from '../../constants/tourSteps.js';

const SpotlightTour = lazy(() => import('./SpotlightTour.jsx'));

/**
 * TourLauncher — the entry point for the walkthrough, and the place where you
 * try out the two engines side by side.
 *
 * Two ways to start a tour:
 *  - the floating "Take a tour" chip (bottom-left), which lets you pick the
 *    engine so you can compare them on the real app, or
 *  - a deep link: `?tour=spotlight` or `?tour=driver` (handy for sharing /
 *    demoing a specific option).
 *
 * It deliberately does NOT auto-start — the app already has its own first-run
 * splash. Once you've picked a favorite, wire that engine to auto-run for new
 * users (see the expansion plan) and drop the chooser.
 */
export default function TourLauncher() {
  const [active, setActive] = useState(null); // 'spotlight' | 'driver' | null
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const startDriver = async () => {
    const { startDriverTour } = await import('./driverTour.js');
    startDriverTour({ onDone: () => setActive(null) });
    setActive('driver');
  };

  const start = (engine) => {
    setMenuOpen(false);
    if (engine === 'driver') startDriver();
    else setActive('spotlight');
  };

  // Deep-link launch: ?tour=spotlight | ?tour=driver
  useEffect(() => {
    const which = new URLSearchParams(window.location.search).get('tour');
    if (which === 'spotlight' || which === 'driver') start(which);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close the chooser when clicking elsewhere.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const driverRunning = active === 'driver';

  return (
    <>
      {/* Launcher chip — hidden while a tour is on screen. */}
      {!active && (
        <div ref={menuRef} className="fixed bottom-4 left-4 z-[60] flex flex-col items-start gap-2">
          {menuOpen && (
            <div
              className="flex flex-col gap-1 rounded-2xl p-1.5 border"
              style={{
                background: 'rgba(12,12,14,0.92)',
                backdropFilter: 'blur(20px) saturate(150%)',
                WebkitBackdropFilter: 'blur(20px) saturate(150%)',
                borderColor: 'rgba(197,160,89,0.28)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                animation: 'tourMenuIn 0.22s ease-out',
              }}
            >
              <MenuItem
                icon={<Sparkles size={15} />}
                title="Branded spotlight"
                subtitle="Bespoke · you tap the real controls"
                onClick={() => start('spotlight')}
              />
              <MenuItem
                icon={<Compass size={15} />}
                title="Classic guide"
                subtitle="driver.js · Next / Back buttons"
                onClick={() => start('driver')}
              />
            </div>
          )}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Take a tour"
            className="flex items-center gap-2 rounded-full pl-3 pr-4 py-2 border transition-transform hover:scale-105"
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
            {menuOpen ? <X size={15} /> : <Sparkles size={15} />}
            Take a tour
          </button>
        </div>
      )}

      {active === 'spotlight' && (
        <Suspense fallback={null}>
          <SpotlightTour steps={TOUR_STEPS} onClose={() => setActive(null)} />
        </Suspense>
      )}

      {/* driver.js renders its own DOM; nothing to mount here. */}
      {driverRunning && null}

      <style>{`@keyframes tourMenuIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </>
  );
}

function MenuItem({ icon, title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-2.5 rounded-xl px-3 py-2 text-left transition-colors hover:bg-gold/10"
      style={{ minWidth: 220 }}
    >
      <span style={{ color: 'var(--gold)', marginTop: 2 }}>{icon}</span>
      <span className="flex flex-col">
        <span style={{ fontFamily: "'Forum', serif", fontSize: '0.9rem', color: '#e7e5e4' }}>{title}</span>
        <span style={{ fontFamily: "'Forum', serif", fontSize: '0.72rem', color: 'rgba(231,229,228,0.55)' }}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}
