import { Sparkles } from 'lucide-react';
import { DESIGN, CATEGORIES } from '../constants/index.js';

/**
 * Desktop-only sidebar panel that displays poetic insight for the current poem.
 * Hidden on mobile — the InsightsDrawer serves that layout.
 *
 * @param {object}      props
 * @param {object|null} props.current          - Currently displayed poem object
 * @param {object|null} props.insightParts     - Parsed insight ({ poeticTranslation, depth, author })
 * @param {boolean}     props.isInterpreting   - Whether the analysis request is in flight
 * @param {string|null} props.interpretation   - Raw interpretation text (null = not yet fetched)
 * @param {boolean}     props.showTranslation  - Whether to display the English translation
 * @param {boolean}     props.darkMode         - Current theme mode
 * @param {object}      props.theme            - Theme tokens ({ glass, border, brand, brandBorder })
 * @param {string}      props.selectedCategory - Active poet/category filter id
 * @param {Function}    props.handleAnalyze    - Triggers the AI insight analysis
 */
export default function DesktopInsightPane({
  current,
  insightParts,
  isInterpreting,
  interpretation,
  showTranslation,
  darkMode,
  theme,
  selectedCategory,
  handleAnalyze,
}) {
  return (
    <div className="hidden md:block h-full border-l">
      <div
        className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}
      >
        <div className="p-6 pb-4 border-b border-stone-500/10">
          <div className="flex items-center justify-between">
            <h3 className={`font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] ${theme.sectionLabel} tracking-tight`}>
              Poetic Insight
            </h3>
            {selectedCategory !== 'All' && (
              <span
                key={selectedCategory}
                className="font-amiri text-[11px] px-2.5 py-0.5 rounded-full border border-gold/25 text-gold/80 bg-gold/5"
                style={{ animation: 'fadeIn 0.3s ease-out' }}
              >
                {CATEGORIES.find((c) => c.id === selectedCategory)?.labelAr}
              </span>
            )}
          </div>
          <p className="text-[10px] opacity-30 uppercase font-brand-en truncate mt-1">
            {current?.poet} • {current?.title}
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {isInterpreting ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse">
              <Sparkles className={`animate-spin ${theme.loadingIcon}`} size={32} />
              <p className="font-brand-en italic text-[clamp(0.875rem,1.5vw,1rem)]">
                Consulting Diwan...
              </p>
            </div>
          ) : (
            <div className={DESIGN.paneSpacing}>
              {!interpretation && (
                <button
                  onClick={handleAnalyze}
                  className={`group relative w-full py-4 border ${theme.brandBorder} ${theme.brand} rounded-full font-brand-en tracking-widest text-[10px] uppercase ${theme.brandBgHover} transition-all flex items-center justify-center gap-3 overflow-hidden ${theme.brandBg}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-tr from-transparent via-lapis/10 to-transparent animate-[spin_8s_linear_infinite]`} />
                  <Sparkles size={12} /> Seek Insight
                </button>
              )}
              {showTranslation && (
                <p
                  className={`font-brand-en italic whitespace-pre-wrap ${DESIGN.paneVerseSize} ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}
                >
                  {insightParts?.poeticTranslation || current?.english}
                </p>
              )}
              {insightParts?.depth && (
                <div className={`pt-6 border-t ${theme.sectionBorder}`}>
                  <h4 className={`text-[10px] font-brand-en font-black ${theme.sectionLabel} mb-2 uppercase tracking-widest opacity-80`}>
                    The Depth
                  </h4>
                  <div className={`pl-4 border-l ${theme.sectionAccent}`}>
                    <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.depth}
                    </p>
                  </div>
                </div>
              )}
              {insightParts?.author && (
                <div className={`pt-6 border-t ${theme.sectionBorder}`}>
                  <h4 className={`text-[10px] font-brand-en font-black ${theme.sectionLabel} mb-2 uppercase tracking-widest opacity-80`}>
                    The Author
                  </h4>
                  <div className={`pl-4 border-l ${theme.sectionAccent}`}>
                    <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                      {insightParts.author}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
