import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, BookOpen, RefreshCw, Volume2, ChevronDown, Quote, Globe, Moon, Sun, Loader2, ChevronRight, ChevronLeft, Search, X, Copy, LayoutGrid, Check, Bug, Trash2, Sparkles, PenTool } from 'lucide-react';

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
  anim: 'transition-all duration-700 ease-in-out',
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

  const theme = darkMode ? THEME.dark : THEME.light;
  
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

      <header style={{ opacity: headerOpacity }} className="fixed top-8 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300 flex flex-row items-center justify-center gap-8 px-6">
        <div className={`flex flex-row-reverse items-center gap-4 ${theme.brand} tracking-wide header-luminescence`}>
          <PenTool size={36} className="opacity-95" strokeWidth={1.5} />
          <h1 className="app-branding-rtl flex items-end gap-6">
            <span className="font-brand-ar text-4xl font-bold mb-2 opacity-80">بالعربي</span>
            <span className="font-brand-en text-6xl lowercase tracking-tighter">poetry</span>
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

                <div className={`relative w-full group py-0 ${DESIGN.mainMarginBottom}`}>
                  <div className="px-4 md:px-20 py-2 text-center">
                    <div className="flex flex-col gap-5 md:gap-7">
                      {versePairs.map((pair, idx) => (
                        <div key={`${current?.id}-${idx}`} className="flex flex-col gap-0.5">
                          <p dir="rtl" className={`font-amiri ${DESIGN.mainFontSize} ${DESIGN.mainLineHeight} arabic-shadow`}>{pair.ar}</p>
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