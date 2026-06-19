import { memo, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StanzaReveal from '../reveal/StanzaReveal.jsx';
import HighlightedVerse from '../HighlightedVerse.jsx';
import { chunkStanzas } from '../../utils/chunkStanzas.js';
import { useStanzaReveal } from '../../hooks/useStanzaReveal.js';
import { DESIGN, POEM_META } from '../../constants/index.js';

/**
 * PoemReader — a single poem panel in the vertical feed.
 *
 * Shows up to 4 lines (a stanza) at a time; each tap reveals the next stanza.
 * When all stanzas are revealed the tap-hint "tap to continue" disappears.
 *
 * Props:
 *   poem          {Object}   — poem data: { id, arabic, english, ... }
 *   isActive      {boolean}  — true when this panel is the visible slide
 *   darkMode      {boolean}
 *   showTranslation     {boolean}
 *   showTransliteration {boolean}
 *   textScale     {number}
 *   currentFontClass {string}
 *   // TTS highlight props (forwarded from app.jsx when isActive)
 *   highlightStyle   {string}
 *   activeVersePairs {Array}
 *   wordRefs         {Array}
 *   wordOffsets      {Array}
 *   // Called on mount/poemId change so TTS can trigger revealAll()
 *   onRevealAllReady {Function}  — called with revealAll fn
 */
const PoemReader = memo(function PoemReader({
  poem,
  isActive = false,
  darkMode = true,
  showTranslation = true,
  showTransliteration = false,
  textScale = 1,
  currentFontClass = 'font-amiri',
  highlightStyle = 'none',
  activeVersePairs = [],
  wordRefs = [],
  wordOffsets = [],
  onRevealAllReady,
}) {
  // Build verse pairs from raw poem strings
  const versePairs = useMemo(() => {
    const arLines = poem?.arabic ? poem.arabic.split('\n') : [];
    const enLines = poem?.english ? poem.english.split('\n') : [];
    return arLines.map((ar, i) => ({ ar, en: enLines[i] || '' }));
  }, [poem]);

  const stanzas = useMemo(() => chunkStanzas(versePairs), [versePairs]);

  const { revealedCount, isAllRevealed, advance, revealAll } = useStanzaReveal(stanzas, poem?.id);

  // Register revealAll with parent (for TTS "Listen" path) whenever poemId or stanzas change.
  // revealAll is stable per poem (useCallback on poemId/total), so including it in deps is safe.
  useEffect(() => {
    if (onRevealAllReady) onRevealAllReady(revealAll);
  }, [poem?.id, stanzas.length, revealAll, onRevealAllReady]);

  // When TTS highlight is active, show all verses with word-level highlighting
  const useHighlight = isActive && highlightStyle !== 'none' && activeVersePairs.length > 0;

  const goldColor = darkMode ? '#c5a059' : '#8B6430';
  const firstReveal = revealedCount === 1 && stanzas.length > 1;

  return (
    <div
      className="flex flex-col items-center w-full h-full px-4 md:px-20 py-4 text-center overflow-y-auto"
      data-testid="poem-reader"
      data-poem-id={poem?.id}
    >
      <div className="w-full max-w-4xl">
        {/* Card box wrapping all poem content */}
        <div
          className="rounded-2xl px-6 py-6 md:px-10 md:py-8"
          style={{
            background: darkMode ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${darkMode ? 'rgba(197,160,89,0.15)' : 'rgba(139,100,48,0.12)'}`,
            boxShadow: darkMode
              ? '0 4px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)'
              : '0 4px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
          }}
        >
          {useHighlight ? (
            // TTS is playing — show all verses with word highlighting
            <div className={`flex flex-col gap-5 md:gap-7 tts-style-${highlightStyle}`}>
              {activeVersePairs.map((pair, idx) => (
                <div
                  key={`${poem?.id}-${idx}`}
                  className="flex flex-col gap-0.5 verse-fade-up"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <HighlightedVerse
                    text={pair.ar}
                    wordRefs={wordRefs}
                    wordOffset={wordOffsets[idx] ?? 0}
                    verseIndex={idx}
                    className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                    style={{ fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})` }}
                  />
                  {showTranslation && pair.en && (
                    <p
                      dir="ltr"
                      className="font-brand-en inline-fade-in mx-auto"
                      style={{
                        fontSize: `calc(${POEM_META.verseEnglishSize} * ${textScale} * 0.85)`,
                        maxWidth: '90%',
                        animationDelay: `${idx * 120}ms`,
                        color: darkMode ? 'rgba(231,229,228,0.72)' : 'rgba(28,25,23,0.68)',
                      }}
                    >
                      {pair.en}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // Normal tap-to-reveal mode
            <div
              className="flex flex-col gap-10"
              onClick={!isAllRevealed ? advance : undefined}
              role={!isAllRevealed ? 'button' : undefined}
              aria-label={!isAllRevealed ? 'Tap to reveal next stanza' : undefined}
              style={{ cursor: !isAllRevealed ? 'pointer' : 'default' }}
              data-testid="stanza-tap-area"
            >
              {stanzas.map((stanzaPairs, stanzaIdx) => (
                <StanzaReveal
                  key={`${poem?.id}-stanza-${stanzaIdx}`}
                  pairs={stanzaPairs}
                  active={stanzaIdx < revealedCount}
                  darkMode={darkMode}
                  showTranslation={showTranslation}
                  showTransliteration={showTransliteration}
                  textScale={textScale}
                  currentFontClass={currentFontClass}
                  data-testid={`stanza-${stanzaIdx}`}
                />
              ))}
            </div>
          )}

          {/* Stanza progress dots */}
          {stanzas.length > 1 && !useHighlight && (
            <div className="flex justify-center gap-2 mt-6" dir="ltr" aria-label="Stanza progress">
              {stanzas.map((_, i) => (
                <div
                  key={i}
                  aria-label={
                    i < revealedCount ? `Stanza ${i + 1} revealed` : `Stanza ${i + 1} hidden`
                  }
                  style={{
                    width: i < revealedCount ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background:
                      i < revealedCount
                        ? goldColor
                        : darkMode
                          ? 'rgba(197,160,89,0.25)'
                          : 'rgba(139,100,48,0.2)',
                    transition: 'all 0.3s ease',
                  }}
                />
              ))}
            </div>
          )}

          {/* Tap guidance — initial prompt before any tap, then "tap to continue" */}
          <AnimatePresence mode="wait">
            {!isAllRevealed && isActive && firstReveal ? (
              <motion.div
                key="tap-begin"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="flex flex-col items-center gap-1.5 mt-6"
                aria-hidden="true"
              >
                <motion.span
                  animate={{ scale: [1, 1.18, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ color: goldColor, fontSize: '1.1rem' }}
                >
                  ✦
                </motion.span>
                <span
                  className="font-brand-en text-xs tracking-widest uppercase"
                  style={{ color: goldColor, opacity: 0.75 }}
                >
                  tap to begin reading
                </span>
              </motion.div>
            ) : !isAllRevealed && isActive ? (
              <motion.div
                key="tap-continue"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 0.6, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.4, duration: 0.35 }}
                className="flex items-center justify-center gap-1.5 mt-5"
                aria-hidden="true"
              >
                <span
                  className="font-brand-en text-xs tracking-widest uppercase"
                  style={{ color: goldColor }}
                >
                  tap to continue ↓
                </span>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
        {/* end card box */}
      </div>
    </div>
  );
});

export default PoemReader;
