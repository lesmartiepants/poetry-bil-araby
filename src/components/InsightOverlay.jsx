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

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}
      closeThreshold={0.1}
      modal
    >
      <Drawer.Portal>
        <Drawer.Overlay
          className="fixed inset-0 z-[60]"
          style={{
            background: 'rgba(0,0,0,0.15)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
          }}
        />
        <Drawer.Content
          data-vaul-drawer
          className="fixed bottom-0 left-0 right-0 z-[61] h-[95dvh] rounded-t-2xl flex flex-col"
          style={{ background: o.bg }}
        >
          <Drawer.Handle
            className="mx-auto mt-3 mb-1 w-8 h-[3px] rounded-full"
            style={{ background: 'var(--gold)' }}
          />

          {/* Header — centered poem title */}
          <div className="px-6 md:px-8 pt-4 pb-3 flex-shrink-0 text-center">
            <Drawer.Title className="sr-only">
              {ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}
            </Drawer.Title>
            <div
              dir="rtl"
              style={{
                fontFamily: "'Reem Kufi', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
                lineHeight: 1.3,
                letterSpacing: '0.02em',
                color: 'var(--gold)',
              }}
            >
              {currentPoem?.titleArabic || currentPoem?.title}
            </div>
            <div
              className="mt-1"
              dir="ltr"
              style={{
                fontFamily: "'Bodoni Moda', serif",
                fontWeight: 500,
                fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
                letterSpacing: '0.02em',
                color: 'var(--gold)',
              }}
            >
              {currentPoem?.title}
            </div>
          </div>

          {/* Scrollable body */}
          <div
            className="flex-1 overflow-y-auto px-6 md:px-8 pb-10"
            data-vaul-no-drag
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--gold-structural) transparent' }}
          >
            {isInterpreting ? (
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
                {/* Translation */}
                {insightParts?.poeticTranslation && (
                  <div className="py-5 animate-[fadeUp_0.5s_ease_0.1s_both]">
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

                {/* Gold rule: Translation → Depth */}
                {insightParts?.poeticTranslation && insightParts?.depth && (
                  <div className="h-px" style={{ background: o.goldRule }} />
                )}

                {/* The Depth */}
                {insightParts?.depth && (
                  <div className="py-5 animate-[fadeUp_0.5s_ease_0.25s_both]">
                    <span
                      className="text-[9px] uppercase tracking-[0.18em]"
                      style={{ color: o.sectionLabel }}
                    >
                      The Depth
                    </span>
                    <p className="font-fell leading-[1.85] text-[13.5px] mt-2.5" style={{ color: o.textDim }}>
                      {insightParts.depth}
                    </p>
                  </div>
                )}

                {/* Gold rule: Depth → Author */}
                {insightParts?.depth && insightParts?.author && (
                  <div className="h-px" style={{ background: o.goldRule }} />
                )}

                {/* Poet name above Author */}
                {insightParts?.author && (
                  <div className="pt-5 text-center animate-[fadeUp_0.5s_ease_0.35s_both]">
                    <div
                      dir="rtl"
                      style={{
                        fontFamily: "'Fustat', sans-serif",
                        fontWeight: 500,
                        fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
                        lineHeight: 1.3,
                        color: darkMode ? '#D4D0C8' : '#6B5C3E',
                      }}
                    >
                      {currentPoem?.poetArabic || currentPoem?.poet}
                    </div>
                    <div
                      className="mt-1"
                      dir="ltr"
                      style={{
                        fontFamily: "'Forum', serif",
                        fontWeight: 400,
                        fontSize: 'clamp(0.75rem, 1.4vw, 0.9rem)',
                        letterSpacing: '0.03em',
                        color: darkMode ? 'rgba(212,200,168,0.7)' : 'rgba(120,100,60,0.7)',
                      }}
                    >
                      {currentPoem?.poet}
                    </div>
                  </div>
                )}

                {/* The Author */}
                {insightParts?.author && (
                  <div className="py-5 animate-[fadeUp_0.5s_ease_0.4s_both]">
                    <span
                      className="text-[9px] uppercase tracking-[0.18em]"
                      style={{ color: o.sectionLabel }}
                    >
                      The Author
                    </span>
                    <p className="font-fell leading-[1.85] text-[13.5px] mt-2.5" style={{ color: o.textDim }}>
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
