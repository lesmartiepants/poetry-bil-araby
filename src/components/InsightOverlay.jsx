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
            background: o.scrim,
            backdropFilter: o.backdrop,
            WebkitBackdropFilter: o.backdrop,
          }}
        />
        <Drawer.Content
          data-vaul-drawer
          className="fixed bottom-0 left-0 right-0 z-[61] h-[90dvh] rounded-t-2xl flex flex-col"
          style={{ background: o.bg }}
        >
          <Drawer.Handle
            className="mx-auto mt-3 mb-1 w-8 h-[3px] rounded-full"
            style={{ background: 'var(--gold-structural)' }}
          />

          {/* Gold rule */}
          <div className="h-px flex-shrink-0" style={{ background: o.goldRule }} />

          {/* Header — English left, Arabic right */}
          <header className="px-6 md:px-8 pt-3 pb-3 flex-shrink-0" style={{ borderBottom: `1px solid ${o.borderSubtle}` }}>
            <Drawer.Title className="sr-only">
              {ratchetMode ? 'Ratchet Insight' : 'Poetic Insight'}
            </Drawer.Title>

            {/* Close button */}
            <div className="flex justify-end mb-1">
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
            </div>

            {/* Title line — English left, Arabic right */}
            <div className="flex items-baseline justify-between gap-3">
              <span
                className="truncate"
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
              </span>
              <span
                className="truncate text-right"
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
              </span>
            </div>

            {/* Poet line — English left, Arabic right */}
            <div className="flex items-baseline justify-between gap-3 mt-0.5">
              <span
                className="truncate"
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
              </span>
              <span
                className="truncate text-right"
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
              </span>
            </div>

            {/* Gold gradient separator */}
            <div
              className="mt-2"
              style={{
                width: '80%',
                maxWidth: 320,
                height: 1,
                margin: '0.5rem auto 0',
                background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)',
              }}
            />
          </header>

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
                {/* Translation (normal flow, not sticky) */}
                {insightParts?.poeticTranslation && (
                  <div
                    className="pt-4 pb-4 mb-4"
                    style={{ borderBottom: '1px solid var(--gold-structural)' }}
                  >
                    <div
                      className="text-[9px] uppercase tracking-[0.18em] mb-2"
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

                {/* The Author */}
                {insightParts?.author && (
                  <div className="py-5 animate-[fadeUp_0.5s_ease_0.4s_both]">
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
