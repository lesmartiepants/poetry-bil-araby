import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import PreferenceStep from './onboarding/PreferenceStep.jsx';
import { readPrefs, writePrefs, PREFS_STORAGE_KEY } from '../services/preferences.js';
import { fetchCategoryBands } from '../services/categoryBands.js';

const GOLD = '#c5a059';

/**
 * PreferencesDrawer — bottom sheet for reviewing and editing the five saved
 * onboarding answers.
 *
 * Two constraints carried over from #517's version:
 *
 * 1. Props, not modalStore. The original read `prefsDrawer` and friends from a
 *    modalStore slice that shipped differently on main; this takes `isOpen` /
 *    `onClose` / `onSave` so it drops into any surface without a store change.
 *
 * 2. One step at a time. A step is `position: fixed; inset: 0`, so mounting
 *    several inside the scrolling sheet renders as stacked full-screen overlays.
 *    The sheet summarises the current answers and opens a single step on demand.
 *
 * Every label comes from the live taxonomy and the derived bands, so a saved key
 * always displays bilingually; a key with no matching value (pre-migration, or a
 * retired value) falls back to the raw key rather than disappearing.
 */
const SECTIONS = [
  { id: 'family', ar: 'ما الذي يستهويك؟', en: 'Draw', field: 'family', multi: false },
  { id: 'mood', ar: 'كيف تشعر الآن؟', en: 'Moods', field: 'moods', multi: true },
  { id: 'motif', ar: 'أيّ الصور تسكنك؟', en: 'Motifs', field: 'motifs', multi: true },
  { id: 'era', ar: 'من أيّ زمن؟', en: 'Age', field: 'era', multi: false },
  { id: 'difficulty', ar: 'عمق اللغة', en: 'Depth', field: 'difficulty', multi: false },
];

const PreferencesDrawer = ({ isOpen = false, onClose, onSave, onReset }) => {
  const [prefs, setPrefs] = useState(readPrefs);
  const [editing, setEditing] = useState(null);
  const [taxonomy, setTaxonomy] = useState(null);

  // Re-read storage each time the sheet opens, so it reflects a flow completed
  // elsewhere in the session.
  useEffect(() => {
    if (isOpen) setPrefs(readPrefs());
  }, [isOpen]);

  // Options + bilingual labels. Never rejects; empty pre-migration.
  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    fetchCategoryBands().then((t) => {
      if (!cancelled) setTaxonomy(t);
    });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const optionsFor = (section) => {
    if (!taxonomy) return [];
    if (section === 'family') return taxonomy.families || [];
    if (section === 'era') return taxonomy.eraBands || [];
    if (section === 'difficulty') return taxonomy.difficultyBands || [];
    const dim = (taxonomy.dimensions || []).find((d) => d.key === section);
    return dim?.values || [];
  };

  const labelFor = (section, key) => {
    const match = optionsFor(section).find((o) => o.key === key);
    return match ? `${match.label_ar} · ${match.label_en}` : String(key);
  };

  /** A section's saved value as an array, whatever its cardinality. */
  const valuesFor = (section) => {
    const raw = prefs[section.field];
    if (Array.isArray(raw)) return raw;
    return raw ? [raw] : [];
  };

  const commit = (next) => {
    setPrefs(next);
    writePrefs(next);
    onSave?.(next);
  };

  const handleReset = () => {
    const empty = { family: null, moods: [], motifs: [], era: null, difficulty: null };
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
                  const values = valuesFor(section);
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

      {/* One full-screen step at a time, above the sheet. */}
      <AnimatePresence>
        {editing &&
          (() => {
            const section = SECTIONS.find((s) => s.id === editing);
            if (!section) return null;
            return (
              <PreferenceStep
                key={`prefs-${section.id}`}
                testId={`prefs-${section.id}`}
                titleAr={section.ar}
                titleEn={section.en}
                options={optionsFor(section.id)}
                layout={
                  section.id === 'family' ? 'rows' : section.multi ? 'constellation' : 'stack'
                }
                multi={section.multi}
                optional={section.id === 'motif'}
                value={valuesFor(section)}
                stepIndex={SECTIONS.indexOf(section)}
                stepCount={SECTIONS.length}
                loading={taxonomy == null}
                onNext={(next) => {
                  commit({ ...prefs, [section.field]: section.multi ? next : next[0] || null });
                  setEditing(null);
                }}
                onBack={() => setEditing(null)}
              />
            );
          })()}
      </AnimatePresence>
    </>
  );
};

export default PreferencesDrawer;
