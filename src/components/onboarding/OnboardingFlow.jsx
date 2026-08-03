import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

import PreferenceStep from './PreferenceStep.jsx';
import { fetchCategoryBands } from '../../services/categoryBands.js';
import {
  readPrefs,
  writePrefs,
  PREFS_STORAGE_KEY,
  PREFS_VERSION,
} from '../../services/preferences.js';

// Re-exported for the callers that already import them from here.
export { readPrefs, writePrefs, PREFS_STORAGE_KEY, PREFS_VERSION };

/**
 * OnboardingFlow — five full-screen questions that seed a reader's first feed.
 *
 * Steps, in order:
 *   1. family      7 values   — the broad shelf of the library (single choice)
 *   2. mood        16 values  — how they want to feel (multi)
 *   3. motif       12 values  — recurring images (multi, OPTIONAL: taxonomy v3
 *                              sets min_labels 0 for this dimension, so a poem
 *                              may legitimately carry no motif and a reader may
 *                              legitimately skip)
 *   4. era         derived    — century bands cut from the live distribution
 *   5. difficulty  derived    — accessibility bands cut from the live distribution
 *
 * Every option, label and count comes from the live categorization API. There
 * are no hardcoded taxonomy keys in this flow — PR #517's key lists were written
 * against a schema that never shipped and were wrong in almost every entry
 * (`anger`, `wonder`, `sea`, `praise` don't exist; `longing` is really
 * `exile-longing`, `grief` is `loss-death`, and so on). Colours are the one
 * exception: presentation-only, keyed by real value keys, gold fallback.
 *
 * The answers are a WEIGHT, not a filter — see src/services/preferenceWeighting.js.
 */

/** Presentation-only accents, keyed by REAL taxonomy value keys. Gold fallback. */
const COLORS = {
  // families
  'love-desire': '#e8647a',
  'grief-loss': '#94a3b8',
  'longing-exile': '#c084fc',
  'valor-defiance': '#ef4444',
  'revelry-company': '#f59e0b',
  'reflection-faith': '#818cf8',
  'nature-cosmos': '#4ade80',
  // moods
  amorous: '#e8647a',
  passion: '#f43f5e',
  yearning: '#c084fc',
  nostalgia: '#8b7355',
  melancholy: '#1e3a6e',
  grief: '#94a3b8',
  despair: '#4a4a4a',
  bittersweet: '#a78bfa',
  joy: '#fbbf24',
  hope: '#4a7c59',
  serenity: '#4a9d8f',
  contemplation: '#38bdf8',
  reverence: '#818cf8',
  pride: '#b8860b',
  defiance: '#ef4444',
  satire: '#fb923c',
  // motifs
  night: '#1e3a6e',
  'moon-stars': '#a5b4fc',
  'desert-ruins': '#b08968',
  'sea-water': '#0ea5e9',
  'garden-flowers': '#4ade80',
  'wine-cup': '#a16207',
  'sword-battle': '#ef4444',
  birds: '#2dd4bf',
  'fire-light': '#fb923c',
  journey: '#c084fc',
  tears: '#7dd3fc',
  dawn: '#fcd34d',
};
const colorFor = (key) => COLORS[key] || '#c5a059';

const toOptions = (values = []) =>
  values.map((v) => ({
    key: v.key,
    label_ar: v.label_ar,
    label_en: v.label_en,
    poem_count: v.poem_count,
    color: colorFor(v.key),
  }));

export default function OnboardingFlow({ onComplete }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState(() => readPrefs());
  const [taxonomy, setTaxonomy] = useState(null);

  useEffect(() => {
    let cancelled = false;
    // Never rejects — pre-migration it resolves to empty arrays and every step
    // renders its empty state instead of hanging.
    fetchCategoryBands().then((t) => {
      if (!cancelled) setTaxonomy(t);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = taxonomy == null;

  const families = useMemo(
    () =>
      (taxonomy?.families || [])
        .slice()
        .sort((a, b) => (b.poem_count || 0) - (a.poem_count || 0))
        .map((f) => ({
          key: f.key,
          label_ar: f.label_ar,
          label_en: f.label_en,
          poem_count: f.poem_count,
          color: colorFor(f.key),
        })),
    [taxonomy]
  );

  // Mood's long tail (82 -> 1,983, a 24x spread) is ORDERED BY COUNT and shown
  // in full rather than truncated. Hiding the rare moods would be right if the
  // answer were a filter — picking يأس would strand a reader on 82 poems. It
  // isn't: the answer is a weight, so a rare pick biases the feed without
  // limiting it, and truncating would only remove expressiveness. The count on
  // each chip, and the chip's size, make the imbalance visible instead of
  // pretending the 16 options are equal.
  const moods = useMemo(() => {
    const dim = (taxonomy?.dimensions || []).find((d) => d.key === 'mood');
    return toOptions(dim?.values).sort((a, b) => b.poem_count - a.poem_count);
  }, [taxonomy]);

  const motifs = useMemo(() => {
    const dim = (taxonomy?.dimensions || []).find((d) => d.key === 'motif');
    return toOptions(dim?.values).sort((a, b) => b.poem_count - a.poem_count);
  }, [taxonomy]);

  const eraBands = taxonomy?.eraBands || [];
  const difficultyBands = taxonomy?.difficultyBands || [];

  const patch = (delta) => setPrefs((p) => ({ ...p, ...delta }));

  const finish = (last) => {
    const next = {
      ...prefs,
      ...last,
      version: PREFS_VERSION,
      completedAt: new Date().toISOString(),
    };
    writePrefs(next);
    setPrefs(next);
    if (onComplete) onComplete(next);
    else navigate('/');
  };

  const back = step > 0 ? () => setStep((s) => s - 1) : undefined;
  const common = { stepCount: 5, loading, onBack: back };

  return (
    <AnimatePresence mode="wait">
      {step === 0 && (
        <PreferenceStep
          key="family"
          testId="onboarding-family"
          stepIndex={0}
          titleAr="ما الذي يستهويك؟"
          titleEn="What draws you in?"
          options={families}
          layout="rows"
          multi={false}
          value={prefs.family ? [prefs.family] : []}
          onNext={(v) => {
            patch({ family: v[0] || null });
            setStep(1);
          }}
          {...common}
        />
      )}
      {step === 1 && (
        <PreferenceStep
          key="mood"
          testId="onboarding-mood"
          stepIndex={1}
          titleAr="كيف تشعر الآن؟"
          titleEn="How are you feeling?"
          options={moods}
          layout="constellation"
          value={prefs.moods}
          onNext={(v) => {
            patch({ moods: v });
            setStep(2);
          }}
          {...common}
        />
      )}
      {step === 2 && (
        <PreferenceStep
          key="motif"
          testId="onboarding-motif"
          stepIndex={2}
          titleAr="أيّ الصور تسكنك؟"
          titleEn="Which images stay with you?"
          options={motifs}
          layout="constellation"
          optional
          value={prefs.motifs}
          onNext={(v) => {
            patch({ motifs: v });
            setStep(3);
          }}
          {...common}
        />
      )}
      {step === 3 && (
        <PreferenceStep
          key="era"
          testId="onboarding-era"
          stepIndex={3}
          titleAr="من أيّ زمن؟"
          titleEn="From which age?"
          options={eraBands}
          layout="stack"
          multi={false}
          value={prefs.era ? [prefs.era] : []}
          onNext={(v) => {
            patch({ era: v[0] || null });
            setStep(4);
          }}
          {...common}
        />
      )}
      {step === 4 && (
        <PreferenceStep
          key="difficulty"
          testId="onboarding-difficulty"
          stepIndex={4}
          titleAr="ما مدى عمق اللغة التي تريد؟"
          titleEn="How deep should the language go?"
          options={difficultyBands}
          layout="stack"
          multi={false}
          value={prefs.difficulty ? [prefs.difficulty] : []}
          onNext={(v) => finish({ difficulty: v[0] || null })}
          {...common}
        />
      )}
    </AnimatePresence>
  );
}
