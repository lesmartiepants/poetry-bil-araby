import { Loader2, Sparkles } from 'lucide-react';
import { DESIGN, GOLD, COLORS } from '../constants/index.js';
import { transliterate } from '../utils/transliterate.js';

/**
 * Displays the current poem: ornamental frame, title/poet header,
 * verse pairs with optional transliteration/translation, genre tags,
 * and the mobile-only inline interpretation panel.
 *
 * @param {object}        props
 * @param {object|null}   props.current           - Currently displayed poem object
 * @param {Array}         props.versePairs         - [{ar, en}] pairs pre-computed in parent
 * @param {object|null}   props.insightParts       - Parsed insight ({ depth, author, poeticTranslation })
 * @param {boolean}       props.isInterpreting     - Whether analysis request is in flight
 * @param {string|null}   props.interpretation     - Raw interpretation text
 * @param {boolean}       props.showTransliteration
 * @param {boolean}       props.showTranslation
 * @param {boolean}       props.darkMode
 * @param {object}        props.theme              - Theme tokens
 * @param {string}        props.currentFontClass   - Tailwind font family class
 * @param {number}        props.textScale          - Multiplier for font size
 */
export default function PoemCard({
  current,
  versePairs,
  insightParts,
  isInterpreting,
  interpretation,
  showTransliteration,
  showTranslation,
  darkMode,
  theme,
  currentFontClass,
  textScale,
}) {
  return (
    <div className="w-full max-w-4xl flex flex-col items-center">
      {/* Ornamental frame + poem title/poet */}
      <div
        className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}
      >
        <div className="minimal-frame mb-1">
          <svg viewBox="0 0 550 120" preserveAspectRatio="xMidYMid meet">
            <line className="frame-line" x1="20" y1="20" x2="70" y2="20" />
            <line className="frame-line" x1="20" y1="20" x2="20" y2="70" />
            <line className="frame-line" x1="530" y1="20" x2="480" y2="20" />
            <line className="frame-line" x1="530" y1="20" x2="530" y2="70" />
            <line className="frame-line" x1="20" y1="100" x2="70" y2="100" />
            <line className="frame-line" x1="20" y1="100" x2="20" y2="50" />
            <line className="frame-line" x1="530" y1="100" x2="480" y2="100" />
            <line className="frame-line" x1="530" y1="100" x2="530" y2="50" />
            <circle
              className="frame-line"
              cx="32"
              cy="32"
              r="2.5"
              fill={GOLD.gold}
              opacity="0.35"
            />
            <circle
              className="frame-line"
              cx="518"
              cy="32"
              r="2.5"
              fill={GOLD.gold}
              opacity="0.35"
            />
            <circle
              className="frame-line"
              cx="32"
              cy="88"
              r="2.5"
              fill={GOLD.gold}
              opacity="0.35"
            />
            <circle
              className="frame-line"
              cx="518"
              cy="88"
              r="2.5"
              fill={GOLD.gold}
              opacity="0.35"
            />
          </svg>

          <div
            className="relative z-10 flex flex-col items-center justify-center w-full"
            dir="rtl"
          >
            <div
              className="font-amiri font-bold text-center"
              style={{
                fontSize: 'clamp(1.4rem, 4vw, 2.25rem)',
                color: 'var(--gold)',
                lineHeight: 1.4,
                textShadow: darkMode ? COLORS.gold.glowShadow15 : 'none',
              }}
            >
              {current?.titleArabic || current?.title}
            </div>
            <div
              style={{
                width: '40px',
                height: '1px',
                background: 'var(--gold)',
                opacity: 0.5,
                margin: '0.5rem auto',
              }}
            />
            <div
              className="font-tajawal text-center"
              style={{
                fontSize: 'clamp(0.8rem, 2vw, 1rem)',
                color: theme.poetCardColor,
                lineHeight: 1.4,
              }}
            >
              {current?.poetArabic || current?.poet}
            </div>
            {(current?.poet !== current?.poetArabic ||
              current?.title !== current?.titleArabic) && (
              <div
                className="font-brand-en text-center italic"
                dir="ltr"
                style={{
                  fontSize: 'clamp(0.7rem, 1.3vw, 0.8rem)',
                  color: theme.subtitleCardColor,
                  marginTop: '0.5rem',
                }}
              >
                {current?.title !== current?.titleArabic && <span>{current.title}</span>}
                {current?.title !== current?.titleArabic &&
                  current?.poet !== current?.poetArabic && (
                    <span className="opacity-40"> — </span>
                  )}
                {current?.poet !== current?.poetArabic && <span>{current.poet}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verse pairs */}
      <div className={`relative w-full group pt-1 pb-2 ${DESIGN.mainMarginBottom}`}>
        <div className="px-4 md:px-20 py-2 text-center">
          <div className="flex flex-col gap-5 md:gap-7">
            {versePairs.map((pair, idx) => (
              <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                <p
                  dir="rtl"
                  className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                  style={{ fontSize: `calc(clamp(1.25rem, 2vw, 1.5rem) * ${textScale})` }}
                >
                  {pair.ar}
                </p>
                {showTransliteration && pair.ar && (
                  <p
                    dir="ltr"
                    className={`font-brand-en italic opacity-30 ${DESIGN.anim}`}
                    style={{
                      fontSize: `calc(clamp(0.75rem, 1.2vw, 0.875rem) * ${textScale})`,
                    }}
                  >
                    {transliterate(pair.ar)}
                  </p>
                )}
                {showTranslation && pair.en && (
                  <p
                    dir="ltr"
                    className={`font-brand-en italic opacity-40 ${DESIGN.anim} mx-auto`}
                    style={{
                      fontSize: `calc(clamp(1rem, 1.5vw, 1.125rem) * ${textScale})`,
                      maxWidth: '90%',
                    }}
                  >
                    {pair.en}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Genre tags */}
      <div className="flex justify-center gap-3 mt-2 mb-4">
        {Array.isArray(current?.tags) &&
          current.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}
            >
              {tag}
            </span>
          ))}
      </div>

      {/* Mobile-only inline interpretation */}
      <div className="w-full max-w-2xl px-6 md:px-0 mb-4 md:hidden">
        {isInterpreting ? (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="relative">
              <Loader2 className="animate-spin text-indigo-500" size={32} />
              <Sparkles
                className="absolute inset-0 m-auto animate-pulse text-indigo-400"
                size={16}
              />
            </div>
            <p className="text-xs italic font-brand-en opacity-60 tracking-widest uppercase">
              Consulting the Diwan...
            </p>
          </div>
        ) : interpretation ? (
          <div className="flex flex-col gap-10 animate-in slide-in-from-bottom-10 duration-1000">
            <div className="pt-6 border-t border-indigo-500/10">
              <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                The Depth
              </h4>
              <div className="pl-4 border-l border-indigo-500/10">
                <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                  {insightParts?.depth}
                </p>
              </div>
            </div>
            <div className="pt-6 border-t border-indigo-500/10">
              <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                The Author
              </h4>
              <div className="pl-4 border-l border-indigo-500/10">
                <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                  {insightParts?.author}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
