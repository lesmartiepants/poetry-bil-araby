import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  THREE SPLASH SCREEN MOCKUPS
  =============================================================================*/

// Shared logo component matching main app header
const Logo = ({ theme, darkMode, onToggleTheme }) => (
  <div className="flex flex-col items-center gap-4 relative">
    {/* Theme toggle - top right */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${theme.glass} ${theme.border} border backdrop-blur-xl shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className={theme.brand} /> : <Moon size={20} className={theme.brand} />}
    </button>

    <PenTool size={56} className={`${theme.brand} opacity-90`} strokeWidth={1.5} />
    <div className={`flex flex-col items-center gap-2 ${theme.brand} tracking-wide`}>
      <span className="font-brand-en text-6xl md:text-7xl lowercase tracking-tighter font-semibold">poetry</span>
      <span className="font-amiri text-2xl md:text-3xl opacity-70">بالعربي</span>
    </div>
  </div>
);

/* =============================================================================
  MOCKUP 1: MODERN DESIGNER
  Contemporary, bold, gradient-rich, dynamic
  =============================================================================*/

export const SplashModern = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg} overflow-hidden`}>
    {/* Dynamic gradient background */}
    <div className="absolute inset-0 opacity-30">
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-radial from-indigo-500/40 via-purple-500/20 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-radial from-purple-500/40 via-indigo-500/20 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
    </div>

    {/* Content */}
    <div className="relative z-10 flex flex-col items-center justify-center gap-10 px-6 max-w-2xl mx-auto text-center">
      <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

      {/* Tagline - Bold & Contemporary */}
      <div className={`space-y-3 ${theme.text}`}>
        <h2 className="font-brand-en text-3xl md:text-4xl font-bold leading-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Timeless Arabic Poetry
        </h2>
        <p className="font-brand-en text-lg md:text-xl opacity-70 leading-relaxed">
          Experience centuries of poetic mastery
        </p>
        <p className="font-amiri text-sm opacity-40">شعر عربي خالد</p>
      </div>

      {/* Bold CTA */}
      <button
        onClick={onGetStarted}
        className="group relative overflow-hidden px-12 py-5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-size-200 bg-pos-0 hover:bg-pos-100 text-white rounded-2xl shadow-2xl shadow-indigo-500/30 transition-all duration-500 hover:scale-105 hover:shadow-indigo-500/50"
      >
        <span className="font-brand-en text-xl font-bold">Begin Your Journey</span>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
      </button>

      {/* Feature highlights - Modern cards */}
      <div className="grid grid-cols-3 gap-4 mt-4 w-full max-w-xl">
        {['Discover', 'Listen', 'Learn'].map((feature, i) => (
          <div key={feature} className={`p-4 ${theme.glass} ${theme.border} border backdrop-blur-xl rounded-xl hover:scale-105 transition-all`}>
            <p className="font-brand-en text-sm font-semibold">{feature}</p>
          </div>
        ))}
      </div>
    </div>

    <style jsx>{`
      .bg-size-200 { background-size: 200% 100%; }
      .bg-pos-0 { background-position: 0% 50%; }
      .bg-pos-100 { background-position: 100% 50%; }
    `}</style>
  </div>
);

/* =============================================================================
  MOCKUP 2: MINIMALIST
  Ultra-clean, maximum white space, subtle
  =============================================================================*/

export const SplashMinimalist = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg}`}>
    {/* Minimal content */}
    <div className="flex flex-col items-center justify-center gap-16 px-6 max-w-xl mx-auto text-center">
      <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

      {/* Minimal tagline */}
      <div className={`space-y-4 ${theme.text}`}>
        <h2 className="font-brand-en text-2xl md:text-3xl font-light tracking-wide opacity-90">
          Arabic Poetry
        </h2>
        <p className="font-amiri text-base opacity-40">شعر عربي</p>
      </div>

      {/* Minimal CTA */}
      <button
        onClick={onGetStarted}
        className={`group px-10 py-4 border-2 ${theme.border} rounded-full hover:${theme.bg === 'bg-[#0c0c0e]' ? 'bg-white text-black' : 'bg-black text-white'} transition-all duration-300 font-brand-en text-base tracking-wider`}
      >
        Enter
      </button>

      {/* Minimal dots */}
      <div className="flex gap-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className={`w-1.5 h-1.5 rounded-full ${theme.brand} opacity-30`} />
        ))}
      </div>
    </div>
  </div>
);

/* =============================================================================
  MOCKUP 3: ARABIAN DESIGN MASTER
  Traditional patterns, ornate, rich colors, arabesque
  =============================================================================*/

export const SplashArabian = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg} overflow-hidden`}>
    {/* Islamic geometric background */}
    <div className="absolute inset-0 opacity-[0.04]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 L60 30 L80 30 L65 43 L70 63 L50 50 L30 63 L35 43 L20 30 L40 30 Z' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='35' fill='none' stroke='%23C5A059' stroke-width='0.5' stroke-dasharray='2,3'/%3E%3Cpath d='M50 15 Q65 50 50 85 Q35 50 50 15' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px'
    }} />

    {/* Ornate frame */}
    <div className={`relative max-w-3xl mx-6 p-12 md:p-16 ${theme.glass} ${theme.border} border-2 backdrop-blur-xl rounded-3xl shadow-2xl`}>
      {/* Arabesque corners */}
      {[
        'top-0 left-0',
        'top-0 right-0 scale-x-[-1]',
        'bottom-0 left-0 scale-y-[-1]',
        'bottom-0 right-0 scale-[-1]'
      ].map((position, i) => (
        <div key={i} className={`absolute ${position} w-24 h-24 pointer-events-none opacity-20`}>
          <svg viewBox="0 0 100 100" className={theme.brand}>
            <path d="M10 10 Q10 5 15 5 L35 5 Q40 5 40 10 L40 30 Q40 35 35 35 L15 35 Q10 35 10 30 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="25" cy="20" r="5" fill="currentColor" opacity="0.3" />
            <path d="M15 20 Q20 15 25 20 Q30 25 35 20" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center relative z-10">
        <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

        {/* Ornate divider */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className={`flex-1 h-px bg-gradient-to-r from-transparent via-${darkMode ? 'amber' : 'yellow'}-600/30 to-transparent`} />
          <svg width="24" height="24" viewBox="0 0 24 24" className={`${darkMode ? 'text-amber-600' : 'text-yellow-700'} opacity-60`}>
            <path d="M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z" fill="currentColor" />
          </svg>
          <div className={`flex-1 h-px bg-gradient-to-r from-transparent via-${darkMode ? 'amber' : 'yellow'}-600/30 to-transparent`} />
        </div>

        {/* Poetic tagline */}
        <div className={`space-y-4 ${theme.text}`}>
          <h2 className={`font-brand-en text-2xl md:text-3xl font-serif italic ${darkMode ? 'text-amber-200' : 'text-yellow-900'} leading-relaxed`}>
            Where Ancient Verses Come Alive
          </h2>
          <p className="font-amiri text-xl leading-[2] opacity-70">
            حيث تنبض الأبيات بالحياة
          </p>
        </div>

        {/* Ornate CTA */}
        <button
          onClick={onGetStarted}
          className={`group relative px-12 py-5 border-2 ${darkMode ? 'border-amber-600/50 hover:bg-amber-600/20' : 'border-yellow-700/50 hover:bg-yellow-700/20'} rounded-xl transition-all duration-300 overflow-hidden`}
        >
          <span className="font-brand-en text-lg font-semibold relative z-10">Enter the Diwan</span>
          <span className="font-amiri text-sm opacity-60 relative z-10 mr-2">ادخل الديوان</span>
          <div className={`absolute inset-0 bg-gradient-to-r ${darkMode ? 'from-amber-600/0 via-amber-600/10 to-amber-600/0' : 'from-yellow-700/0 via-yellow-700/10 to-yellow-700/0'} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700`} />
        </button>

        {/* Decorative bottom */}
        <div className="flex items-center gap-3 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`w-2 h-2 rotate-45 ${darkMode ? 'bg-amber-600/30' : 'bg-yellow-700/30'} ${i === 2 ? 'scale-150' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
