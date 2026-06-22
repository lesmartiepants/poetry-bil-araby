import { memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSplitTextReveal } from '../../hooks/useSplitTextReveal.js';
import { transliterate } from '../../utils/transliterate.js';
import { DESIGN, POEM_META } from '../../constants/index.js';

/**
 * StanzaReveal — renders one stanza (up to 4 verse pairs) with a tap-triggered bloom.
 *
 * When `active` flips to true for the first time, the reveal animation plays.
 * With `revealStyle === 'aurora'` (default), a word-by-word blur-up cascade plays via
 * GSAP SplitText.  With `revealStyle === 'simple'`, a plain framer-motion fade-up is
 * used instead (no GSAP, lighter on low-end devices).
 * Subsequent renders (translation/font changes) stay visible without re-animating.
 *
 * Props:
 *   pairs         {Array<{ar, en}>}  — verse pairs for this stanza
 *   active        {boolean}          — whether this stanza should be visible
 *   darkMode      {boolean}
 *   showTranslation     {boolean}
 *   showTransliteration {boolean}
 *   textScale     {number}           — multiplier from TEXT_SIZES
 *   currentFontClass {string}        — CSS class for Arabic font
 *   revealStyle   {string}           — 'aurora' | 'simple'
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
  revealStyle = 'aurora',
  'data-testid': testId,
}) {
  const { containerRef } = useSplitTextReveal(active, {
    skip: revealStyle !== 'aurora',
    // Use aurora bloom defaults: stagger 0.05, duration 0.7, lineDelay 0.15
  });

  // Outer wrapper ref — applies CSS opacity directly so inactive stanzas are always
  // hidden regardless of framer-motion behaviour (framer may skip opacity:0 when
  // initial === animate target, leaving the element visible at default opacity:1).
  const wrapperRef = useRef(null);
  useEffect(() => {
    if (!wrapperRef.current) return;
    wrapperRef.current.style.opacity = active ? '' : '0';
    wrapperRef.current.style.pointerEvents = active ? '' : 'none';
  }, [active]);

  const verses = (
    <>
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
    </>
  );

  return (
    // Outer div — starts hidden via inline style; useEffect syncs CSS on active change.
    <div
      ref={wrapperRef}
      data-testid={testId}
      aria-hidden={!active}
      style={{ opacity: active ? undefined : 0, pointerEvents: active ? undefined : 'none' }}
      className="flex flex-col gap-5 md:gap-7"
    >
      {revealStyle === 'aurora' ? (
        // Aurora: GSAP drives word-level blur-up; inner div is the GSAP scope container
        <div ref={containerRef} className="flex flex-col gap-5 md:gap-7">
          {verses}
        </div>
      ) : (
        // Simple: framer-motion fade-up on the whole stanza
        <motion.div
          ref={containerRef}
          initial={{ opacity: 0, y: 12 }}
          animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col gap-5 md:gap-7"
        >
          {verses}
        </motion.div>
      )}
    </div>
  );
});

export default StanzaReveal;
