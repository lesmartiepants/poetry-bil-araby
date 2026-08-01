import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

import MoodPicker from './MoodPicker';
import EraPicker from './EraPicker';
import TopicsPicker from './TopicsPicker';

/**
 * OnboardingFlow — the three preference pickers in sequence (mood -> era ->
 * topics), rendered as a full-screen routed view at `/onboarding`.
 *
 * Each picker is a fixed, full-screen step that calls back with its selection,
 * so they are sequenced here rather than stacked. On completion the answers are
 * written to `localStorage.onboardingPrefs` (the shape PreferencesDrawer reads)
 * and the flow navigates back to the reader.
 *
 * Selections are TAXONOMY VALUE KEYS: `moods` and `topics` are `category_values`
 * keys of the mood / topic dimensions, so they drop straight into
 * `GET /api/poems/by-category?mood=&topic=`. `eras` are `poets.era_id` values
 * (stringified) for `?era=`.
 *
 * Consuming the saved prefs to bias the feed is deliberately NOT wired here —
 * that is a product decision about the reader's queue, not part of the salvage.
 */
export const PREFS_STORAGE_KEY = 'onboardingPrefs';

export const readPrefs = () => {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return {
      moods: parsed?.moods || [],
      eras: parsed?.eras || [],
      topics: parsed?.topics || [],
    };
  } catch {
    return { moods: [], eras: [], topics: [] };
  }
};

export const writePrefs = (prefs) => {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage unavailable (private mode) — selections are simply not persisted */
  }
};

export default function OnboardingFlow({ onComplete }) {
  const [, navigate] = useLocation();
  const saved = readPrefs();

  const [step, setStep] = useState('mood'); // 'mood' | 'era' | 'topics'
  const [moods, setMoods] = useState(saved.moods);
  const [eras, setEras] = useState(saved.eras);

  const finish = (topics) => {
    const prefs = { moods, eras, topics, completedAt: new Date().toISOString() };
    writePrefs(prefs);
    if (onComplete) onComplete(prefs);
    else navigate('/');
  };

  return (
    <AnimatePresence mode="wait">
      {step === 'mood' && (
        <MoodPicker
          key="mood"
          initialValue={moods}
          onNext={(value) => {
            setMoods(value);
            setStep('era');
          }}
        />
      )}
      {step === 'era' && (
        <EraPicker
          key="era"
          initialValue={eras}
          onNext={(value) => {
            setEras(value);
            setStep('topics');
          }}
        />
      )}
      {step === 'topics' && (
        <TopicsPicker
          key="topics"
          selectedMoods={moods}
          selectedEras={eras}
          initialValue={saved.topics}
          onComplete={({ topics }) => finish(topics)}
        />
      )}
    </AnimatePresence>
  );
}
