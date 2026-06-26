/**
 * InlineInsights — presentational end-of-poem insight, driven by `stage` from PoemReader.
 *
 * The tap rhythm lives in the parent: tap "for meaning" → stage 'meaning' (The Meaning / depth),
 * tap "for the poet" → stage 'author' (About the Author / bio). No buttons here.
 *
 * Content comes from the parent's parsed insightParts ({ poeticTranslation, depth, author }).
 */
export default function InlineInsights({
  stage = 'meaning',
  poem,
  darkMode = true,
  isInterpreting = false,
  insightParts = null,
  interpretation = null,
}) {
  const gold = darkMode ? '#d4b463' : '#8B6430';
  const labelColor = darkMode ? 'rgba(212,180,99,0.7)' : 'rgba(139,100,48,0.8)';
  const textLight = darkMode ? 'rgba(236,232,224,0.9)' : 'rgba(28,25,23,0.88)';
  const textDim = darkMode ? 'rgba(236,232,224,0.66)' : 'rgba(28,25,23,0.62)';
  const rule = 'rgba(197,160,89,0.25)';

  if (isInterpreting && !insightParts?.depth) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: '2px solid rgba(197,160,89,0.25)', borderTopColor: gold }}
        />
        <span className="font-brand-en italic text-sm" style={{ color: textDim }}>
          Consulting the Diwan…
        </span>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center">
      {/* The Meaning (depth) */}
      {insightParts?.depth ? (
        <div className="py-2 w-full">
          <div
            className="text-[9px] uppercase tracking-[0.18em] mb-2"
            style={{ color: labelColor }}
          >
            The Meaning
          </div>
          <p
            className="font-fell leading-[1.8] text-[clamp(0.95rem,1.5vw,1.1rem)]"
            style={{ color: textLight }}
          >
            {insightParts.depth}
          </p>
        </div>
      ) : (
        !isInterpreting && (
          <span className="font-brand-en italic text-sm py-6" style={{ color: textDim }}>
            {interpretation ? 'No meaning available.' : 'Tap to seek the meaning.'}
          </span>
        )
      )}

      {/* About the Author — revealed on the next tap */}
      {stage === 'author' && insightParts?.author && (
        <>
          <div className="h-px w-full my-3" style={{ background: rule }} />
          <div className="pt-1 text-center">
            <div
              lang="ar"
              dir="rtl"
              style={{
                fontFamily: "'Fustat', sans-serif",
                fontWeight: 500,
                fontSize: 'clamp(1.15rem,2.5vw,1.45rem)',
                color: darkMode ? '#D4D0C8' : '#6B5C3E',
              }}
            >
              {poem?.poetArabic || poem?.poet}
            </div>
            {poem?.poet && poem?.poet !== poem?.poetArabic && (
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
          <div className="py-2 w-full">
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
    </div>
  );
}
