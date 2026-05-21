export const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-4 pb-2',
  mainTagSize: 'text-[0.6875rem]',
  mainTitleSize: 'text-[clamp(1.875rem,3.5vw,2.25rem)]', // 30px-36px (updated from text-3xl md:text-4xl)
  mainSubtitleSize: 'text-[clamp(0.625rem,1.2vw,0.875rem)]', // 10px-14px (updated from text-sm)
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-[clamp(1rem,1.8vw,1.125rem)]', // 16px-18px for insight panel
  glass: 'backdrop-blur-3xl backdrop-saturate-150',
  radius: 'rounded-2xl',
  anim: 'transition-all duration-300 ease-in-out',
  animColors: 'transition-colors duration-300 ease-in-out',
  buttonHover: 'hover:scale-105 hover:shadow-lg transition-all duration-300',
  touchTarget: 'min-w-[44px] min-h-[44px]',
};

// ── Shared Brand Styles ──────────────────────────────────────────────────
// BRAND: Full-size branding used by splash screen (desert phase).
// BRAND_HEADER: Subtle corner wordmark used in the main app header.
export const BRAND = {
  arabic: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    lineHeight: 1,
  },
  english: {
    fontFamily: "'Forum', serif",
    fontSize: 'clamp(2.86rem, 5.72vw, 4.4rem)',
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  feather: {
    width: 'clamp(1.5rem, 4vw, 2.25rem)',
    height: 'clamp(1.5rem, 4vw, 2.25rem)',
    opacity: 0.8,
  },
};

// ── Poem Meta Typography ─────────────────────────────────────────────────
// Covers the 3-line attribution block (Arabic title → Arabic poet → English
// combined line) and the verse body base sizes.  Theme-aware colors are
// stored as { dark, light } sub-objects so callers do:
//   style={{ ...POEM_META.poet, color: darkMode ? POEM_META.poetColor.dark : POEM_META.poetColor.light }}
export const POEM_META = {
  // Line 1: Arabic poem title — Reem Kufi, dominant gold
  title: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(1.5rem, 4vw, 2.2rem)',
    lineHeight: 1.3,
    letterSpacing: '0.02em',
    color: 'var(--gold)',
  },
  titleShadow: {
    dark: '0 0 40px rgba(197,160,89,0.25), 0 0 12px rgba(197,160,89,0.1)',
    light: 'none',
  },

  // Line 2: Arabic poet name — Fustat, secondary warm
  poet: {
    fontFamily: "'Fustat', sans-serif",
    fontWeight: 500,
    fontSize: 'clamp(1.15rem, 2.5vw, 1.45rem)',
    lineHeight: 1.3,
    marginTop: '0.4rem',
  },
  poetColor: {
    dark: '#D4D0C8',
    light: '#6B5C3E',
  },

  // Hairline rule separating attribution from verse body
  separator: {
    width: '80%',
    maxWidth: '320px',
    height: '1px',
    background: 'linear-gradient(to right, transparent, rgba(201,168,76,0.2), transparent)',
    margin: '0.8rem auto 0',
  },

  // Line 3: English attribution — Bodoni Moda, warm cream
  englishLine: {
    fontFamily: "'Bodoni Moda', serif",
    fontStyle: 'normal',
    fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
    marginTop: '0.5rem',
    letterSpacing: '0.01em',
  },
  englishLineColor: {
    dark: 'rgba(212,200,168,0.88)',
    light: 'rgba(107,92,62,0.9)',
  },

  // Verse body base sizes — used as calc(size * textScale) in JSX
  verseArabicSize: 'clamp(1.4rem, 2.5vw, 1.75rem)',
  verseTranslitSize: 'clamp(0.75rem, 1.2vw, 0.875rem)',
  verseEnglishSize: 'clamp(1.1rem, 1.8vw, 1.25rem)',
};

// ── Shared Brand Styles ──────────────────────────────────────────────────
// Subtle corner wordmark for the main app header (top-right, non-competing)
export const BRAND_HEADER = {
  arabic: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: '0.875rem',
    lineHeight: 1,
  },
  english: {
    fontFamily: "'Forum', serif",
    fontSize: '0.875rem',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  feather: {
    width: '0.75rem',
    height: '0.75rem',
    opacity: 0.75,
  },
  containerOpacity: 0.58,
};
