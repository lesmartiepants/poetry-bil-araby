import { useState, useEffect, useRef } from 'react';
import { Bug, Trash2, ChevronDown } from 'lucide-react';
import Sentry from '../sentry.js';
import { FEATURES } from '../constants/features';
import { THEME } from '../constants/theme';
import { getApiUrl } from '../services/api';

const DebugPanel = ({ logs, onClear, darkMode, poem, appState }) => {
  const theme = darkMode ? THEME.dark : THEME.light;
  const [isExpanded, setIsExpanded] = useState(false);
  const [bugDescription, setBugDescription] = useState('');
  const [bugStatus, setBugStatus] = useState(null); // null | 'sending' | 'success' | 'error'
  const [bugError, setBugError] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

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
      const res = await fetch(`${getApiUrl()}/api/bug-reports`, {
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

  if (!FEATURES.debug) return null;

  return (
    <div
      className={`w-full max-w-full transition-all duration-300 ${isExpanded ? 'h-48 md:h-64' : 'h-7'} overflow-hidden border-b ${
        theme.debug
      } backdrop-blur-md shadow-lg flex flex-col relative z-[100] flex-none`}
    >
      <div
        className="flex items-center justify-between px-6 h-7 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest opacity-60 text-indigo-500 leading-none h-full">
          <Bug size={10} className="mb-0" /> <span>System Logs</span>{' '}
          <span className="ml-1 opacity-40">({logs.length})</span>
        </div>
        <div className="flex items-center gap-3 h-full">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="p-1 hover:text-red-500 transition-colors flex items-center"
          >
            <Trash2 size={10} />
          </button>
          <ChevronDown
            size={10}
            className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          />
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 pb-3 font-mono text-[10px] space-y-1 custom-scrollbar"
      >
        {logs.map((log, idx) => (
          <div
            key={idx}
            className={`pb-1 border-b border-stone-500/5 ${log.type === 'error' ? theme.error : log.type === 'success' ? 'text-indigo-400' : ''}`}
          >
            <span className="opacity-40">[{log.time}]</span>{' '}
            <span className="font-bold">{log.label}:</span> {log.msg}
          </div>
        ))}
        {isExpanded && (
          <div className={`flex items-center gap-2 pt-2 border-t ${theme.debugDivider}`}>
            <input
              type="text"
              value={bugDescription}
              onChange={(e) => setBugDescription(e.target.value)}
              placeholder="Describe the bug (optional)"
              className={`flex-1 px-2 py-1 rounded text-[10px] border ${theme.debugInput}`}
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSubmitBug();
              }}
              disabled={bugStatus === 'sending'}
              className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider transition-colors ${
                bugStatus === 'success'
                  ? 'bg-green-600/80 text-white'
                  : bugStatus === 'error'
                    ? `${theme.errorBg} text-white`
                    : bugStatus === 'sending'
                      ? 'bg-stone-600/80 text-stone-400'
                      : 'bg-indigo-600/80 text-white hover:bg-indigo-500/80'
              }`}
            >
              {bugStatus === 'sending'
                ? 'Sending...'
                : bugStatus === 'success'
                  ? 'Sent!'
                  : bugStatus === 'error'
                    ? `Failed${bugError ? ` (${bugError})` : ''}`
                    : 'Submit Bug'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export { DebugPanel };
