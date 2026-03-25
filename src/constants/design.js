export const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-4 pb-2',
  mainTagSize: 'text-[11px]',
  mainTitleSize: 'text-[clamp(1.875rem,3.5vw,2.25rem)]', // 30px-36px (updated from text-3xl md:text-4xl)
  mainSubtitleSize: 'text-[clamp(10px,1.2vw,14px)]', // 10px-14px (updated from text-sm)
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-[clamp(1rem,1.8vw,1.125rem)]', // 16px-18px for insight panel
  glass: 'backdrop-blur-3xl backdrop-saturate-150',
  radius: 'rounded-2xl',
  anim: 'transition-all duration-300 ease-in-out',
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
    width: 'clamp(24px, 4vw, 36px)',
    height: 'clamp(24px, 4vw, 36px)',
    opacity: 0.8,
  },
};

// Subtle corner wordmark for the main app header (top-right, non-competing)
export const BRAND_HEADER = {
  arabic: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: '14px',
    lineHeight: 1,
  },
  english: {
    fontFamily: "'Forum', serif",
    fontSize: '14px',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  },
  feather: {
    width: '12px',
    height: '12px',
    opacity: 0.75,
  },
  containerOpacity: 0.58,
};
