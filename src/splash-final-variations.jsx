import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  FINAL SPLASH VARIATIONS
  - 4a: Refined 3a with main app indigo/purple colors
  - 4b: Solid + Islamic geometric pattern overlay (no glassmorphism)
  - 4c: Paper/parchment texture style
  All: Logo matches main app, theme toggle outside modal top-right, diamond corners
  =============================================================================*/

// Logo Component - EXACT format from main app
const Logo = ({ theme, darkMode }) => (
  <div className="flex flex-row-reverse items-center gap-4 tracking-wide" style={{ color: darkMode ? '#a5b4fc' : '#4f46e5' }}>
    <PenTool size={42} className="opacity-95" strokeWidth={1.5} />
    <h1 className="flex items-end gap-6">
      <span className="font-brand-ar text-5xl font-bold mb-2 opacity-80">بالعربي</span>
      <span className="font-brand-en text-7xl lowercase tracking-tighter">poetry</span>
      <span className="font-brand-en text-xs px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 uppercase tracking-wider mb-4 ml-3 opacity-60">beta</span>
    </h1>
  </div>
);

/* =============================================================================
  VARIATION 4a: Refined 3a with Main App Colors
  Clean modern fusion using indigo/purple/stone palette from main app
  =============================================================================*/

export const SplashArabian4a = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#0c0c0e]' : 'bg-[#FDFCF8]'} overflow-hidden`}>
    {/* Theme toggle - OUTSIDE modal, top right of screen */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${darkMode ? 'bg-stone-900/80' : 'bg-white/80'} ${darkMode ? 'border-stone-800' : 'border-stone-200'} border backdrop-blur-xl shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className="text-indigo-400" /> : <Moon size={20} className="text-indigo-600" />}
    </button>

    {/* Subtle geometric pattern */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40 Z' fill='none' stroke='%234f46e5' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='25' fill='none' stroke='%234f46e5' stroke-width='1'/%3E%3C/svg%3E")`,
      backgroundSize: '80px 80px'
    }} />

    {/* Clean frame */}
    <div className={`relative max-w-3xl mx-6 p-14 ${darkMode ? 'bg-stone-900/70' : 'bg-white/70'} backdrop-blur-xl border ${darkMode ? 'border-indigo-500/20' : 'border-indigo-400/20'} rounded-2xl shadow-2xl`}>
      {/* Diamond corner accents */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((position, i) => (
        <div key={i} className={`absolute ${position} w-3 h-3 ${darkMode ? 'bg-indigo-500/40' : 'bg-indigo-600/40'} rotate-45`} />
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center">
        <Logo theme={theme} darkMode={darkMode} />

        {/* Clean divider */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className={`flex-1 h-px ${darkMode ? 'bg-indigo-500/30' : 'bg-indigo-500/30'}`} />
          <div className={`w-2 h-2 ${darkMode ? 'bg-indigo-500' : 'bg-indigo-600'} rotate-45`} />
          <div className={`flex-1 h-px ${darkMode ? 'bg-indigo-500/30' : 'bg-indigo-500/30'}`} />
        </div>

        {/* Tagline - readable sizes */}
        <div className={`space-y-4 ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-light ${darkMode ? 'text-indigo-300' : 'text-indigo-800'} leading-relaxed tracking-wide`}>
            Poetry Through the Ages
          </h2>
          <p className="font-amiri text-lg opacity-70 leading-[2]">
            الشعر عبر العصور
          </p>
        </div>

        {/* Modern CTA */}
        <button
          onClick={onGetStarted}
          className={`group px-12 py-5 ${darkMode ? 'bg-indigo-500/20 border-2 border-indigo-500/40 hover:bg-indigo-500/30' : 'bg-indigo-50 border-2 border-indigo-400/50 hover:bg-indigo-100'} rounded-xl transition-all duration-300 font-brand-en text-lg font-medium`}
        >
          Begin Journey
        </button>

        {/* Minimal dots */}
        <div className="flex gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-indigo-500/40' : 'bg-indigo-600/40'}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 4b: Islamic Geometric Pattern Overlay (Solid, No Glassmorphism)
  Rich solid background with large geometric pattern
  =============================================================================*/

export const SplashArabian4b = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${darkMode ? 'bg-[#0a0e1a]' : 'bg-[#f5f3ef]'}`}>
    {/* Theme toggle - OUTSIDE, top right of screen */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${darkMode ? 'bg-stone-900/90' : 'bg-white/90'} ${darkMode ? 'border-indigo-700' : 'border-indigo-300'} border shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className="text-indigo-400" /> : <Moon size={20} className="text-indigo-600" />}
    </button>

    {/* Large Islamic geometric pattern overlay - inspired by mashrabiya screens */}
    <div className="absolute inset-0 opacity-[0.08]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3C!-- 8-pointed star pattern --%3E%3Cpath d='M60 10 L68 38 L96 38 L73 54 L81 82 L60 66 L39 82 L47 54 L24 38 L52 38 Z' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Ccircle cx='60' cy='60' r='45' fill='none' stroke='%234f46e5' stroke-width='1.5' stroke-dasharray='3,4'/%3E%3Ccircle cx='60' cy='60' r='30' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Cpath d='M60 15 L60 105 M15 60 L105 60' stroke='%234f46e5' stroke-width='1' opacity='0.4'/%3E%3Cpath d='M25 25 L95 95 M95 25 L25 95' stroke='%234f46e5' stroke-width='1' opacity='0.4'/%3E%3C!-- Corner stars --%3E%3Cpath d='M15 15 L18 22 L25 22 L20 26 L22 33 L15 28 L8 33 L10 26 L5 22 L12 22 Z' fill='%234f46e5' opacity='0.3'/%3E%3Cpath d='M105 15 L108 22 L115 22 L110 26 L112 33 L105 28 L98 33 L100 26 L95 22 L102 22 Z' fill='%234f46e5' opacity='0.3'/%3E%3Cpath d='M15 105 L18 112 L25 112 L20 116 L22 123 L15 118 L8 123 L10 116 L5 112 L12 112 Z' fill='%234f46e5' opacity='0.3'/%3E%3Cpath d='M105 105 L108 112 L115 112 L110 116 L112 123 L105 118 L98 123 L100 116 L95 112 L102 112 Z' fill='%234f46e5' opacity='0.3'/%3E%3C/svg%3E")`,
      backgroundSize: '120px 120px'
    }} />

    {/* Solid content frame - NO glassmorphism */}
    <div className={`relative max-w-3xl mx-6 p-16 ${darkMode ? 'bg-[#1a1f2e]' : 'bg-white'} border-2 ${darkMode ? 'border-indigo-600/40' : 'border-indigo-400/40'} rounded-2xl shadow-2xl`}>
      {/* Diamond corners */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((position, i) => (
        <div key={i} className={`absolute ${position} w-3 h-3 ${darkMode ? 'bg-indigo-500/60' : 'bg-indigo-600/60'} rotate-45`} />
      ))}

      {/* Inner decorative border */}
      <div className={`absolute inset-3 border ${darkMode ? 'border-indigo-500/15' : 'border-indigo-400/15'} rounded-xl pointer-events-none`} />

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center relative z-10">
        <Logo theme={theme} darkMode={darkMode} />

        {/* Geometric divider */}
        <div className="flex items-center gap-3 w-full max-w-lg">
          <div className={`flex-1 h-[1.5px] bg-gradient-to-r from-transparent ${darkMode ? 'via-indigo-500/50' : 'via-indigo-600/50'} to-transparent`} />
          <svg width="32" height="32" viewBox="0 0 32 32" className={`${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            <path d="M16 4 L19 12 L27 12 L21 17 L23 25 L16 20 L9 25 L11 17 L5 12 L13 12 Z" fill="currentColor" opacity="0.7" />
            <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
          </svg>
          <div className={`flex-1 h-[1.5px] bg-gradient-to-r from-transparent ${darkMode ? 'via-indigo-500/50' : 'via-indigo-600/50'} to-transparent`} />
        </div>

        {/* Tagline - READABLE */}
        <div className={`space-y-4 ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-normal ${darkMode ? 'text-indigo-200' : 'text-indigo-900'} leading-relaxed`}>
            Where Words Become Timeless
          </h2>
          <p className="font-amiri text-xl leading-[2] opacity-80">
            حيث تصبح الكلمات خالدة
          </p>
        </div>

        {/* Strong CTA */}
        <button
          onClick={onGetStarted}
          className={`group relative px-14 py-5 border-2 ${darkMode ? 'border-indigo-500/60 bg-indigo-500/10 hover:bg-indigo-500/20' : 'border-indigo-500/60 bg-indigo-500/5 hover:bg-indigo-500/10'} rounded-xl transition-all duration-300 overflow-hidden shadow-lg`}
        >
          <span className="font-brand-en text-xl font-semibold relative z-10">Enter</span>
          <span className="font-amiri text-base opacity-70 relative z-10 mr-2">ادخل</span>
        </button>

        {/* Geometric pattern */}
        <div className="flex items-center gap-2.5 mt-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className={`${i === 3 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'} rotate-45 ${darkMode ? 'bg-indigo-500/50' : 'bg-indigo-600/50'} ${i === 3 ? 'opacity-80' : 'opacity-50'}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 4c: Paper/Parchment Style with Ink Borders
  Inspired by ancient manuscripts, solid backgrounds, ornate ink-style borders
  =============================================================================*/

export const SplashArabian4c = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${darkMode ? 'bg-[#0f0e0c]' : 'bg-[#f9f7f1]'}`}>
    {/* Theme toggle - OUTSIDE, top right */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${darkMode ? 'bg-stone-900/90' : 'bg-white/90'} ${darkMode ? 'border-stone-700' : 'border-stone-300'} border shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-stone-700" />}
    </button>

    {/* Subtle paper texture pattern */}
    <div className="absolute inset-0 opacity-[0.04]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 20 Q70 50 50 80 Q30 50 50 20' fill='none' stroke='%23${darkMode ? '8B7355' : '6b5d4f'}' stroke-width='0.8'/%3E%3Cpath d='M20 50 Q50 30 80 50 Q50 70 20 50' fill='none' stroke='%23${darkMode ? '8B7355' : '6b5d4f'}' stroke-width='0.8'/%3E%3Ccircle cx='50' cy='50' r='25' fill='none' stroke='%23${darkMode ? '8B7355' : '6b5d4f'}' stroke-width='0.5' stroke-dasharray='2,3'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px'
    }} />

    {/* Parchment-style frame - SOLID */}
    <div className={`relative max-w-3xl mx-6 p-16 ${darkMode ? 'bg-[#1a1816]' : 'bg-[#fffef9]'} border-4 ${darkMode ? 'border-amber-900/40' : 'border-stone-400/40'} rounded-lg shadow-2xl`} style={{
      boxShadow: darkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 2px 4px rgba(197, 160, 89, 0.1)' : '0 25px 50px -12px rgba(0, 0, 0, 0.15), inset 0 2px 4px rgba(107, 93, 79, 0.1)'
    }}>
      {/* Inner ink-style border */}
      <div className={`absolute inset-3 border-2 ${darkMode ? 'border-amber-800/30' : 'border-stone-500/30'} rounded pointer-events-none`} style={{
        borderStyle: 'solid'
      }} />

      {/* Ornate corner flourishes - ink style */}
      {[
        'top-0 left-0',
        'top-0 right-0 scale-x-[-1]',
        'bottom-0 left-0 scale-y-[-1]',
        'bottom-0 right-0 scale-[-1]'
      ].map((position, i) => (
        <div key={i} className={`absolute ${position} w-20 h-20 pointer-events-none opacity-30`}>
          <svg viewBox="0 0 80 80" className={darkMode ? 'text-amber-700' : 'text-stone-600'}>
            <path d="M10 10 Q10 5 15 5 L30 5 Q35 5 35 10 L35 25 Q35 30 30 30 L15 30 Q10 30 10 25 Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="22" cy="17" r="5" fill="currentColor" opacity="0.4" />
            <path d="M15 17 Q19 13 22 17 Q25 21 30 17" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      {/* Diamond corners in brand colors */}
      {['top-5 left-5', 'top-5 right-5', 'bottom-5 left-5', 'bottom-5 right-5'].map((position, i) => (
        <div key={i} className={`absolute ${position} w-2.5 h-2.5 ${darkMode ? 'bg-indigo-500/50' : 'bg-indigo-600/50'} rotate-45`} />
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center relative z-10">
        <Logo theme={theme} darkMode={darkMode} />

        {/* Ornate manuscript divider */}
        <div className="flex items-center gap-4 w-full max-w-lg">
          <div className={`flex-1 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-amber-700/50' : 'via-stone-500/50'} to-transparent`} />
          <svg width="36" height="36" viewBox="0 0 36 36" className={`${darkMode ? 'text-amber-600' : 'text-stone-600'}`}>
            <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M18 4 L21 13 L30 13 L23 18 L26 27 L18 22 L10 27 L13 18 L6 13 L15 13 Z" fill="currentColor" opacity="0.6" />
            <circle cx="18" cy="18" r="5" fill="currentColor" opacity="0.5" />
          </svg>
          <div className={`flex-1 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-amber-700/50' : 'via-stone-500/50'} to-transparent`} />
        </div>

        {/* Manuscript-style tagline - READABLE */}
        <div className={`space-y-4 ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-serif italic ${darkMode ? 'text-amber-300' : 'text-stone-800'} leading-relaxed tracking-wide`}>
            Chronicles of Eloquence
          </h2>
          <p className="font-amiri text-xl leading-[2.2] opacity-85">
            سجلات البلاغة
          </p>
        </div>

        {/* Manuscript-style CTA */}
        <button
          onClick={onGetStarted}
          className={`group relative px-14 py-5 border-2 ${darkMode ? 'border-amber-700/60 bg-amber-950/30 hover:bg-amber-900/40' : 'border-stone-500/50 bg-stone-100/50 hover:bg-stone-200/50'} rounded-lg transition-all duration-300 overflow-hidden shadow-lg`}
        >
          <span className="font-brand-en text-lg font-semibold relative z-10">Open the Manuscript</span>
          <span className="font-amiri text-base opacity-70 relative z-10 mr-2">افتح المخطوطة</span>
        </button>

        {/* Decorative ink dots */}
        <div className="flex items-center gap-2 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`${i === 2 ? 'w-2 h-2' : 'w-1.5 h-1.5'} rounded-full ${darkMode ? 'bg-amber-700/60' : 'bg-stone-600/60'} ${i === 2 ? 'opacity-80' : 'opacity-50'}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
