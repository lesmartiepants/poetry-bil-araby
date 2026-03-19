import { useState, useEffect, useRef } from 'react';
import { X, Sparkles } from 'lucide-react';
import { useDrag } from '@use-gesture/react';

const InsightsDrawer = ({
  isOpen,
  onClose,
  isInterpreting,
  insightParts,
  interpretation,
  showTranslation,
  current,
  theme,
  darkMode,
}) => {
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
      <div
        className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm"
        style={{ animation: 'fadeIn 0.2s ease-out' }}
        onClick={onClose}
      />
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed bottom-0 left-0 right-0 z-[61] rounded-t-3xl border-t border-[#C5A059]/20 overflow-hidden"
        style={{
          height,
          transform: `translateY(${Math.max(0, dragY)}px)`,
          transition: isDragging
            ? 'none'
            : 'height 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'insightsDrawerIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
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
          <div className="w-10 h-1 rounded-full bg-[#C5A059]/30" />
        </div>

        {/* Header */}
        <div className="px-6 pb-3 flex items-center justify-between">
          <h3 className="font-brand-en italic font-semibold text-base text-indigo-600 tracking-tight">
            Poetic Insight
          </h3>
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
              <p className="font-brand-en italic text-sm">Consulting Diwan...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {showTranslation && (
                <p
                  className={`font-brand-en italic whitespace-pre-wrap text-sm leading-relaxed ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}
                >
                  {insightParts?.poeticTranslation || current?.english}
                </p>
              )}
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
                  Tap Explain to discover this poem's story
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default InsightsDrawer;
