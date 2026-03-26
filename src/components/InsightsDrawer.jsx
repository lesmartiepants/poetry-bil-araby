import { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useDrag } from '@use-gesture/react';
import { motion } from 'framer-motion';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { usePoemStore } from '../stores/poemStore';

const InsightsDrawer = ({ insightParts }) => {
  const isOpen = useModalStore((s) => s.insightsDrawer);
  const onClose = () => useModalStore.getState().setInsightsDrawer(false);
  const isInterpreting = usePoemStore((s) => s.isInterpreting);
  const interpretation = usePoemStore((s) => s.interpretation);
  const currentPoem = usePoemStore((s) => s.currentPoem());
  const storeDarkMode = useUIStore((s) => s.darkMode);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  const darkMode = storeDarkMode;
  const theme = storeDarkMode ? THEME.dark : THEME.light;
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [inAuthorSection, setInAuthorSection] = useState(false);
  const authorRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // IntersectionObserver: morph header when author section is visible
  useEffect(() => {
    if (!authorRef.current || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInAuthorSection(entry.isIntersecting),
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(authorRef.current);
    return () => observer.disconnect();
  }, [insightParts?.author]);

  // Reset state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setDragY(0);
      setInAuthorSection(false);
    }
  }, [isOpen]);

  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy], direction: [, dy] }) => {
      setIsDragging(down);

      if (down) {
        // Clamp: allow limited upward drag (-40px) and free downward
        setDragY(Math.max(-40, my));
      } else {
        // Release — check velocity and distance for dismiss
        if (my > 80 || (vy > 0.5 && dy > 0)) {
          onClose();
        }
        setDragY(0);
      }
    },
    {
      axis: 'y',
      filterTaps: true,
      pointer: { touch: true },
    }
  );

  if (!isOpen) return null;

  const bgSolid = darkMode ? '#12100e' : '#fdfcf8';
  const textDim = darkMode ? 'rgba(245,240,230,0.5)' : 'rgba(60,50,30,0.5)';
  const textMuted = darkMode ? 'rgba(245,240,230,0.35)' : 'rgba(60,50,30,0.35)';
  const textLight = darkMode ? 'rgba(245,240,230,0.85)' : 'rgba(40,35,20,0.85)';

  return (
    <>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      {/* Drawer — 80dvh with rounded top corners */}
      <motion.div
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-2xl overflow-hidden flex flex-col"
        initial={{ y: '100%' }}
        animate={{ y: Math.max(0, dragY) }}
        exit={{ y: '100%' }}
        transition={
          isDragging
            ? { type: 'tween', duration: 0 }
            : { type: 'spring', damping: 30, stiffness: 300 }
        }
        style={{
          height: '80dvh',
          background: bgSolid,
        }}
      >
        {/* Drag handle */}
        <div
          {...bind()}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        >
          <div className="w-10 h-1 rounded-full bg-gold/30" />
        </div>

        {/* Contextual morphing header */}
        <header
          className="flex items-center justify-between px-6 md:px-8 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--gold-structural)' }}
        >
          {/* Accessible title hidden from view */}
          <h2 className="sr-only">
            {ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}
          </h2>
          <div className="flex-1 flex items-center justify-between min-w-0 mr-3">
            <span
              className="truncate transition-all duration-300"
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(0.95rem, 2vw, 1.15rem)',
                color: 'var(--gold)',
              }}
            >
              {inAuthorSection
                ? (currentPoem?.poetArabic || currentPoem?.poet)
                : (currentPoem?.titleArabic || currentPoem?.title)}
            </span>
            <span
              className="truncate transition-all duration-300"
              style={{
                fontFamily: "'Bodoni Moda', serif",
                fontSize: 'clamp(0.8rem, 1.5vw, 0.95rem)',
                color: textDim,
              }}
            >
              {inAuthorSection ? currentPoem?.poet : currentPoem?.title}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <X size={16} style={{ color: 'var(--gold)', opacity: 0.6 }} />
          </button>
        </header>

        {/* Scrollable content */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-6 pb-10"
        >
          {isInterpreting ? (
            <div className="flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse py-12">
              <Sparkles className={`animate-spin ${theme.loadingIcon}`} size={28} />
              <p className="font-brand-en italic text-sm">
                {ratchetMode ? 'Getting lit fr fr...' : 'Consulting Diwan...'}
              </p>
            </div>
          ) : (
            <div>
              {/* Sticky poetic translation — pins as context anchor */}
              {insightParts?.poeticTranslation && (
                <div
                  className="sticky top-0 z-10 pb-4 mb-4"
                  style={{ background: bgSolid, borderBottom: '1px solid var(--gold-structural)' }}
                >
                  <div
                    className="text-[0.5625rem] uppercase tracking-[0.18em] mb-2 pt-4"
                    style={{ color: textMuted }}
                  >
                    Translation
                  </div>
                  <p
                    className="font-fell italic leading-[1.9] line-clamp-3"
                    style={{
                      fontSize: 'clamp(0.9375rem, 1.4vw, 1.0625rem)',
                      color: textLight,
                    }}
                  >
                    {insightParts.poeticTranslation}
                  </p>
                </div>
              )}

              {/* Depth section */}
              {insightParts?.depth && (
                <div className="py-5">
                  <h4
                    className="text-[0.625rem] font-brand-en font-black mb-2 uppercase tracking-widest opacity-80"
                    style={{ color: 'var(--gold)' }}
                  >
                    The Depth
                  </h4>
                  <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                    {insightParts.depth}
                  </p>
                </div>
              )}

              {/* Gold rule between sections */}
              {insightParts?.depth && insightParts?.author && (
                <div className="h-px" style={{ background: 'var(--gold-structural)' }} />
              )}

              {/* Author section — observed by IntersectionObserver */}
              {insightParts?.author && (
                <div ref={authorRef} className="py-5">
                  <h4
                    className="text-[0.625rem] font-brand-en font-black mb-2 uppercase tracking-widest opacity-80"
                    style={{ color: 'var(--gold)' }}
                  >
                    The Author
                  </h4>
                  <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                    {insightParts.author}
                  </p>
                </div>
              )}

              {!interpretation && !isInterpreting && (
                <p className="text-center text-sm opacity-40 font-brand-en italic py-8">
                  {ratchetMode
                    ? 'Tap Explain to get that ratchet take fr fr'
                    : 'Tap the lightbulb to illuminate this poem'}
                </p>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default InsightsDrawer;
