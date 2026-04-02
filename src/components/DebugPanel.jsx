import { useState, useEffect, useRef } from 'react';
import { Bug, X, Trash2, Zap, Radio } from 'lucide-react';
import Sentry from '../sentry.js';
import { FEATURES } from '../constants/features.js';
import { THEME } from '../constants/theme.js';
import { useUIStore, CATEGORY_MAP } from '../stores/uiStore';
import { usePoemStore } from '../stores/poemStore';
import { useAudioStore } from '../stores/audioStore';
import { API_MODELS } from '../services/gemini.js';
import { cacheOperations, CACHE_CONFIG } from '../services/cache.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DebugPanel = ({ controlBarRef }) => {
  const logs = useUIStore((s) => s.logs);
  const onClear = () => useUIStore.getState().clearLogs();
  const darkMode = useUIStore((s) => s.darkMode);
  const visible = useUIStore((s) => s.showDebugLogs);
  const currentFont = useUIStore((s) => s.font);
  const poem = usePoemStore.getState().currentPoem();
  const useDatabase = usePoemStore((s) => s.useDatabase);
  const appState = {
    mode: useDatabase ? 'database' : 'ai',
    theme: darkMode ? 'dark' : 'light',
    font: currentFont,
  };
  const theme = darkMode ? THEME.dark : THEME.light;
  const [panelOpen, setPanelOpen] = useState(false);
  const [ttsModel, setTtsModel] = useState(API_MODELS.tts.includes('pro') ? 'pro' : 'flash');
  const [bugDescription, setBugDescription] = useState('');
  const [bugStatus, setBugStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [bugError, setBugError] = useState('');
  const [lastViewedCount, setLastViewedCount] = useState(0);
  const scrollRef = useRef(null);
  const btnPos = { right: 8, bottom: 52 };
  const panelRight = 68; // clears sidebar (right:8 + ~52px wide + 8px gap)

  // Auto-scroll to bottom on new logs when panel is open
  useEffect(() => {
    if (panelOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, panelOpen]);

  // Track viewed count when panel opens
  useEffect(() => {
    if (panelOpen) setLastViewedCount(logs.length);
  }, [panelOpen, logs.length]);

  const errorCount = logs.filter((l) => l.type === 'error').length;
  const lastViewedErrors = useRef(0);
  useEffect(() => {
    if (panelOpen) lastViewedErrors.current = errorCount;
  }, [panelOpen, errorCount]);
  const unreadErrors = errorCount - lastViewedErrors.current;

  const handleTtsModelToggle = async () => {
    const next = ttsModel === 'pro' ? 'flash' : 'pro';
    if (next === 'pro') {
      API_MODELS.tts = 'gemini-2.5-pro-preview-tts';
      API_MODELS.ttsFallback = 'gemini-2.5-flash-preview-tts';
    } else {
      API_MODELS.tts = 'gemini-2.5-flash-preview-tts';
      API_MODELS.ttsFallback = 'gemini-2.5-pro-preview-tts';
    }
    setTtsModel(next);

    // Clear cached audio for current poem
    const poem = usePoemStore.getState().currentPoem();
    if (poem?.id) {
      await cacheOperations.delete(CACHE_CONFIG.stores.audio, poem.id);
    }
    // Reset audio state
    const { player, resetAudio } = useAudioStore.getState();
    if (player) try { player.stop(); } catch {}
    resetAudio();
  };

  const handleSubmitBug = async () => {
    setBugStatus('sending');
    try {
      const payload = {
        description: bugDescription,
        logs: logs.slice(-100),
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        poem: poem ? { id: poem.id, poet: poem.poet, title: poem.title } : null,
        appState: appState || null,
        url: window.location.href,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        online: navigator.onLine,
        referrer: document.referrer,
        featureFlags: { ...FEATURES },
      };
      const res = await fetch(`${apiUrl}/api/bug-reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${text ? ': ' + text.slice(0, 100) : ''}`);
      }
      setBugStatus('success');
      setBugDescription('');
      setTimeout(() => setBugStatus(null), 3000);
    } catch (e) {
      Sentry.captureException(e);
      setBugStatus('error');
      setBugError(e.message || 'Network error');
      setTimeout(() => setBugStatus(null), 5000);
    }
  };

  if (!visible) return null;

  const gold = 'var(--gold)';

  return (
    <>
      {/* Floating trigger — bottom-right, aligned with controls */}
      <button
        onClick={() => setPanelOpen((prev) => !prev)}
        className="fixed z-[200] w-[44px] h-[44px] flex items-center justify-center"
        style={{ right: btnPos.right, bottom: btnPos.bottom }}
        title="Toggle dev logs"
        aria-label="Toggle developer log panel"
      >
        <span
          className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
            darkMode
              ? `bg-black/70 text-gold/40 hover:text-gold/80 border ${theme.border}`
              : `bg-white/80 text-gold/30 hover:text-gold/70 border ${theme.border}`
          } backdrop-blur-xl`}
          style={panelOpen ? { boxShadow: '0 0 10px 2px rgba(197,160,89,0.45)' } : undefined}
        >
          <Bug size={10} strokeWidth={1.5} />
          {unreadErrors > 0 && !panelOpen && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500/80" />
          )}
        </span>
      </button>

      {/* Backdrop — dismisses panel on outside tap */}
      {panelOpen && (
        <div
          className="fixed inset-0 z-[199]"
          onClick={() => setPanelOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating log panel */}
      <div
        className={`fixed z-[200] flex flex-col rounded-2xl transition-all duration-200 border ${theme.border} ${
          darkMode
            ? 'bg-black/70'
            : 'bg-white/80'
        } backdrop-blur-xl ${panelOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        style={{
          right: panelRight,
          left: 8,
          bottom: btnPos.bottom + 48,
          height: '50vh',
          maxHeight: '480px',
          minHeight: '240px',
          boxShadow: '0 0 24px 4px rgba(197,160,89,0.12), 0 8px 32px rgba(0,0,0,0.5)',
        }}
        aria-hidden={!panelOpen}
      >
        {/* Panel header */}
        <div
          className={`flex items-center justify-between px-4 py-2.5 border-b ${theme.border} flex-none`}
        >
          <span
            className="text-[0.625rem] font-brand-en uppercase tracking-widest font-bold"
            style={{ color: 'var(--gold)' }}
          >
            Application Logs
            <span className="ml-1.5 opacity-60">({logs.length})</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onClear}
              className="p-1 transition-colors text-gold/30 hover:text-gold/70"
              title="Clear logs"
            >
              <Trash2 size={11} />
            </button>
            <button
              onClick={() => setPanelOpen(false)}
              className="p-1 transition-colors text-gold/30 hover:text-gold/70"
              title="Close panel"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* Log entries */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-1.5 font-mono text-[0.625rem] space-y-0.5 custom-scrollbar"
        >
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`py-0.5 border-b break-words overflow-hidden ${darkMode ? 'border-white/[0.04]' : 'border-black/[0.06]'}`}
            >
              <div>
                <span className={darkMode ? 'text-white/95' : 'text-black/80'}>
                  {idx === 0 ? log.time : log.rel}
                </span>{' '}
                <span className="font-semibold" style={{ color: (CATEGORY_MAP[log.type] || CATEGORY_MAP.info).color }}>
                  {(CATEGORY_MAP[log.type] || CATEGORY_MAP.info).prefix}
                </span>{' '}
                <span style={{ color: (CATEGORY_MAP[log.type] || CATEGORY_MAP.info).color, opacity: 0.7 }}>[{log.label}]</span>
              </div>
              <div className={darkMode ? 'text-white/50' : 'text-black/50'}>{log.msg}</div>
            </div>
          ))}
        </div>

        {/* Speech Engine model A/B toggle — full row is the tap target */}
        <button
          onClick={handleTtsModelToggle}
          title={`Switch to ${ttsModel === 'pro' ? 'Flash' : 'Pro'} — clears audio cache for current poem`}
          className={`flex items-center gap-2 w-full px-4 py-1.5 border-t ${theme.border} flex-none text-left`}
        >
          {ttsModel === 'pro' ? (
            <Zap size={9} className="text-amber-400 flex-shrink-0" />
          ) : (
            <Radio size={9} className="text-emerald-400 flex-shrink-0" />
          )}
          <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50 flex-shrink-0">
            Speech Engine
          </span>
          {/* Inline pill toggle — Flash (emerald, left) ↔ Pro (amber, right) */}
          <div
            className="relative flex-shrink-0 rounded-full transition-colors"
            style={{
              width: 24,
              height: 12,
              backgroundColor: ttsModel === 'pro' ? 'rgba(251,191,36,0.18)' : 'rgba(52,211,153,0.15)',
              border: `1px solid ${ttsModel === 'pro' ? 'rgba(251,191,36,0.35)' : 'rgba(52,211,153,0.3)'}`,
            }}
          >
            <span
              className="absolute rounded-full transition-all duration-200"
              style={{
                width: 8,
                height: 8,
                top: 1,
                left: ttsModel === 'pro' ? 13 : 1,
                backgroundColor: ttsModel === 'pro' ? 'rgb(251,191,36)' : 'rgb(52,211,153)',
                boxShadow: ttsModel === 'pro' ? '0 0 4px rgba(251,191,36,0.7)' : '0 0 4px rgba(52,211,153,0.6)',
              }}
            />
          </div>
          <span className={`text-[0.5625rem] font-mono font-bold flex-shrink-0 ${ttsModel === 'pro' ? 'text-amber-400' : 'text-emerald-400'}`}>
            {ttsModel === 'pro' ? 'Pro' : 'Flash'}
          </span>
        </button>

        {/* Bug report input */}
        <div
          className={`flex items-center gap-1.5 px-4 py-2 border-t ${theme.border} flex-none`}
        >
          <input
            type="text"
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            placeholder="Describe the bug..."
            className={`flex-1 px-2 py-1 rounded text-[1rem] border ${darkMode ? 'bg-white/[0.04] border-white/[0.06] text-white/70 placeholder:text-white/20' : 'bg-black/[0.03] border-black/[0.06] text-black/70 placeholder:text-black/25'}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSubmitBug();
            }}
          />
          <button
            onClick={handleSubmitBug}
            disabled={bugStatus === 'sending'}
            className={`px-2 py-1 rounded text-[0.5625rem] font-bold uppercase tracking-wider transition-colors ${
              bugStatus === 'success'
                ? 'bg-green-600/80 text-white'
                : bugStatus === 'error'
                  ? `${theme.errorBg} text-white`
                  : bugStatus === 'sending'
                    ? 'bg-gold/10 text-gold/40'
                    : darkMode
                      ? 'bg-gold/20 text-gold hover:bg-gold/30'
                      : 'bg-gold/15 text-gold hover:bg-gold/25'
            }`}
          >
            {bugStatus === 'sending'
              ? '...'
              : bugStatus === 'success'
                ? 'Sent!'
                : bugStatus === 'error'
                  ? 'Fail'
                  : 'Report'}
          </button>
        </div>
      </div>
    </>
  );
};

export default DebugPanel;
