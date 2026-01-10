import React from 'react';
import { PenTool, Moon, Sun } from 'lucide-react';

/* =============================================================================
  WILDCARD & NEW DIRECTION VARIATIONS
  Consulting: Designers, Consultants, Frontend Engineers, Design Leaders

  WILDCARDS (Bold, Unexpected):
  - 5a: Brutalist/Swiss Design (Stark, geometric, high contrast)
  - 5b: Aurora/Gradient Mesh (Organic, flowing, modern without glass)
  - 5c: Terminal/Developer (Monospace, grid, technical meets poetic)

  NEW DIRECTIONS (Refined Approaches):
  - 5d: Editorial/Magazine (Print-inspired, sophisticated typography)
  - 5e: Cinematic/Film Title (Center-weighted, dramatic, art house)
  =============================================================================*/

// FIXED Logo Component - Bigger Arabic, No Beta
const Logo = ({ darkMode }) => (
  <div className="flex flex-row-reverse items-center gap-4 tracking-wide" style={{ color: darkMode ? '#a5b4fc' : '#4f46e5' }}>
    <PenTool size={42} className="opacity-95" strokeWidth={1.5} />
    <h1 className="flex items-end gap-6">
      <span className="font-brand-ar text-6xl font-bold mb-2 opacity-80">بالعربي</span>
      <span className="font-brand-en text-7xl lowercase tracking-tighter">poetry</span>
    </h1>
  </div>
);

/* =============================================================================
  WILDCARD 5a: BRUTALIST / SWISS DESIGN
  Designer perspective: Raw, honest materials. No decoration. Pure function.
  Frontend engineer: Minimal CSS, performance-first, accessibility champion.
  Consultant: Differentiation through bold simplicity. Anti-trend statement.
  =============================================================================*/

export const SplashWildcard5a = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-white'}`}>
    {/* Theme toggle - stark circle, top right */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-14 h-14 rounded-full flex items-center justify-center ${darkMode ? 'bg-white' : 'bg-black'} hover:scale-110 transition-transform duration-200`}
    >
      {darkMode ? <Sun size={24} className="text-black" /> : <Moon size={24} className="text-white" />}
    </button>

    {/* Raw geometric grid */}
    <div className="absolute inset-0 opacity-[0.03]" style={{
      backgroundImage: `repeating-linear-gradient(0deg, ${darkMode ? '#fff' : '#000'} 0px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, ${darkMode ? '#fff' : '#000'} 0px, transparent 1px, transparent 40px)`,
    }} />

    {/* Brutalist content block */}
    <div className="relative max-w-4xl w-full mx-8">
      {/* Heavy geometric frame */}
      <div className={`border-4 ${darkMode ? 'border-white' : 'border-black'} p-16`}>
        {/* Logo with heavy spacing */}
        <div className="mb-20">
          <Logo darkMode={darkMode} />
        </div>

        {/* Stark typography */}
        <div className={`space-y-8 ${darkMode ? 'text-white' : 'text-black'}`}>
          <h2 className="font-brand-en text-5xl md:text-6xl font-bold uppercase tracking-tight leading-[1.1]">
            ARABIC<br/>POETRY
          </h2>
          <p className="font-amiri text-3xl leading-[1.8]">
            الشعر العربي
          </p>
        </div>

        {/* Stark CTA - geometric block */}
        <button
          onClick={onGetStarted}
          className={`mt-16 w-full py-6 ${darkMode ? 'bg-white text-black hover:bg-indigo-500 hover:text-white' : 'bg-black text-white hover:bg-indigo-600'} font-brand-en text-xl font-bold uppercase tracking-widest transition-colors duration-300`}
        >
          ENTER
        </button>

        {/* Geometric corner marks */}
        <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
        <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
        <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
        <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 ${darkMode ? 'border-indigo-500' : 'border-indigo-600'}`} />
      </div>

      {/* Offset decoration - pure geometry */}
      <div className={`absolute -bottom-4 -right-4 w-full h-full border-4 ${darkMode ? 'border-indigo-500/30' : 'border-indigo-600/30'} pointer-events-none`} />
    </div>
  </div>
);

/* =============================================================================
  WILDCARD 5b: AURORA / GRADIENT MESH
  Designer: Organic, flowing, inspired by nature and fabric. Modern luxury.
  Frontend engineer: CSS gradients, smooth animations, no heavy libraries.
  Leader: Emotional, memorable, stands out from competition.
  =============================================================================*/

export const SplashWildcard5b = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden ${darkMode ? 'bg-[#0a0514]' : 'bg-[#faf9ff]'}`}>
    {/* Theme toggle */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 p-3 rounded-full ${darkMode ? 'bg-purple-950/80' : 'bg-white/80'} border ${darkMode ? 'border-purple-800' : 'border-purple-200'} backdrop-blur-sm shadow-lg hover:scale-110 transition-all`}
    >
      {darkMode ? <Sun size={20} className="text-purple-300" /> : <Moon size={20} className="text-purple-700" />}
    </button>

    {/* Flowing gradient mesh - aurora effect */}
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={`absolute top-[-50%] left-[-25%] w-[100%] h-[100%] rounded-full blur-[100px] ${darkMode ? 'bg-gradient-radial from-indigo-600/40 via-purple-600/30 to-transparent' : 'bg-gradient-radial from-indigo-400/30 via-purple-400/20 to-transparent'}`}
        style={{ animation: 'float 20s ease-in-out infinite' }}
      />
      <div
        className={`absolute bottom-[-50%] right-[-25%] w-[100%] h-[100%] rounded-full blur-[100px] ${darkMode ? 'bg-gradient-radial from-purple-600/40 via-pink-600/30 to-transparent' : 'bg-gradient-radial from-purple-400/30 via-pink-400/20 to-transparent'}`}
        style={{ animation: 'float 25s ease-in-out infinite reverse' }}
      />
      <div
        className={`absolute top-[30%] right-[20%] w-[80%] h-[80%] rounded-full blur-[120px] ${darkMode ? 'bg-gradient-radial from-indigo-500/30 via-transparent to-transparent' : 'bg-gradient-radial from-indigo-300/20 via-transparent to-transparent'}`}
        style={{ animation: 'float 30s ease-in-out infinite' }}
      />
    </div>

    {/* Content with flowing design */}
    <div className="relative z-10 max-w-3xl mx-6 text-center">
      <div className={`${darkMode ? 'bg-purple-950/40' : 'bg-white/60'} backdrop-blur-md border ${darkMode ? 'border-purple-800/50' : 'border-purple-200/50'} rounded-3xl p-14 shadow-2xl`}>
        <Logo darkMode={darkMode} />

        {/* Flowing divider */}
        <div className="my-10 flex items-center justify-center gap-4">
          <svg width="200" height="2" viewBox="0 0 200 2" className={darkMode ? 'text-purple-500/50' : 'text-purple-600/50'}>
            <path d="M0 1 Q50 -2 100 1 T200 1" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>

        {/* Organic typography */}
        <div className={`space-y-4 ${darkMode ? 'text-purple-100' : 'text-purple-950'}`}>
          <h2 className="font-brand-en text-4xl md:text-5xl font-light leading-relaxed tracking-wide">
            Poetry Across Time
          </h2>
          <p className="font-amiri text-2xl leading-[2] opacity-70">
            شعر عبر الزمن
          </p>
        </div>

        {/* Flowing CTA */}
        <button
          onClick={onGetStarted}
          className={`mt-12 px-16 py-5 ${darkMode ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white'} rounded-full font-brand-en text-lg font-medium shadow-2xl hover:shadow-purple-500/50 hover:scale-105 transition-all duration-300`}
        >
          Begin
        </button>
      </div>
    </div>

    <style jsx>{`
      @keyframes float {
        0%, 100% { transform: translate(0, 0) scale(1); }
        33% { transform: translate(30px, -30px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
      }
    `}</style>
  </div>
);

/* =============================================================================
  WILDCARD 5c: TERMINAL / DEVELOPER AESTHETIC
  Frontend engineer: Monospace, technical precision, developer tools beauty.
  Designer: Grid systems, modular design, ASCII art as decoration.
  Consultant: Appeals to technical audience, memorable differentiation.
  =============================================================================*/

export const SplashWildcard5c = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center font-mono ${darkMode ? 'bg-[#0d1117]' : 'bg-[#f6f8fa]'}`}>
    {/* Theme toggle - terminal style */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 px-4 py-2 ${darkMode ? 'bg-[#161b22] border-[#30363d]' : 'bg-white border-gray-300'} border rounded font-mono text-xs hover:${darkMode ? 'border-indigo-500' : 'border-indigo-600'} transition-colors`}
    >
      {darkMode ? '☀ light' : '☾ dark'}
    </button>

    {/* Terminal grid */}
    <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: `repeating-linear-gradient(0deg, ${darkMode ? '#fff' : '#000'} 0px, transparent 1px, transparent 8px), repeating-linear-gradient(90deg, ${darkMode ? '#fff' : '#000'} 0px, transparent 1px, transparent 8px)`,
    }} />

    {/* Terminal window */}
    <div className={`relative max-w-4xl w-full mx-8 ${darkMode ? 'bg-[#161b22]' : 'bg-white'} border-2 ${darkMode ? 'border-[#30363d]' : 'border-gray-300'} rounded-lg shadow-2xl overflow-hidden`}>
      {/* Terminal header */}
      <div className={`${darkMode ? 'bg-[#0d1117]' : 'bg-gray-100'} border-b ${darkMode ? 'border-[#30363d]' : 'border-gray-300'} px-4 py-2 flex items-center gap-2`}>
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-red-500/50' : 'bg-red-400'}`} />
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-yellow-500/50' : 'bg-yellow-400'}`} />
        <div className={`w-3 h-3 rounded-full ${darkMode ? 'bg-green-500/50' : 'bg-green-400'}`} />
        <span className={`ml-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>poetry-bil-araby</span>
      </div>

      {/* Terminal content */}
      <div className="p-12">
        {/* ASCII art decoration */}
        <pre className={`text-xs ${darkMode ? 'text-indigo-500/40' : 'text-indigo-600/40'} mb-8 leading-tight`}>
{`┌─────────────────────────────────────────────┐
│                                             │
└─────────────────────────────────────────────┘`}
        </pre>

        {/* Logo in monospace context */}
        <div className="mb-12">
          <div className="flex flex-row-reverse items-center gap-4" style={{ color: darkMode ? '#a5b4fc' : '#4f46e5' }}>
            <PenTool size={42} className="opacity-95" strokeWidth={1.5} />
            <h1 className="flex items-end gap-6">
              <span className="font-brand-ar text-6xl font-bold mb-2 opacity-80">بالعربي</span>
              <span className="font-mono text-6xl lowercase tracking-tight font-bold">poetry</span>
            </h1>
          </div>
        </div>

        {/* Terminal-style prompt */}
        <div className={`space-y-4 text-lg ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}>
          <div className="flex items-start gap-3">
            <span className={`${darkMode ? 'text-green-500' : 'text-green-600'}`}>$</span>
            <div>
              <span className="font-mono">explore --poetry --language=arabic</span>
              <div className={`mt-2 text-base ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className="font-amiri text-xl leading-[2]">الشعر العربي الكلاسيكي</span>
              </div>
            </div>
          </div>
        </div>

        {/* Command-style CTA */}
        <button
          onClick={onGetStarted}
          className={`mt-12 w-full py-4 ${darkMode ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-500 hover:bg-indigo-600'} text-white font-mono text-base rounded transition-colors`}
        >
          {'> ./start_journey.sh'}
        </button>

        {/* Bottom ASCII decoration */}
        <pre className={`text-xs ${darkMode ? 'text-indigo-500/40' : 'text-indigo-600/40'} mt-8 leading-tight`}>
{`┌─────────────────────────────────────────────┐
│  poetry-bil-araby v1.0.0                    │
└─────────────────────────────────────────────┘`}
        </pre>
      </div>
    </div>
  </div>
);

/* =============================================================================
  NEW DIRECTION 5d: EDITORIAL / MAGAZINE LAYOUT
  Designer: Print-inspired hierarchy, whitespace as design element, sophistication.
  Consultant: Premium positioning, literary credibility, timeless appeal.
  Leader: Elegant, professional, appeals to educated audience.
  =============================================================================*/

export const SplashDirection5d = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-[#1a1715]' : 'bg-[#fffef9]'}`}>
    {/* Theme toggle - minimal circle */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-8 right-8 z-50 w-12 h-12 rounded-full border ${darkMode ? 'border-stone-700 hover:border-stone-600' : 'border-stone-300 hover:border-stone-400'} flex items-center justify-center transition-colors`}
    >
      {darkMode ? <Sun size={18} className="text-stone-400" /> : <Moon size={18} className="text-stone-600" />}
    </button>

    {/* Editorial layout */}
    <div className="relative max-w-5xl w-full mx-8">
      {/* Thin top rule - editorial style */}
      <div className={`absolute top-0 left-0 right-0 h-px ${darkMode ? 'bg-stone-700' : 'bg-stone-300'}`} />

      {/* Content - magazine layout */}
      <div className="pt-20 pb-16">
        {/* Overline - small caps */}
        <div className={`text-center mb-8 ${darkMode ? 'text-stone-500' : 'text-stone-500'} font-brand-en text-xs uppercase tracking-[0.3em]`}>
          A Digital Collection
        </div>

        {/* Logo - centered, generous spacing */}
        <div className="mb-16 flex justify-center">
          <Logo darkMode={darkMode} />
        </div>

        {/* Main headline - editorial hierarchy */}
        <div className={`text-center mb-12 ${darkMode ? 'text-stone-200' : 'text-stone-900'}`}>
          <h2 className="font-serif text-5xl md:text-6xl leading-tight mb-6 italic font-light">
            Timeless Verses
          </h2>
          <p className="font-amiri text-3xl leading-[2] opacity-70">
            أبيات خالدة
          </p>
        </div>

        {/* Deck/Subhead - editorial style */}
        <div className={`max-w-2xl mx-auto text-center mb-16 ${darkMode ? 'text-stone-400' : 'text-stone-600'} font-brand-en text-lg leading-relaxed`}>
          Explore centuries of Arabic poetic tradition, from classical masters to modern voices.
        </div>

        {/* CTA - minimal, elegant */}
        <div className="flex justify-center">
          <button
            onClick={onGetStarted}
            className={`px-12 py-4 border-2 ${darkMode ? 'border-stone-700 hover:bg-stone-900' : 'border-stone-900 hover:bg-stone-900 hover:text-white'} font-brand-en text-base uppercase tracking-[0.2em] transition-all duration-300`}
          >
            Begin Reading
          </button>
        </div>

        {/* Publication info - editorial detail */}
        <div className={`text-center mt-16 ${darkMode ? 'text-stone-600' : 'text-stone-400'} font-brand-en text-xs uppercase tracking-widest`}>
          Digital Edition
        </div>
      </div>

      {/* Thin bottom rule */}
      <div className={`absolute bottom-0 left-0 right-0 h-px ${darkMode ? 'bg-stone-700' : 'bg-stone-300'}`} />
    </div>
  </div>
);

/* =============================================================================
  NEW DIRECTION 5e: CINEMATIC / FILM TITLE CARD
  Designer: Center-weighted, dramatic framing, film-inspired aesthetics.
  Frontend engineer: Performance-first, minimal but impactful animations.
  Leader: Memorable, emotional impact, creates anticipation.
  =============================================================================*/

export const SplashDirection5e = ({ onGetStarted, darkMode, onToggleTheme }) => (
  <div className={`fixed inset-0 z-50 flex items-center justify-center ${darkMode ? 'bg-black' : 'bg-[#f5f1ea]'}`}>
    {/* Theme toggle - corner position like film markers */}
    <button
      onClick={onToggleTheme}
      className={`fixed top-6 right-6 z-50 w-10 h-10 rounded-sm border ${darkMode ? 'border-white/20 hover:border-white/40' : 'border-black/20 hover:border-black/40'} flex items-center justify-center transition-all`}
    >
      {darkMode ? <Sun size={16} className="text-white/70" /> : <Moon size={16} className="text-black/70" />}
    </button>

    {/* Film grain texture */}
    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }} />

    {/* Corner frame markers - like film frames */}
    <div className={`fixed top-8 left-8 w-16 h-16 border-l-2 border-t-2 ${darkMode ? 'border-white/30' : 'border-black/30'}`} />
    <div className={`fixed top-8 right-8 w-16 h-16 border-r-2 border-t-2 ${darkMode ? 'border-white/30' : 'border-black/30'}`} />
    <div className={`fixed bottom-8 left-8 w-16 h-16 border-l-2 border-b-2 ${darkMode ? 'border-white/30' : 'border-black/30'}`} />
    <div className={`fixed bottom-8 right-8 w-16 h-16 border-r-2 border-b-2 ${darkMode ? 'border-white/30' : 'border-black/30'}`} />

    {/* Cinematic content - center-weighted */}
    <div className="relative max-w-4xl mx-8 text-center">
      {/* Logo */}
      <div className="mb-20">
        <Logo darkMode={darkMode} />
      </div>

      {/* Title card style */}
      <div className={`space-y-12 ${darkMode ? 'text-white' : 'text-black'}`}>
        <div>
          <h2 className="font-serif text-6xl md:text-7xl font-light leading-tight tracking-tight mb-6">
            Poetry
          </h2>
          <p className="font-amiri text-4xl leading-[2] opacity-80">
            الشعر
          </p>
        </div>

        <div className={`text-sm uppercase tracking-[0.4em] opacity-50 font-brand-en`}>
          An Anthology
        </div>
      </div>

      {/* Fade in CTA - cinematic timing */}
      <button
        onClick={onGetStarted}
        className={`mt-20 px-16 py-4 border ${darkMode ? 'border-white hover:bg-white hover:text-black' : 'border-black hover:bg-black hover:text-white'} font-brand-en text-sm uppercase tracking-[0.3em] transition-all duration-500`}
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
