import RevealText from './RevealText.jsx';

/**
 * InlineInsights — presentational end-of-poem insight, driven by `stage` from PoemReader.
 *
 * The tap rhythm lives in the parent: tap "for meaning" → 'meaning' (The Meaning / depth), tap
 * "for the poet" → 'author' (About the Author / bio). One section shows at a time; its paragraph
 * reveals word-by-word via RevealText. The section label is pinned above the RevealText viewport,
 * which scrolls natively (the scrub bar it used to depend on is gone). The poet's name is NOT
 * repeated here; it already lives in the page header.
 *
 * onProgress is forwarded to the active RevealText so the parent can mark the section seen.
 */
export default function InlineInsights({
  stage = 'meaning',
  darkMode = true,
  isInterpreting = false,
  insightParts = null,
  interpretation = null,
  animate = true,
  onProgress,
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

  const isAuthor = stage === 'author';
  const text = isAuthor ? insightParts?.author : insightParts?.depth;
  const label = isAuthor ? 'About the Author' : 'The Meaning';

  if (!text) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="font-brand-en italic text-sm py-6" style={{ color: textDim }}>
          {isAuthor
            ? 'No author note available.'
            : interpretation
              ? 'No meaning available.'
              : 'Tap to seek the meaning.'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Pinned section label — stays fixed; the paragraph below scrolls natively. */}
      <div
        className="shrink-0 text-[9px] uppercase tracking-[0.18em] mb-2 text-center"
        style={{ color: gold, opacity: 0.8 }}
      >
        {label}
      </div>
      <div className="flex-1 min-h-0">
        <RevealText
          key={stage}
          text={text}
          active
          animate={animate}
          color={isAuthor ? textDim : textLight}
          onProgress={onProgress}
        />
      </div>
    </div>
  );
}
