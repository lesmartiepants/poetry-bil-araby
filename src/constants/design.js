export const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-2 pb-1',
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
// Single source of truth for بالعربي + poetry + feather rendering.
// Used by: main header, splash desert phase. (Kinetic splash has its own animations.)
export const BRAND = {
  arabic: {
    fontFamily: "'Reem Kufi', sans-serif",
    fontWeight: 700,
    fontSize: 'clamp(3rem, 6vw, 4.5rem)',
    lineHeight: 1,
  },
  english: {
    fontFamily: "'Forum', serif",
    fontSize: 'clamp(2.86rem, 5.72vw, 4.4rem)', // 10% larger than previous 2.6/5.2/4
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  feather: {
    width: 'clamp(24px, 4vw, 36px)',
    height: 'clamp(24px, 4vw, 36px)',
    opacity: 0.8,
  },
};
