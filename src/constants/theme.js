export const THEME = {
  dark: {
    bg: 'bg-[#0c0c0e]',
    text: 'text-stone-200',
    accent: 'text-lapis-light',
    glass: 'bg-stone-950/10',
    border: 'border-white/[0.06]',
    shadow: 'shadow-black/60',
    pill: 'bg-stone-900/40 border-stone-700/50',
    glow: 'from-lapis/30 via-lapis-deep/15 to-transparent',
    brand: 'text-lapis-light',
    brandBg: 'bg-lapis/15',
    brandBgHover: 'hover:bg-lapis/15',
    brandBorder: 'border-lapis-light/30',
    btnPrimary: 'bg-lapis border border-lapis-light/40 text-white shadow-lapis/30',
    titleColor: 'text-gold',
    poetColor: 'text-gold',
    controlIcon: 'text-stone-300 hover:text-white',
    gold: 'var(--gold)',
    goldText: 'text-gold',
    goldHoverBg: 'hover:bg-gold/12',
    goldHoverBg15: 'hover:bg-gold/15',
    goldActiveBg: 'bg-gold/15',
    goldBorder: 'border-gold',
    goldBorderMuted: 'border-gold/20',
    goldBorderSubtle: 'border-gold/30',
    goldHoverBorderSubtle: 'hover:border-gold/30',
    goldBorderAccent: 'border-gold/40',
    goldBorderStrong: 'border-gold/70',
    goldHoverBorderStrong: 'hover:border-gold/70',
    goldBg10: 'bg-gold/10',
    goldBg20: 'border-gold/20',
    goldTextMuted: 'text-gold/60',
    sectionLabel: 'text-lapis-light',
    sectionBorder: 'border-lapis-light/20',
    sectionAccent: 'border-lapis-light/20',
    loadingIcon: 'text-lapis-light',
    selectionBg: 'selection:bg-lapis',
    error: 'text-red-400',
    errorBg: 'bg-red-600/80',
    debug: 'bg-black/60 border-stone-800 text-stone-300',
    debugInput: 'bg-stone-900/80 border-stone-700 text-stone-200 placeholder:text-stone-500',
    debugDivider: 'border-stone-700',
    kbd: 'bg-stone-800 text-stone-300 border-stone-700',

    // ── Inline style tokens (for style={{}} props) ─────────────────────
    brandHeaderTextColor: '#D4D0C8',
    poetCardColor: '#a8a29e',
    subtitleCardColor: '#78716c',
    searchInputTextColor: '#d6d3cd',
    fadeSolid: '#0c0c0e',
    fadeAlpha85: 'rgba(12,12,14,0.85)',
    fadeAlpha40: 'rgba(12,12,14,0.4)',
    insightDrawerBg:
      'linear-gradient(180deg, rgba(18,16,14,0.98) 0%, rgba(12,12,14,0.99) 100%)',
    authModalCardBg:
      'linear-gradient(145deg, rgba(20,18,15,0.97) 0%, rgba(12,12,14,0.98) 100%)',
    discoverDrawerBg:
      'linear-gradient(180deg, rgba(18,16,12,0.99) 0%, rgba(12,12,14,1) 100%)',
    textInline: 'rgba(214,211,205,0.9)',
    subTextInline: 'rgba(214,211,205,0.6)',
    subtleBorderInline: 'rgba(255,255,255,0.06)',
    cardBgInline: 'rgba(255,255,255,0.025)',
    stickyBgInline: 'rgba(18,16,12,0.97)',
  },
  light: {
    bg: 'bg-[#FDFCF8]',
    text: 'text-stone-800',
    accent: 'text-lapis',
    glass: 'bg-white/40',
    border: 'border-white/50',
    shadow: 'shadow-lapis/20',
    pill: 'bg-white/40 border-white/60',
    glow: 'from-lapis/20 via-lapis-deep/10 to-transparent',
    brand: 'text-lapis',
    brandBg: 'bg-lapis/10',
    brandBgHover: 'hover:bg-lapis/10',
    brandBorder: 'border-lapis-light/20',
    btnPrimary: 'bg-lapis border border-lapis-light/40 text-white shadow-lapis/20',
    titleColor: 'text-gold',
    poetColor: 'text-gold',
    controlIcon: 'text-stone-700 hover:text-black',
    gold: 'var(--gold)',
    goldText: 'text-gold',
    goldHoverBg: 'hover:bg-gold/12',
    goldHoverBg15: 'hover:bg-gold/15',
    goldActiveBg: 'bg-gold/15',
    goldBorder: 'border-gold',
    goldBorderMuted: 'border-gold/20',
    goldBorderSubtle: 'border-gold/30',
    goldHoverBorderSubtle: 'hover:border-gold/30',
    goldBorderAccent: 'border-gold/40',
    goldBorderStrong: 'border-gold/70',
    goldHoverBorderStrong: 'hover:border-gold/70',
    goldBg10: 'bg-gold/10',
    goldBg20: 'border-gold/20',
    goldTextMuted: 'text-gold/60',
    sectionLabel: 'text-lapis',
    sectionBorder: 'border-lapis/15',
    sectionAccent: 'border-lapis/15',
    loadingIcon: 'text-lapis',
    selectionBg: 'selection:bg-lapis',
    error: 'text-red-400',
    errorBg: 'bg-red-600/80',
    debug: 'bg-white/60 border-stone-200 text-stone-700',
    debugInput: 'bg-white/80 border-stone-300 text-stone-800 placeholder:text-stone-400',
    debugDivider: 'border-stone-300',
    kbd: 'bg-stone-200 text-stone-700 border-stone-300',

    // ── Inline style tokens (for style={{}} props) ─────────────────────
    brandHeaderTextColor: '#1A1614',
    poetCardColor: '#57534e',
    subtitleCardColor: '#a8a29e',
    searchInputTextColor: '#3c3531',
    fadeSolid: '#FDFCF8',
    fadeAlpha85: 'rgba(253,252,248,0.85)',
    fadeAlpha40: 'rgba(253,252,248,0.4)',
    insightDrawerBg:
      'linear-gradient(180deg, rgba(253,252,248,0.98) 0%, rgba(245,243,238,0.99) 100%)',
    authModalCardBg:
      'linear-gradient(145deg, rgba(253,252,248,0.97) 0%, rgba(245,243,238,0.98) 100%)',
    discoverDrawerBg:
      'linear-gradient(180deg, rgba(253,252,248,0.99) 0%, rgba(245,243,238,1) 100%)',
    textInline: 'rgba(40,35,30,0.9)',
    subTextInline: 'rgba(40,35,30,0.6)',
    subtleBorderInline: 'rgba(0,0,0,0.07)',
    cardBgInline: 'rgba(0,0,0,0.02)',
    stickyBgInline: 'rgba(253,252,248,0.97)',
  },
};

// Convenience alias: many UI elements (control bar, dropdowns, badges) always use
// the dark-mode gold regardless of current theme.  Destructuring avoids verbose
// `THEME.dark.*` references throughout the JSX.
export const GOLD = THEME.dark;

// ── Static color palette for inline styles ─────────────────────────────
// Non-theme-dependent color values used in style={{}} props.  Centralised
// here so no raw hex / rgba() values leak into component JSX.
export const COLORS = {
  // Gold (rgb 197,160,89) at graduated alpha levels
  gold: {
    alpha6: 'rgba(197,160,89,0.06)',
    alpha8: 'rgba(197,160,89,0.08)',
    alpha10: 'rgba(197,160,89,0.1)',
    alpha12: 'rgba(197,160,89,0.12)',
    alpha15: 'rgba(197,160,89,0.15)',
    alpha18: 'rgba(197,160,89,0.18)',
    alpha20: 'rgba(197,160,89,0.2)',
    alpha25: 'rgba(197,160,89,0.25)',
    alpha30: 'rgba(197,160,89,0.3)',
    alpha40: 'rgba(197,160,89,0.4)',
    alpha50: 'rgba(197,160,89,0.5)',
    alpha60: 'rgba(197,160,89,0.6)',
    dark: '#B8943E',
    foilText: '#2c1a04',
    foilTextShadow: '0 1px 2px rgba(255,248,180,0.5)',
    foilShadow:
      '0 2px 14px rgba(200,160,40,0.4), inset 0 1px 0 rgba(255,248,180,0.4), inset 0 -1px 0 rgba(0,0,0,0.10)',
    highlight: 'rgba(212,180,120,0.8)',
    glowShadow30: '0 0 30px rgba(197,160,89,0.3)',
    glowShadow15: '0 0 30px rgba(197,160,89,0.15)',
    accentGradient:
      'linear-gradient(90deg, transparent, rgba(197,160,89,0.6), rgba(212,180,120,0.8), rgba(197,160,89,0.6), transparent)',
    accentLine:
      'linear-gradient(90deg, transparent, rgba(197,160,89,0.3), transparent)',
    scrollbar: 'rgba(197,160,89,0.2) transparent',
    signInBtnBg:
      'linear-gradient(135deg, rgba(197,160,89,0.12) 0%, rgba(197,160,89,0.06) 100%)',
    signInBtnText: '#D4C8B0',
    avatarBg:
      'linear-gradient(135deg, rgba(197,160,89,0.25), rgba(197,160,89,0.15))',
    avatarBorder: '1.5px solid rgba(197,160,89,0.5)',
    badgeGradient: 'linear-gradient(135deg, var(--gold), #B8943E)',
    overlay:
      'radial-gradient(ellipse at center, rgba(197,160,89,0.08) 0%, rgba(0,0,0,0.7) 100%)',
    svgStroke: '%23C5A059',
    // Ember particle colors (GoldenFireIcon animation)
    ember1: 'rgba(197,160,89,1)',
    ember2: 'rgba(240,205,90,1)',
    ember3: 'rgba(255,225,100,0.9)',
    ember4: 'rgba(197,160,89,0.85)',
    ember5: 'rgba(255,210,80,0.8)',
  },

  // Ratchet Mode Easter-egg palette
  ratchet: {
    orange: '#f97316',
    glowGradient:
      'radial-gradient(ellipse at center, rgba(255,80,0,0.22) 0%, rgba(255,40,0,0.08) 60%, transparent 100%)',
    toastOnBg: 'linear-gradient(135deg, #ff5000, #ff9000)',
    toastOffBg: 'rgba(60,60,70,0.92)',
    activeGradient:
      'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(239,68,68,0.15))',
    activeBorder: 'rgba(249,115,22,0.5)',
  },

  // Error-boundary fallback (always renders dark)
  error: {
    bg: '#0c0c0e',
    text: '#e7e5e4',
    btnBg: '#6366f1',
    btnHover: '#4f46e5',
  },

  // Splash screen
  splash: {
    star: '#FFF',
    btnBorder: '#333333',
    btnHoverBorder: '#666666',
    btnHoverBg: 'rgba(255, 255, 255, 0.06)',
    btnText: '#ffffff',
    progressBar: 'rgba(255, 255, 255, 0.15)',
    kineticBg: '#000000',
    kineticSubtext: '#666666',
    kineticLabel: '#555555',
    kineticCount: '#888888',
    kineticHint: '#333333',
    desertNight: '#1A0F0A',
    sandMutedDark: 'rgba(232,213,183,0.5)',
    sandMutedLight: 'rgba(26,15,10,0.4)',
    dunesDark: ['#6B3720', '#5A2E1A', '#4A2516', '#3A1C12'],
    dunesLight: ['#D4B896', '#C8A880', '#BC9A6E', '#B08C5E'],
    bgGradientDark:
      'linear-gradient(180deg, #0D0A14 0%, #1A0F0A 40%, #3A1C12 100%)',
    bgGradientLight:
      'linear-gradient(180deg, #F5EDE0 0%, #EDE0CC 40%, #B08C5E 100%)',
  },

  white: '#fff',
  black: '#000',

  // Shared UI shadows
  controlBarShadow:
    'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
  toastShadow: '0 4px 24px rgba(0,0,0,0.4)',
  drawerShadow: '0 -20px 60px rgba(0,0,0,0.5)',
};
