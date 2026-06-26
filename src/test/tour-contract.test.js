import { describe, it, expect } from 'vitest';
import { TOUR_TRAYS } from '../constants/tourTrays.js';
import { TOUR_STEPS } from '../constants/tourSteps.js';
import { useModalStore } from '../stores/modalStore';

/**
 * Tour ↔ modalStore contract guard.
 *
 * The tour drives app overlays only through TOUR_TRAYS. If modalStore renames a
 * field or setter, the tour breaks silently (a tray never reads as open, Next
 * closes nothing). These assertions fail fast instead, at unit speed.
 */
describe('tour ↔ modalStore contract', () => {
  it.each(Object.entries(TOUR_TRAYS))(
    'tray "%s" binds to a store field + setter that exist',
    (_name, { stateKey, setter }) => {
      const state = useModalStore.getState();
      expect(Object.prototype.hasOwnProperty.call(state, stateKey), `missing field ${stateKey}`).toBe(true);
      expect(typeof state[setter], `missing setter ${setter}`).toBe('function');
    }
  );

  it.each(Object.entries(TOUR_TRAYS))('tray "%s" setter actually toggles its field', (_name, { stateKey, setter }) => {
    useModalStore.getState()[setter](true);
    expect(useModalStore.getState()[stateKey]).toBe(true);
    useModalStore.getState()[setter](false);
    expect(useModalStore.getState()[stateKey]).toBe(false);
  });

  it('every `tray` referenced by a step has a contract entry', () => {
    for (const s of TOUR_STEPS) {
      if (s.tray) {
        expect(TOUR_TRAYS[s.tray], `step "${s.key}" references unknown tray "${s.tray}"`).toBeTruthy();
      }
    }
  });

  it('every `above` selector is a data-tour-anchor selector', () => {
    for (const { above } of Object.values(TOUR_TRAYS)) {
      if (above) expect(above).toMatch(/^\[data-tour-anchor="[\w-]+"\]$/);
    }
  });
});
