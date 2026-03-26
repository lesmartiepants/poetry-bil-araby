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

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
      snapPoints={[1]}
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
          className="fixed inset-0 z-[61] flex flex-col"
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
            <div className="flex flex-col gap-1">
              <div
                className="font-amiri text-base md:text-lg leading-tight"
                dir="rtl"
                style={{ color: o.textLight }}
              >
                {currentPoem?.titleArabic || currentPoem?.title}
              </div>
              <span
                className="text-[9px] uppercase tracking-[0.12em]"
                style={{ color: o.textMuted }}
              >
                {currentPoem?.poet}
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

          {/* Heading */}
          <div className="px-6 md:px-8 pt-4 pb-3 flex-shrink-0">
            <span className="gold-foil-text font-brand-en italic text-xl tracking-tight">
              {ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}
            </span>
          </div>

          {/* Scrollable body */}
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 pb-20"
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
                {/* Translation block */}
                {insightParts?.poeticTranslation && (
                  <div
                    className="pb-5 mb-5 animate-[fadeUp_0.5s_ease_0.1s_both]"
                    style={{ borderBottom: `1px solid var(--gold-structural)` }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-[0.18em] mb-2.5"
                      style={{ color: o.textMuted }}
                    >
                      Translation
                    </div>
                    <p
                      className="font-fell italic leading-[1.9] text-[clamp(0.9375rem,1.4vw,1.0625rem)]"
                      style={{ color: o.textLight }}
                    >
                      {insightParts.poeticTranslation}
                    </p>
                  </div>
                )}

                {/* Analysis grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {insightParts?.depth && (
                    <div className="animate-[fadeUp_0.5s_ease_0.25s_both]">
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
                  {insightParts?.author && (
                    <div className="animate-[fadeUp_0.5s_ease_0.4s_both]">
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
