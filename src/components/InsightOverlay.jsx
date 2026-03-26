import { useState, useRef, useEffect } from 'react';
import { Drawer } from 'vaul';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';

export default function InsightOverlay({
  open,
  insightParts,
  currentPoem,
  isInterpreting,
  interpretation,
  onClose,
  ratchetMode,
  handleAnalyze,
}) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const o = theme.overlay;

  const [inAuthorSection, setInAuthorSection] = useState(false);
  const authorRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!authorRef.current || !scrollContainerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInAuthorSection(entry.isIntersecting),
      { root: scrollContainerRef.current, threshold: 0.1 }
    );
    observer.observe(authorRef.current);
    return () => observer.disconnect();
  }, [insightParts?.author]);

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      snapPoints={[0.8]}
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
          className="fixed bottom-0 left-0 right-0 z-[61] flex flex-col rounded-t-2xl overflow-hidden"
          style={{ background: o.bg }}
        >
          {/* Gold rule */}
          <div className="h-px flex-shrink-0" style={{ background: o.goldRule }} />

          {/* Mobile swipe handle */}
          <Drawer.Handle
            className="md:hidden mx-auto mt-4 mb-2 w-8 h-[3px] rounded-full"
            style={{ background: 'var(--gold-structural)' }}
          />

          {/* Topbar */}
          <header
            className="flex items-center justify-between px-6 md:px-8 py-3 flex-shrink-0"
            style={{ borderBottom: `1px solid ${o.borderSubtle}` }}
          >
            <Drawer.Title className="sr-only">{ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}</Drawer.Title>
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
                {inAuthorSection ? (currentPoem?.poetArabic || currentPoem?.poet) : (currentPoem?.titleArabic || currentPoem?.title)}
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
                className="hidden md:block px-4 py-1.5 rounded-full text-[10px] tracking-[0.08em] font-fell transition-all"
                style={{ border: `1px solid ${o.borderSubtle}`, color: o.textMuted }}
              >
                Close
              </button>
            </Drawer.Close>
            <Drawer.Close asChild>
              <button
                data-testid="insight-close-mobile"
                type="button"
                aria-label="Close insight overlay"
                className="md:hidden w-7 h-7 rounded-full flex items-center justify-center transition-all"
                style={{ border: `1px solid ${o.borderSubtle}`, color: o.textMuted }}
              >
                ✕
              </button>
            </Drawer.Close>
          </header>

          {/* Scrollable body */}
          <div
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-6 md:px-8 pb-10"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--gold-structural) transparent' }}
          >
            {isInterpreting ? (
              <div className="flex flex-col items-center justify-center gap-5 min-h-[200px]">
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
                {/* Sticky translation block */}
                {insightParts?.poeticTranslation && (
                  <div
                    className="sticky top-0 z-10 pb-4 mb-4"
                    style={{ background: o.bg, borderBottom: '1px solid var(--gold-structural)' }}
                  >
                    <div className="text-[9px] uppercase tracking-[0.18em] mb-2" style={{ color: o.textMuted }}>
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

                {/* Single column with gold rules */}
                <div>
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
                          style={{
                            background: `linear-gradient(90deg, ${o.sectionLine}, transparent)`,
                          }}
                        />
                      </div>
                      <p
                        className="font-fell leading-[1.85] text-[13px] md:text-[13px]"
                        style={{ color: o.textDim }}
                      >
                        {insightParts.depth}
                      </p>
                    </div>
                  )}
                  {insightParts?.depth && insightParts?.author && (
                    <div className="h-px" style={{ background: o.goldRule }} />
                  )}
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
                          style={{
                            background: `linear-gradient(90deg, ${o.sectionLine}, transparent)`,
                          }}
                        />
                      </div>
                      <p
                        className="font-fell leading-[1.85] text-[13px] md:text-[13.5px]"
                        style={{ color: o.textDim }}
                      >
                        {insightParts.author}
                      </p>
                    </div>
                  )}
                </div>

                {/* Empty state */}
                {!interpretation && !isInterpreting && (
                  <div className="flex flex-col items-center justify-center min-h-[200px] gap-4">
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
