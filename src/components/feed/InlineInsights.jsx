import { useState } from 'react';

/**
 * InlineInsights — end-of-poem insight surface.
 *
 * Inline mode (default): "✦ see the meaning" → The Meaning (depth) → tap "the author" →
 * About the Author (bio) → "back to poem" / "next poem" buttons. Drawer mode: the button
 * defers to the parent (onSeeInsight) which opens the existing Vaul InsightOverlay.
 *
 * Content comes from the parent's parsed insightParts ({ poeticTranslation, depth, author }).
 */
export default function InlineInsights({
  mode = 'inline',
  poem,
  darkMode = true,
  isInterpreting = false,
  insightParts = null,
  interpretation = null,
  onSeeInsight,
  onBackToPoem,
  onNextPoem,
}) {
  const [stage, setStage] = useState('idle'); // idle | meaning | author

  const gold = darkMode ? '#d4b463' : '#8B6430';
  const labelColor = darkMode ? 'rgba(212,180,99,0.7)' : 'rgba(139,100,48,0.8)';
  const textLight = darkMode ? 'rgba(236,232,224,0.9)' : 'rgba(28,25,23,0.88)';
  const textDim = darkMode ? 'rgba(236,232,224,0.66)' : 'rgba(28,25,23,0.62)';
  const rule = 'rgba(197,160,89,0.25)';

  const handleSee = () => {
    onSeeInsight?.();
    if (mode === 'inline') setStage('meaning');
  };

  const btn = (label, onClick, primary = false) => (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="px-5 py-2 rounded-full text-[0.8rem] tracking-[0.06em] font-brand-en transition-all"
      style={{
        border: `1px solid ${primary ? gold : 'rgba(197,160,89,0.4)'}`,
        background: primary ? 'rgba(197,160,89,0.14)' : 'transparent',
        color: gold,
      }}
    >
      {label}
    </button>
  );

  if (stage === 'idle') {
    return btn('✦ see the meaning', handleSee, true);
  }

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center" data-insight-ui>
      {isInterpreting && !insightParts?.depth ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="w-6 h-6 rounded-full animate-spin"
            style={{ border: '2px solid rgba(197,160,89,0.25)', borderTopColor: gold }}
          />
          <span className="font-brand-en italic text-sm" style={{ color: textDim }}>
            Consulting the Diwan…
          </span>
        </div>
      ) : (
        <>
          {/* The Meaning (depth) */}
          {insightParts?.depth && (
            <div className="py-3 w-full">
              <div
                className="text-[9px] uppercase tracking-[0.18em] mb-2"
                style={{ color: labelColor }}
              >
                The Meaning
              </div>
              <p
                className="font-fell leading-[1.8] text-[clamp(0.9rem,1.4vw,1.05rem)]"
                style={{ color: textLight }}
              >
                {insightParts.depth}
              </p>
            </div>
          )}

          {/* tap-to-reveal the author */}
          {stage === 'meaning' && insightParts?.author && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setStage('author');
              }}
              className="mt-1 mb-2 px-4 py-1.5 rounded-full text-[0.72rem] uppercase tracking-[0.12em] font-brand-en"
              style={{ border: `1px solid rgba(197,160,89,0.4)`, color: gold }}
            >
              about the author →
            </button>
          )}

          {/* About the Author */}
          {stage === 'author' && insightParts?.author && (
            <>
              <div className="h-px w-full my-2" style={{ background: rule }} />
              <div className="pt-1 text-center">
                <div
                  lang="ar"
                  dir="rtl"
                  style={{
                    fontFamily: "'Fustat', sans-serif",
                    fontWeight: 500,
                    fontSize: 'clamp(1.1rem,2.5vw,1.4rem)',
                    color: darkMode ? '#D4D0C8' : '#6B5C3E',
                  }}
                >
                  {poem?.poetArabic || poem?.poet}
                </div>
                {poem?.poet && (
                  <div
                    dir="ltr"
                    style={{
                      fontFamily: "'Forum', serif",
                      fontSize: 'clamp(0.75rem,1.4vw,0.9rem)',
                      letterSpacing: '0.03em',
                      color: darkMode ? 'rgba(212,200,168,0.7)' : 'rgba(120,100,60,0.7)',
                      marginTop: 2,
                    }}
                  >
                    {poem.poet}
                  </div>
                )}
              </div>
              <div className="py-3 w-full">
                <div
                  className="text-[9px] uppercase tracking-[0.18em] mb-2"
                  style={{ color: labelColor }}
                >
                  About the Author
                </div>
                <p className="font-fell leading-[1.8] text-[13.5px]" style={{ color: textDim }}>
                  {insightParts.author}
                </p>
              </div>
            </>
          )}

          {/* end controls */}
          {(stage === 'author' || (stage === 'meaning' && !insightParts?.author)) && (
            <div className="flex items-center gap-3 mt-2">
              {btn('back to poem', () => {
                setStage('idle');
                onBackToPoem?.();
              })}
              {btn('next poem ↑', () => onNextPoem?.(), true)}
            </div>
          )}

          {/* empty / no-insight fallback */}
          {!isInterpreting && !interpretation && !insightParts?.depth && (
            <span className="font-brand-en italic text-sm py-4" style={{ color: textDim }}>
              No insight available.
            </span>
          )}
        </>
      )}
    </div>
  );
}
