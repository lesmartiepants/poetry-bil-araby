import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  ROUND 6: CREATIVE EXPLORATION - No Constraints
  Based on user's favorites: 5a (Brutalist), 5d (Editorial), 5e (Cinematic)

  Exploring: Color logos, bold palettes, unconventional layouts

  6a: Brutalist + Bold Primary Colors
  6b: Neo-Brutalist + Pastels
  6c: Editorial + Colored Logo & Typography
  6d: Magazine Spread + Multi-column
  6e: Cinematic + Colored Title Treatment
  6f: Art House Cinema + Geometric Color Blocks
  =============================================================================*/

/* =============================================================================
  6a: BRUTALIST + BOLD PRIMARY COLORS
  Raw geometry meets vibrant color blocking
  =============================================================================*/

export const Splash6a = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
    {/* Theme toggle - colored */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 transition-all duration-200`}
    >
      {darkMode ? <Sun size={24} className="text-black" /> : <Moon size={24} className="text-black" />}
    </button>

    {/* Bold color stripe background */}
    <div className="absolute inset-0">
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-500 via-yellow-400 to-blue-500" />
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500" />
    </div>

    {/* Content */}
    <div className="relative max-w-4xl w-full mx-8">
      {/* Heavy frame with colored corners */}
      <div className={`border-4 ${darkMode ? 'border-white' : 'border-black'} p-16 relative`}>
        {/* Colored logo */}
        <div className="mb-20">
          <div className="flex flex-row-reverse items-center gap-4 tracking-wide">
            <PenTool size={42} className="text-blue-500" strokeWidth={1.5} />
            <h1 className="flex items-end gap-6">
              <span className="font-brand-ar text-6xl font-bold mb-2 text-red-500">بالعربي</span>
              <span className="font-brand-en text-7xl lowercase tracking-tighter font-bold text-yellow-400">poetry</span>
            </h1>
          </div>
        </div>

        {/* Bold colored blocks */}
        <div className={`space-y-8 ${darkMode ? 'text-white' : 'text-black'}`}>
          <div className="bg-blue-500 text-white p-6">
            <h2 className="font-brand-en text-5xl font-bold uppercase tracking-tight leading-[1.1]">
              ARABIC POETRY
            </h2>
          </div>
          <div className="bg-red-500 text-white p-6">
            <p className="font-amiri text-3xl leading-[1.8]">
              الشعر العربي الكلاسيكي
            </p>
          </div>
        </div>

        {/* Bold CTA */}
        <button
          onClick={onGetStarted}
          className="mt-16 w-full py-6 bg-yellow-400 text-black hover:bg-yellow-500 font-brand-en text-xl font-bold uppercase tracking-widest transition-colors duration-300"
        >
          ENTER
        </button>

        {/* Colored corner marks */}
        <div className="absolute top-0 left-0 w-12 h-12 bg-red-500" />
        <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500" />
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-yellow-400" />
        <div className="absolute bottom-0 right-0 w-12 h-12 bg-red-500" />
      </div>
    </div>
  </div>
);

/* =============================================================================
  6b: NEO-BRUTALIST + SOFT PASTELS
  Brutalist structure with gentle color palette
  =============================================================================*/

export const Splash6b = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1a1625]' : 'bg-[#fef7ff]'}`}>
    {/* Theme toggle - pastel */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-14 h-14 rounded flex items-center justify-center ${darkMode ? 'bg-purple-300' : 'bg-purple-400'} hover:scale-105 transition-all`}
    >
      {darkMode ? <Sun size={24} className="text-purple-900" /> : <Moon size={24} className="text-purple-900" />}
    </button>

    {/* Content */}
    <div className="relative max-w-4xl w-full mx-8">
      <div className={`border-[6px] ${darkMode ? 'border-purple-300' : 'border-purple-400'} p-16 ${darkMode ? 'bg-purple-950/50' : 'bg-white/80'} shadow-2xl`}>
        {/* Pastel colored logo */}
        <div className="mb-16">
          <div className="flex flex-row-reverse items-center gap-4 tracking-wide">
            <PenTool size={42} className={darkMode ? 'text-pink-300' : 'text-pink-500'} strokeWidth={1.5} />
            <h1 className="flex items-end gap-6">
              <span className={`font-brand-ar text-6xl font-bold mb-2 ${darkMode ? 'text-purple-300' : 'text-purple-600'}`}>بالعربي</span>
              <span className={`font-brand-en text-7xl lowercase tracking-tighter font-bold ${darkMode ? 'text-pink-200' : 'text-pink-600'}`}>poetry</span>
            </h1>
          </div>
        </div>

        {/* Soft blocks */}
        <div className="space-y-6">
          <div className={`${darkMode ? 'bg-purple-900/60 text-purple-100' : 'bg-purple-100 text-purple-900'} p-8 rounded-sm`}>
            <h2 className="font-brand-en text-4xl font-bold uppercase tracking-wide">
              Timeless Verses
            </h2>
          </div>
          <div className={`${darkMode ? 'bg-pink-900/40 text-pink-100' : 'bg-pink-100 text-pink-900'} p-8 rounded-sm`}>
            <p className="font-amiri text-2xl leading-[2]">
              أبيات خالدة من التراث
            </p>
          </div>
        </div>

        {/* Soft CTA */}
        <button
          onClick={onGetStarted}
          className={`mt-12 w-full py-5 ${darkMode ? 'bg-purple-400 text-purple-900 hover:bg-purple-300' : 'bg-purple-500 text-white hover:bg-purple-600'} font-brand-en text-lg font-bold uppercase tracking-widest transition-all rounded-sm`}
        >
          Begin Journey
        </button>

        {/* Pastel corner accents */}
        <div className={`absolute top-0 left-0 w-4 h-4 ${darkMode ? 'bg-pink-400' : 'bg-pink-500'}`} />
        <div className={`absolute top-0 right-0 w-4 h-4 ${darkMode ? 'bg-purple-400' : 'bg-purple-500'}`} />
        <div className={`absolute bottom-0 left-0 w-4 h-4 ${darkMode ? 'bg-purple-400' : 'bg-purple-500'}`} />
        <div className={`absolute bottom-0 right-0 w-4 h-4 ${darkMode ? 'bg-pink-400' : 'bg-pink-500'}`} />
      </div>
    </div>
  </div>
);

/* =============================================================================
  6c: EDITORIAL + COLORED LOGO & TYPOGRAPHY
  Magazine sophistication with strategic color use
  =============================================================================*/

export const Splash6c = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1a1715]' : 'bg-[#fffef9]'}`}>
    {/* Theme toggle */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-12 h-12 rounded-full border-2 ${darkMode ? 'border-amber-600 hover:bg-amber-600/20' : 'border-amber-700 hover:bg-amber-700/10'} flex items-center justify-center transition-colors`}
    >
      {darkMode ? <Sun size={18} className="text-amber-500" /> : <Moon size={18} className="text-amber-700" />}
    </button>

    {/* Editorial layout */}
    <div className="relative max-w-5xl w-full mx-8">
      {/* Colored top rule */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />

      <div className="pt-20 pb-16">
        {/* Colored overline */}
        <div className="text-center mb-8 text-amber-600 font-brand-en text-xs uppercase tracking-[0.3em] font-semibold">
          A Digital Anthology
        </div>

        {/* Colored logo */}
        <div className="mb-16 flex justify-center">
          <div className="flex flex-row-reverse items-center gap-4 tracking-wide">
            <PenTool size={42} className="text-amber-600" strokeWidth={1.5} />
            <h1 className="flex items-end gap-6">
              <span className="font-brand-ar text-6xl font-bold mb-2 text-amber-600">بالعربي</span>
              <span className={`font-brand-en text-7xl lowercase tracking-tighter ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>poetry</span>
            </h1>
          </div>
        </div>

        {/* Headline with color accent */}
        <div className={`text-center mb-12 ${darkMode ? 'text-stone-200' : 'text-stone-900'}`}>
          <h2 className="font-serif text-6xl leading-tight mb-4 italic font-light">
            <span className="text-amber-600">Timeless</span> Verses
          </h2>
          <p className="font-amiri text-3xl leading-[2] opacity-70">
            <span className="text-amber-600">أبيات</span> خالدة
          </p>
        </div>

        {/* Deck with color */}
        <div className={`max-w-2xl mx-auto text-center mb-16 font-brand-en text-lg leading-relaxed`}>
          <p className={darkMode ? 'text-stone-400' : 'text-stone-600'}>
            Explore <span className="text-amber-600 font-semibold">centuries of Arabic poetic tradition</span>, from classical masters to modern voices.
          </p>
        </div>

        {/* Colored CTA */}
        <div className="flex justify-center">
          <button
            onClick={onGetStarted}
            className="px-12 py-4 bg-amber-600 hover:bg-amber-700 text-white font-brand-en text-base uppercase tracking-[0.2em] transition-all duration-300 shadow-lg"
          >
            Begin Reading
          </button>
        </div>

        {/* Colored publication info */}
        <div className="text-center mt-16 text-amber-600/60 font-brand-en text-xs uppercase tracking-widest">
          Digital Edition • 2025
        </div>
      </div>

      {/* Colored bottom rule */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600 to-transparent" />
    </div>
  </div>
);

/* =============================================================================
  6d: MAGAZINE SPREAD + MULTI-COLUMN
  Editorial spread layout with columns and color
  =============================================================================*/

export const Splash6d = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1c1917]' : 'bg-[#fafaf9]'} overflow-hidden`}>
    {/* Theme toggle */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-12 h-12 rounded border ${darkMode ? 'border-indigo-600 hover:bg-indigo-900' : 'border-indigo-500 hover:bg-indigo-50'} flex items-center justify-center transition-colors`}
    >
      {darkMode ? <Sun size={18} className="text-indigo-400" /> : <Moon size={18} className="text-indigo-600" />}
    </button>

    {/* Magazine spread */}
    <div className="relative max-w-7xl w-full h-[90vh] mx-8 grid grid-cols-12 gap-8">
      {/* Left column - Logo & Main headline */}
      <div className="col-span-5 flex flex-col justify-center pr-8 border-r-2 border-indigo-500/30">
        {/* Issue number */}
        <div className="text-indigo-600 font-brand-en text-xs uppercase tracking-[0.4em] font-bold mb-12">
          Issue 001
        </div>

        {/* Logo - vertical orientation */}
        <div className="mb-12">
          <div className="flex flex-col items-start gap-3">
            <div className="flex items-center gap-3">
              <PenTool size={36} className="text-indigo-600" strokeWidth={1.5} />
              <span className={`font-brand-en text-6xl lowercase tracking-tighter font-bold ${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>poetry</span>
            </div>
            <span className="font-brand-ar text-5xl font-bold text-indigo-600 mr-12">بالعربي</span>
          </div>
        </div>

        {/* Main headline */}
        <div className={`${darkMode ? 'text-stone-100' : 'text-stone-900'}`}>
          <h2 className="font-serif text-5xl leading-[1.1] mb-4 font-bold">
            The Voice<br/>
            of<br/>
            <span className="text-indigo-600">Centuries</span>
          </h2>
        </div>
      </div>

      {/* Right columns - Content */}
      <div className="col-span-7 flex flex-col justify-center">
        {/* Arabic headline */}
        <div className="mb-8">
          <p className={`font-amiri text-4xl leading-[1.8] ${darkMode ? 'text-stone-200' : 'text-stone-800'}`}>
            صوت <span className="text-indigo-600">القرون</span>
          </p>
        </div>

        {/* Two-column text */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          <div className={`font-brand-en text-sm leading-relaxed ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
            <p className="mb-4">
              Journey through the rich tapestry of Arabic poetry, where words transcend time and touch the eternal.
            </p>
            <p>
              From the golden age of classical verse to contemporary expressions of the human experience.
            </p>
          </div>
          <div className={`font-amiri text-base leading-[2] ${darkMode ? 'text-stone-400' : 'text-stone-600'}`}>
            <p>
              رحلة عبر نسيج غني من الشعر العربي، حيث تتجاوز الكلمات الزمن وتلمس الأبدية
            </p>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={onGetStarted}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-brand-en text-sm uppercase tracking-[0.3em] transition-colors"
        >
          Read Now
        </button>

        {/* Metadata */}
        <div className={`mt-8 text-xs ${darkMode ? 'text-stone-600' : 'text-stone-400'} font-brand-en uppercase tracking-wider`}>
          Digital Collection • Poetry • Arabic Literature
        </div>
      </div>
    </div>
  </div>
);

/* =============================================================================
  6e: CINEMATIC + COLORED TITLE TREATMENT
  Film aesthetic with strategic color
  =============================================================================*/

export const Splash6e = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-[#f5f1ea]'}`}>
    {/* Theme toggle */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 w-10 h-10 rounded-sm border ${darkMode ? 'border-rose-600/40 hover:border-rose-600/60' : 'border-rose-700/40 hover:border-rose-700/60'} flex items-center justify-center transition-all`}
    >
      {darkMode ? <Sun size={16} className="text-rose-500" /> : <Moon size={16} className="text-rose-700" />}
    </button>

    {/* Film grain */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }} />

    {/* Colored corner frames */}
    <div className="fixed top-8 left-8 w-16 h-16 border-l-2 border-t-2 border-rose-600/50" />
    <div className="fixed top-8 right-8 w-16 h-16 border-r-2 border-t-2 border-rose-600/50" />
    <div className="fixed bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 border-rose-600/50" />
    <div className="fixed bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 border-rose-600/50" />

    {/* Content */}
    <div className="relative max-w-4xl mx-8 text-center">
      {/* Colored logo */}
      <div className="mb-20">
        <div className="flex flex-row-reverse items-center justify-center gap-4 tracking-wide">
          <PenTool size={42} className="text-rose-600" strokeWidth={1.5} />
          <h1 className="flex items-end gap-6">
            <span className="font-brand-ar text-6xl font-bold mb-2 text-rose-600">بالعربي</span>
            <span className={`font-brand-en text-7xl lowercase tracking-tighter ${darkMode ? 'text-white' : 'text-black'}`}>poetry</span>
          </h1>
        </div>
      </div>

      {/* Title with color accent */}
      <div className={`space-y-12 ${darkMode ? 'text-white' : 'text-black'}`}>
        <div>
          <h2 className="font-serif text-7xl font-light leading-tight tracking-tight mb-6">
            <span className="text-rose-600">Poetry</span>
          </h2>
          <p className="font-amiri text-4xl leading-[2] opacity-80">
            <span className="text-rose-600">الشعر</span>
          </p>
        </div>

        <div className={`text-sm uppercase tracking-[0.4em] opacity-50 font-brand-en`}>
          An Anthology • <span className="text-rose-600">Timeless</span>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onGetStarted}
        className={`mt-20 px-16 py-4 border-2 border-rose-600 text-rose-600 hover:bg-rose-600 hover:text-white font-brand-en text-sm uppercase tracking-[0.3em] transition-all duration-500`}
        style={{ animation: 'fadeIn 0.8s ease-in forwards', animationDelay: '0.5s', opacity: 0 }}
      >
        Enter
      </button>
    </div>

    <style jsx>{`
      @keyframes fadeIn {
        to { opacity: 1; }
      }
    `}</style>
  </div>
);

/* =============================================================================
  6f: ART HOUSE CINEMA + GEOMETRIC COLOR BLOCKS
  Experimental film aesthetic with bold color geometry
  =============================================================================*/

export const Splash6f = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]'} overflow-hidden`}>
    {/* Theme toggle */}
    <button
      onClick={onToggleTheme}
      className="fixed top-6 right-6 z-50 w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 hover:scale-110 flex items-center justify-center transition-all rounded-sm"
    >
      {darkMode ? <Sun size={16} className="text-white" /> : <Moon size={16} className="text-white" />}
    </button>

    {/* Geometric color blocks - floating */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-[10%] left-[15%] w-32 h-32 bg-cyan-500/20 rotate-12" style={{ animation: 'float 8s ease-in-out infinite' }} />
      <div className="absolute top-[60%] right-[20%] w-40 h-40 bg-purple-600/20 -rotate-6" style={{ animation: 'float 10s ease-in-out infinite reverse' }} />
      <div className="absolute bottom-[15%] left-[25%] w-24 h-24 bg-pink-500/20 rotate-45" style={{ animation: 'float 12s ease-in-out infinite' }} />
    </div>

    {/* Content */}
    <div className="relative max-w-3xl mx-8 text-center">
      {/* Gradient logo */}
      <div className="mb-16">
        <div className="flex flex-row-reverse items-center justify-center gap-4 tracking-wide">
          <PenTool size={42} className="text-transparent bg-clip-text bg-gradient-to-br from-cyan-500 to-purple-600" strokeWidth={1.5} style={{ WebkitTextFillColor: 'transparent', WebkitBackgroundClip: 'text' }} />
          <h1 className="flex items-end gap-6">
            <span className="font-brand-ar text-6xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">بالعربي</span>
            <span className={`font-brand-en text-7xl lowercase tracking-tighter bg-gradient-to-r from-cyan-500 to-purple-600 bg-clip-text text-transparent font-bold`}>poetry</span>
          </h1>
        </div>
      </div>

      {/* Geometric title treatment */}
      <div className="space-y-8">
        <div className="relative inline-block">
          <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-purple-600/20 to-pink-500/20 blur-xl" />
          <h2 className={`relative font-serif text-6xl font-light leading-tight ${darkMode ? 'text-white' : 'text-black'}`}>
            Arabic Poetry
          </h2>
        </div>

        <div className="relative inline-block">
          <p className={`font-amiri text-3xl leading-[2] ${darkMode ? 'text-stone-300' : 'text-stone-700'}`}>
            الشعر العربي
          </p>
        </div>
      </div>

      {/* Gradient CTA */}
      <button
        onClick={onGetStarted}
        className="mt-16 px-14 py-5 bg-gradient-to-r from-cyan-500 via-purple-600 to-pink-600 text-white font-brand-en text-base uppercase tracking-[0.3em] transition-all duration-300 hover:scale-105 shadow-2xl rounded-sm"
      >
        Explore
      </button>

      {/* Colored metadata */}
      <div className="mt-12 flex items-center justify-center gap-6 text-xs font-brand-en uppercase tracking-wider">
        <span className="text-cyan-500">Digital</span>
        <span className={darkMode ? 'text-stone-600' : 'text-stone-400'}>•</span>
        <span className="text-purple-600">Collection</span>
        <span className={darkMode ? 'text-stone-600' : 'text-stone-400'}>•</span>
        <span className="text-pink-600">2025</span>
      </div>
    </div>

    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translate(0, 0) rotate(var(--rotate, 0deg)); }
        50% { transform: translate(20px, -20px) rotate(calc(var(--rotate, 0deg) + 10deg)); }
      }
    `}</style>
  </div>
);
