import RevealText from './RevealText.jsx';

/**
 * InlineInsights — presentational end-of-poem insight, driven by `stage` from PoemReader.
 *
 * The tap rhythm lives in the parent: tap "for meaning" → stage 'meaning' (The Meaning / depth),
 * tap "for the poet" → stage 'author' (About the Author / bio). No buttons here.
 *
 * Each section sparkle-reveals its paragraph (RevealText): words fade in left→right with a gold
 * shimmer; if the text overflows, the box scrolls as it reveals and a scoped scrubber appears
 * (spec #6/#7). Only the section for the current stage is shown so its reveal owns the view.
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
  const textLight = darkMode ? 'rgba(236,232,224,0.9)' : 'rgba(28,25,23,0.88)';
  const textDim = darkMode ? 'rgba(236,232,224,0.66)' : 'rgba(28,25,23,0.62)';

  if (isInterpreting && !insightParts?.depth) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 h-full py-8">
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

  // About the Author — name header rendered above the reveal paragraph.
  const authorHeader = (
    <div className="pb-2 text-center">
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
  );

  if (stage === 'author') {
    if (!insightParts?.author) {
      return (
        <div className="flex items-center justify-center h-full">
          <span className="font-brand-en italic text-sm py-6" style={{ color: textDim }}>
            No author note available.
          </span>
        </div>
      );
    }
    return (
      <RevealText
        text={insightParts.author}
        active
        goldColor={gold}
        color={textDim}
        label="About the Author"
        before={authorHeader}
      />
    );
  }

  // stage === 'meaning'
  if (!insightParts?.depth) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-brand-en italic text-sm py-6" style={{ color: textDim }}>
          {interpretation ? 'No meaning available.' : 'Tap to seek the meaning.'}
        </span>
      </div>
    );
  }
  return (
    <RevealText
      text={insightParts.depth}
      active
      goldColor={gold}
      color={textLight}
      label="The Meaning"
    />
  );
}
