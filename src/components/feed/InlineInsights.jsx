import RevealText from './RevealText.jsx';

/**
 * Which section the reader is in. Lives here rather than in PoemReader because this is the
 * component the sections belong to, but PoemReader renders the label (as the header's kicker),
 * so the mapping has to be shared rather than written out in both files.
 */
export const INSIGHT_LABELS = {
  meaning: 'The Meaning',
  author: 'About the Author',
};

/**
 * InlineInsights — presentational end-of-poem insight, driven by `stage` from PoemReader.
 *
 * The tap rhythm lives in the parent: tap "for meaning" → 'meaning' (The Meaning / depth), tap
 * "for the poet" → 'author' (About the Author / bio). One section shows at a time; its paragraph
 * reveals word-by-word via RevealText, which scrolls natively.
 *
 * This renders the BODY ONLY. The section label moved up into PoemReader's insight header, where
 * it sits as a kicker above the poem's title: it was previously rendered here, directly beneath
 * that header, where it read as orphaned and collided with the byline. Rendering it in the header
 * also means it survives the loading and empty states, which this component returns early for —
 * so "which section am I in" no longer disappears exactly when the answer is least obvious.
 * The poet's name is NOT repeated here either; it already lives in that header.
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
