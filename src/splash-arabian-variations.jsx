import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  ARABIAN SPLASH VARIATIONS - Exploring Different Directions
  All use EXACT logo format from main app (horizontal, no line breaks)
  =============================================================================*/

// Correct Logo Component - Matches Main App Header EXACTLY
const Logo = ({ theme, darkMode, onToggleTheme }) => (
  <div className="flex flex-col items-center gap-8 relative">
    {/* Theme toggle - top right */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${theme.glass} ${theme.border} border backdrop-blur-xl shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className={theme.brand} /> : <Moon size={20} className={theme.brand} />}
    </button>

    {/* Logo - EXACT format from main app header */}
    <div className={`flex flex-row-reverse items-center gap-4 ${theme.brand} tracking-wide`}>
      <PenTool size={42} className="opacity-95" strokeWidth={1.5} />
      <h1 className="flex items-end gap-6">
        <span className="font-brand-ar text-5xl font-bold mb-2 opacity-80">بالعربي</span>
        <span className="font-brand-en text-7xl lowercase tracking-tighter">poetry</span>
        <span className="font-brand-en text-xs px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 uppercase tracking-wider mb-4 ml-3 opacity-60">beta</span>
      </h1>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 1: Original Arabian (Refined)
  Ornate frame, warm amber, arabesque corners
  =============================================================================*/

export const SplashArabian1 = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
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

/* =============================================================================
  VARIATION 2: Maximalist Arabian
  More ornate, richer patterns, deeper colors, intricate details
  =============================================================================*/

export const SplashArabian2 = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1a0f0f]' : 'bg-[#FFF9F0]'} overflow-hidden`}>
    {/* Dense Islamic geometric pattern */}
    <div className="absolute inset-0 opacity-[0.08]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 L35 15 L45 15 L38 22 L41 32 L30 25 L19 32 L22 22 L15 15 L25 15 Z' fill='none' stroke='%23D4AF37' stroke-width='0.8'/%3E%3Ccircle cx='30' cy='30' r='20' fill='none' stroke='%23D4AF37' stroke-width='0.8' stroke-dasharray='1,2'/%3E%3Ccircle cx='30' cy='30' r='12' fill='none' stroke='%23D4AF37' stroke-width='0.8'/%3E%3Cpath d='M30 10 L30 50 M10 30 L50 30' stroke='%23D4AF37' stroke-width='0.5' opacity='0.3'/%3E%3C/svg%3E")`,
      backgroundSize: '60px 60px'
    }} />

    {/* Radial gradient overlay */}
    <div className={`absolute inset-0 bg-gradient-radial ${darkMode ? 'from-amber-900/20 via-transparent to-transparent' : 'from-amber-200/30 via-transparent to-transparent'}`} />

    {/* Ornate double frame */}
    <div className={`relative max-w-4xl mx-6 ${darkMode ? 'bg-stone-950/80' : 'bg-white/80'} backdrop-blur-2xl rounded-2xl shadow-2xl overflow-hidden`}>
      {/* Outer decorative border */}
      <div className={`absolute inset-0 border-4 ${darkMode ? 'border-amber-700/40' : 'border-yellow-700/40'} rounded-2xl pointer-events-none`} />
      <div className={`absolute inset-2 border ${darkMode ? 'border-amber-600/20' : 'border-yellow-600/20'} rounded-xl pointer-events-none`} />

      {/* Elaborate corner ornaments */}
      {[
        'top-0 left-0',
        'top-0 right-0 scale-x-[-1]',
        'bottom-0 left-0 scale-y-[-1]',
        'bottom-0 right-0 scale-[-1]'
      ].map((position, i) => (
        <div key={i} className={`absolute ${position} w-32 h-32 pointer-events-none opacity-30`}>
          <svg viewBox="0 0 120 120" className={darkMode ? 'text-amber-500' : 'text-yellow-800'}>
            <path d="M10 10 Q10 3 17 3 L40 3 Q47 3 47 10 L47 33 Q47 40 40 40 L17 40 Q10 40 10 33 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="28" cy="21" r="7" fill="currentColor" opacity="0.4" />
            <path d="M17 21 Q23 15 28 21 Q33 27 40 21" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="15" cy="15" r="3" fill="currentColor" opacity="0.6" />
            <circle cx="41" cy="15" r="3" fill="currentColor" opacity="0.6" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-12 text-center p-16">
        <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

        {/* Elaborate decorative divider */}
        <div className="flex items-center gap-3 w-full max-w-2xl">
          <div className={`flex-1 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-amber-600/50' : 'via-yellow-700/50'} to-transparent`} />
          <svg width="40" height="40" viewBox="0 0 40 40" className={`${darkMode ? 'text-amber-500' : 'text-yellow-800'}`}>
            <circle cx="20" cy="20" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
            <path d="M20 5 L23 15 L33 15 L25 21 L28 31 L20 25 L12 31 L15 21 L7 15 L17 15 Z" fill="currentColor" opacity="0.7" />
            <circle cx="20" cy="20" r="5" fill="currentColor" opacity="0.5" />
          </svg>
          <div className={`flex-1 h-[2px] bg-gradient-to-r from-transparent ${darkMode ? 'via-amber-600/50' : 'via-yellow-700/50'} to-transparent`} />
        </div>

        {/* Rich tagline */}
        <div className={`space-y-5 ${darkMode ? 'text-amber-100' : 'text-stone-800'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-serif italic ${darkMode ? 'text-amber-300' : 'text-yellow-900'} leading-relaxed tracking-wide`}>
            A Treasury of Eternal Verses
          </h2>
          <p className="font-amiri text-2xl leading-[2.2] opacity-80">
            خزينة الأشعار الخالدة
          </p>
          <p className={`font-brand-en text-sm tracking-widest uppercase opacity-50 ${darkMode ? 'text-amber-400' : 'text-yellow-800'}`}>
            From the Masters of Language
          </p>
        </div>

        {/* Ornate CTA with border pattern */}
        <button
          onClick={onGetStarted}
          className={`group relative px-14 py-6 border-2 ${darkMode ? 'border-amber-600/60 bg-amber-900/20 hover:bg-amber-800/30' : 'border-yellow-700/60 bg-yellow-100/30 hover:bg-yellow-200/40'} rounded-lg transition-all duration-300 overflow-hidden shadow-xl`}
        >
          <div className={`absolute inset-0 border ${darkMode ? 'border-amber-500/20' : 'border-yellow-600/20'} rounded-lg m-1 pointer-events-none`} />
          <span className="font-brand-en text-xl font-bold relative z-10">Enter the Diwan</span>
          <span className="font-amiri text-base opacity-70 relative z-10 mr-3">ادخل الديوان</span>
        </button>

        {/* Rich decorative pattern */}
        <div className="flex items-center gap-2 mt-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className={`${i % 2 === 0 ? 'w-2 h-2' : 'w-1.5 h-1.5'} rotate-45 ${darkMode ? 'bg-amber-600/40' : 'bg-yellow-700/40'} ${i === 4 ? 'scale-[2] opacity-70' : ''}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 3a: Modern Arabian Fusion (Teal)
  Contemporary meets traditional, teal/turquoise palette
  =============================================================================*/

export const SplashArabian3a = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#0a1419]' : 'bg-[#F0FFFE]'} overflow-hidden`}>
    {/* Subtle geometric pattern */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0 L80 40 L40 80 L0 40 Z' fill='none' stroke='%2314b8a6' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='25' fill='none' stroke='%2314b8a6' stroke-width='1'/%3E%3C/svg%3E")`,
      backgroundSize: '80px 80px'
    }} />

    {/* Clean frame with minimal decoration */}
    <div className={`relative max-w-3xl mx-6 p-14 ${darkMode ? 'bg-stone-900/70' : 'bg-white/70'} backdrop-blur-xl border ${darkMode ? 'border-teal-700/30' : 'border-teal-400/30'} rounded-2xl shadow-2xl`}>
      {/* Minimal corner accents */}
      {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((position, i) => (
        <div key={i} className={`absolute ${position} w-3 h-3 ${darkMode ? 'bg-teal-500/40' : 'bg-teal-600/40'} rotate-45`} />
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center">
        <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

        {/* Clean divider */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className={`flex-1 h-px ${darkMode ? 'bg-teal-600/30' : 'bg-teal-500/30'}`} />
          <div className={`w-2 h-2 ${darkMode ? 'bg-teal-500' : 'bg-teal-600'} rotate-45`} />
          <div className={`flex-1 h-px ${darkMode ? 'bg-teal-600/30' : 'bg-teal-500/30'}`} />
        </div>

        {/* Contemporary tagline */}
        <div className={`space-y-4 ${darkMode ? 'text-teal-100' : 'text-stone-800'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-light ${darkMode ? 'text-teal-300' : 'text-teal-800'} leading-relaxed tracking-wide`}>
            Poetry Through the Ages
          </h2>
          <p className="font-amiri text-lg opacity-60 leading-[2]">
            الشعر عبر العصور
          </p>
        </div>

        {/* Modern CTA */}
        <button
          onClick={onGetStarted}
          className={`group px-12 py-5 ${darkMode ? 'bg-teal-600/20 border-2 border-teal-500/40 hover:bg-teal-600/30' : 'bg-teal-50 border-2 border-teal-400/50 hover:bg-teal-100'} rounded-xl transition-all duration-300 font-brand-en text-lg font-medium`}
        >
          Begin Journey
        </button>

        {/* Minimal dots */}
        <div className="flex gap-2 mt-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className={`w-1.5 h-1.5 rounded-full ${darkMode ? 'bg-teal-500/40' : 'bg-teal-600/40'}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 3b: Modern Arabian Fusion (Deep Blue)
  Sophisticated navy/sapphire palette, elegant
  =============================================================================*/

export const SplashArabian3b = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#0a0e1a]' : 'bg-[#F8FAFF]'} overflow-hidden`}>
    {/* Subtle pattern */}
    <div className="absolute inset-0 opacity-[0.04]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='45' cy='45' r='35' fill='none' stroke='%232563eb' stroke-width='1' stroke-dasharray='3,4'/%3E%3Cpath d='M45 10 L55 30 L75 30 L60 43 L65 63 L45 50 L25 63 L30 43 L15 30 L35 30 Z' fill='none' stroke='%232563eb' stroke-width='0.8'/%3E%3C/svg%3E")`,
      backgroundSize: '90px 90px'
    }} />

    {/* Elegant frame */}
    <div className={`relative max-w-3xl mx-6 p-14 ${darkMode ? 'bg-slate-900/80' : 'bg-white/80'} backdrop-blur-xl border-2 ${darkMode ? 'border-blue-800/40' : 'border-blue-300/40'} rounded-3xl shadow-2xl`}>
      {/* Subtle corner ornaments */}
      {[
        'top-0 left-0',
        'top-0 right-0 scale-x-[-1]',
        'bottom-0 left-0 scale-y-[-1]',
        'bottom-0 right-0 scale-[-1]'
      ].map((position, i) => (
        <div key={i} className={`absolute ${position} w-20 h-20 pointer-events-none opacity-20`}>
          <svg viewBox="0 0 80 80" className={darkMode ? 'text-blue-400' : 'text-blue-700'}>
            <path d="M10 10 L25 10 L25 25" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="20" cy="20" r="5" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center">
        <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

        {/* Elegant divider */}
        <div className="flex items-center gap-4 w-full max-w-lg">
          <div className={`flex-1 h-[1px] bg-gradient-to-r from-transparent ${darkMode ? 'via-blue-500/40' : 'via-blue-600/40'} to-transparent`} />
          <svg width="28" height="28" viewBox="0 0 28 28" className={`${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
            <circle cx="14" cy="14" r="10" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
            <path d="M14 4 L16 10 L22 10 L17 14 L19 20 L14 16 L9 20 L11 14 L6 10 L12 10 Z" fill="currentColor" opacity="0.6" />
          </svg>
          <div className={`flex-1 h-[1px] bg-gradient-to-r from-transparent ${darkMode ? 'via-blue-500/40' : 'via-blue-600/40'} to-transparent`} />
        </div>

        {/* Refined tagline */}
        <div className={`space-y-4 ${darkMode ? 'text-blue-100' : 'text-slate-800'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-serif italic ${darkMode ? 'text-blue-300' : 'text-blue-900'} leading-relaxed`}>
            The Eloquence of Centuries
          </h2>
          <p className="font-amiri text-xl leading-[2] opacity-70">
            بلاغة القرون
          </p>
        </div>

        {/* Sophisticated CTA */}
        <button
          onClick={onGetStarted}
          className={`group relative px-12 py-5 border-2 ${darkMode ? 'border-blue-600/50 hover:bg-blue-900/30' : 'border-blue-500/50 hover:bg-blue-50'} rounded-2xl transition-all duration-300 overflow-hidden`}
        >
          <span className="font-brand-en text-lg font-semibold relative z-10">Enter</span>
          <span className="font-amiri text-base opacity-60 relative z-10 mr-2">ادخل</span>
          <div className={`absolute inset-0 bg-gradient-to-r ${darkMode ? 'from-blue-600/0 via-blue-600/10 to-blue-600/0' : 'from-blue-500/0 via-blue-500/10 to-blue-500/0'} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700`} />
        </button>

        {/* Elegant pattern */}
        <div className="flex items-center gap-3 mt-4">
          <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-blue-500/40' : 'bg-blue-600/40'}`} />
          <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-500/50' : 'bg-blue-600/50'}`} />
          <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-blue-500/60' : 'bg-blue-600/60'}`} />
          <div className={`w-2 h-2 rounded-full ${darkMode ? 'bg-blue-500/50' : 'bg-blue-600/50'}`} />
          <div className={`w-1 h-1 rounded-full ${darkMode ? 'bg-blue-500/40' : 'bg-blue-600/40'}`} />
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  VARIATION 3c: Modern Arabian Fusion (Burgundy)
  Rich burgundy/wine palette, luxurious feel
  =============================================================================*/

export const SplashArabian3c = ({ onGetStarted, darkMode, theme, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1a0a0f]' : 'bg-[#FFF5F7]'} overflow-hidden`}>
    {/* Elegant pattern */}
    <div className="absolute inset-0 opacity-[0.05]" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 20 Q70 50 50 80 Q30 50 50 20' fill='none' stroke='%239f1239' stroke-width='1'/%3E%3Cpath d='M20 50 Q50 30 80 50 Q50 70 20 50' fill='none' stroke='%239f1239' stroke-width='1'/%3E%3Ccircle cx='50' cy='50' r='30' fill='none' stroke='%239f1239' stroke-width='0.8' stroke-dasharray='2,3'/%3E%3C/svg%3E")`,
      backgroundSize: '100px 100px'
    }} />

    {/* Luxurious frame */}
    <div className={`relative max-w-3xl mx-6 p-14 ${darkMode ? 'bg-stone-950/85' : 'bg-white/85'} backdrop-blur-xl border-2 ${darkMode ? 'border-rose-900/50' : 'border-rose-400/40'} rounded-3xl shadow-2xl`}>
      {/* Decorative corners */}
      {[
        'top-0 left-0',
        'top-0 right-0 scale-x-[-1]',
        'bottom-0 left-0 scale-y-[-1]',
        'bottom-0 right-0 scale-[-1]'
      ].map((position, i) => (
        <div key={i} className={`absolute ${position} w-24 h-24 pointer-events-none opacity-25`}>
          <svg viewBox="0 0 100 100" className={darkMode ? 'text-rose-600' : 'text-rose-700'}>
            <path d="M10 10 Q10 5 15 5 L30 5 Q35 5 35 10 L35 25 Q35 30 30 30 L15 30 Q10 30 10 25 Z" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="22" cy="17" r="5" fill="currentColor" opacity="0.4" />
          </svg>
        </div>
      ))}

      {/* Content */}
      <div className="flex flex-col items-center gap-10 text-center">
        <Logo theme={theme} darkMode={darkMode} onToggleTheme={onToggleTheme} />

        {/* Rich divider */}
        <div className="flex items-center gap-4 w-full max-w-md">
          <div className={`flex-1 h-[1.5px] bg-gradient-to-r from-transparent ${darkMode ? 'via-rose-700/50' : 'via-rose-600/50'} to-transparent`} />
          <svg width="32" height="32" viewBox="0 0 32 32" className={`${darkMode ? 'text-rose-600' : 'text-rose-700'}`}>
            <path d="M16 2 L18 10 L26 10 L20 15 L22 23 L16 18 L10 23 L12 15 L6 10 L14 10 Z" fill="currentColor" opacity="0.7" />
            <circle cx="16" cy="16" r="4" fill="currentColor" opacity="0.4" />
          </svg>
          <div className={`flex-1 h-[1.5px] bg-gradient-to-r from-transparent ${darkMode ? 'via-rose-700/50' : 'via-rose-600/50'} to-transparent`} />
        </div>

        {/* Luxurious tagline */}
        <div className={`space-y-4 ${darkMode ? 'text-rose-100' : 'text-stone-800'}`}>
          <h2 className={`font-brand-en text-3xl md:text-4xl font-serif italic ${darkMode ? 'text-rose-300' : 'text-rose-900'} leading-relaxed`}>
            Words That Echo Through Time
          </h2>
          <p className="font-amiri text-xl leading-[2] opacity-75">
            كلمات تتردد عبر الزمن
          </p>
        </div>

        {/* Elegant CTA */}
        <button
          onClick={onGetStarted}
          className={`group relative px-13 py-5 border-2 ${darkMode ? 'border-rose-700/60 bg-rose-950/30 hover:bg-rose-900/40' : 'border-rose-600/50 bg-rose-50/50 hover:bg-rose-100'} rounded-2xl transition-all duration-300 overflow-hidden shadow-lg`}
        >
          <span className="font-brand-en text-lg font-semibold relative z-10">Begin</span>
          <span className="font-amiri text-base opacity-65 relative z-10 mr-2">ابدأ</span>
          <div className={`absolute inset-0 bg-gradient-to-r ${darkMode ? 'from-rose-700/0 via-rose-700/10 to-rose-700/0' : 'from-rose-600/0 via-rose-600/10 to-rose-600/0'} translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700`} />
        </button>

        {/* Decorative elements */}
        <div className="flex items-center gap-2.5 mt-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className={`${i === 3 ? 'w-2.5 h-2.5' : 'w-1.5 h-1.5'} rotate-45 ${darkMode ? 'bg-rose-700/40' : 'bg-rose-600/40'} ${i === 3 ? 'opacity-80' : 'opacity-50'}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
