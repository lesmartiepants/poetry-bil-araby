import { DESIGN, GOLD } from '../constants/index.js';
import { transliterate } from '../utils/transliterate.js';

/**
 * Displays the current poem: ornamental frame, title/poet header,
 * verse pairs with optional transliteration/translation, genre tags,
 * and the mobile-only inline interpretation panel.
 *
 * @param {object}        props
 * @param {object|null}   props.current           - Currently displayed poem object
 * @param {Array}         props.versePairs         - [{ar, en}] pairs pre-computed in parent
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
                textShadow: darkMode ? '0 0 30px rgba(197,160,89,0.15)' : 'none',
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
                color: darkMode ? '#a8a29e' : '#57534e',
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
                  color: darkMode ? '#78716c' : '#a8a29e',
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

    </div>
  );
}
