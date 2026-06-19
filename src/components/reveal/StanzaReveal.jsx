import { memo } from 'react';
import { motion } from 'framer-motion';
import { useSplitTextReveal } from '../../hooks/useSplitTextReveal.js';
import { transliterate } from '../../utils/transliterate.js';
import { DESIGN, POEM_META } from '../../constants/index.js';

/**
 * StanzaReveal — renders one stanza (up to 4 verse pairs) with a tap-triggered bloom.
 *
 * When `active` flips to true for the first time, a word-by-word blur-up cascade plays
 * via GSAP SplitText.  Subsequent renders (translation/font changes) stay visible without
 * re-animating.
 *
 * Props:
 *   pairs         {Array<{ar, en}>}  — verse pairs for this stanza
 *   active        {boolean}          — whether this stanza should be visible
 *   darkMode      {boolean}
 *   showTranslation     {boolean}
 *   showTransliteration {boolean}
 *   textScale     {number}           — multiplier from TEXT_SIZES
 *   currentFontClass {string}        — CSS class for Arabic font
 *   data-testid   {string}           — forwarded to outer div
 */
const StanzaReveal = memo(function StanzaReveal({
  pairs = [],
  active = false,
  darkMode = true,
  showTranslation = true,
  showTransliteration = false,
  textScale = 1,
  currentFontClass = 'font-amiri',
  'data-testid': testId,
}) {
  const { containerRef } = useSplitTextReveal(active, {
    stagger: 0.035,
    duration: 0.5,
  });

  return (
    <motion.div
      ref={containerRef}
      data-testid={testId}
      initial={{ opacity: 0 }}
      animate={active ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex flex-col gap-5 md:gap-7 ${active ? '' : 'pointer-events-none'}`}
      aria-hidden={!active}
    >
      {pairs.map((pair, idx) => (
        <div key={idx} className="flex flex-col gap-0.5">
          {/* Arabic verse — mark for SplitText targeting */}
          <p
            dir="rtl"
            data-split-target
            className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
            style={{
              fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})`,
            }}
          >
            {pair.ar}
          </p>

          {/* Transliteration (optional) */}
          {showTransliteration && pair.ar && (
            <p
              dir="ltr"
              className={`font-brand-en opacity-50 ${DESIGN.anim}`}
              style={{
                fontSize: `calc(${POEM_META.verseTranslitSize} * ${textScale})`,
              }}
            >
              {transliterate(pair.ar)}
            </p>
          )}

          {/* English translation (optional) */}
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
    </motion.div>
  );
});

export default StanzaReveal;
