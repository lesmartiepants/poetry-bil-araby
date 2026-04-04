import { forwardRef } from 'react';

/**
 * HighlightedVerse — renders a single Arabic verse as individually-addressable word spans.
 *
 * Props:
 *   text        {string}   Arabic verse text
 *   wordRefs    {React.RefObject[]}  One ref per word, pre-allocated by parent
 *   wordOffset  {number}   Index of the first word of this verse in the global allWords array
 *   verseIndex  {number}   Zero-based verse index (used for tts-line class)
 *   className   {string}   Additional classes (e.g. font, size)
 *   style       {object}   Inline styles
 *
 * The component adds:
 *   - `.tts-line` on the verse wrapper — used by focus-blur style
 *   - `.tts-word` on each word span — used by all word-level styles
 *   - `data-word-index` on each span — used by E2E tests to verify position
 */
const HighlightedVerse = forwardRef(function HighlightedVerse(
  { text, wordRefs, wordOffset, verseIndex, className, style },
  ref
) {
  const words = text ? text.split(/\s+/).filter(Boolean) : [];

  return (
    <p
      ref={ref}
      dir="rtl"
      data-verse-index={verseIndex}
      className={`tts-line ${className || ''}`}
      style={style}
    >
      {words.map((word, i) => {
        const globalIndex = wordOffset + i;
        return (
          <span
            key={i}
            ref={wordRefs[globalIndex]}
            className="tts-word"
            data-word-index={globalIndex}
          >
            {word}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        );
      })}
    </p>
  );
});

export default HighlightedVerse;
