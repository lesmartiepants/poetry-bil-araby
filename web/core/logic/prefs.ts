import type { Prefs } from '../types';

export const DEFAULT_PREFS: Prefs = {
  page: 'night',
  font: 'amiri',
  textSize: 3,
  vowelMarks: true,
  under: 'english',
  voice: 'Zephyr',
  feelings: [],
  learnFromKeeps: true,
  classicalModern: 0.3,
  difficulty: 'any',
  length: 'any',
  tapWord: true,
  silentMode: true,
  pauseLines: false,
};

/** Your settings = the defaults with your choices on top; unknown keys are dropped. */
export function mergePrefs(defaults: Prefs, mine: Partial<Prefs> | null | undefined): Prefs {
  const out = { ...defaults };
  if (!mine) return out;
  for (const k of Object.keys(defaults) as (keyof Prefs)[]) {
    const v = mine[k];
    if (v !== undefined && v !== null && typeof v === typeof defaults[k]) (out as Record<string, unknown>)[k] = v;
  }
  if (mine.displayName) out.displayName = mine.displayName;
  return out;
}
