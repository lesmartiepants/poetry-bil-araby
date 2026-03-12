export const THEME = {
  dark: {
    bg: 'bg-[#0c0c0e]',
    text: 'text-stone-200',
    accent: 'text-indigo-400',
    glass: 'bg-stone-900/60',
    border: 'border-stone-800',
    shadow: 'shadow-black/60',
    pill: 'bg-stone-900/40 border-stone-700/50',
    glow: 'from-indigo-600/30 via-purple-600/15 to-transparent',
    brand: 'text-indigo-400',
    brandBg: 'bg-indigo-500/10',
    brandBorder: 'border-indigo-500/20',
    btnPrimary: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40',
    titleColor: 'text-[#C5A059]', // Antique Gold
    poetColor: 'text-[#C5A059]', // Unified Gold
    controlIcon: 'text-stone-300 hover:text-white',
    gold: '#C5A059', // Raw gold hex for inline styles & template literals
    goldText: 'text-[#C5A059]', // Tailwind gold text
    goldHoverBg: 'hover:bg-[#C5A059]/12', // Gold hover background (buttons)
    goldHoverBg15: 'hover:bg-[#C5A059]/15', // Gold hover background (sidebar)
    goldActiveBg: 'bg-[#C5A059]/15', // Gold active/selected background
    goldBorder: 'border-[#C5A059]', // Gold solid border (selected state)
    goldBorderMuted: 'border-[#C5A059]/20', // Gold muted border (dividers)
    goldBorderSubtle: 'border-[#C5A059]/30', // Gold subtle border (hover)
    goldHoverBorderSubtle: 'hover:border-[#C5A059]/30', // Gold hover border
    goldBorderAccent: 'border-[#C5A059]/40', // Gold border accent (sidebar edges)
    goldBorderStrong: 'border-[#C5A059]/70', // Gold border strong (hover state)
    goldHoverBorderStrong: 'hover:border-[#C5A059]/70', // Gold hover border strong
    goldBg10: 'bg-[#C5A059]/10', // Gold background 10% (selected items)
    goldBg20: 'border-[#C5A059]/20', // Gold background 20% (badge border)
    goldTextMuted: 'text-[#C5A059]/60', // Gold muted text
    error: 'text-red-400', // Error text
    errorBg: 'bg-red-600/80', // Error background (bug report button)
    debug: 'bg-black/60 border-stone-800 text-stone-300', // Debug panel
    debugInput: 'bg-stone-900/80 border-stone-700 text-stone-200 placeholder:text-stone-500', // Debug input
    debugDivider: 'border-stone-700', // Debug panel divider
    kbd: 'bg-stone-800 text-stone-300 border-stone-700', // Keyboard shortcut keys
  },
  light: {
    bg: 'bg-[#FDFCF8]',
    text: 'text-stone-800',
    accent: 'text-indigo-600',
    glass: 'bg-white/70',
    border: 'border-white/80',
    shadow: 'shadow-indigo-100/50',
    pill: 'bg-white/40 border-white/60',
    glow: 'from-indigo-500/15 via-purple-500/10 to-transparent',
    brand: 'text-indigo-600',
    brandBg: 'bg-indigo-500/5',
    brandBorder: 'border-indigo-500/10',
    btnPrimary: 'bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-indigo-200',
    titleColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    poetColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    controlIcon: 'text-indigo-950/90 hover:text-black',
    gold: '#8B7355', // Raw gold hex for inline styles & template literals
    goldText: 'text-[#8B7355]', // Tailwind gold text
    goldHoverBg: 'hover:bg-[#8B7355]/12', // Gold hover background (buttons)
    goldHoverBg15: 'hover:bg-[#8B7355]/15', // Gold hover background (sidebar)
    goldActiveBg: 'bg-[#8B7355]/15', // Gold active/selected background
    goldBorder: 'border-[#8B7355]', // Gold solid border (selected state)
    goldBorderMuted: 'border-[#8B7355]/20', // Gold muted border (dividers)
    goldBorderSubtle: 'border-[#8B7355]/30', // Gold subtle border (hover)
    goldHoverBorderSubtle: 'hover:border-[#8B7355]/30', // Gold hover border
    goldBorderAccent: 'border-[#8B7355]/40', // Gold border accent (sidebar edges)
    goldBorderStrong: 'border-[#8B7355]/70', // Gold border strong (hover state)
    goldHoverBorderStrong: 'hover:border-[#8B7355]/70', // Gold hover border strong
    goldBg10: 'bg-[#8B7355]/10', // Gold background 10% (selected items)
    goldBg20: 'border-[#8B7355]/20', // Gold background 20% (badge border)
    goldTextMuted: 'text-[#8B7355]/60', // Gold muted text
    error: 'text-red-400', // Error text (same in light for visibility)
    errorBg: 'bg-red-600/80', // Error background (bug report button)
    debug: 'bg-white/60 border-stone-200 text-stone-700', // Debug panel
    debugInput: 'bg-white/80 border-stone-300 text-stone-800 placeholder:text-stone-400', // Debug input
    debugDivider: 'border-stone-300', // Debug panel divider
    kbd: 'bg-stone-200 text-stone-700 border-stone-300', // Keyboard shortcut keys
  },
};

// Convenience alias: many UI elements (control bar, dropdowns, badges) always use
// the dark-mode gold regardless of current theme.
export const GOLD = THEME.dark;
