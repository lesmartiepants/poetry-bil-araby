import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, RefreshCw, Volume2, ChevronDown, Quote, Globe, Moon, Sun, Loader2, ChevronRight, ChevronLeft, Search, X, Copy, LayoutGrid, Check, Bug, Trash2, Sparkles, PenTool, Library, Compass, Rabbit, MoreHorizontal } from 'lucide-react';

/* =============================================================================
  1. FEATURE FLAGS & DESIGN SYSTEM
  =============================================================================
*/

const FEATURES = {
  grounding: false,
  debug: true,
  caching: true,      // Enable IndexedDB caching for audio/insights
  streaming: true,    // Enable streaming insights (progressive rendering)
  prefetching: true   // Enable aggressive prefetching of audio/insights
};

const DESIGN = {
  // Main Poem Display - with fluid responsive scaling using clamp()
  mainFontSize: 'text-[clamp(1.25rem,2vw,1.5rem)]', // 20px-24px (updated from text-xl md:text-2xl)
  mainEnglishFontSize: 'text-[clamp(1rem,1.5vw,1.125rem)]', // 16px-18px
  mainLineHeight: 'leading-[2.4]',
  mainMetaPadding: 'pt-8 pb-1',
  mainTagSize: 'text-[11px]',
  mainTitleSize: 'text-[clamp(1.875rem,3.5vw,2.25rem)]', // 30px-36px (updated from text-3xl md:text-4xl)
  mainSubtitleSize: 'text-[clamp(10px,1.2vw,14px)]', // 10px-14px (updated from text-sm)
  mainMarginBottom: 'mb-8',
  paneWidth: 'w-full md:w-96',
  panePadding: 'p-8',
  paneSpacing: 'space-y-8',
  paneVerseSize: 'text-[clamp(1rem,1.8vw,1.125rem)]', // 16px-18px for insight panel
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
    titleColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    poetColor: 'text-[#8B7355]', // Antique Gold (rich, warm tone - 5.2:1 contrast)
    controlIcon: 'text-indigo-950/90 hover:text-black'
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

const FONTS = [
  { id: "Amiri", label: "Amiri", labelAr: "أميري", family: "font-amiri" },
  { id: "Alexandria", label: "Alexandria", labelAr: "الإسكندرية", family: "font-alexandria" },
  { id: "El Messiri", label: "El Messiri", labelAr: "المسيري", family: "font-messiri" },
  { id: "Lalezar", label: "Lalezar", labelAr: "لاله‌زار", family: "font-lalezar" },
  { id: "Rakkas", label: "Rakkas", labelAr: "رقاص", family: "font-rakkas" },
  { id: "Fustat", label: "Fustat", labelAr: "فسطاط", family: "font-fustat" },
  { id: "Kufam", label: "Kufam", labelAr: "كوفام", family: "font-kufam" },
  { id: "Katibeh", label: "Katibeh", labelAr: "كاتبة", family: "font-katibeh" }
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
  2. CACHE CONFIGURATION & INDEXEDDB WRAPPER
  =============================================================================
*/

const CACHE_CONFIG = {
  dbName: 'poetry-cache-v1',
  version: 1,
  stores: {
    audio: 'audio-cache',
    insights: 'insights-cache',
    poems: 'poems-cache'
  },
  expiry: {
    audio: 7 * 24 * 60 * 60 * 1000,      // 7 days
    insights: 30 * 24 * 60 * 60 * 1000,  // 30 days
    poems: null                           // Never expire
  },
  maxSize: 500 * 1024 * 1024 // 500MB
};

/**
 * Initialize IndexedDB cache database
 * Creates object stores for audio, insights, and poems if they don't exist
 */
const initCache = () => {
  return new Promise((resolve, reject) => {
    if (!FEATURES.caching) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(CACHE_CONFIG.dbName, CACHE_CONFIG.version);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.audio)) {
        db.createObjectStore(CACHE_CONFIG.stores.audio, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.insights)) {
        db.createObjectStore(CACHE_CONFIG.stores.insights, { keyPath: 'poemId' });
      }
      if (!db.objectStoreNames.contains(CACHE_CONFIG.stores.poems)) {
        db.createObjectStore(CACHE_CONFIG.stores.poems, { keyPath: 'poemId' });
      }
    };
  });
};

/**
 * Cache operations for IndexedDB
 * Provides get, set, delete, and clear operations with expiry checking
 */
const cacheOperations = {
  /**
   * Get an item from cache with expiry check
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<Object|null>} Cached data or null if expired/missing
   */
  async get(storeName, poemId) {
    if (!FEATURES.caching) return null;

    try {
      const db = await initCache();
      if (!db) return null;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(poemId);

        request.onsuccess = () => {
          const result = request.result;
          if (!result) {
            resolve(null);
            return;
          }

          // Check expiry
          const expiryTime = storeName === CACHE_CONFIG.stores.audio
            ? CACHE_CONFIG.expiry.audio
            : storeName === CACHE_CONFIG.stores.insights
            ? CACHE_CONFIG.expiry.insights
            : CACHE_CONFIG.expiry.poems;

          if (expiryTime && result.timestamp) {
            const age = Date.now() - result.timestamp;
            if (age > expiryTime) {
              // Expired - delete and return null
              cacheOperations.delete(storeName, poemId);
              resolve(null);
              return;
            }
          }

          resolve(result);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  },

  /**
   * Set an item in cache with timestamp
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @param {Object} data - Data to cache (will be wrapped with poemId and timestamp)
   * @returns {Promise<boolean>} Success status
   */
  async set(storeName, poemId, data) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const record = {
          poemId,
          timestamp: Date.now(),
          ...data
        };
        const request = store.put(record);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  },

  /**
   * Delete an item from cache
   * @param {string} storeName - Name of the object store
   * @param {string|number} poemId - ID of the poem
   * @returns {Promise<boolean>} Success status
   */
  async delete(storeName, poemId) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(poemId);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  },

  /**
   * Clear all items from a store
   * @param {string} storeName - Name of the object store
   * @returns {Promise<boolean>} Success status
   */
  async clear(storeName) {
    if (!FEATURES.caching) return false;

    try {
      const db = await initCache();
      if (!db) return false;

      return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Cache clear error:', error);
      return false;
    }
  }
};

/* =============================================================================
  3. UTILITY COMPONENTS
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
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="Select poet category"
      >
        <Library size={21} className="text-[#C5A059]" />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Poets</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[220px] bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => { onSelect(cat.id); setIsOpen(false); }}
              className={`w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center border-b border-[rgba(197,160,89,0.08)] last:border-b-0 hover:bg-[rgba(197,160,89,0.08)] ${selected === cat.id ? 'bg-[rgba(197,160,89,0.12)]' : ''}`}
            >
              <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">{cat.labelAr}</div>
              <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{cat.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const ThemeDropdown = ({ darkMode, onToggleDarkMode, currentFont, onCycleFont, fonts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const handleCycleFont = () => {
    onCycleFont();
    setIsOpen(false);
  };

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="Theme options"
      >
        {darkMode ? <Sun size={21} className="text-[#C5A059]" /> : <Moon size={21} className="text-[#C5A059]" />}
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Theme</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[200px] bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          <button
            onClick={handleCycleFont}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">تبديل الخط</div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Cycle Font: {currentFont}</div>
          </button>
          <button
            onClick={handleToggleDarkMode}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div className="font-amiri text-[clamp(1rem,1.8vw,1.125rem)] text-[#C5A059] mb-[3px] font-medium">{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{darkMode ? 'Light Mode' : 'Dark Mode'}</div>
          </button>
        </div>
      )}
    </div>
  );
};

const OverflowMenu = ({
  darkMode,
  onToggleDarkMode,
  currentFont,
  onCycleFont,
  selectedCategory,
  onSelectCategory,
  onCopy,
  showCopySuccess
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false); };
    document.addEventListener("mousedown", clickOut);
    return () => document.removeEventListener("mousedown", clickOut);
  }, []);

  const handleCopy = () => {
    onCopy();
    setIsOpen(false);
  };

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setIsOpen(false);
  };

  const handleSelectCategory = (catId) => {
    onSelectCategory(catId);
    setIsOpen(false);
  };

  const handleCycleFont = () => {
    onCycleFont();
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105"
        aria-label="More options"
      >
        <MoreHorizontal size={21} className="text-[#C5A059]" />
      </button>
      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">More</span>

      {isOpen && (
        <div className="absolute bottom-full right-[-20px] mb-3 min-w-[220px] max-h-[80vh] overflow-y-auto custom-scrollbar bg-[rgba(20,18,16,0.98)] backdrop-blur-[48px] border border-[rgba(197,160,89,0.15)] rounded-3xl p-3 shadow-[0_-10px_40px_rgba(0,0,0,0.7)] z-50">
          <button
            onClick={handleCopy}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            {showCopySuccess ? <Check size={18} className="text-green-500" /> : <Copy size={18} className="text-[#C5A059]" />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">نسخ</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Copy</div>
            </div>
          </button>

          <button
            onClick={handleToggleDarkMode}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            {darkMode ? <Sun size={18} className="text-[#C5A059]" /> : <Moon size={18} className="text-[#C5A059]" />}
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">{darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Theme</div>
            </div>
          </button>

          <button
            onClick={handleCycleFont}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <PenTool size={18} className="text-[#C5A059]" />
            <div className="flex flex-col items-start">
              <div className="font-amiri text-base text-[#C5A059] font-medium">تبديل الخط</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">Font: {currentFont}</div>
            </div>
          </button>

          <div className="border-b border-[rgba(197,160,89,0.08)] last:border-b-0">
            <div className="px-5 py-2">
              <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-30 text-[#a8a29e]">Poets</div>
            </div>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => handleSelectCategory(cat.id)}
                className={`w-full p-[10px_20px] cursor-pointer transition-all duration-200 flex items-center gap-2 hover:bg-[rgba(197,160,89,0.08)] ${selectedCategory === cat.id ? 'bg-[rgba(197,160,89,0.12)]' : ''}`}
              >
                <Library size={14} className="text-[#C5A059] opacity-60" />
                <div className="flex flex-col items-start">
                  <div className="font-amiri text-sm text-[#C5A059] font-medium">{cat.labelAr}</div>
                  <div className="font-brand-en text-[8px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">{cat.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
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
  const controlBarRef = useRef(null);

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
  const [currentFont, setCurrentFont] = useState("Amiri");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [logs, setLogs] = useState([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isOverflow, setIsOverflow] = useState(false);
  const [cacheStats, setCacheStats] = useState({ audioHits: 0, audioMisses: 0, insightsHits: 0, insightsMisses: 0 });

  const theme = darkMode ? THEME.dark : THEME.light;

  const currentFontClass = useMemo(() => {
    const font = FONTS.find(f => f.id === currentFont);
    return font ? font.family : FONTS[0].family;
  }, [currentFont]);

  const cycleFont = () => {
    const currentIdx = FONTS.findIndex(f => f.id === currentFont);
    const nextIdx = (currentIdx + 1) % FONTS.length;
    setCurrentFont(FONTS[nextIdx].id);
    addLog("Font", `Switched to ${FONTS[nextIdx].label}`, "info");
  };

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

  useEffect(() => {
    const detectOverflow = () => {
      if (controlBarRef.current) {
        const controlBar = controlBarRef.current;
        const viewportWidth = window.innerWidth;
        const controlBarWidth = controlBar.scrollWidth;
        setIsOverflow(controlBarWidth > viewportWidth * 0.9);
      }
    };

    detectOverflow();
    window.addEventListener('resize', detectOverflow);
    return () => window.removeEventListener('resize', detectOverflow);
  }, []);

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
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        addLog("Audio", "Retrying playback...", "info");
        setAudioUrl(null);
        togglePlay();
      });
      return;
    }

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
      if (cached?.blob) {
        addLog("Audio Cache", "Playing from cache (instant)", "success");
        setCacheStats(prev => ({ ...prev, audioHits: prev.audioHits + 1 }));

        const u = URL.createObjectURL(cached.blob);
        setAudioUrl(u);
        audioRef.current.src = u;
        audioRef.current.load();
        audioRef.current.play().then(() => setIsPlaying(true)).catch(e => {
          addLog("Audio", "Starting cached playback...", "info");
          setIsPlaying(true);
        });
        return;
      } else {
        addLog("Audio Cache", "Cache miss - generating audio", "info");
        setCacheStats(prev => ({ ...prev, audioMisses: prev.audioMisses + 1 }));
      }
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
             addLog("Audio", "Starting playback...", "info");
             setIsPlaying(true);
          });

          // CACHE THE AUDIO BLOB
          if (FEATURES.caching && current?.id) {
            await cacheOperations.set(CACHE_CONFIG.stores.audio, current.id, {
              blob,
              metadata: {
                poet: current.poet,
                title: current.title,
                size: blob.size
              }
            });
            addLog("Audio Cache", "Audio cached for future playback", "success");
          }
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

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
      if (cached?.interpretation) {
        addLog("Insights Cache", "Loaded from cache (instant)", "success");
        setCacheStats(prev => ({ ...prev, insightsHits: prev.insightsHits + 1 }));
        setInterpretation(cached.interpretation);
        return;
      } else {
        addLog("Insights Cache", "Cache miss - generating insights", "info");
        setCacheStats(prev => ({ ...prev, insightsMisses: prev.insightsMisses + 1 }));
      }
    }

    setIsInterpreting(true);
    let insightText = "";

    try {
      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        addLog("Insights", "Streaming analysis...", "info");
        setInterpretation(""); // Clear previous interpretation

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:streamGenerateContent?alt=sse&key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Deep Analysis of: ${current?.arabic}` }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
          })
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text) {
                  accumulatedText += text;
                  setInterpretation(accumulatedText); // Real-time UI update
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.debug("Skipping malformed chunk:", jsonStr);
              }
            }
          }
        }

        insightText = accumulatedText;
        addLog("Insights", "Analysis complete", "success");
      } else {
        // Non-streaming fallback (original implementation)
        addLog("Insights", "Analyzing poem...", "info");
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Deep Analysis of: ${current?.arabic}` }] }],
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] }
          })
        });
        const data = await res.json();
        insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        setInterpretation(insightText);
        addLog("Insights", "Analysis complete", "success");
      }

      // CACHE THE INSIGHTS
      if (FEATURES.caching && current?.id && insightText) {
        await cacheOperations.set(CACHE_CONFIG.stores.insights, current.id, {
          interpretation: insightText,
          metadata: {
            poet: current.poet,
            title: current.title
          }
        });
        addLog("Insights Cache", "Insights cached for future use", "success");
      }
    } catch (e) {
      addLog("Analysis Error", e.message, "error");
      // Show partial results if streaming was interrupted
      if (FEATURES.streaming && insightText) {
        addLog("Insights", "Showing partial results", "warning");
      }
    } finally {
      setIsInterpreting(false);
    }
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

  const handleCopy = async () => {
    const textToCopy = `${current?.titleArabic || ""}\n${current?.poetArabic || ""}\n\n${current?.arabic || ""}\n\n---\n\n${current?.title || ""}\n${current?.poet || ""}\n\n${current?.english || ""}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setShowCopySuccess(true);
      addLog("Copy", "Poem copied to clipboard", "success");
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (e) {
      addLog("Copy Error", e.message, "error");
    }
  };

  useEffect(() => {
    setInterpretation(null);
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  }, [current?.id]);

  return (
    <div className={`h-[100dvh] w-full flex flex-col overflow-hidden ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}>
      <style>{`
        .arabic-shadow { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2); border-radius: 10px; }
        .bg-radial-gradient { background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%); }
        .app-branding-rtl { direction: rtl; }
        .safe-bottom { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }

        .font-amiri { font-family: 'Amiri', serif; }
        .font-alexandria { font-family: 'Alexandria', sans-serif; }
        .font-messiri { font-family: 'El Messiri', sans-serif; }
        .font-lalezar { font-family: 'Lalezar', cursive; }
        .font-rakkas { font-family: 'Rakkas', cursive; }
        .font-fustat { font-family: 'Fustat', serif; }
        .font-kufam { font-family: 'Kufam', sans-serif; }
        .font-katibeh { font-family: 'Katibeh', cursive; }

        .header-luminescence {
          text-shadow: 0 0 30px rgba(99, 102, 241, 0.6);
        }

        .minimal-frame {
          position: relative;
          width: 100%;
          max-width: 550px;
          margin: 0 auto 16px;
          padding: 28px 40px;
        }

        .minimal-frame svg {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        .frame-line {
          fill: none;
          stroke: #C5A059;
          stroke-width: 2;
          opacity: 0.28;
          stroke-linecap: square;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }

        .rabbit-bounce {
          animation: bounce 2s ease-in-out infinite;
        }

        .scroll-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(to right, #6366f1, #9333ea);
          transform: scaleX(0.36);
          transform-origin: left;
          z-index: 100;
          opacity: 0.85;
        }
      `}</style>

      <div className="scroll-progress" />

      <DebugPanel logs={logs} onClear={() => setLogs([])} darkMode={darkMode} />

      <header style={{ opacity: headerOpacity }} className="fixed top-4 md:top-8 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300 flex flex-row items-center justify-center gap-4 md:gap-8 px-4 md:px-6">
        <div className={`flex flex-row-reverse items-center gap-2 md:gap-4 ${theme.brand} tracking-wide header-luminescence`}>
          <PenTool className="w-8 h-8 md:w-[42px] md:h-[42px] opacity-95" strokeWidth={1.5} />
          <h1 className="app-branding-rtl flex items-end gap-3 md:gap-6">
            <span className="font-brand-ar text-[clamp(1.875rem,4vw,3rem)] font-bold mb-[clamp(0.25rem,0.5vw,0.5rem)] opacity-80">بالعربي</span>
            <span className="font-brand-en text-[clamp(3rem,6vw,4.5rem)] lowercase tracking-tighter">poetry</span>
            <span className="font-brand-en text-[clamp(10px,1.2vw,12px)] px-[clamp(0.375rem,0.8vw,0.5rem)] py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 uppercase tracking-wider mb-[clamp(0.5rem,1vw,1rem)] ml-[clamp(0.5rem,1vw,0.75rem)] opacity-60">beta</span>
          </h1>
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div className={`absolute inset-0 pointer-events-none opacity-[0.04] ${darkMode ? 'invert' : ''}`} style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3C/svg%3E")`, backgroundSize: '60px 60px' }} />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main ref={mainScrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 md:px-0 pb-28">
            <div className="min-h-full flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-4xl flex flex-col items-center">
                
                <div className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}>
                   <div className="minimal-frame mb-1">
                      <svg viewBox="0 0 550 120" preserveAspectRatio="xMidYMid meet">
                        <line className="frame-line" x1="20" y1="20" x2="70" y2="20" />
                        <line className="frame-line" x1="20" y1="20" x2="20" y2="70" />
                        <line className="frame-line" x1="530" y1="20" x2="480" y2="20" />
                        <line className="frame-line" x1="530" y1="20" x2="530" y2="70" />
                        <line className="frame-line" x1="20" y1="100" x2="70" y2="100" />
                        <line className="frame-line" x1="20" y1="100" x2="20" y2="50" />
                        <line className="frame-line" x1="530" y1="100" x2="480" y2="100" />
                        <line className="frame-line" x1="530" y1="100" x2="530" y2="50" />
                        <circle className="frame-line" cx="32" cy="32" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="518" cy="32" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="32" cy="88" r="2.5" fill="#C5A059" opacity="0.35" />
                        <circle className="frame-line" cx="518" cy="88" r="2.5" fill="#C5A059" opacity="0.35" />
                      </svg>

                      <div className="relative z-10 flex flex-col items-center justify-center w-full">
                         <div className={`flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-4 ${currentFontClass} ${DESIGN.mainTitleSize}`}>
                           <span className={`${theme.poetColor} opacity-90`}>{current?.poetArabic}</span>
                           <span className="opacity-10 text-[clamp(0.75rem,1.5vw,1.25rem)]">-</span>
                           <span className={`${theme.titleColor} font-bold`}>{current?.titleArabic}</span>
                         </div>
                         <div className={`flex items-center justify-center gap-1 sm:gap-2 opacity-45 ${DESIGN.mainSubtitleSize} font-brand-en tracking-[0.08em] uppercase mt-[clamp(0.25rem,0.8vw,0.75rem)]`}>
                           <span className="font-semibold">{current?.poet}</span> <span className="opacity-20">•</span> <span>{current?.title}</span>
                         </div>
                      </div>
                   </div>

                   <div className="flex justify-center gap-3 mt-1">
                     {Array.isArray(current?.tags) && current.tags.slice(0, 3).map(tag => (
                       <span key={tag} className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}>
                         {tag}
                       </span>
                     ))}
                   </div>
                </div>

                <div className={`relative w-full group pt-8 pb-2 ${DESIGN.mainMarginBottom}`}>
                  <div className="px-4 md:px-20 py-2 text-center">
                    <div className="flex flex-col gap-5 md:gap-7">
                      {versePairs.map((pair, idx) => (
                        <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                          <p dir="rtl" className={`${currentFontClass} ${DESIGN.mainFontSize} leading-[2.2]  arabic-shadow`}>{pair.ar}</p>
                          {pair.en && <p dir="ltr" className={`font-brand-en italic ${DESIGN.mainEnglishFontSize} opacity-40 ${DESIGN.anim}`}>{pair.en}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="w-full max-w-2xl px-6 md:px-0 mb-4 md:hidden">
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
                            <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.depth}</p>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-indigo-500/10">
                          <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">The Author</h4>
                          <div className="pl-4 border-l border-indigo-500/10">
                            <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">{insightParts?.author}</p>
                          </div>
                        </div>
                     </div>
                   ) : null}
                </div>
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 bg-gradient-to-t from-black/5 to-transparent safe-bottom">
            <div ref={controlBarRef} className={`flex items-center gap-2 px-5 py-2 rounded-full shadow-2xl border ${DESIGN.glass} ${theme.border} ${theme.shadow} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}>

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={togglePlay} disabled={isGeneratingAudio} aria-label={isPlaying ? "Pause recitation" : "Play recitation"} className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isGeneratingAudio ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : isPlaying ? <Pause fill="#C5A059" size={21} /> : <Volume2 className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Listen</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={handleAnalyze} disabled={isInterpreting || interpretation} aria-label="Dive into poem meaning" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105 disabled:opacity-50">
                  {isInterpreting ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Compass className="text-[#C5A059]" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Dive In</span>
              </div>

              <div className="flex flex-col items-center gap-1 min-w-[56px]">
                <button onClick={handleFetch} disabled={isFetching} aria-label="Discover new poem" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                  {isFetching ? <Loader2 className="animate-spin text-[#C5A059]" size={21} /> : <Rabbit className="text-[#C5A059] rabbit-bounce" size={21} />}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">Discover</span>
              </div>

              <div className="w-px h-10 bg-stone-500/20 mx-2 flex-shrink-0" />

              {!isOverflow ? (
                <>
                  <div className="flex flex-col items-center gap-1 min-w-[56px]">
                    <button onClick={handleCopy} aria-label="Copy poem to clipboard" className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full hover:bg-[#C5A059]/12 hover:scale-105">
                      {showCopySuccess ? <Check size={21} className="text-green-500" /> : <Copy size={21} className="text-[#C5A059]" />}
                    </button>
                    <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap text-[#C5A059]">Copy</span>
                  </div>

                  <ThemeDropdown
                    darkMode={darkMode}
                    onToggleDarkMode={() => setDarkMode(!darkMode)}
                    currentFont={currentFont}
                    onCycleFont={cycleFont}
                    fonts={FONTS}
                  />

                  <CategoryPill selected={selectedCategory} onSelect={setSelectedCategory} darkMode={darkMode} />
                </>
              ) : (
                <OverflowMenu
                  darkMode={darkMode}
                  onToggleDarkMode={() => setDarkMode(!darkMode)}
                  currentFont={currentFont}
                  onCycleFont={cycleFont}
                  selectedCategory={selectedCategory}
                  onSelectCategory={setSelectedCategory}
                  onCopy={handleCopy}
                  showCopySuccess={showCopySuccess}
                />
              )}
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}>
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <h3 className="font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] text-indigo-600 tracking-tight">Poetic Insight</h3>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate">{current?.poet} • {current?.title}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isInterpreting ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse"><Sparkles className="animate-spin text-indigo-500" size={32} /><p className="font-brand-en italic text-[clamp(0.875rem,1.5vw,1rem)]">Consulting Diwan...</p></div>
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
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.depth}</p>
                      </div>
                    </div>
                  )}
                  {insightParts?.author && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">The Author</h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">{insightParts.author}</p>
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