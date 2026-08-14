import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

import WelcomeStep from './steps/WelcomeStep.jsx';
import MoodStep from './steps/MoodStep.jsx';
import ImageryStep from './steps/ImageryStep.jsx';
import FamilyStep from './steps/FamilyStep.jsx';
import ReadingStep from './steps/ReadingStep.jsx';
import EraStep from './steps/EraStep.jsx';
import { fetchCategoryBands } from '../../services/categoryBands.js';
import { useUIStore } from '../../stores/uiStore.js';
import {
  readPrefs,
  writePrefs,
  PREFS_STORAGE_KEY,
  PREFS_VERSION,
} from '../../services/preferences.js';

// Re-exported for the callers that already import them from here.
export { readPrefs, writePrefs, PREFS_STORAGE_KEY, PREFS_VERSION };

/**
 * OnboardingFlow — six screens that seed a reader's first feed.
 *
 * Steps, in order:
 *   0. welcome     — the offer, and the door out of it
 *   1. mood        16 values  — how they want to feel (multi)
 *   2. motif       12 values  — recurring images (multi, OPTIONAL: taxonomy v3
 *                              sets min_labels 0 for this dimension, so a poem
 *                              may legitimately carry no motif and a reader may
 *                              legitimately skip)
 *   3. family      7 values   — the broad shelf of the library (single)
 *   4. difficulty  derived    — accessibility bands cut from the live distribution
 *   5. era         derived    — century bands cut from the live distribution
 *
 * Every option and bilingual label still comes from the live categorization
 * API; there are no hardcoded taxonomy keys here. What changed in the redesign
 * is presentation only: each step now renders its OWN component instead of
 * sharing one generic picker, and no step shows a poem count.
 *
 * ## Why the counts are gone
 *
 * They were honest and they were still wrong to show. The answers are a WEIGHT,
 * not a filter (src/services/preferenceWeighting.js), so a number next to an
 * option answers a question nobody asked and implies a narrowing that does not
 * happen. Worse, showing them turned six different questions into six readings
 * of the same table. The counts still exist on the API and the draw inspector
 * (الميزان) still reports them where they mean something — after a draw.
 *
 * Dropping them also removed the cascading scope refetch that used to run on
 * every step, so the flow no longer issues a request per answer.
 *
 * The stored shape is unchanged: {family, moods, motifs, era, difficulty}.
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

/**
 * Presentation order for the moods.
 *
 * The old flow sorted them by poem_count so the chip sizes could encode the
 * shape of the corpus. Nothing encodes that any more, and count order reads as
 * arbitrary once the numbers are gone. Grouping by feeling instead means the
 * reader scans a spectrum — warm, then heavy, then bright, then upright — and
 * neighbouring chips are actually related. Keys not listed keep their API order
 * at the end, so a new mood appearing in the taxonomy still renders.
 */
const MOOD_ORDER = [
  'amorous',
  'passion',
  'yearning',
  'nostalgia',
  'bittersweet',
  'melancholy',
  'grief',
  'despair',
  'joy',
  'hope',
  'serenity',
  'contemplation',
  'reverence',
  'pride',
  'defiance',
  'satire',
];

const orderBy = (list, order) => {
  const rank = new Map(order.map((k, i) => [k, i]));
  return list.slice().sort((a, b) => (rank.get(a.key) ?? 999) - (rank.get(b.key) ?? 999));
};

const toOptions = (values = []) =>
  values.map((v) => ({
    key: v.key,
    label_ar: v.label_ar,
    label_en: v.label_en,
    color: colorFor(v.key),
  }));

export default function OnboardingFlow({ onComplete }) {
  const [, navigate] = useLocation();
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState(() => readPrefs());
  const [taxonomy, setTaxonomy] = useState(null);
  const readingPosture = useUIStore((s) => s.readingPosture);
  const setReadingPosture = useUIStore((s) => s.setReadingPosture);

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
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((f) => ({
          key: f.key,
          label_ar: f.label_ar,
          label_en: f.label_en,
          color: colorFor(f.key),
        })),
    [taxonomy]
  );

  const moods = useMemo(() => {
    const dim = (taxonomy?.dimensions || []).find((d) => d.key === 'mood');
    return orderBy(toOptions(dim?.values), MOOD_ORDER);
  }, [taxonomy]);

  const motifs = useMemo(() => {
    const dim = (taxonomy?.dimensions || []).find((d) => d.key === 'motif');
    return toOptions(dim?.values);
  }, [taxonomy]);

  // Bands keep the cuts the service derived from the live distribution. Only
  // the counts and shares that used to be printed on them are dropped.
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

  // Leaving from the welcome screen writes nothing: a reader who chose to just
  // read has not expressed a preference, and stamping completedAt on an empty
  // set would make the feed treat "no answer" as a finished answer.
  const leave = () => {
    if (onComplete) onComplete(prefs);
    else navigate('/');
  };

  const back = step > 0 ? () => setStep((s) => s - 1) : undefined;
  const common = { stepCount: 6, loading, onBack: back };

  return (
    <AnimatePresence mode="wait">
      {step === 0 && (
        <WelcomeStep
          key="welcome"
          testId="onboarding-welcome"
          stepIndex={0}
          onNext={() => setStep(1)}
          onSkipAll={leave}
          // Reading posture lives in the UI store, not in onboardingPrefs: it
          // sets what the READER shows (translation, transliteration) rather
          // than what the feed serves, and the prefs payload is a taste profile
          // the draw inspector reads by shape. Applied on tap rather than on
          // completion, so a reader who takes the second door still keeps it.
          posture={readingPosture}
          onPosture={setReadingPosture}
          {...common}
        />
      )}
      {step === 1 && (
        <MoodStep
          key="mood"
          testId="onboarding-mood"
          stepIndex={1}
          options={moods}
          value={prefs.moods}
          onNext={(v) => {
            patch({ moods: v });
            setStep(2);
          }}
          {...common}
        />
      )}
      {step === 2 && (
        <ImageryStep
          key="motif"
          testId="onboarding-motif"
          stepIndex={2}
          options={motifs}
          value={prefs.motifs}
          onNext={(v) => {
            patch({ motifs: v });
            setStep(3);
          }}
          {...common}
        />
      )}
      {step === 3 && (
        <FamilyStep
          key="family"
          testId="onboarding-family"
          stepIndex={3}
          options={families}
          value={prefs.family ? [prefs.family] : []}
          onNext={(v) => {
            patch({ family: v[0] || null });
            setStep(4);
          }}
          {...common}
        />
      )}
      {step === 4 && (
        <ReadingStep
          key="difficulty"
          testId="onboarding-difficulty"
          stepIndex={4}
          options={difficultyBands}
          value={prefs.difficulty ? [prefs.difficulty] : []}
          onNext={(v) => {
            patch({ difficulty: v[0] || null });
            setStep(5);
          }}
          {...common}
        />
      )}
      {step === 5 && (
        <EraStep
          key="era"
          testId="onboarding-era"
          stepIndex={5}
          options={eraBands}
          value={prefs.era ? [prefs.era] : []}
          onNext={(v) => finish({ era: v[0] || null })}
          {...common}
        />
      )}
    </AnimatePresence>
  );
}
