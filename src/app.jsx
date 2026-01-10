import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, RefreshCw, Volume2, ChevronDown, Quote, Globe, Moon, Sun, Loader2, ChevronRight, ChevronLeft, Search, X, Copy, LayoutGrid, Check, Bug, Trash2, Sparkles, PenTool, Zap, MousePointer } from 'lucide-react';
import { SplashModern, SplashMinimalist, SplashArabian } from './splash-mockups.jsx';
import { SplashArabian1, SplashArabian2, SplashArabian3a, SplashArabian3b, SplashArabian3c } from './splash-arabian-variations.jsx';
import { SplashArabian4a, SplashArabian4b, SplashArabian4c } from './splash-final-variations.jsx';
import { SplashWildcard5a, SplashWildcard5b, SplashWildcard5c, SplashDirection5d, SplashDirection5e } from './splash-wildcard-variations.jsx';
import { Splash6a, Splash6b, Splash6c, Splash6d, Splash6e, Splash6f } from './splash-round6-variations.jsx';

/* =============================================================================
  1. FEATURE FLAGS & DESIGN SYSTEM
  =============================================================================
*/

const FEATURES = {
  grounding: false, 
  debug: true,
};

const DESIGN = {
  // Main Poem Display
  mainFontSize: 'text-base md:text-xl',
  mainEnglishFontSize: 'text-sm md:text-base',
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-8 pb-1',
  mainTagSize: 'text-[9px]',
  mainTitleSize: 'text-2xl md:text-4xl',
  mainSubtitleSize: 'text-[11px]',
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-lg',
  glass: 'backdrop-blur-2xl',
  radius: 'rounded-2xl',
  anim: 'transition-all duration-300 ease-in-out',
  buttonHover: 'hover:scale-105 hover:shadow-lg transition-all duration-300',
  touchTarget: 'min-w-[44px] min-h-[44px]',
};

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
    titleColor: 'text-[#C5A059]', // Antique Gold
    poetColor: 'text-[#C5A059]', // Unified Gold
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
    titleColor: 'text-[#8B7355]', // Antique Gold
    poetColor: 'text-[#8B7355]', // Unified Gold
    controlIcon: 'text-indigo-900/80 hover:text-black' 
  }
};

const CATEGORIES = [
  { id: "All", label: "All Poets", labelAr: "كل الشعراء" },
  { id: "Nizar Qabbani", label: "Nizar Qabbani", labelAr: "نزار قباني" },
  { id: "Mahmoud Darwish", label: "Mahmoud Darwish", labelAr: "محمود درويش" },
  { id: "Al-Mutanabbi", label: "Al-Mutanabbi", labelAr: "المتنبي" },
  { id: "Antarah", label: "Antarah", labelAr: "عنترة بن شداد" },
  { id: "Ibn Arabi", label: "Ibn Arabi", labelAr: "ابن عربي" }
];

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 

const SYSTEM_PROMPT = `
You are an expert scholar and master poet of both Arabic and English literature. 

TASK: POETIC INSIGHT
Provide exactly three sections labeled:
1. POEM: Provide a faithful, line-by-line English translation matching the Arabic lines exactly. Ensure poetic weight and grammatical elegance.
2. THE DEPTH: Exactly 3 sentences explaining meaning.
3. THE AUTHOR: Exactly 2 sentences on the poet.

Strictly adhere to this format:
POEM:
[Translation]
THE DEPTH: [Text]
THE AUTHOR: [Text]
`;

/* =============================================================================
  2. UTILITY COMPONENTS
  =============================================================================
*/

const MysticalConsultationEffect = ({ active, theme }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-1000">
      <div className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-125 opacity-80`} />
      <div className={`absolute inset-0 bg-radial-gradient from-purple-500/20 to-transparent animate-ping scale-150 opacity-30`} style={{ animationDuration: '3s' }} />
      <div className="absolute inset-0">
        {[...Array(45)].map((_, i) => (
          <div key={i} className="absolute bg-indigo-200 rounded-full animate-pulse" style={{
              width: Math.random() * 3 + 1 + 'px', height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2, animationDuration: Math.random() * 1 + 0.5 + 's'
          }} />
        ))}
      </div>
    </div>
  );
};

const DebugPanel = ({ logs, onClear, darkMode }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (!FEATURES.debug) return null;

  return (
    <div className={`w-full max-w-full transition-all duration-300 ${isExpanded ? 'h-48 md:h-64' : 'h-7'} overflow-hidden border-b ${
      darkMode ? 'bg-black/60 border-stone-800 text-stone-300' : 'bg-white/60 border-stone-200 text-stone-700'
    } backdrop-blur-md shadow-lg flex flex-col relative z-[100] flex-none`}>
      <div className="flex items-center justify-between px-6 h-7 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60 text-indigo-500 leading-none h-full">
          <Bug size={10} className="mb-0" /> <span>System Logs</span> <span className="ml-1 opacity-40">({logs.length})</span>
        </div>
        <div className="flex items-center gap-3 h-full">
          <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="p-1 hover:text-red-500 transition-colors flex items-center"><Trash2 size={10} /></button>
          <ChevronDown size={10} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 pb-3 font-mono text-[10px] space-y-1 custom-scrollbar">
        {logs.map((log, idx) => (
          <div key={idx} className={`pb-1 border-b border-stone-500/5 ${log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-indigo-400' : ''}`}>
            <span className="opacity-40">[{log.time}]</span> <span className="font-bold">{log.label}:</span> {log.msg}
          </div>
        ))}
      </div>
    </div>
  );
};

const CategoryPill = ({ selected, onSelect, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentCat = CATEGORIES.find(c => c.id === selected) || CATEGORIES[0];
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const theme = darkMode ? THEME.dark : THEME.light;

  return (
    <div className="relative mb-2 flex justify-center" ref={dropdownRef}>
      <div className={`flex flex-col ${DESIGN.radius} ${DESIGN.anim} shadow-xl overflow-hidden border ${DESIGN.glass} ${theme.pill}`}>
        <div className={`${DESIGN.anim} ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100 mb-1 border-b border-indigo-500/10' : 'max-h-0 opacity-0'}`}>
          <div className="p-1 flex flex-col gap-0.5">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { onSelect(cat.id); setIsOpen(false); }} className={`w-full px-5 py-2.5 flex flex-col items-center rounded-xl transition-all hover:bg-indigo-500/10 group ${selected === cat.id ? 'hidden' : ''}`}>
                <span className={`font-brand-ar text-base ${theme.titleColor} transition-colors opacity-90`}>{cat.labelAr}</span>
                <span className="font-brand-en text-[8px] uppercase tracking-wider opacity-40">{cat.label}</span>
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-center gap-3 px-4 py-2 transition-colors hover:bg-teal-500/5`}>
          <div className="flex flex-col items-center leading-none">
            <span className={`font-brand-ar text-lg ${theme.titleColor}`}>{currentCat.labelAr}</span>
            <span className="font-brand-en text-[8px] opacity-40 uppercase tracking-widest">{currentCat.label}</span>
          </div>
          <ChevronDown size={12} className={`${DESIGN.anim} ${isOpen ? 'rotate-180' : ''} text-stone-500`} />
        </button>
      </div>
    </div>
  );
};

const SplashScreen = ({ onGetStarted, darkMode }) => {
  const theme = darkMode ? THEME.dark : THEME.light;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${theme.bg} ${DESIGN.anim}`}>
      {/* Mystical background - Islamic geometric pattern */}
      <div className={`absolute inset-0 pointer-events-none opacity-[0.03] ${darkMode ? 'invert' : ''}`}
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M50 10 L60 30 L80 30 L65 43 L70 63 L50 50 L30 63 L35 43 L20 30 L40 30 Z' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3Ccircle cx='50' cy='50' r='35' fill='none' stroke='%23C5A059' stroke-width='0.5' stroke-dasharray='2,3'/%3E%3Cpath d='M50 15 Q65 50 50 85 Q35 50 50 15' fill='none' stroke='%23C5A059' stroke-width='0.5'/%3E%3C/svg%3E")`, backgroundSize: '100px 100px' }} />

      {/* Luminous glow effect */}
      <div className={`absolute inset-0 pointer-events-none bg-gradient-radial from-indigo-500/5 via-transparent to-transparent`} />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-8 md:gap-12 px-6 max-w-3xl mx-auto text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Logo with mystical aura */}
        <div className="flex flex-col items-center gap-6 relative">
          {/* Arabesque corner decorations */}
          <div className="absolute -top-8 -left-16 opacity-15">
            <svg width="60" height="60" viewBox="0 0 60 60" className={theme.brand}>
              <path d="M10 10 Q10 5 15 5 L25 5 Q30 5 30 10 L30 20 Q30 25 25 25 L15 25 Q10 25 10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </div>
          <div className="absolute -top-8 -right-16 opacity-15 scale-x-[-1]">
            <svg width="60" height="60" viewBox="0 0 60 60" className={theme.brand}>
              <path d="M10 10 Q10 5 15 5 L25 5 Q30 5 30 10 L30 20 Q30 25 25 25 L15 25 Q10 25 10 20 Z" fill="none" stroke="currentColor" strokeWidth="1" />
              <circle cx="20" cy="15" r="3" fill="currentColor" opacity="0.3" />
            </svg>
          </div>

          {/* PenTool icon */}
          <div className="relative">
            <PenTool size={64} className={`${theme.brand} opacity-90`} strokeWidth={1.5} />
          </div>

          <div className={`flex flex-col items-center gap-3 ${theme.brand} tracking-wide header-luminescence`}>
            <span className="font-brand-en text-6xl md:text-8xl lowercase tracking-tighter font-semibold">poetry</span>
            <span className="font-amiri text-2xl md:text-3xl opacity-70">بالعربي</span>
          </div>
          <span className={`font-brand-en text-xs px-3 py-1 rounded border ${theme.brandBorder} ${theme.brandBg} uppercase tracking-wider opacity-60`}>beta</span>
        </div>

        {/* Description - English primary */}
        <div className={`space-y-3 ${theme.text}`}>
          <p className="font-brand-en text-xl md:text-2xl leading-relaxed italic opacity-90">
            Journey through time into the realm of timeless poetry
          </p>
          <p className="font-amiri text-base md:text-lg leading-[2] opacity-50">
            رحلة عبر الزمن إلى عالم الشعر الخالد
          </p>
        </div>

        {/* Get Started Button - English primary */}
        <button
          onClick={onGetStarted}
          className={`group relative overflow-hidden px-10 py-4 ${theme.btnPrimary} ${DESIGN.radius} ${DESIGN.touchTarget} shadow-2xl font-brand-en text-xl font-semibold tracking-wide`}
        >
          <span className="relative z-10">Begin Journey</span>
          <span className="relative z-10 font-amiri text-sm mr-2 opacity-70">ابدأ الرحلة</span>
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </button>

        {/* Features Preview - English primary */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 w-full ${theme.text}`}>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Scroll icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <rect x="8" y="6" width="16" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 10 L20 10 M12 14 L20 14 M12 18 L18 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">Discover poetry by the greats</p>
            <span className="font-amiri text-xs opacity-40">اكتشف شعر العظماء</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Sound wave icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <path d="M6 16 L6 16 M10 12 L10 20 M14 8 L14 24 M18 12 L18 20 M22 8 L22 24 M26 12 L26 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">The poem is recited to you</p>
            <span className="font-amiri text-xs opacity-40">القصيدة تُتلى عليك</span>
          </div>
          <div className="flex flex-col items-center gap-3 p-4">
            {/* Lantern/light icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" className={theme.accent}>
              <path d="M16 4 L19 8 L13 8 Z" fill="currentColor" opacity="0.5" />
              <path d="M13 8 L19 8 L20 24 L12 24 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <ellipse cx="16" cy="16" rx="3" ry="4" fill="currentColor" opacity="0.3" />
              <path d="M12 24 L14 28 L18 28 L20 24" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <p className="font-brand-en text-base font-medium leading-relaxed text-center">Learn about the depth and meanings</p>
            <span className="font-amiri text-xs opacity-40">تعلّم عن العمق والمعاني</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const WalkthroughGuide = ({ onClose, darkMode, currentStep, onStepChange }) => {
  const theme = darkMode ? THEME.dark : THEME.light;

  const steps = [
    {
      title: "Welcome to Poetry Bil-Araby",
      titleAr: "مرحباً بك",
      description: "Experience timeless Arabic poetry that expands the mind and touches the soul",
      descriptionAr: "شعر عربي خالد"
    },
    {
      title: "Navigate Through Poems",
      titleAr: "تصفح القصائد",
      description: "Journey through centuries of poetic mastery with a simple gesture",
      descriptionAr: "رحلة عبر قرون"
    },
    {
      title: "Listen to Poetry",
      titleAr: "استمع للشعر",
      description: "Hear the verses come alive as they were meant to be recited",
      descriptionAr: "استمع للأبيات"
    },
    {
      title: "Discover Hidden Meanings",
      titleAr: "اكتشف المعاني",
      description: "Unlock the depth and wisdom woven into each verse",
      descriptionAr: "عمق وحكمة"
    }
  ];

  const step = steps[currentStep];

  // Islamic geometric pattern - octagon with 8 segments (2 per step)
  const segmentsLit = (currentStep + 1) * 2;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md ${DESIGN.anim}`}>
      {/* Mystical background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-150 opacity-30`} />
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-indigo-300 rounded-full animate-pulse" style={{
              width: Math.random() * 2 + 1 + 'px', height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.1, animationDuration: Math.random() * 3 + 2 + 's'
          }} />
        ))}
      </div>

      <div className={`relative max-w-2xl mx-6 ${theme.glass} ${DESIGN.glass} ${theme.border} border-2 ${DESIGN.radius} p-10 md:p-16 shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-700 overflow-hidden`}>
        {/* Arabesque corner flourishes - more ornate */}
        <div className="absolute top-0 left-0 w-20 h-20 pointer-events-none opacity-20">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute top-0 right-0 w-20 h-20 pointer-events-none opacity-20 scale-x-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute bottom-0 left-0 w-20 h-20 pointer-events-none opacity-20 scale-y-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>
        <div className="absolute bottom-0 right-0 w-20 h-20 pointer-events-none opacity-20 scale-[-1]">
          <svg viewBox="0 0 80 80" className={theme.brand}>
            <path d="M5 5 Q5 0 10 0 L30 0 Q35 0 35 5 L35 25 Q35 30 30 30 L10 30 Q5 30 5 25 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="20" cy="15" r="4" fill="currentColor" opacity="0.3" />
            <path d="M10 15 Q15 10 20 15 Q25 20 30 15" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </div>

        {/* Mystical glow behind icon */}
        <div className="absolute inset-0 bg-gradient-radial from-indigo-500/10 via-transparent to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className={`absolute top-4 right-4 p-2 ${theme.controlIcon} ${DESIGN.buttonHover} rounded-full z-10`}
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="flex flex-col items-center gap-8 text-center relative z-10">
          {/* PenTool icon with glow */}
          <div className={`relative p-6 ${theme.brandBg} rounded-full border border-indigo-500/20 shadow-lg`}>
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="relative z-10">
              <PenTool size={48} className={theme.brand} strokeWidth={1.5} />
            </div>
          </div>

          {/* English primary, Arabic complementary */}
          <div className={`space-y-3 ${theme.text}`}>
            <h3 className="font-brand-en text-3xl md:text-4xl font-semibold leading-tight">{step.title}</h3>
            <p className="font-amiri text-base opacity-50">{step.titleAr}</p>
          </div>

          <div className={`space-y-2 ${theme.text} max-w-md`}>
            <p className="font-brand-en text-lg md:text-xl leading-relaxed opacity-90">{step.description}</p>
            <p className="font-amiri text-sm opacity-40 leading-[1.8]">{step.descriptionAr}</p>
          </div>

          {/* Islamic geometric pattern step indicator */}
          <div className="relative mt-6">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform rotate-[22.5deg]">
              {/* Octagon - 8 segments */}
              {[...Array(8)].map((_, i) => {
                const angle = (i * 45) * Math.PI / 180;
                const nextAngle = ((i + 1) * 45) * Math.PI / 180;
                const r = 50;
                const cx = 60;
                const cy = 60;

                const x1 = cx + r * Math.cos(angle);
                const y1 = cy + r * Math.sin(angle);
                const x2 = cx + r * Math.cos(nextAngle);
                const y2 = cy + r * Math.sin(nextAngle);

                const isLit = i < segmentsLit;

                return (
                  <g key={i}>
                    <path
                      d={`M ${cx} ${cy} L ${x1} ${y1} L ${x2} ${y2} Z`}
                      fill={isLit ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      className={`${DESIGN.anim} ${isLit ? theme.brand + ' opacity-60' : 'opacity-10'}`}
                      style={{ transitionDuration: '800ms' }}
                    />
                    {isLit && (
                      <circle
                        cx={(x1 + x2) / 2}
                        cy={(y1 + y2) / 2}
                        r="3"
                        fill="currentColor"
                        className={`${theme.brand} opacity-80 animate-pulse`}
                      />
                    )}
                  </g>
                );
              })}
              {/* Center circle */}
              <circle cx="60" cy="60" r="15" fill="none" stroke="currentColor" strokeWidth="1.5" className={`${theme.brand} opacity-20`} />
              <circle cx="60" cy="60" r="8" fill="currentColor" className={`${theme.brand} opacity-30`} />
            </svg>

            {/* Step dots below pattern */}
            <div className="flex items-center justify-center gap-2 mt-4">
              {steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => onStepChange(idx)}
                  className={`w-2 h-2 rounded-full ${DESIGN.anim} transition-all duration-500 ${
                    idx === currentStep
                      ? `${theme.brand} w-3 h-3`
                      : idx < currentStep
                      ? 'bg-indigo-500/50'
                      : 'bg-stone-500/20'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Navigation - English primary */}
          <div className="flex items-center gap-4 mt-6 w-full">
            {currentStep > 0 && (
              <button
                onClick={() => onStepChange(currentStep - 1)}
                className={`flex-1 px-6 py-3 border-2 ${theme.border} ${DESIGN.radius} ${DESIGN.buttonHover} font-brand-en text-base font-medium hover:bg-indigo-500/5`}
              >
                Previous
                <span className="font-amiri text-xs ml-2 opacity-50">السابق</span>
              </button>
            )}
            <button
              onClick={currentStep < steps.length - 1 ? () => onStepChange(currentStep + 1) : onClose}
              className={`flex-1 px-6 py-3 ${theme.btnPrimary} ${DESIGN.radius} ${DESIGN.buttonHover} font-brand-en text-base font-semibold shadow-xl`}
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Start Exploring'}
              <span className="font-amiri text-xs mr-2 opacity-70">{currentStep < steps.length - 1 ? 'التالي' : 'ابدأ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =============================================================================
  3. MAIN APPLICATION
  =============================================================================
*/

export default function DiwanApp() {
  const mainScrollRef = useRef(null);
  const audioRef = useRef(new Audio());
  
  const [headerOpacity, setHeaderOpacity] = useState(1);
  const [poems, setPoems] = useState([{
    id: 1, poet: "Nizar Qabbani", poetArabic: "نزار قباني", title: "My Beloved", titleArabic: "حبيبتي",
    arabic: "حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة\nحُبُّكِ مِثْلَ المَوْتِ وَالوِلَادَة\nصَعْبٌ بِأَنْ يُعَادَ مَرَّتَيْنِ",
    english: "Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.\nYour love is like Death and like Birth—\nIt is difficult for it to be repeated twice.",
    tags: ["Modern", "Romantic", "Ghazal"]
  }]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [darkMode, setDarkMode] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showSplash, setShowSplash] = useState(() => {
    // Skip splash screen in tests by checking URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return !params.has('skipSplash');
    }
    return true;
  });
  const [mockupType, setMockupType] = useState(() => {
    // Check which mockup to show from URL parameter
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mockup') || 'default';
    }
    return 'default';
  });
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [walkthroughStep, setWalkthroughStep] = useState(0);

  const theme = darkMode ? THEME.dark : THEME.light;

  // Sync theme to HTML element class for E2E tests
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.className = darkMode ? 'dark' : 'light';
    }
  }, [darkMode]);

  const filtered = useMemo(() => {
    const searchStr = selectedCategory.toLowerCase();
    return selectedCategory === "All" 
      ? poems 
      : poems.filter(p => {
          const poetMatch = (p?.poet || "").toLowerCase().includes(searchStr);
          const tagsMatch = Array.isArray(p?.tags) && p.tags.some(t => String(t).toLowerCase() === searchStr);
          return poetMatch || tagsMatch;
        });
  }, [poems, selectedCategory]);

  const current = filtered[currentIndex] || filtered[0] || poems[0];

  const addLog = (label, msg, type = 'info') => {
    setLogs(prev => [...prev, { label, msg: String(msg), type, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) }]);
  };

  useEffect(() => {
    if (selectedCategory !== "All" && filtered.length === 0) {
      handleFetch();
    } else {
      setCurrentIndex(0);
    }
  }, [selectedCategory]);

  const handleScroll = (e) => {
    setHeaderOpacity(Math.max(0, 1 - e.target.scrollTop / 30)); 
  };

  const insightParts = useMemo(() => {
    if (!interpretation) return null;
    const parts = interpretation.split(/POEM:|THE DEPTH:|THE AUTHOR:/i).map(p => p.trim()).filter(Boolean);
    return { poeticTranslation: parts[0] || "", depth: parts[1] || "", author: parts[2] || "" };
  }, [interpretation]);

  const versePairs = useMemo(() => {
    const arLines = (current?.arabic || "").split('\n').filter(l => l.trim());
    const enSource = insightParts?.poeticTranslation || current?.english || "";
    const enLines = enSource.split('\n').filter(l => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || "", en: enLines[i] || "" });
    }
    return pairs;
  }, [current, insightParts]);

  const pcm16ToWav = (base64, rate = 24000) => {
    try {
      const cleanedBase64 = base64.replace(/\s/g, '');
      const bin = atob(cleanedBase64);
      const buf = new ArrayBuffer(bin.length);
      const view = new DataView(buf);
      for (let i = 0; i < bin.length; i++) view.setUint8(i, bin.charCodeAt(i));
      const samples = new Int16Array(buf);
      const wavBuf = new ArrayBuffer(44 + samples.length * 2);
      const wavView = new DataView(wavBuf);
      const s = (o, str) => { for (let i = 0; i < str.length; i++) wavView.setUint8(o + i, str.charCodeAt(i)); };
      s(0, 'RIFF'); wavView.setUint32(4, 36 + samples.length * 2, true); s(8, 'WAVE'); s(12, 'fmt ');
      wavView.setUint32(16, 16, true); wavView.setUint16(20, 1, true); wavView.setUint16(22, 1, true);
      wavView.setUint32(24, rate, true); wavView.setUint32(28, rate * 2, true); wavView.setUint16(32, 2, true);
      wavView.setUint16(34, 16, true); s(36, 'data'); wavView.setUint32(40, samples.length * 2, true);
      new Int16Array(wavBuf, 44).set(samples);
      return new Blob([wavBuf], { type: 'audio/wav' });
    } catch (e) {
      addLog("Audio Error", e.message, "error");
      return null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  const togglePlay = async () => {
    if (isPlaying) { 
      audioRef.current.pause(); 
      setIsPlaying(false); 
      return; 
    }

    if (audioUrl) { 
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setAudioUrl(null);
        togglePlay();
      });
      return; 
    }

    setIsGeneratingAudio(true);
    addLog("Audio", "Opening the Diwan...");
    const mood = current?.tags?.[1] || "Poetic";
    const era = current?.tags?.[0] || "Classical";
    const poet = current?.poet || "the Master Poet";
    const ttsInstruction = `Act as a master orator. Recite this masterpiece by ${poet} in the soulful, ${mood} tone of the ${era} era. Use high intensity, passionate oratorical power, and majestic strength. Include natural pauses and audible breaths. Text: ${current?.arabic}`;

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: ttsInstruction }] }], generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Fenrir" } } } } }) });
      const data = await res.json();
      
      if (!data.candidates || data.candidates.length === 0) throw new Error("Recitation failed.");

      const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (b64) {
        const blob = pcm16ToWav(b64);
        if (blob) {
          const u = URL.createObjectURL(blob);
          setAudioUrl(u); 
          audioRef.current.src = u; 
          audioRef.current.load();
          audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
             addLog("Playback Blocked", "Please interact with the page first.", "error");
             setIsPlaying(false);
          });
        }
      }
    } catch (e) { 
      addLog("Audio System Error", e.message, "error"); 
      setIsPlaying(false); 
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleAnalyze = async () => {
    if (interpretation || isInterpreting) return;
    setIsInterpreting(true);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `Deep Analysis of: ${current?.arabic}` }] }], systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] } }) });
      const data = await res.json();
      setInterpretation(data.candidates?.[0]?.content?.parts?.[0]?.text);
    } catch (e) { addLog("Analysis Error", e.message, "error"); }
    setIsInterpreting(false);
  };

  const handleFetch = async () => {
    if (isFetching) return;
    setIsFetching(true);
    addLog("Discovery", `Consulting ${selectedCategory}...`);
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const prompt = selectedCategory === "All" ? "Find a masterpiece Arabic poem. COMPLETE text." : `Find a famous poem by ${selectedCategory}. COMPLETE text.`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: `${prompt} JSON only.` }] }], systemInstruction: { parts: [{ text: `Return JSON: poet, poetArabic, title, titleArabic, arabic (full text, FULL tashkeel), english, tags (Era, Mood, Type).` }] }, generationConfig: { responseMimeType: "application/json" } }) });
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const cleanJson = (rawText || "").replace(/```json|```/g, "").trim();
      const newPoem = { ...JSON.parse(cleanJson), id: Date.now() };
      setPoems(prev => {
        const updated = [...prev, newPoem];
        const freshFiltered = selectedCategory === "All" ? updated : updated.filter(p => (p?.poet || "").toLowerCase().includes(selectedCategory.toLowerCase()) || (Array.isArray(p?.tags) && p.tags.some(t => String(t).toLowerCase() === searchStr)));
        const newIdx = freshFiltered.findIndex(p => p.id === newPoem.id);
        if (newIdx !== -1) setCurrentIndex(newIdx);
        return updated;
      });
    } catch (e) { addLog("Discovery Error", e.message, "error"); }
    setIsFetching(false);
  };

  useEffect(() => {
    setInterpretation(null);
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [current?.id]);

  const handleGetStarted = () => {
    setShowSplash(false);
    setShowWalkthrough(true);
  };

  const handleCloseWalkthrough = () => {
    setShowWalkthrough(false);
    setWalkthroughStep(0);
  };

  return (
    <div className={`h-screen w-full flex flex-col overflow-hidden ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Forum&family=Reem+Kufi:wght@400;700&display=swap');
        .font-amiri { font-family: 'Amiri', serif; }
        .font-serif { font-family: 'Playfair Display', serif; }
        .font-brand-en { font-family: 'Forum', serif; }
        .font-brand-ar { font-family: 'Reem Kufi', sans-serif; }
        .arabic-shadow { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2); border-radius: 10px; }
        .bg-radial-gradient { background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%); }
        .app-branding-rtl { direction: rtl; }
        
        .header-luminescence {
          text-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
        }

        .arch-frame {
          position: relative;
          width: clamp(100%, 95vw, 100%);
          height: clamp(100px, 24vw, 280px);
          margin: 0 auto;
          padding: clamp(12px, 3vw, 32px) clamp(16px, 4vw, 48px);
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 1.8 / 1;
        }

        .arch-frame svg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .arch-line {
          fill: none;
          stroke: #C5A059;
          stroke-width: clamp(0.8, 0.2vw, 2);
          opacity: 0.25;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}</style>

      <DebugPanel logs={logs} onClear={() => setLogs([])} darkMode={darkMode} />

      {showSplash && (() => {
        const splashProps = { onGetStarted: handleGetStarted, darkMode, theme, onToggleTheme: () => setDarkMode(!darkMode) };
        switch (mockupType) {
          case 'modern':
            return <SplashModern {...splashProps} />;
          case 'minimalist':
            return <SplashMinimalist {...splashProps} />;
          case 'arabian':
            return <SplashArabian {...splashProps} />;
          case '1':
            return <SplashArabian1 {...splashProps} />;
          case '2':
            return <SplashArabian2 {...splashProps} />;
          case '3a':
            return <SplashArabian3a {...splashProps} />;
          case '3b':
            return <SplashArabian3b {...splashProps} />;
          case '3c':
            return <SplashArabian3c {...splashProps} />;
          case '4a':
            return <SplashArabian4a {...splashProps} />;
          case '4b':
            return <SplashArabian4b {...splashProps} />;
          case '4c':
            return <SplashArabian4c {...splashProps} />;
          case '5a':
            return <SplashWildcard5a {...splashProps} />;
          case '5b':
            return <SplashWildcard5b {...splashProps} />;
          case '5c':
            return <SplashWildcard5c {...splashProps} />;
          case '5d':
            return <SplashDirection5d {...splashProps} />;
          case '5e':
            return <SplashDirection5e {...splashProps} />;
          case '6a':
            return <Splash6a {...splashProps} />;
          case '6b':
            return <Splash6b {...splashProps} />;
          case '6c':
            return <Splash6c {...splashProps} />;
          case '6d':
            return <Splash6d {...splashProps} />;
          case '6e':
            return <Splash6e {...splashProps} />;
          case '6f':
            return <Splash6f {...splashProps} />;
          default:
            return <SplashScreen onGetStarted={handleGetStarted} darkMode={darkMode} />;
        }
      })()}
      {showWalkthrough && (
        <WalkthroughGuide
          onClose={handleCloseWalkthrough}
          darkMode={darkMode}
          currentStep={walkthroughStep}
          onStepChange={setWalkthroughStep}
        />
      )}

      <header style={{ opacity: headerOpacity }} className="fixed top-8 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300 flex flex-row items-center justify-center gap-8 px-6">
        <div className={`flex flex-row-reverse items-center gap-4 ${theme.brand} tracking-wide header-luminescence`}>
          <PenTool size={42} className="opacity-95" strokeWidth={1.5} />
          <h1 className="app-branding-rtl flex items-end gap-6">
            <span className="font-brand-ar text-5xl font-bold mb-2 opacity-80">بالعربي</span>
            <span className="font-brand-en text-7xl lowercase tracking-tighter">poetry</span>
            <span className="font-brand-en text-xs px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 uppercase tracking-wider mb-4 ml-3 opacity-60">beta</span>
          </h1>
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className={`absolute inset-0 pointer-events-none opacity-[0.04] ${darkMode ? 'invert' : ''}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main ref={mainScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 md:px-0">
            <div className="min-h-full flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-4xl flex flex-col items-center">
                
                <div className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}>
                   <div className="arch-frame mb-1">
                      <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid meet" className="w-full h-auto">
                        <path className="arch-line" d="M50,180 L50,80 C50,20 750,20 750,80 L750,180" />
                        <path className="arch-line opacity-20" d="M80,180 L80,100 C80,40 720,40 720,100 L720,180" />
                      </svg>
                      
                      <div className="relative z-10 flex flex-col items-center justify-center w-full">
                         <div className={`flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-4 font-amiri text-sm sm:text-lg md:${DESIGN.mainTitleSize}`}>
                           <span className={`${theme.poetColor} opacity-90`}>{current?.poetArabic}</span>
                           <span className="opacity-10 text-xs sm:text-sm md:text-xl">-</span>
                           <span className={`${theme.titleColor} font-bold`}>{current?.titleArabic}</span>
                         </div>
                         <div className={`flex items-center justify-center gap-1 sm:gap-2 opacity-45 text-[8px] sm:text-[9px] md:${DESIGN.mainSubtitleSize} font-brand-en tracking-[0.08em] uppercase mt-1 sm:mt-2 md:mt-3`}>
                           <span className="font-semibold">{current?.poet}</span> <span className="opacity-20">•</span> <span>{current?.title}</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-center gap-3 mt-4">
                     {Array.isArray(current?.tags) && current.tags.slice(0, 3).map(tag => (
                       <span key={tag} className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}>
                         {tag}
                       </span>
                     ))}
                   </div>
                </div>

                <div className={`relative w-full group py-8 ${DESIGN.mainMarginBottom}`}>
                  <div className="px-4 md:px-20 py-6 text-center">
                    <div className="flex flex-col gap-5 md:gap-7">
                      {versePairs.map((pair, idx) => (
                        <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                          <p dir="rtl" className={`font-amiri ${DESIGN.mainFontSize} leading-[2.2]  arabic-shadow`}>{pair.ar}</p>
                          {pair.en && <p dir="ltr" className={`font-brand-en italic ${DESIGN.mainEnglishFontSize} opacity-40 ${DESIGN.anim}`}>{pair.en}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-2xl px-6 md:px-0 mb-32 md:hidden">
                   {isInterpreting ? (
                     <div className="flex flex-col items-center py-8 gap-4">
                       <div className="relative">
                         <Loader2 className="animate-spin text-indigo-500" size={32} />
                         <Sparkles className="absolute inset-0 m-auto animate-pulse text-indigo-400" size={16} />
                       </div>
                       <p className="text-xs italic font-brand-en opacity-60 tracking-widest uppercase">Consulting the Diwan...</p>
                     </div>
                   ) : interpretation ? (
                     <div className={`flex flex-col gap-10 animate-in slide-in-from-bottom-10 duration-1000`}>
                        <div className="pt-6 border-t border-indigo-500/10">
                          <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">The Depth</h4>
                          <div className="pl-4 border-l border-indigo-500/10">
                            <p className="text-[15px] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.depth}</p>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-indigo-500/10">
                          <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">The Author</h4>
                          <div className="pl-4 border-l border-indigo-500/10">
                            <p className="text-[15px] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.author}</p>
                          </div>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col items-center gap-4 py-8">
                       <button 
                        onClick={handleAnalyze} 
                        className={`group relative w-16 h-16 flex items-center justify-center rounded-full border ${theme.brandBorder} ${theme.brand} transition-all duration-1000 hover:scale-110 shadow-2xl overflow-hidden bg-indigo-500/5`}
                       >
                         <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-[spin_8s_linear_infinite]" />
                         <RefreshCw className="animate-[spin_20s_linear_infinite] opacity-30 text-indigo-400" size={40} />
                         <Sparkles className="absolute group-hover:scale-125 transition-transform duration-500" size={24} />
                       </button>
                       <span className="text-[9px] font-brand-en tracking-[0.4em] uppercase opacity-40">Reveal Insight</span>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </main>

          <footer className="flex-none py-3 px-4 flex flex-col items-center z-20 relative bg-gradient-to-t from-black/5 to-transparent">
            <CategoryPill selected={selectedCategory} onSelect={setSelectedCategory} darkMode={darkMode} />
            <div className={`flex items-center gap-2 md:gap-4 px-3 md:px-5 py-2 rounded-full shadow-2xl border ${DESIGN.glass} ${theme.border} ${theme.shadow} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}>
              
              <button onClick={handleFetch} disabled={isFetching} className={`p-1.5 transition-all hover:scale-110 relative group ${theme.controlIcon}`}>
                {isFetching ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} className="stroke-[1.5]" />}
                <span className="absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-indigo-900 text-white font-brand-en text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Discover</span>
              </button>

              <div className="w-px h-5 bg-stone-500/20 mx-0.5 md:mx-1 flex-shrink-0" />

              <div className="flex items-center">
                <button onClick={() => setCurrentIndex(prev => (prev - 1 + filtered.length) % filtered.length)} disabled={filtered.length <= 1} className={`p-1.5 disabled:opacity-10 transition-colors ${theme.controlIcon}`}><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentIndex(prev => (prev + 1) % filtered.length)} disabled={filtered.length <= 1} className={`p-1.5 disabled:opacity-10 transition-colors ${theme.controlIcon}`}><ChevronRight size={20} /></button>
              </div>
              
              <div className="w-px h-5 bg-stone-500/20 mx-0.5 md:mx-1 flex-shrink-0" />
              
              <button onClick={togglePlay} disabled={isGeneratingAudio} className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl transition-all duration-300 hover:scale-110 active:scale-95 group relative ${theme.btnPrimary}`}>
                 <div className="absolute inset-0 rounded-full border border-white/20 scale-110 opacity-0 group-hover:opacity-100 transition-all duration-300" />
                {isGeneratingAudio ? <Loader2 className="animate-spin" size={18} /> : isPlaying ? <Pause fill="currentColor" size={18} /> : <Play fill="currentColor" className="ml-0.5" size={18} />}
              </button>
              
              <div className="w-px h-5 bg-stone-500/20 mx-0.5 md:mx-1 flex-shrink-0" />

              <div className="flex items-center">
                <button onClick={() => { const text = `${current?.poet} - ${current?.title}\n${current?.poetArabic} - ${current?.titleArabic}\n\n${current?.arabic}\n\n${current?.english}`; const el = document.createElement('textarea'); el.value = text; document.body.appendChild(el); el.select(); document.execCommand('copy'); document.body.removeChild(el); setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); }} className={`p-1.5 transition-all duration-300 ${copySuccess ? 'text-green-500' : theme.controlIcon}`}>
                  {copySuccess ? <Check size={18} /> : <Copy size={18} />}
                </button>
                <button onClick={() => setDarkMode(!darkMode)} className={`p-1.5 transition-colors ${theme.controlIcon}`}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
              </div>
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}>
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <h3 className="font-brand-en italic font-semibold text-lg text-indigo-600 tracking-tight">Poetic Insight</h3>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate">{current?.poet} • {current?.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isInterpreting ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse"><Sparkles className="animate-spin text-indigo-500" size={32} /><p className="font-brand-en italic text-sm">Consulting Diwan...</p></div>
              ) : (
                <div className={DESIGN.paneSpacing}>
                  {!interpretation && (
                    <button 
                      onClick={handleAnalyze} 
                      className={`group relative w-full py-4 border ${theme.brandBorder} ${theme.brand} rounded-full font-brand-en tracking-widest text-[10px] uppercase hover:bg-indigo-500/5 transition-all flex items-center justify-center gap-3 overflow-hidden bg-indigo-500/5`}
                    >
                       <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-indigo-500/10 to-transparent animate-[spin_8s_linear_infinite]" />
                       <Sparkles size={12} /> Seek Insight
                    </button>
                  )}
                  <p className={`font-brand-en italic whitespace-pre-wrap ${DESIGN.paneVerseSize} ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}>{insightParts?.poeticTranslation || current?.english}</p>
                  {insightParts?.depth && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">The Depth</h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.depth}</p>
                      </div>
                    </div>
                  )}
                  {insightParts?.author && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">The Author</h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-sm font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.author}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}