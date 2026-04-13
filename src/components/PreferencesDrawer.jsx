import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MoodPicker from './onboarding/MoodPicker';
import EraPicker from './onboarding/EraPicker';
import TopicsPicker from './onboarding/TopicsPicker';
import { useModalStore } from '../stores/modalStore';

const GOLD = '#c5a059';

const PreferencesDrawer = () => {
  const isOpen = useModalStore((s) => s.prefsDrawer);
  const closePrefsDrawer = useModalStore((s) => s.closePrefsDrawer);
  const completeOnboarding = useModalStore((s) => s.completeOnboarding);
  const resetPreferences = useModalStore((s) => s.resetPreferences);

  // Load saved prefs on each open
  const getSavedPrefs = () => {
    try {
      const raw = localStorage.getItem('onboardingPrefs');
      return raw ? JSON.parse(raw) : { moods: [], eras: [], topics: [] };
    } catch {
      return { moods: [], eras: [], topics: [] };
    }
  };

  const [moods, setMoods] = useState(() => getSavedPrefs().moods || []);
  const [eras, setEras] = useState(() => getSavedPrefs().eras || []);
  const [topics, setTopics] = useState(() => getSavedPrefs().topics || []);

  const handleSave = () => {
    completeOnboarding({ moods, eras, topics });
    closePrefsDrawer();
  };

  const handleReset = () => {
    resetPreferences();
    closePrefsDrawer();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePrefsDrawer}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 70,
              background: 'rgba(0,0,0,0.5)',
            }}
          />
          {/* Sheet */}
          <motion.div
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

            {/* Scrollable pickers */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
              {/* Compact mood section */}
              <div style={{ marginBottom: '24px' }}>
                <p
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    marginBottom: '12px',
                    textAlign: 'center',
                    direction: 'rtl',
                  }}
                >
                  كيف تشعر الآن؟
                </p>
                <MoodPicker onNext={(v) => setMoods(v)} initialValue={moods} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <p
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    marginBottom: '12px',
                    textAlign: 'center',
                    direction: 'rtl',
                  }}
                >
                  أي عصر يستهويك؟
                </p>
                <EraPicker onNext={(v) => setEras(v)} initialValue={eras} />
              </div>
              <div style={{ marginBottom: '24px' }}>
                <p
                  style={{
                    fontFamily: "'Tajawal', sans-serif",
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '0.8rem',
                    marginBottom: '12px',
                    textAlign: 'center',
                    direction: 'rtl',
                  }}
                >
                  ما الذي يستهويك؟
                </p>
                <TopicsPicker
                  selectedMoods={moods}
                  selectedEras={eras}
                  onComplete={({ topics: t }) => setTopics(t)}
                  initialValue={topics}
                />
              </div>
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
                onClick={handleSave}
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
                حفظ التفضيلات
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
  );
};

export default PreferencesDrawer;
