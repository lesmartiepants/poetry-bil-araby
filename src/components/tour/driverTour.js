import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TOUR_STEPS } from '../../constants/tourSteps.js';

/**
 * DriverTour — the library-backed engine (driver.js, ~5kb, MIT).
 *
 * This is the "proven library" option to compare against the bespoke
 * SpotlightTour. It reads the SAME TOUR_STEPS source of truth and themes the
 * popover with the app's gold accents via the `.poetry-tour` class injected
 * below. It is button-driven (Next / Prev) but `disableActiveInteraction:false`
 * keeps the highlighted control clickable, so users can still poke the real app.
 *
 * Usage:  startDriverTour({ onDone })
 */

let styleInjected = false;
function injectTheme() {
  if (styleInjected) return;
  styleInjected = true;
  const css = `
    .driver-popover.poetry-tour {
      background: rgba(12,12,14,0.95);
      backdrop-filter: blur(24px) saturate(150%);
      -webkit-backdrop-filter: blur(24px) saturate(150%);
      border: 1px solid rgba(197,160,89,0.3);
      border-radius: 18px;
      box-shadow: 0 0 50px rgba(197,160,89,0.08), 0 12px 40px rgba(0,0,0,0.55);
      color: #e7e5e4;
      max-width: 340px;
    }
    .driver-popover.poetry-tour .driver-popover-title {
      font-family: 'Forum', serif; font-size: 1.15rem; color: #e7e5e4;
    }
    .driver-popover.poetry-tour .driver-popover-description {
      font-family: 'Forum', serif; font-size: 0.92rem; line-height: 1.55; color: rgba(231,229,228,0.66);
    }
    .driver-popover.poetry-tour .driver-popover-arrow { border-color: rgba(12,12,14,0.95) !important; }
    .driver-popover.poetry-tour .driver-popover-progress-text {
      font-family: 'Forum', serif; color: rgba(197,160,89,0.7); font-size: 0.75rem;
    }
    .driver-popover.poetry-tour button {
      font-family: 'Forum', serif !important;
      text-shadow: none !important;
      border-radius: 999px !important;
      padding: 5px 16px !important;
    }
    .driver-popover.poetry-tour .driver-popover-next-btn {
      background: linear-gradient(135deg, var(--gold), #B8943E) !important;
      color: #0c0c0e !important; border: none !important; font-weight: 600 !important;
    }
    .driver-popover.poetry-tour .driver-popover-prev-btn {
      background: transparent !important; color: rgba(231,229,228,0.7) !important;
      border: 1px solid rgba(197,160,89,0.3) !important;
    }
    .driver-popover.poetry-tour .driver-popover-close-btn { color: rgba(231,229,228,0.6); }
    .driver-popover.poetry-tour button:focus,
    .driver-popover.poetry-tour button:focus-visible { outline: none !important; box-shadow: none !important; }
    .driver-active .driver-overlay { filter: none; }
  `;
  const el = document.createElement('style');
  el.setAttribute('data-poetry-tour', '');
  el.textContent = css;
  document.head.appendChild(el);
}

function toDriverSteps() {
  return TOUR_STEPS.map((s) => {
    const description = s.hint ? `${s.body}<br/><span style="color:var(--gold)">↳ ${s.hint}</span>` : s.body;
    if (!s.target) {
      return { popover: { title: s.title, description, popoverClass: 'poetry-tour' } };
    }
    return {
      element: s.target,
      popover: {
        title: s.title,
        description,
        // Per-step placement keeps the popover off the control and guides the
        // eye toward it (e.g. sit above-left of the Listen button).
        side: s.side && s.side !== 'center' ? s.side : 'top',
        align: s.align || 'center',
        popoverClass: 'poetry-tour',
      },
    };
  });
}

export function startDriverTour({ onDone } = {}) {
  injectTheme();
  const d = driver({
    showProgress: true,
    allowClose: true,
    overlayColor: 'rgba(8,8,12,0.7)',
    stagePadding: 8,
    stageRadius: 16,
    disableActiveInteraction: false, // keep the real control clickable
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    onDestroyed: () => {
      try {
        localStorage.setItem('hasSeenTour', 'true');
      } catch {
        /* ignore */
      }
      onDone?.();
    },
    steps: toDriverSteps(),
  });
  d.drive();
  return d;
}
