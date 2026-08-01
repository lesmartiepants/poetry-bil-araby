import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import MoodPicker from './onboarding/MoodPicker';
import EraPicker from './onboarding/EraPicker';
import TopicsPicker from './onboarding/TopicsPicker';
import { readPrefs, writePrefs, PREFS_STORAGE_KEY } from './onboarding/OnboardingFlow';
import { fetchTagTaxonomy } from '../services/categoryTags.js';
import { ERAS } from '../constants/eras.js';

const GOLD = '#c5a059';

/**
 * PreferencesDrawer — bottom sheet for reviewing and editing saved onboarding
 * preferences (moods / eras / topics).
 *
 * Two changes from #517's version:
 *
 * 1. Props, not modalStore. The original read `prefsDrawer` and friends from a
 *    modalStore slice that shipped differently on main; this takes `isOpen` /
 *    `onClose` / `onSave` so it drops into any surface without a store change.
 *
 * 2. One picker at a time. Each picker is `position: fixed; inset: 0`, so the
 *    original — which mounted all three inside the scrolling sheet — rendered as
 *    three stacked full-screen overlays. Here the sheet summarises the current
 *    selection and opens a single picker on demand.
 *
 * Labels come from the shipped taxonomy (`GET /api/categories`) so a saved key
 * displays its bilingual label; keys with no matching value (pre-migration, or
 * a retired value) fall back to showing the raw key.
 */
const SECTIONS = [
  { id: 'mood', ar: 'كيف تشعر الآن؟', en: 'Moods', field: 'moods' },
  { id: 'era', ar: 'أي عصر يستهويك؟', en: 'Eras', field: 'eras' },
  { id: 'topic', ar: 'ما الذي يستهويك؟', en: 'Topics', field: 'topics' },
];

const PreferencesDrawer = ({ isOpen = false, onClose, onSave, onReset }) => {
  const [prefs, setPrefs] = useState(readPrefs);
  const [editing, setEditing] = useState(null); // 'mood' | 'era' | 'topic' | null
  const [labels, setLabels] = useState({}); // "dim:key" -> { name_ar, name_en }

  // Re-read storage each time the sheet opens, so it reflects a flow completed
  // elsewhere in the session.
  useEffect(() => {
    if (isOpen) setPrefs(readPrefs());
  }, [isOpen]);

  // Bilingual labels for the saved keys. Never rejects; empty pre-migration.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchTagTaxonomy().then(({ tags }) => {
      if (cancelled) return;
      setLabels(Object.fromEntries(tags.map((t) => [t.id, t])));
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const labelFor = (section, key) => {
    if (section === 'era') {
      const era = ERAS.find((e) => String(e.id) === String(key));
      return era ? `${era.ar} · ${era.en}` : String(key);
    }
    const tag = labels[`${section}:${key}`];
    return tag ? `${tag.name_ar} · ${tag.name_en}` : String(key);
  };

  const commit = (next) => {
    setPrefs(next);
    writePrefs(next);
    onSave?.(next);
  };

  const handleReset = () => {
    const empty = { moods: [], eras: [], topics: [] };
    setPrefs(empty);
    try {
      localStorage.removeItem(PREFS_STORAGE_KEY);
    } catch {
      /* storage unavailable */
    }
    onReset?.();
    onClose?.();
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.5)' }}
            />
            {/* Sheet */}
            <motion.div
              data-testid="preferences-drawer"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              style={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 71,
                maxHeight: '90vh',
                background: 'rgba(10,10,15,0.97)',
                backdropFilter: 'blur(20px)',
                borderRadius: '20px 20px 0 0',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Drag handle */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: '12px',
                  paddingBottom: '8px',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 4,
                    borderRadius: 2,
                    background: 'rgba(255,255,255,0.2)',
                  }}
                />
              </div>

              {/* Title */}
              <div style={{ padding: '8px 24px 16px', textAlign: 'center' }}>
                <h3
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    color: GOLD,
                    fontSize: '1.1rem',
                    margin: 0,
                    direction: 'rtl',
                  }}
                >
                  تعديل ذوقك
                </h3>
              </div>

              {/* Sections */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
                {SECTIONS.map((section) => {
                  const values = prefs[section.field] || [];
                  return (
                    <button
                      key={section.id}
                      onClick={() => setEditing(section.id)}
                      data-testid={`prefs-edit-${section.id}`}
                      style={{
                        width: '100%',
                        marginBottom: '12px',
                        padding: '14px 16px',
                        textAlign: 'right',
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Tajawal', sans-serif",
                          color: 'rgba(255,255,255,0.55)',
                          fontSize: '0.8rem',
                          direction: 'rtl',
                          marginBottom: '8px',
                        }}
                      >
                        {section.ar}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {values.length === 0 ? (
                          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.78rem' }}>
                            Not set — tap to choose
                          </span>
                        ) : (
                          values.map((key) => (
                            <span
                              key={key}
                              style={{
                                padding: '3px 10px',
                                borderRadius: '999px',
                                border: `1px solid ${GOLD}55`,
                                color: GOLD,
                                fontSize: '0.72rem',
                                fontFamily: "'Tajawal', sans-serif",
                              }}
                            >
                              {labelFor(section.id, key)}
                            </span>
                          ))
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div
                style={{
                  padding: '16px 24px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  alignItems: 'center',
                }}
              >
                <button
                  onClick={onClose}
                  style={{
                    width: '100%',
                    maxWidth: 280,
                    padding: '12px',
                    background: `${GOLD}22`,
                    border: `1px solid ${GOLD}`,
                    borderRadius: '999px',
                    color: GOLD,
                    fontFamily: "'Tajawal', sans-serif",
                    fontSize: '1rem',
                    cursor: 'pointer',
                    direction: 'rtl',
                  }}
                >
                  تم
                </button>
                <button
                  onClick={handleReset}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,100,100,0.6)',
                    fontSize: '0.8rem',
                    fontFamily: "'Tajawal', sans-serif",
                    cursor: 'pointer',
                    direction: 'rtl',
                  }}
                >
                  مسح تفضيلاتي
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* One full-screen picker at a time, above the sheet. */}
      <AnimatePresence>
        {editing === 'mood' && (
          <MoodPicker
            key="prefs-mood"
            initialValue={prefs.moods}
            onNext={(moods) => {
              commit({ ...prefs, moods });
              setEditing(null);
            }}
          />
        )}
        {editing === 'era' && (
          <EraPicker
            key="prefs-era"
            initialValue={prefs.eras}
            onNext={(eras) => {
              commit({ ...prefs, eras });
              setEditing(null);
            }}
          />
        )}
        {editing === 'topic' && (
          <TopicsPicker
            key="prefs-topic"
            selectedMoods={prefs.moods}
            selectedEras={prefs.eras}
            initialValue={prefs.topics}
            onComplete={({ topics }) => {
              commit({ ...prefs, topics });
              setEditing(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default PreferencesDrawer;
