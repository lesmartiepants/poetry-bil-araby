import { useState, useEffect, useRef } from 'react';
import { Bug, X, Copy, Check, Zap, Radio, Wifi } from 'lucide-react';
import Sentry from '../sentry.js';
import { FEATURES } from '../constants/features.js';
import { THEME } from '../constants/theme.js';
import { VOICE_CATALOG } from '../constants/voices.js';
import { useUIStore, CATEGORY_MAP } from '../stores/uiStore';
import { usePoemStore } from '../stores/poemStore';
import { useAudioStore } from '../stores/audioStore';
import { API_MODELS } from '../services/gemini.js';
import { abortPlay } from '../stores/actions/togglePlay.js';
import { cacheOperations, CACHE_CONFIG } from '../services/cache.js';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DebugPanel = ({ controlBarRef }) => {
  const logs = useUIStore((s) => s.logs);
  const [copied, setCopied] = useState(false);

  // Serialize the whole log to plain text and copy it to the clipboard.
  const onCopyLogs = async () => {
    const text = logs
      .map((l) => `${l.time || l.rel || ''} [${(l.type || 'info').toUpperCase()}] [${l.label}] ${l.msg}`)
      .join('\n');
    const ok = await (async () => {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch {
        // Fallback for non-secure contexts / older browsers
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const done = document.execCommand('copy');
          document.body.removeChild(ta);
          return done;
        } catch {
          return false;
        }
      }
    })();
    useUIStore
      .getState()
      .addLog('Debug', ok ? `Copied ${logs.length} log lines to clipboard` : 'Copy failed', ok ? 'success' : 'error');
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
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
  const liveVoice = useUIStore((s) => s.liveVoice);
  const liveTemperature = useUIStore((s) => s.liveTemperature);
  const [panelOpen, setPanelOpen] = useState(false);
  // Initialize the engine display from the actual ttsMode so the panel and playback
  // agree (ttsMode defaults to 'live'). Falls back to the REST model label otherwise.
  const [ttsModel, setTtsModel] = useState(() =>
    useUIStore.getState().ttsMode === 'live' ? 'live' : API_MODELS.tts.includes('pro') ? 'pro' : 'flash'
  );
  const [bugDescription, setBugDescription] = useState('');
  const [bugStatus, setBugStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [bugError, setBugError] = useState('');
  const [lastViewedCount, setLastViewedCount] = useState(0);
  const [timingMode, setTimingMode] = useState(() => {
    try { return localStorage.getItem('ttsTimingMode') || 'verseLetterWeighted'; } catch { return 'verseLetterWeighted'; }
  });
  const [enableSilenceAware, setEnableSilenceAware] = useState(() => {
    try { return localStorage.getItem('ttsEnableSilenceAware') === 'true'; } catch { return false; }
  });
  const [verseDelayMs, setVerseDelayMs] = useState(() => {
    try { return parseFloat(localStorage.getItem('ttsVerseDelayMs') || '125'); } catch { return 125; }
  });
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

  // Stop playback and cancel any in-flight Live stream before switching engine or
  // voice. abortPlay() invalidates the in-flight generation's playId so it releases
  // the play guard (isTogglingPlay) and stops streaming. Without it, switching
  // mid-recitation leaves an orphaned stream holding the guard, and the next play is
  // rejected as "Play toggle already in progress" with no audio (#560, #558).
  const stopAndResetAudio = () => {
    abortPlay();
    const { player, resetAudio } = useAudioStore.getState();
    if (player) {
      try {
        player.stop();
      } catch {
        /* already stopped */
      }
    }
    resetAudio();
  };

  const handleTtsModelToggle = async () => {
    const cycle = { pro: 'flash', flash: 'live', live: 'pro' };
    const next = cycle[ttsModel] || 'pro';

    if (next === 'live') {
      // Live API bypasses REST model selection entirely
      useUIStore.getState().setTtsMode('live');
      const { liveVoice: v, liveTemperature: t } = useUIStore.getState();
      useUIStore.getState().addLog('Settings', `Speech engine → Live (${v}, temp ${t})`, 'user');
    } else {
      useUIStore.getState().setTtsMode('rest');
      useUIStore.getState().addLog('Settings', `Speech engine → REST (${API_MODELS?.tts || 'flash'})`, 'user');
      if (next === 'pro') {
        API_MODELS.tts = 'gemini-2.5-pro-preview-tts';
        API_MODELS.ttsFallback = 'gemini-2.5-flash-preview-tts';
      } else {
        API_MODELS.tts = 'gemini-2.5-flash-preview-tts';
        API_MODELS.ttsFallback = 'gemini-2.5-pro-preview-tts';
      }
    }
    setTtsModel(next);

    // Clear cached audio for current poem
    const poem = usePoemStore.getState().currentPoem();
    if (poem?.id) {
      await cacheOperations.delete(CACHE_CONFIG.stores.audio, poem.id);
    }
    // Cancel any in-flight stream + reset, so the next play isn't blocked (#560).
    stopAndResetAudio();
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
              onClick={onCopyLogs}
              disabled={logs.length === 0}
              className="p-1 transition-colors text-gold/30 hover:text-gold/70 disabled:opacity-30"
              title={copied ? 'Copied!' : 'Copy logs to clipboard'}
            >
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
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

        {/* Speech Engine model toggle — cycles pro → flash → live */}
        <button
          onClick={handleTtsModelToggle}
          title={`Switch TTS mode (current: ${ttsModel})${ttsModel === 'live' ? ' — requires backend server' : ''} — clears audio cache`}
          className={`flex items-center gap-2 w-full px-4 py-1.5 border-t ${theme.border} flex-none text-left`}
        >
          {ttsModel === 'pro' ? (
            <Zap size={9} className="text-amber-400 flex-shrink-0" />
          ) : ttsModel === 'flash' ? (
            <Radio size={9} className="text-emerald-400 flex-shrink-0" />
          ) : (
            <Wifi size={9} className="text-orange-400 flex-shrink-0" />
          )}
          <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50 flex-shrink-0">
            Speech Engine
          </span>
          {/* 3-position indicator */}
          <div
            className="relative flex-shrink-0 rounded-full transition-colors"
            style={{
              width: 30,
              height: 12,
              backgroundColor: ttsModel === 'pro' ? 'rgba(251,191,36,0.18)' : ttsModel === 'flash' ? 'rgba(52,211,153,0.15)' : 'rgba(251,146,60,0.18)',
              border: `1px solid ${ttsModel === 'pro' ? 'rgba(251,191,36,0.35)' : ttsModel === 'flash' ? 'rgba(52,211,153,0.3)' : 'rgba(251,146,60,0.35)'}`,
            }}
          >
            <span
              className="absolute rounded-full transition-all duration-200"
              style={{
                width: 8,
                height: 8,
                top: 1,
                left: ttsModel === 'pro' ? 1 : ttsModel === 'flash' ? 10 : 19,
                backgroundColor: ttsModel === 'pro' ? 'rgb(251,191,36)' : ttsModel === 'flash' ? 'rgb(52,211,153)' : 'rgb(251,146,60)',
                boxShadow: ttsModel === 'pro' ? '0 0 4px rgba(251,191,36,0.7)' : ttsModel === 'flash' ? '0 0 4px rgba(52,211,153,0.6)' : '0 0 4px rgba(251,146,60,0.7)',
              }}
            />
          </div>
          <span className={`text-[0.5625rem] font-mono font-bold flex-shrink-0 ${ttsModel === 'pro' ? 'text-amber-400' : ttsModel === 'flash' ? 'text-emerald-400' : 'text-orange-400'}`}>
            {ttsModel === 'pro' ? 'Pro' : ttsModel === 'flash' ? 'Flash' : 'Live 3.1'}
          </span>
        </button>

        {/* Live API voice + temperature — only shown in Live mode */}
        {ttsModel === 'live' && (
          <div className={`flex flex-col gap-2 px-4 py-2 border-t ${theme.border} flex-none`}>
            <div className="flex items-center gap-2">
              <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50 flex-shrink-0">Voice</span>
              <select
                value={liveVoice}
                onChange={(e) => {
                  useUIStore.getState().setLiveVoice(e.target.value);
                  useUIStore.getState().addLog('Settings', `Live voice → ${e.target.value}`, 'user');
                  // Cancel any in-flight stream + reset loaded audio so the next Listen
                  // regenerates in the new voice and isn't blocked as "already in
                  // progress" (otherwise resume-from-blob replays the old voice) (#558).
                  stopAndResetAudio();
                }}
                className="flex-1 text-[0.6rem] font-mono rounded px-1.5 py-0.5 cursor-pointer"
                style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', color: 'rgb(251,146,60)' }}
              >
                <optgroup label="♀ Female">
                  {VOICE_CATALOG.filter((v) => v.gender === 'f').map((v) => (
                    <option key={v.name} value={v.name}>{v.name} — {v.descriptor}</option>
                  ))}
                </optgroup>
                <optgroup label="♂ Male">
                  {VOICE_CATALOG.filter((v) => v.gender === 'm').map((v) => (
                    <option key={v.name} value={v.name}>{v.name} — {v.descriptor}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50 flex-shrink-0">Temp</span>
              <input
                type="range" min="0" max="2" step="0.05"
                value={liveTemperature}
                onChange={(e) => { useUIStore.getState().setLiveTemperature(parseFloat(e.target.value)); useUIStore.getState().addLog('Settings', `Live temperature → ${parseFloat(e.target.value).toFixed(2)}`, 'user'); }}
                className="flex-1 h-1 cursor-pointer accent-orange-400"
              />
              <span className="text-[0.6rem] font-mono text-orange-400 w-7 text-right">{liveTemperature.toFixed(2)}</span>
            </div>
            <div className="flex flex-col items-start gap-2">
              <div className="flex flex-col items-start gap-1">
                <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50">Timing Mode</span>
                <select
                  value={timingMode}
                  onChange={(e) => { setTimingMode(e.target.value); try { localStorage.setItem('ttsTimingMode', e.target.value); } catch {} useUIStore.getState().addLog('Settings', `Timing mode → ${e.target.value}`, 'user'); }}
                  className={`rounded text-[0.75rem] px-2 py-1 cursor-pointer ${darkMode ? 'bg-white/[0.06] border border-white/[0.1] text-white/80' : 'bg-black/[0.03] border border-black/[0.1] text-black/70'}`}
                >
                  <option value="even">even (uniform)</option>
                  <option value="smooth">smooth (min-dwell)</option>
                  <option value="verseLetterWeighted">verse + letters</option>
                  <option value="raw">raw (lumpy)</option>
                </select>
              </div>
              <label className="flex items-center gap-1.5 text-[0.6rem] cursor-pointer opacity-75 hover:opacity-100">
                <input
                  type="checkbox"
                  checked={enableSilenceAware}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setEnableSilenceAware(val);
                    try { localStorage.setItem('ttsEnableSilenceAware', val ? 'true' : 'false'); } catch {}
                    useUIStore.getState().addLog('Settings', `Silence-aware ${val ? 'ON' : 'OFF'}`, 'user');
                  }}
                  className="w-3 h-3 cursor-pointer"
                />
                <span>Pause on silence (exp)</span>
              </label>
              <div className="flex flex-col items-start gap-1 w-full">
                <div className="flex items-baseline justify-between w-full">
                  <span className="text-[0.5625rem] font-brand-en uppercase tracking-widest font-semibold opacity-50">Verse Delay</span>
                  <span className="text-[0.6rem] font-mono opacity-60">{verseDelayMs.toFixed(0)}ms</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="500"
                  step="25"
                  value={verseDelayMs}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setVerseDelayMs(val);
                    try { localStorage.setItem('ttsVerseDelayMs', val.toString()); } catch {}
                    useUIStore.getState().addLog('Settings', `Verse delay → ${val.toFixed(0)}ms`, 'user');
                  }}
                  className="w-full h-1 cursor-pointer accent-orange-400"
                  title="Add delay at the start of each verse (slows highlight exit from first word)"
                />
                <span className="text-[0.5rem] opacity-40 text-center w-full">first-word dwell (default 125ms)</span>
              </div>
            </div>
          </div>
        )}

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
