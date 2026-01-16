import React, { useState } from 'react';
import { SplashZen } from './splash-zen.jsx';

/* =============================================================================
  PREVIEW COMPONENT FOR ZEN SPLASH SCREEN

  Usage:
  1. Import this in app.jsx temporarily
  2. Navigate to /preview-zen route
  3. Test dark/light modes and interactions
  =============================================================================*/

const THEME = {
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
    titleColor: 'text-[#C5A059]',
    poetColor: 'text-[#C5A059]',
    controlIcon: 'text-stone-300 hover:text-white'
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
    titleColor: 'text-[#8B7355]',
    poetColor: 'text-[#8B7355]',
    controlIcon: 'text-indigo-950/90 hover:text-black'
  }
};

export const PreviewZen = () => {
  const [darkMode, setDarkMode] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const theme = darkMode ? THEME.dark : THEME.light;

  const handleGetStarted = () => {
    setShowSplash(false);
  };

  const handleToggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleReset = () => {
    setShowSplash(true);
  };

  if (!showSplash) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text}`}>
        <div className="text-center space-y-6">
          <h1 className="text-4xl font-bold">Zen Splash Preview</h1>
          <p className="text-lg opacity-70">Splash screen dismissed successfully!</p>
          <button
            onClick={handleReset}
            className={`px-8 py-3 ${theme.btnPrimary} rounded-xl transition-all hover:scale-105`}
          >
            Reset & Preview Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <SplashZen
      onGetStarted={handleGetStarted}
      darkMode={darkMode}
      theme={theme}
      onToggleTheme={handleToggleTheme}
    />
  );
};
