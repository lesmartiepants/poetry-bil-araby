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
  const storeDarkMode = useUIStore((s) => s.darkMode);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  const darkMode = storeDarkMode;
  const theme = storeDarkMode ? THEME.dark : THEME.light;
  const [expanded, setExpanded] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef(null);

  // Reset expanded state when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setExpanded(false);
      setDragY(0);
    }
  }, [isOpen]);

  const bind = useDrag(
    ({ down, movement: [, my], velocity: [, vy], direction: [, dy], cancel }) => {
      setIsDragging(down);

      if (down) {
        // Clamp: allow limited upward drag (-40px) and free downward
        setDragY(Math.max(-40, my));
      } else {
        // Release — check velocity and distance for dismiss/expand
        if (my > 80 || (vy > 0.5 && dy > 0)) {
          // Dragged or flicked down — close
          onClose();
        } else if (my < -20 || (vy > 0.5 && dy < 0)) {
          // Dragged or flicked up — expand
          setExpanded(true);
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

  const height = expanded ? '75dvh' : '40dvh';

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
      {/* Drawer */}
      <motion.div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl border-t border-gold/20 overflow-hidden"
        initial={{ y: '100%' }}
        animate={{ y: Math.max(0, dragY) }}
        exit={{ y: '100%' }}
        transition={
          isDragging
            ? { type: 'tween', duration: 0 }
            : { type: 'spring', damping: 30, stiffness: 300 }
        }
        style={{
          height,
          background: darkMode
            ? 'linear-gradient(180deg, rgba(18,16,14,0.98) 0%, rgba(12,12,14,0.99) 100%)'
            : 'linear-gradient(180deg, rgba(253,252,248,0.98) 0%, rgba(245,243,238,0.99) 100%)',
        }}
      >
        {/* Drag handle */}
        <div
          {...bind()}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div className="w-10 h-1 rounded-full bg-gold/30" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-brand-en italic font-semibold text-base text-indigo-600 tracking-tight">
              {ratchetMode ? '🔥 Ratchet Insight' : 'Poetic Insight'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={16} style={{ color: theme.gold, opacity: 0.6 }} />
          </button>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-8"
          style={{ maxHeight: 'calc(100% - 3.5rem)' }}
        >
          {isInterpreting ? (
            <div className="flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse py-12">
              <Sparkles className="animate-spin text-indigo-500" size={28} />
              <p className="font-brand-en italic text-sm">
                {ratchetMode ? 'Getting lit fr fr...' : 'Consulting Diwan...'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {insightParts?.depth && (
                <div className="pt-4 border-t border-indigo-500/10">
                  <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                    The Depth
                  </h4>
                  <div className="pl-4 border-l border-indigo-500/10">
                    <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.depth}
                    </p>
                  </div>
                </div>
              )}
              {insightParts?.author && (
                <div className="pt-4 border-t border-indigo-500/10">
                  <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                    The Author
                  </h4>
                  <div className="pl-4 border-l border-indigo-500/10">
                    <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.author}
                    </p>
                  </div>
                </div>
              )}
              {!interpretation && !isInterpreting && (
                <p className="text-center text-sm opacity-40 font-brand-en italic py-8">
                  {ratchetMode
                    ? 'Tap Explain to get that ratchet take fr fr 🔥'
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
