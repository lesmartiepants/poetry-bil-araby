import { useState, useRef, useEffect } from 'react';
import { Drawer } from 'vaul';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';

export default function InsightOverlay({
  open, insightParts, currentPoem, isInterpreting, interpretation,
  onClose, ratchetMode, handleAnalyze,
}) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const o = theme.overlay;

  const [inAuthorSection, setInAuthorSection] = useState(false);
  const authorRef = useRef(null);
  const scrollRef = useRef(null);

  // Header morph: poem title → poet name when Author section scrolls into view
  useEffect(() => {
    if (!authorRef.current || !scrollRef.current) return;
    const obs = new IntersectionObserver(
      ([e]) => setInAuthorSection(e.isIntersecting),
      { root: scrollRef.current, threshold: 0.1 }
    );
    obs.observe(authorRef.current);
    return () => obs.disconnect();
  }, [insightParts?.author]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      snapPoints={[0.9]}
      closeThreshold={0.1}
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[60]"
          style={{
            background: o.scrim,
            backdropFilter: o.backdrop,
            WebkitBackdropFilter: o.backdrop,
          }}
        />
        <Drawer.Content
          data-vaul-drawer
          className="z-[61] rounded-t-2xl flex flex-col"
          style={{ background: o.bg }}
        >
          {/* NO fixed, NO bottom-0, NO height, NO inner wrapper — Vaul positions this */}

          <Drawer.Handle
            className="mx-auto mt-3 mb-1 w-8 h-[3px] rounded-full"
            style={{ background: 'var(--gold-structural)' }}
          />

          {/* Gold rule */}
          <div className="h-px flex-shrink-0" style={{ background: o.goldRule }} />

          {/* Header */}
          <header
            className="flex items-center justify-between px-6 md:px-8 py-3 flex-shrink-0"
            style={{ borderBottom: `1px solid ${o.borderSubtle}` }}
          >
            <Drawer.Title className="sr-only">
              {ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}
            </Drawer.Title>
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
                  color: o.textDim,
                }}
              >
                {inAuthorSection ? currentPoem?.poet : currentPoem?.title}
              </span>
            </div>
            <Drawer.Close asChild>
              <button
                data-testid="insight-close"
                type="button"
                aria-label="Close insight overlay"
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0"
                style={{ border: `1px solid ${o.borderSubtle}`, color: o.textMuted }}
              >
                ✕
              </button>
            </Drawer.Close>
          </header>

          {/* Scrollable body — data-vaul-no-drag prevents swipe vs scroll conflict */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 md:px-8 pb-10"
            data-vaul-no-drag
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--gold-structural) transparent' }}
          >
            {isInterpreting ? (
              /* Loading state */
              <div className="flex flex-col items-center justify-center gap-5 min-h-[200px] pt-16">
                <div
                  className="w-7 h-7 rounded-full animate-spin"
                  style={{
                    border: `2px solid ${o.loadingBorder}`,
                    borderTopColor: o.loadingActive,
                    opacity: 0.6,
                  }}
                />
                <span
                  className="font-brand-en italic text-base animate-[breathe_3s_ease-in-out_infinite]"
                  style={{ color: o.textDim }}
                >
                  {ratchetMode ? 'Getting lit fr fr...' : 'Consulting the Diwan...'}
                </span>
              </div>
            ) : (
              <>
                {/* Sticky translation */}
                {insightParts?.poeticTranslation && (
                  <div
                    className="sticky top-0 z-10 pt-2 pb-4 mb-4"
                    style={{
                      background: o.bg,
                      borderBottom: '1px solid var(--gold-structural)',
                    }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-[0.18em] mb-2"
                      style={{ color: o.textMuted }}
                    >
                      Translation
                    </div>
                    <p
                      className="font-fell italic leading-[1.9] text-[clamp(0.9375rem,1.4vw,1.0625rem)] line-clamp-3"
                      style={{ color: o.textLight }}
                    >
                      {insightParts.poeticTranslation}
                    </p>
                  </div>
                )}

                {/* The Depth */}
                {insightParts?.depth && (
                  <div className="py-5 animate-[fadeUp_0.5s_ease_0.25s_both]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="text-[9px] uppercase tracking-[0.18em] whitespace-nowrap"
                        style={{ color: o.sectionLabel }}
                      >
                        The Depth
                      </span>
                      <span
                        className="flex-1 h-px"
                        style={{ background: `linear-gradient(90deg, ${o.sectionLine}, transparent)` }}
                      />
                    </div>
                    <p className="font-fell leading-[1.85] text-[13.5px]" style={{ color: o.textDim }}>
                      {insightParts.depth}
                    </p>
                  </div>
                )}

                {/* Gold rule divider */}
                {insightParts?.depth && insightParts?.author && (
                  <div className="h-px" style={{ background: o.goldRule }} />
                )}

                {/* The Author — ref triggers header morph */}
                {insightParts?.author && (
                  <div ref={authorRef} className="py-5 animate-[fadeUp_0.5s_ease_0.4s_both]">
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="text-[9px] uppercase tracking-[0.18em] whitespace-nowrap"
                        style={{ color: o.sectionLabel }}
                      >
                        The Author
                      </span>
                      <span
                        className="flex-1 h-px"
                        style={{ background: `linear-gradient(90deg, ${o.sectionLine}, transparent)` }}
                      />
                    </div>
                    <p className="font-fell leading-[1.85] text-[13.5px]" style={{ color: o.textDim }}>
                      {insightParts.author}
                    </p>
                  </div>
                )}

                {/* Empty state */}
                {!interpretation && !isInterpreting && (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-4 pt-16">
                    <p className="font-brand-en italic text-sm" style={{ color: o.textMuted }}>
                      {ratchetMode
                        ? 'Tap Explain to get that ratchet take'
                        : 'Tap the lightbulb to illuminate this poem'}
                    </p>
                    <button
                      onClick={handleAnalyze}
                      className="px-6 py-2 rounded-full text-[10px] uppercase tracking-[0.08em] font-fell transition-all"
                      style={{ border: `1px solid ${o.borderSubtle}`, color: o.textMuted }}
                    >
                      Seek Insight
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
