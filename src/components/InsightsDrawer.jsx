import { X } from 'lucide-react';
import { useModalStore } from '../stores/modalStore';
import { usePoemStore } from '../stores/poemStore';
import { useUIStore } from '../stores/uiStore';
import { THEME } from '../constants/theme.js';

export default function InsightsDrawer({ insightParts }) {
  const insightsDrawer = useModalStore((s) => s.insightsDrawer);
  const setInsightsDrawer = useModalStore((s) => s.setInsightsDrawer);
  const isInterpreting = usePoemStore((s) => s.isInterpreting);
  const interpretation = usePoemStore((s) => s.interpretation);
  const currentPoem = usePoemStore((s) => s.currentPoem());
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const o = theme.overlay;

  if (!insightsDrawer) return null;

  return (
    <div
      role="dialog"
      className={`fixed inset-0 z-[60] flex flex-col ${darkMode ? 'bg-[#0c0c0e]' : 'bg-[#FDFCF8]'}`}
    >
      <h2 className="sr-only">Poetic Insight</h2>

      {/* Header */}
      <header className={`flex items-center justify-between px-6 py-4 flex-shrink-0 border-b ${theme.border}`}>
        <div className="flex flex-col gap-0.5">
          {currentPoem?.titleArabic && (
            <div
              className="font-amiri text-base leading-tight"
              dir="rtl"
              style={{ color: o?.textLight }}
            >
              {currentPoem.titleArabic}
            </div>
          )}
          {currentPoem?.title && (
            <div
              className="text-[0.625rem] uppercase tracking-[0.12em]"
              style={{ color: o?.textMuted }}
            >
              {currentPoem.title}
            </div>
          )}
        </div>
        <button
          onClick={() => setInsightsDrawer(false)}
          aria-label="Close insights"
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ border: `1px solid ${o?.borderSubtle}`, color: o?.textMuted }}
        >
          <X size={14} />
        </button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 pb-20">
        {isInterpreting ? (
          <div className="flex flex-col items-center justify-center gap-5 min-h-[200px]">
            <p
              className="font-brand-en italic text-base"
              style={{ color: o?.textMuted }}
            >
              Consulting Diwan...
            </p>
          </div>
        ) : (
          <>
            {/* Translation */}
            {insightParts?.poeticTranslation && (
              <div className="pb-5 mb-5">
                <div
                  className="text-[0.5625rem] uppercase tracking-[0.18em] mb-2.5"
                  style={{ color: o?.textMuted }}
                >
                  Translation
                </div>
                <p
                  className="font-fell italic leading-[1.9]"
                  style={{ color: o?.textLight }}
                >
                  {insightParts.poeticTranslation}
                </p>
              </div>
            )}

            {/* Depth */}
            {insightParts?.depth && (
              <div className="mb-5">
                <div
                  className="text-[0.5625rem] uppercase tracking-[0.18em] mb-2.5"
                  style={{ color: o?.sectionLabel }}
                >
                  The Depth
                </div>
                <p
                  className="font-fell leading-[1.85] text-[0.8125rem]"
                  style={{ color: o?.textDim }}
                >
                  {insightParts.depth}
                </p>
              </div>
            )}

            {/* Gold rule divider between depth and author */}
            {insightParts?.depth && insightParts?.author && (
              <div
                className="h-px mb-5"
                style={{ background: o?.goldRule || 'linear-gradient(90deg, transparent, #B8943E, transparent)' }}
              />
            )}

            {/* Author */}
            {insightParts?.author && (
              <div className="mb-5">
                <div
                  className="text-[0.5625rem] uppercase tracking-[0.18em] mb-2.5"
                  style={{ color: o?.sectionLabel }}
                >
                  The Author
                </div>
                <p
                  className="font-fell leading-[1.85] text-[0.8125rem]"
                  style={{ color: o?.textDim }}
                >
                  {insightParts.author}
                </p>
              </div>
            )}

            {/* Empty state */}
            {!interpretation && !isInterpreting && !insightParts && (
              <div className="flex flex-col items-center justify-center min-h-[200px]">
                <p
                  className="font-brand-en italic text-sm"
                  style={{ color: o?.textMuted }}
                >
                  Tap the lightbulb to illuminate this poem
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
