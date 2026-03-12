import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Pause,
  RefreshCw,
  Volume2,
  X,
  Copy,
  Check,
  Sparkles,
  Feather,
  Library,
  Compass,
  Rabbit,
  Heart,
  Languages,
  Share2,
  CalendarDays,
  ThumbsDown,
  Loader2,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import {
  useAuth,
  useUserSettings,
  useSavedPoems,
  useDownvotes,
  usePoemEvents,
} from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useOverflowDetect } from './hooks/useOverflowDetect';
import { useDailyPoem } from './hooks/useDailyPoem';
import { useDiscovery } from './hooks/useDiscovery';
import { useInsights } from './hooks/useInsights';
import { useAudio } from './hooks/useAudio.jsx';
import { transliterate } from './utils/transliterate';
import { useLogger } from './LogContext.jsx';
import { FEATURES } from './constants/features';
import { DESIGN, TEXT_SIZES } from './constants/design';
import { THEME, GOLD } from './constants/theme';
import { FONTS } from './constants/fonts';
import { getApiUrl } from './services/api';
import { prefetchManager } from './services/prefetch';

import { SplashScreen } from './components/SplashScreen';
import { VerticalSidebar } from './components/VerticalSidebar';
import { DebugPanel } from './components/DebugPanel';
import { SettingsView } from './components/SettingsView';
import { SavedPoemsView } from './components/SavedPoemsView';
import { AuthButton } from './components/AuthButton';
import { AuthModal } from './components/AuthModal';
import { CategoryPill } from './components/CategoryPill';
import { ThemeDropdown } from './components/ThemeDropdown';

/* Constants, design tokens, utilities, and services are imported from:
   - constants/ (features, design, theme, categories, fonts)
   - utils/ (transliterate)
   - services/ (api, prefetch)
   - hooks/ (useAuth, useKeyboardShortcuts, useOverflowDetect, useDailyPoem, useDiscovery, useInsights, useAudio)
   - components/ (SplashScreen, VerticalSidebar, DebugPanel, SettingsView, SavedPoemsView, AuthButton, AuthModal, CategoryPill, ThemeDropdown)
*/

/* =============================================================================
  UTILITY COMPONENTS (small, stateless — stay inline)
  =============================================================================
*/

const MysticalConsultationEffect = ({ active, theme }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden animate-in fade-in duration-1000">
      <div
        className={`absolute inset-0 bg-radial-gradient ${theme.glow} animate-pulse scale-125 opacity-80`}
      />
      <div
        className={`absolute inset-0 bg-radial-gradient from-purple-500/20 to-transparent animate-ping scale-150 opacity-30`}
        style={{ animationDuration: '3s' }}
      />
      <div className="absolute inset-0">
        {[...Array(45)].map((_, i) => (
          <div
            key={i}
            className="absolute bg-indigo-200 rounded-full animate-pulse"
            style={{
              width: Math.random() * 3 + 1 + 'px',
              height: Math.random() * 3 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.6 + 0.2,
              animationDuration: Math.random() * 1 + 0.5 + 's',
            }}
          />
        ))}
      </div>
    </div>
  );
};

const ErrorBanner = ({ error, onDismiss, onRetry, theme }) => {
  if (!error) return null;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] ${DESIGN.anim}`}
    >
      <div
        className={`${DESIGN.glass} ${theme.glass} ${theme.border} border ${DESIGN.radius} p-4 shadow-2xl`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <X size={20} className="text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${theme.text} text-sm font-medium mb-2`}>Error</p>
            <p className={`${theme.text} text-xs opacity-70 mb-3`}>{error}</p>
            <div className="flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className={`${DESIGN.btnPrimary} ${theme.btnPrimary} px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${DESIGN.buttonHover}`}
                >
                  <RefreshCw size={14} className="inline mr-1" />
                  Retry
                </button>
              )}
              <button
                onClick={onDismiss}
                className={`${theme.pill} border px-3 py-1.5 ${DESIGN.radius} text-xs font-medium ${theme.text} ${DESIGN.buttonHover}`}
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DatabaseToggle = ({ useDatabase, onToggle, disabled }) => {
  return (
    <div className="flex flex-col items-center gap-1 min-w-[56px]">
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none transition-all duration-300 flex items-center justify-center rounded-full ${disabled ? 'opacity-50 cursor-not-allowed' : `cursor-pointer ${GOLD.goldHoverBg} hover:scale-105`}`}
        aria-label={useDatabase ? 'Switch to LLM Mode' : 'Switch to Database Mode'}
      >
        {useDatabase ? (
          <Library size={21} className={GOLD.goldText} />
        ) : (
          <Sparkles size={21} className={GOLD.goldText} />
        )}
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {useDatabase ? 'Local' : 'Web'}
      </span>
    </div>
  );
};

/* =============================================================================
  KEYBOARD SHORTCUT HELP
  =============================================================================
*/

const SHORTCUTS = [
  { keys: ['Space'], desc: 'Play / Pause audio' },
  { keys: ['→'], desc: 'Discover new poem' },
  { keys: ['E'], desc: 'Explain poem' },
  { keys: ['T'], desc: 'Toggle English translation' },
  { keys: ['R'], desc: 'Toggle transliteration' },
  { keys: ['Esc'], desc: 'Close modal / panel' },
  { keys: ['?'], desc: 'Show this help' },
];

const ShortcutHelp = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  const isDark = theme === THEME.dark;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className={`relative w-full max-w-sm ${theme.glass} ${theme.border} border ${DESIGN.radius} p-8 shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={20} className={theme.text} />
        </button>

        <h2 className={`font-brand-en text-lg font-bold mb-6 ${theme.text}`}>Keyboard Shortcuts</h2>

        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between gap-4">
              <span className={`font-brand-en text-sm ${theme.text} opacity-70`}>{desc}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold ${theme.kbd} border`}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SavePoemButton = ({ poem, isSaved, onSave, onUnsave, disabled }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (disabled) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    if (isSaved) {
      onUnsave();
    } else {
      onSave();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isSaved ? 'Unsave poem' : 'Save poem'}
      >
        <Heart
          size={21}
          className={`${isSaved ? 'fill-red-500 text-red-500' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isSaved ? 'Saved' : 'Save'}
      </span>

      {showTooltip && disabled && (
        <div className="absolute bottom-full mb-2 px-3 py-2 bg-stone-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          Sign in to save poems
        </div>
      )}
    </div>
  );
};

const DownvoteButton = ({ poem, isDownvoted, onDownvote, onUndownvote, disabled }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleClick = () => {
    if (disabled) {
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
      return;
    }

    if (isDownvoted) {
      onUndownvote();
    } else {
      onDownvote();
    }
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[52px]">
      <button
        onClick={handleClick}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label={isDownvoted ? 'Unflag poem' : 'Flag poem'}
      >
        <ThumbsDown
          size={21}
          className={`${isDownvoted ? 'fill-red-400 text-red-400' : GOLD.goldText} transition-all`}
        />
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        {isDownvoted ? 'Flagged' : 'Flag'}
      </span>

      {showTooltip && disabled && (
        <div className="absolute bottom-full mb-2 px-3 py-2 bg-stone-900 text-white text-xs rounded-lg whitespace-nowrap shadow-lg">
          Sign in to flag poems
        </div>
      )}
    </div>
  );
};

/* =============================================================================
  6. MAIN APPLICATION
  =============================================================================
*/

export default function DiwanApp() {
  const mainScrollRef = useRef(null);
  const controlBarRef = useRef(null);

  const [headerOpacity, setHeaderOpacity] = useState(1);
  const [darkMode, setDarkMode] = useState(true);
  const [currentFont, setCurrentFont] = useState('Amiri');
  const [copySuccess, setCopySuccess] = useState(false);
  const { logs, addLog, clearLogs } = useLogger();
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [isPrefetching, setIsPrefetching] = useState(false);

  // Auth state
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const { settings, saveSettings } = useUserSettings(user);
  const { savedPoems, savePoem, unsavePoem, isPoemSaved } = useSavedPoems(user);
  const { downvotedPoemIds, downvotePoem, undownvotePoem, isPoemDownvoted } = useDownvotes(user);
  const { emitEvent } = usePoemEvents(user);

  // Discovery state and logic
  const {
    poems,
    currentIndex,
    selectedCategory,
    useDatabase,
    isFetching,
    filtered,
    current,
    autoExplainPending,
    setPoems,
    setCurrentIndex,
    setSelectedCategory,
    setUseDatabase,
    setAutoExplainPending,
    handleFetch,
    handleToggleDatabase,
  } = useDiscovery(emitEvent);

  // Insights state and logic
  const {
    interpretation,
    isInterpreting,
    insightParts,
    versePairs,
    cacheStats: insightsCacheStats,
    activeInsightRequests,
    handleAnalyze,
    resetInsights,
  } = useInsights({ current });

  // Audio state and logic
  const {
    audioRef,
    isPlaying,
    isGeneratingAudio,
    audioUrl,
    audioError,
    audioCacheStats,
    activeAudioRequests,
    togglePlay,
    resetAudio,
    dismissAudioError,
    PulseGlowBars,
  } = useAudio({ current });

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSavedPoems, setShowSavedPoems] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showSplash, setShowSplash] = useState(true); // Always show splash on every visit
  const [showOnboarding] = useState(() => {
    if (!FEATURES.onboarding) return false;
    if (FEATURES.forceOnboarding) return true;
    try {
      return !localStorage.getItem('hasSeenOnboarding');
    } catch {
      return false;
    }
  });
  const [showTranslation, setShowTranslation] = useState(true);
  const [textSizeLevel, setTextSizeLevel] = useState(1); // 0=S, 1=M, 2=L, 3=XL
  const [showTransliteration, setShowTransliteration] = useState(false);
  const [showShortcutHelp, setShowShortcutHelp] = useState(false);

  const theme = darkMode ? THEME.dark : THEME.light;

  const currentFontClass = useMemo(() => {
    const font = FONTS.find((f) => f.id === currentFont);
    return font ? font.family : FONTS[0].family;
  }, [currentFont]);

  const cycleFont = () => {
    const currentIdx = FONTS.findIndex((f) => f.id === currentFont);
    const nextIdx = (currentIdx + 1) % FONTS.length;
    setCurrentFont(FONTS[nextIdx].id);
    track('font_changed', { font: FONTS[nextIdx].id });
    addLog('Font', `Switched to ${FONTS[nextIdx].label}`, 'info');
  };

  const cycleTextSize = () => {
    setTextSizeLevel((prev) => (prev + 1) % TEXT_SIZES.length);
  };

  const textScale = TEXT_SIZES[textSizeLevel].multiplier;

  // Track poem view time (emit 'view' event after 3s on same poem)
  useEffect(() => {
    if (!current?.id || !user) return;
    const timer = setTimeout(() => {
      emitEvent(current.id, 'view', { duration_ms: 3000 });
      addLog('Event', `→ view event emitted | poem_id: ${current.id} | duration: 3000ms`, 'info');
    }, 3000);
    return () => clearTimeout(timer);
  }, [current?.id, user]);

  // Fetch poem of the day
  const dailyPoem = useDailyPoem(useDatabase);

  // After OAuth redirect, once the user is signed in, auto-save the stashed poem and clean up
  useEffect(() => {
    if (!user) return;
    let stashed;
    try {
      stashed = sessionStorage.getItem('pendingSavePoem');
    } catch {}
    if (!stashed) return;
    sessionStorage.removeItem('pendingSavePoem');
    try {
      const poem = JSON.parse(stashed);
      if (poem && poem.arabic) {
        savePoem(poem).then(({ error }) => {
          if (error) {
            addLog('Save Error', error.message, 'error');
          } else {
            addLog('Save', `Auto-saved poem: ${poem.poet} — ${poem.title}`, 'success');
          }
        });
      }
    } catch {}
  }, [user]);

  // Auto-trigger explanation after auto-loaded poem arrives (skip if cached translation exists)
  useEffect(() => {
    if (autoExplainPending && current?.id && !isFetching && !isInterpreting && !interpretation) {
      setAutoExplainPending(false);
      if (!current?.cachedTranslation) {
        handleAnalyze();
      }
    }
  }, [autoExplainPending, current?.id, isFetching, isInterpreting, interpretation]);

  // Overflow detection for control bar
  const isOverflow = useOverflowDetect(controlBarRef, [user]);

  // Load user settings on mount
  useEffect(() => {
    if (user && settings) {
      if (settings.theme) {
        setDarkMode(settings.theme === 'dark');
      }
      if (settings.font_id) {
        setCurrentFont(settings.font_id);
      }
    }
  }, [user, settings]);

  // Save settings when theme or font changes (with debounce)
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      saveSettings({
        theme: darkMode ? 'dark' : 'light',
        font_id: currentFont,
      });
    }, 1000); // Debounce by 1 second

    return () => clearTimeout(timeoutId);
  }, [darkMode, currentFont, user]);

  // Keyboard shortcuts
  useKeyboardShortcuts(
    {
      onSpace: togglePlay,
      onArrowRight: handleFetch,
      onExplain: () => {
        if (!isInterpreting && !interpretation) handleAnalyze();
      },
      onToggleTranslation: () => setShowTranslation((prev) => !prev),
      onToggleTransliteration: () => setShowTransliteration((prev) => !prev),
      onEscape: () => {
        setShowAuthModal(false);
        setShowSavedPoems(false);
        setShowSettings(false);
        setShowShortcutHelp(false);
      },
      onHelp: () => setShowShortcutHelp((prev) => !prev),
    },
    [isInterpreting, interpretation]
  );

  const handleScroll = (e) => {
    setHeaderOpacity(Math.max(0, 1 - e.target.scrollTop / 30));
  };

  const handleCopy = async () => {
    addLog(
      'UI Event',
      `📋 Copy button clicked | Poem: ${current?.poet} - ${current?.title}`,
      'info'
    );

    const textToCopy = `${current?.titleArabic || ''}\n${current?.poetArabic || ''}\n\n${current?.arabic || ''}\n\n---\n\n${current?.title || ''}\n${current?.poet || ''}\n\n${current?.english || ''}`;
    const copyChars = textToCopy.length;
    const arabicChars = current?.arabic?.length || 0;
    const englishChars = current?.english?.length || 0;

    try {
      await navigator.clipboard.writeText(textToCopy);
      track('poem_copied', { poet: current?.poet });
      if (current?.id) {
        emitEvent(current.id, 'copy');
        addLog('Event', `→ copy event emitted | poem_id: ${current.id}`, 'info');
      }
      setShowCopySuccess(true);
      addLog(
        'Copy',
        `✓ Copied to clipboard | ${copyChars} chars total (${arabicChars} Arabic + ${englishChars} English)`,
        'success'
      );
      setTimeout(() => setShowCopySuccess(false), 2000);
    } catch (e) {
      addLog('Copy Error', e.message, 'error');
    }
  };

  const handleDailyPoem = () => {
    if (!dailyPoem) return;
    track('daily_poem_requested');
    addLog('UI Event', 'Daily poem button clicked', 'info');
    resetInsights();
    setPoems((prev) => {
      const exists = prev.find((p) => p.id === dailyPoem.id);
      if (exists) {
        setCurrentIndex(prev.indexOf(exists));
        return prev;
      }
      setCurrentIndex(prev.length);
      return [...prev, dailyPoem];
    });
    setAutoExplainPending(true);
    // Update URL for DB poems
    if (dailyPoem.isFromDatabase && typeof dailyPoem.id === 'number') {
      window.history.replaceState({}, '', '/poem/' + dailyPoem.id);
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleShare = async () => {
    addLog('UI Event', 'Share button clicked', 'info');
    track('poem_shared', { poet: current?.poet });

    const poemId = current?.id;
    const isDbPoem = current?.isFromDatabase && typeof poemId === 'number';
    const shareUrl = isDbPoem ? `${window.location.origin}/poem/${poemId}` : window.location.origin;
    const shareTitle = `${current?.titleArabic || current?.title || 'Arabic Poetry'} — ${current?.poetArabic || current?.poet || ''}`;
    const shareText = current?.arabic
      ? current.arabic.split('\n').slice(0, 2).join('\n')
      : 'Discover classical and modern Arabic poetry';

    // Try native Web Share API first (mobile + some desktop)
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        track('share_method', { method: 'native' });
        if (current?.id) {
          emitEvent(current.id, 'share', { method: 'native' });
          addLog(
            'Event',
            `→ share event emitted | poem_id: ${current.id} | method: native`,
            'info'
          );
        }
        addLog('Share', 'Shared via Web Share API', 'success');
        return;
      } catch (e) {
        // User cancelled or API failed — fall through to copy
        if (e.name === 'AbortError') {
          addLog('Share', 'Share cancelled by user', 'info');
          return;
        }
      }
    }

    // Fallback: copy link to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      track('share_method', { method: 'clipboard' });
      if (current?.id) {
        emitEvent(current.id, 'share', { method: 'clipboard' });
        addLog(
          'Event',
          `→ share event emitted | poem_id: ${current.id} | method: clipboard`,
          'info'
        );
      }
      setShowShareSuccess(true);
      addLog('Share', `Link copied: ${shareUrl}`, 'success');
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (e) {
      addLog('Share Error', e.message, 'error');
    }
  };

  // Auth handlers
  const handleSignIn = () => {
    track('sign_in_started');
    setShowAuthModal(true);
  };

  const handleSignInWithGoogle = async () => {
    // Stash current poem so it survives the OAuth page redirect
    if (current) {
      try {
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(current));
      } catch {}
    }
    const { error } = await signInWithGoogle();
    if (error) {
      addLog('Auth Error', error.message, 'error');
      track('sign_in_error', { provider: 'google', error: (error.message || '').slice(0, 100) });
    } else {
      setShowAuthModal(false);
      track('sign_in_completed', { provider: 'google' });
      addLog('Auth', 'Signed in with Google', 'success');
    }
  };

  const handleSignInWithApple = async () => {
    // Stash current poem so it survives the OAuth page redirect
    if (current) {
      try {
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(current));
      } catch {}
    }
    const { error } = await signInWithApple();
    if (error) {
      addLog('Auth Error', error.message, 'error');
      track('sign_in_error', { provider: 'apple', error: (error.message || '').slice(0, 100) });
    } else {
      setShowAuthModal(false);
      track('sign_in_completed', { provider: 'apple' });
      addLog('Auth', 'Signed in with Apple', 'success');
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      addLog('Auth Error', error.message, 'error');
    } else {
      setShowSavedPoems(false);
      setShowSettings(false);
      setShowAuthModal(false);
      track('sign_out');
      addLog('Auth', 'Signed out successfully', 'success');
    }
  };

  // Save/unsave poem handlers
  const handleSavePoem = async () => {
    if (!user) {
      handleSignIn();
      return;
    }

    const { error } = await savePoem(current);
    if (error) {
      addLog('Save Error', error.message, 'error');
    } else {
      addLog('Save', `Saved poem: ${current?.poet} - ${current?.title}`, 'success');
      track('poem_saved', { poet: current?.poet });
      if (current?.id) {
        emitEvent(current.id, 'save');
        addLog('Event', `→ save event emitted (dual-write) | poem_id: ${current.id}`, 'info');
      }
    }
  };

  const handleUnsavePoem = async () => {
    const { error } = await unsavePoem(current?.id, current?.arabic);
    if (error) {
      addLog('Unsave Error', error.message, 'error');
    } else {
      track('poem_unsaved', { poet: current?.poet });
      addLog('Unsave', `Removed poem: ${current?.poet} - ${current?.title}`, 'success');
    }
  };

  const handleDownvote = async () => {
    addLog(
      'UI Event',
      `👎 Flag button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );

    if (!user) {
      addLog('Downvote', 'Not authenticated — opening sign-in', 'info');
      handleSignIn();
      return;
    }

    addLog('Downvote', `→ Sending downvote to Supabase | poem_id: ${current?.id}`, 'info');
    const { error } = await downvotePoem(current);
    if (error) {
      addLog('Downvote Error', `✗ Failed: ${error.message}`, 'error');
    } else {
      addLog(
        'Downvote',
        `✓ Flagged poem: ${current?.poet} - ${current?.title} | Auto-advancing in 600ms`,
        'success'
      );
      track('poem_downvoted', { poet: current?.poet });
      // Auto-advance after 600ms
      setTimeout(() => handleFetch(), 600);
    }
  };

  const handleUndownvote = async () => {
    addLog(
      'UI Event',
      `👍 Unflag button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );
    addLog('Undownvote', `→ Removing downvote from Supabase | poem_id: ${current?.id}`, 'info');

    const { error } = await undownvotePoem(current?.id);
    if (error) {
      addLog('Undownvote Error', `✗ Failed: ${error.message}`, 'error');
    } else {
      track('poem_undownvoted', { poet: current?.poet });
      addLog('Undownvote', `✓ Unflagged poem: ${current?.poet} - ${current?.title}`, 'success');
    }
  };

  const handleOpenSavedPoems = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    track('saved_poems_opened');
    setShowSavedPoems(true);
  };

  const handleSelectSavedPoem = (savedPoem) => {
    track('saved_poem_selected', { poet: savedPoem.poet });
    const mappedPoem = {
      id: savedPoem.poem_id || savedPoem.id,
      poet: savedPoem.poet || '',
      poetArabic: savedPoem.poet || '',
      title: savedPoem.title || '',
      titleArabic: savedPoem.title || '',
      arabic: savedPoem.poem_text || '',
      english: savedPoem.english || '',
      tags: savedPoem.category ? [savedPoem.category] : [],
    };
    setPoems((prev) => {
      const exists = prev.find((p) => p.arabic === mappedPoem.arabic);
      if (exists) {
        setCurrentIndex(prev.indexOf(exists));
        return prev;
      }
      setCurrentIndex(prev.length);
      return [...prev, mappedPoem];
    });
    setShowSavedPoems(false);
    // Update URL for DB poems
    if (typeof mappedPoem.id === 'number') {
      window.history.replaceState({}, '', '/poem/' + mappedPoem.id);
    } else {
      window.history.replaceState({}, '', '/');
    }
  };

  const handleOpenSettings = () => {
    if (!user) {
      handleSignIn();
      return;
    }
    track('settings_opened');
    setShowSettings(true);
  };

  const handleSelectFont = (fontId) => {
    track('font_changed', { font: fontId });
    setCurrentFont(fontId);
    addLog('Font', `Font selected: ${fontId}`, 'info');
  };

  const handleToggleDarkMode = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    track('theme_changed', { theme: newTheme });
    setDarkMode(!darkMode);
    addLog('Theme', `Switched to ${newTheme} mode`, 'info');
  };
  const handleToggleTheme = handleToggleDarkMode;

  const handleUnsavePoemFromList = async (sp) => {
    const { error } = await unsavePoem(sp.poem_id || sp.id, sp.poem_text);
    if (error) {
      addLog('Unsave Error', error.message, 'error');
    } else {
      addLog('Unsave', `Removed poem from saved list`, 'success');
    }
  };

  const handleToggleTranslation = (showTranslation) => {
    addLog('Translation', `Translation ${showTranslation ? 'shown' : 'hidden'}`, 'info');
  };

  const handleToggleTransliteration = (showTransliteration) => {
    addLog(
      'Transliteration',
      `Transliteration ${showTransliteration ? 'shown' : 'hidden'}`,
      'info'
    );
  };

  const handleTextSizeChange = (level) => {
    addLog('TextSize', `Text size changed to level ${level}`, 'info');
  };

  const handleKeyboardShortcut = (key, action) => {
    addLog('Keyboard', `Shortcut: ${key} → ${action}`, 'info');
  };

  const handleSplashDismissed = () => {
    addLog('Splash', 'Splash screen dismissed', 'info');
  };

  const handleSplashShown = () => {
    addLog('Splash', 'Splash screen shown', 'info');
  };
  // ── End logging hooks ─────────────────────────────────────────────

  useEffect(() => {
    // Reset insights and audio state on poem change
    resetInsights();
    resetAudio();

    // Reset translation visibility so every new poem shows the translation by default
    setShowTranslation(true);

    // Log current poem tags for debugging
    const tagsType = Array.isArray(current?.tags) ? 'array' : typeof current?.tags;
    const tagsContent = Array.isArray(current?.tags)
      ? `[${current.tags.join(', ')}]`
      : JSON.stringify(current?.tags);
    addLog(
      'Navigation',
      `Switched to poem: ${current?.poet} - ${current?.title} | ID: ${current?.id} | Tags: ${tagsType} - ${tagsContent}`,
      'info'
    );
  }, [current?.id]);

  // Prefetch triggers - run background prefetching when poem changes
  // Only prefetch current poem; next-poem audio prefetch removed to conserve TTS quota (100 RPD free tier)
  useEffect(() => {
    if (!FEATURES.prefetching || !current?.id) return;

    // Prefetch current poem audio after 2s (only if user lingers on this poem)
    const prefetchCurrentAudio = setTimeout(() => {
      prefetchManager.prefetchAudio(current.id, current, addLog, activeAudioRequests);
    }, 2000);

    // Prefetch current poem insights after 5s (only if user stays)
    const prefetchCurrentInsights = setTimeout(() => {
      prefetchManager.prefetchInsights(current.id, current, addLog, activeInsightRequests);
    }, 5000);

    // Cleanup timeouts on unmount or when dependencies change
    return () => {
      clearTimeout(prefetchCurrentAudio);
      clearTimeout(prefetchCurrentInsights);
    };
  }, [current?.id, currentIndex, filtered]);

  // Keep-alive ping to prevent Render free tier from sleeping (15 min idle timeout)
  // Pings every 10 minutes to keep backend awake
  useEffect(() => {
    if (!useDatabase) return; // Only ping if database mode is enabled

    const keepAlivePing = setInterval(
      () => {
        fetch(`${getApiUrl()}/api/health`)
          .then(() => {
            if (FEATURES.debug) {
              addLog('Keep-Alive', 'Backend pinged successfully', 'info');
            }
          })
          .catch((err) => {
            // Silently fail - don't disrupt user experience
            if (FEATURES.debug) {
              addLog('Keep-Alive', `Ping failed: ${err.message}`, 'error');
            }
          });
      },
      10 * 60 * 1000
    ); // 10 minutes

    // Initial ping on mount
    fetch(`${getApiUrl()}/api/health`).catch(() => {});

    return () => clearInterval(keepAlivePing);
  }, [useDatabase]);

  if (!current) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme.bg} ${theme.text}`}>
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto opacity-60" />
          <p className="text-sm opacity-60">Loading poems...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-[100dvh] w-full flex flex-col overflow-hidden ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}
    >
      <style>{`
        .arabic-shadow { text-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.2); border-radius: 10px; }
        .bg-radial-gradient { background: radial-gradient(circle, var(--tw-gradient-from) 0%, var(--tw-gradient-via) 50%, var(--tw-gradient-to) 100%); }

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
          text-shadow: 0 0 30px rgba(197, 160, 89, 0.3);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
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
          stroke: ${GOLD.gold};
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

        @keyframes wave {
          0%, 100% { transform: scaleY(0.3); }
          50% { transform: scaleY(1); }
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }

        @keyframes wave-organic-1 {
          0% { height: 10px; }
          25% { height: 18px; }
          50% { height: 24px; }
          75% { height: 14px; }
          100% { height: 10px; }
        }

        @keyframes wave-organic-2 {
          0% { height: 12px; }
          30% { height: 20px; }
          60% { height: 22px; }
          80% { height: 16px; }
          100% { height: 12px; }
        }

        @keyframes wave-organic-3 {
          0% { height: 14px; }
          20% { height: 24px; }
          55% { height: 18px; }
          85% { height: 20px; }
          100% { height: 14px; }
        }

        @keyframes wave-organic-4 {
          0% { height: 11px; }
          35% { height: 19px; }
          65% { height: 23px; }
          90% { height: 15px; }
          100% { height: 11px; }
        }

        @keyframes wave-organic-5 {
          0% { height: 10px; }
          28% { height: 17px; }
          58% { height: 21px; }
          88% { height: 13px; }
          100% { height: 10px; }
        }

        .volume-pulse-active .bar-with-glow {
          box-shadow: 0 0 8px rgba(197, 160, 89, 0.6),
                      0 0 4px rgba(197, 160, 89, 0.4);
        }

        .bar-with-glow {
          transition: box-shadow 0.15s ease;
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

      <DebugPanel
        logs={logs}
        onClear={clearLogs}
        darkMode={darkMode}
        poem={current}
        appState={{
          mode: useDatabase ? 'database' : 'ai',
          theme: darkMode ? 'dark' : 'light',
          font: currentFont,
        }}
      />

      <header
        style={{ opacity: headerOpacity }}
        className="fixed top-4 md:top-8 left-0 right-0 z-40 pointer-events-none transition-opacity duration-300 flex flex-row items-center justify-center gap-4 md:gap-8 px-4 md:px-6"
      >
        <div
          className="flex flex-row items-baseline gap-3 header-luminescence"
        >
          <h1 style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', margin: 0 }}>
            <span style={{
              fontFamily: "'Reem Kufi', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(3rem, 6vw, 4.5rem)',
              lineHeight: 1,
              color: darkMode ? '#D4D0C8' : '#1A1614',
            }}>
              بالعربي
            </span>
            <span style={{
              fontFamily: "'Forum', serif",
              fontSize: 'clamp(1.25rem, 2.5vw, 1.75rem)',
              letterSpacing: '-0.05em',
              lineHeight: 1,
              color: '#C5A059',
              textShadow: '0 0 40px rgba(197,160,89,0.3)',
              paddingBottom: '0.15em',
            }}>
              poetry
            </span>
          </h1>
          <Feather
            style={{ color: '#C5A059', opacity: 0.8 }}
            className="w-[clamp(24px,4vw,36px)] h-[clamp(24px,4vw,36px)]"
            strokeWidth={1.5}
          />
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div
            className={`absolute inset-0 pointer-events-none opacity-[0.04] ${darkMode ? 'invert' : ''}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%234f46e5' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main
            ref={mainScrollRef}
            onScroll={handleScroll}
            className={`flex-1 overflow-y-auto custom-scrollbar relative z-10 px-4 md:px-0 pb-28${isOverflow ? ' pr-16' : ''}`}
          >
            <div className="min-h-full flex flex-col items-center justify-center py-6">
              <div className="w-full max-w-4xl flex flex-col items-center">
                <div
                  className={`text-center ${DESIGN.mainMetaPadding} animate-in slide-in-from-bottom-8 duration-1000 z-20 w-full`}
                >
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
                      <circle
                        className="frame-line"
                        cx="32"
                        cy="32"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="518"
                        cy="32"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="32"
                        cy="88"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                      <circle
                        className="frame-line"
                        cx="518"
                        cy="88"
                        r="2.5"
                        fill={GOLD.gold}
                        opacity="0.35"
                      />
                    </svg>

                    <div className="relative z-10 flex flex-col items-center justify-center w-full">
                      <div
                        className={`flex flex-wrap items-center justify-center gap-1 sm:gap-2 md:gap-4 ${currentFontClass} ${DESIGN.mainTitleSize}`}
                      >
                        <span className={`${theme.poetColor} opacity-90`}>
                          {current?.poetArabic}
                        </span>
                        <span className="opacity-10 text-[clamp(0.75rem,1.5vw,1.25rem)]">-</span>
                        <span className={`${theme.titleColor} font-bold`}>
                          {current?.titleArabic}
                        </span>
                      </div>
                      <div
                        className={`flex items-center justify-center gap-1 sm:gap-2 opacity-45 ${DESIGN.mainSubtitleSize} font-brand-en tracking-[0.08em] uppercase mt-[clamp(0.25rem,0.8vw,0.75rem)]`}
                      >
                        <span className="font-semibold">{current?.poet}</span>{' '}
                        <span className="opacity-20">•</span> <span>{current?.title}</span>
                      </div>
                      {dailyPoem && current?.id === dailyPoem.id && (
                        <div
                          className={`flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full ${GOLD.goldBg10} border ${GOLD.goldBg20}`}
                        >
                          <CalendarDays size={12} className={GOLD.goldText} />
                          <span
                            className={`font-brand-en text-[9px] font-bold tracking-[0.15em] uppercase ${GOLD.goldText}`}
                          >
                            Poem of the Day
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center gap-3 mt-1">
                    {Array.isArray(current?.tags) &&
                      current.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className={`px-2.5 py-0.5 border ${theme.brandBorder} ${theme.brand} ${DESIGN.mainTagSize} font-brand-en tracking-[0.15em] uppercase opacity-70`}
                        >
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
                          <p
                            dir="rtl"
                            className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                            style={{ fontSize: `calc(clamp(1.25rem, 2vw, 1.5rem) * ${textScale})` }}
                          >
                            {pair.ar}
                          </p>
                          {showTransliteration && pair.ar && (
                            <p
                              dir="ltr"
                              className={`font-brand-en italic opacity-30 ${DESIGN.anim}`}
                              style={{
                                fontSize: `calc(clamp(0.75rem, 1.2vw, 0.875rem) * ${textScale})`,
                              }}
                            >
                              {transliterate(pair.ar)}
                            </p>
                          )}
                          {showTranslation && pair.en && (
                            <p
                              dir="ltr"
                              className={`font-brand-en italic opacity-40 ${DESIGN.anim}`}
                              style={{
                                fontSize: `calc(clamp(1rem, 1.5vw, 1.125rem) * ${textScale})`,
                              }}
                            >
                              {pair.en}
                            </p>
                          )}
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
                        <Sparkles
                          className="absolute inset-0 m-auto animate-pulse text-indigo-400"
                          size={16}
                        />
                      </div>
                      <p className="text-xs italic font-brand-en opacity-60 tracking-widest uppercase">
                        Consulting the Diwan...
                      </p>
                    </div>
                  ) : interpretation ? (
                    <div
                      className={`flex flex-col gap-10 animate-in slide-in-from-bottom-10 duration-1000`}
                    >
                      <div className="pt-6 border-t border-indigo-500/10">
                        <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                          The Depth
                        </h4>
                        <div className="pl-4 border-l border-indigo-500/10">
                          <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                            {insightParts?.depth}
                          </p>
                        </div>
                      </div>
                      <div className="pt-6 border-t border-indigo-500/10">
                        <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-3 uppercase tracking-[0.3em] opacity-80">
                          The Author
                        </h4>
                        <div className="pl-4 border-l border-indigo-500/10">
                          <p className="text-[clamp(0.9375rem,1.6vw,1rem)] font-brand-en font-normal leading-relaxed italic opacity-90">
                            {insightParts?.author}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </main>

          <footer className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 bg-gradient-to-t from-black/5 to-transparent safe-bottom">
            {audioError && (
              <div
                className={`mb-2 px-4 py-2 rounded-full text-xs font-medium ${DESIGN.glass} ${theme.glass} border ${theme.border} shadow-lg ${DESIGN.anim} max-w-[calc(100vw-2rem)] text-center`}
              >
                <span className={theme.error}>{audioError}</span>
                <button
                  onClick={dismissAudioError}
                  className="ml-2 opacity-60 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X size={12} className="inline" />
                </button>
              </div>
            )}
            <div
              ref={controlBarRef}
              className={`flex items-center gap-2 px-5 py-2 rounded-full shadow-2xl border ${DESIGN.glass} ${theme.border} ${theme.shadow} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}
            >
              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                {isGeneratingAudio ? (
                  <>
                    <button
                      disabled
                      aria-label="Preparing audio"
                      className="min-w-[46px] min-h-[46px] p-[11px] bg-[#C5A059]/8 border border-[#C5A059]/30 cursor-wait transition-all duration-300 flex items-center justify-center rounded-full"
                    >
                      <div className="flex items-center justify-center gap-0.5 h-[21px]">
                        <div
                          className="w-[2px] h-[6px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.15s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[14px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.3s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.45s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[6px] bg-[#C5A059] rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.6s',
                          }}
                        />
                      </div>
                    </button>
                    <div className="flex flex-col items-center gap-0.5">
                      <span
                        className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase text-stone-400 whitespace-nowrap"
                        style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                      >
                        Crafting
                      </span>
                      <span
                        className="font-amiri text-[9px] text-[#C5A059]/80"
                        dir="rtl"
                        style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                      >
                        إعداد الصوت
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 relative group`}
                    >
                      {audioError ? (
                        <Volume2 className={theme.error} size={21} />
                      ) : isPlaying ? (
                        <>
                          <PulseGlowBars />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                            <Pause fill={GOLD.gold} size={14} />
                          </div>
                        </>
                      ) : (
                        <Volume2 className={GOLD.goldText} size={21} />
                      )}
                    </button>
                    {isPlaying ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase text-stone-400 whitespace-nowrap">
                          Playing
                        </span>
                        <span className="font-amiri text-[9px] text-[#C5A059]/80" dir="rtl">
                          يُسمع الآن
                        </span>
                      </div>
                    ) : (
                      <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
                        Listen
                      </span>
                    )}
                  </>
                )}
              </div>

              {!isOverflow && (
                <div className="flex flex-col items-center gap-1 min-w-[52px]">
                  <button
                    onClick={handleAnalyze}
                    disabled={isInterpreting || interpretation}
                    aria-label="Explain poem meaning"
                    className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 disabled:opacity-50`}
                  >
                    {isInterpreting ? (
                      <Loader2 className={`animate-spin ${GOLD.goldText}`} size={21} />
                    ) : (
                      <Compass className={GOLD.goldText} size={21} />
                    )}
                  </button>
                  <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
                    Explain
                  </span>
                </div>
              )}

              <div className="flex flex-col items-center gap-1 min-w-[52px]">
                <button
                  onClick={handleFetch}
                  disabled={isFetching}
                  aria-label="Discover new poem"
                  className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                >
                  {isFetching ? (
                    <Loader2 className={`animate-spin ${GOLD.goldText}`} size={21} />
                  ) : (
                    <Rabbit className={`${GOLD.goldText} rabbit-bounce`} size={21} />
                  )}
                </button>
                <span className="font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap">
                  Discover
                </span>
              </div>

              <SavePoemButton
                poem={current}
                isSaved={isPoemSaved(current)}
                onSave={handleSavePoem}
                onUnsave={handleUnsavePoem}
                disabled={!user}
              />

              <DownvoteButton
                poem={current}
                isDownvoted={isPoemDownvoted(current)}
                onDownvote={handleDownvote}
                onUndownvote={handleUndownvote}
                disabled={!user}
              />

              {!isOverflow && (
                <>
                  <div className="w-px h-10 bg-stone-500/20 mx-1 flex-shrink-0" />

                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button
                      onClick={handleCopy}
                      aria-label="Copy poem to clipboard"
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                    >
                      {showCopySuccess ? (
                        <Check size={21} className="text-green-500" />
                      ) : (
                        <Copy size={21} className={GOLD.goldText} />
                      )}
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      Copy
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button
                      onClick={handleShare}
                      aria-label="Share poem"
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                    >
                      {showShareSuccess ? (
                        <Check size={21} className="text-green-500" />
                      ) : (
                        <Share2 size={21} className={GOLD.goldText} />
                      )}
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      Share
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button
                      onClick={() => setShowTranslation((prev) => !prev)}
                      aria-label={
                        showTranslation ? 'Hide English translation' : 'Show English translation'
                      }
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${!showTranslation ? 'opacity-40' : ''}`}
                    >
                      <Languages size={21} className={GOLD.goldText} />
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      {showTranslation ? 'English' : 'Arabic'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button
                      onClick={() => setShowTransliteration((prev) => !prev)}
                      aria-label={
                        showTransliteration ? 'Hide transliteration' : 'Show transliteration'
                      }
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${!showTransliteration ? 'opacity-40' : ''}`}
                    >
                      <span
                        className={`${GOLD.goldText} text-[14px] font-bold leading-none`}
                        style={{ fontFamily: "'Amiri', serif" }}
                      >
                        عA
                      </span>
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      Romanize
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-1 min-w-[52px]">
                    <button
                      onClick={cycleTextSize}
                      aria-label={`Text size: ${TEXT_SIZES[textSizeLevel].label}`}
                      className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                    >
                      <span className={`font-brand-en text-[15px] font-bold ${GOLD.goldText}`}>
                        Aa
                      </span>
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      {TEXT_SIZES[textSizeLevel].label}
                    </span>
                  </div>

                  {dailyPoem && (
                    <div className="flex flex-col items-center gap-1 min-w-[52px]">
                      <button
                        onClick={handleDailyPoem}
                        aria-label="Poem of the day"
                        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${current?.id === dailyPoem.id ? GOLD.goldActiveBg : ''}`}
                      >
                        <CalendarDays size={21} className={GOLD.goldText} />
                      </button>
                      <span
                        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                      >
                        Daily
                      </span>
                    </div>
                  )}

                  <DatabaseToggle
                    useDatabase={useDatabase}
                    onToggle={handleToggleDatabase}
                    disabled={false}
                  />

                  <ThemeDropdown
                    darkMode={darkMode}
                    onToggleDarkMode={handleToggleTheme}
                    currentFont={currentFont}
                    onCycleFont={cycleFont}
                    fonts={FONTS}
                  />

                  <CategoryPill
                    selected={selectedCategory}
                    onSelect={setSelectedCategory}
                    darkMode={darkMode}
                  />

                  <AuthButton
                    user={user}
                    darkMode={darkMode}
                    onSignIn={handleSignIn}
                    onSignOut={handleSignOut}
                    onOpenSavedPoems={handleOpenSavedPoems}
                    onOpenSettings={handleOpenSettings}
                    theme={theme}
                  />
                </>
              )}
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div
            className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}
          >
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <h3 className="font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] text-indigo-600 tracking-tight">
                Poetic Insight
              </h3>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate">
                {current?.poet} • {current?.title}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {isInterpreting ? (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-30 animate-pulse">
                  <Sparkles className="animate-spin text-indigo-500" size={32} />
                  <p className="font-brand-en italic text-[clamp(0.875rem,1.5vw,1rem)]">
                    Consulting Diwan...
                  </p>
                </div>
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
                  {showTranslation && (
                    <p
                      className={`font-brand-en italic whitespace-pre-wrap ${DESIGN.paneVerseSize} ${darkMode ? 'text-stone-100' : 'text-stone-800'}`}
                    >
                      {insightParts?.poeticTranslation || current?.english}
                    </p>
                  )}
                  {insightParts?.depth && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                        The Depth
                      </h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                          {insightParts.depth}
                        </p>
                      </div>
                    </div>
                  )}
                  {insightParts?.author && (
                    <div className="pt-6 border-t border-indigo-500/10">
                      <h4 className="text-[10px] font-brand-en font-black text-indigo-600 mb-2 uppercase tracking-widest opacity-80">
                        The Author
                      </h4>
                      <div className="pl-4 border-l border-indigo-500/10">
                        <p className="text-[clamp(0.875rem,1.5vw,1rem)] font-brand-en font-normal opacity-80 leading-relaxed">
                          {insightParts.author}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSignInWithGoogle={handleSignInWithGoogle}
        onSignInWithApple={handleSignInWithApple}
        theme={theme}
      />

      {/* Saved Poems View */}
      <SavedPoemsView
        isOpen={showSavedPoems}
        onClose={() => setShowSavedPoems(false)}
        savedPoems={savedPoems}
        onSelectPoem={handleSelectSavedPoem}
        onUnsavePoem={handleUnsavePoemFromList}
        theme={theme}
        currentFontClass={currentFontClass}
      />

      {/* Settings View */}
      <SettingsView
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleTheme}
        currentFont={currentFont}
        onSelectFont={handleSelectFont}
        user={user}
        theme={theme}
      />
      {/* Design Review - Mobile: left edge vertical strip, Desktop: bottom-left pill */}
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateY(-50%) translateX(-100%); opacity: 0; }
          to { transform: translateY(-50%) translateX(0); opacity: 1; }
        }
      `}</style>
      <a
        href="/design-review"
        className={`fixed left-0 top-1/2 -translate-y-1/2 z-[45] md:hidden py-3 px-1.5 rounded-r-2xl bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-xl border-r-2 ${GOLD.goldBorderAccent} no-underline flex items-center`}
        style={{ writingMode: 'vertical-rl', animation: 'slideInLeft 0.4s ease-out' }}
        title="Design Review"
      >
        <span
          className={`text-[10px] font-brand-en tracking-widest ${GOLD.goldTextMuted} uppercase`}
        >
          Review
        </span>
      </a>
      <a
        href="/design-review"
        className={`hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-[45] py-4 px-2 rounded-r-2xl bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-xl border-r-2 ${GOLD.goldBorderAccent} no-underline items-center hover:px-3 ${GOLD.goldHoverBorderStrong} transition-all duration-300 cursor-pointer`}
        style={{ writingMode: 'vertical-rl', animation: 'slideInLeft 0.4s ease-out' }}
        title="Design Review"
      >
        <span
          className={`text-[10px] font-brand-en tracking-widest ${GOLD.goldTextMuted} uppercase`}
        >
          Review
        </span>
      </a>

      {/* Vertical Sidebar - Mobile overflow only */}
      {isOverflow && (
        <VerticalSidebar
          onExplain={handleAnalyze}
          onCopy={handleCopy}
          showCopySuccess={showCopySuccess}
          onShare={handleShare}
          showShareSuccess={showShareSuccess}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
          user={user}
          theme={theme}
          isInterpreting={isInterpreting}
          interpretation={interpretation}
          showTranslation={showTranslation}
          onToggleTranslation={() => setShowTranslation((prev) => !prev)}
          showTransliteration={showTransliteration}
          onToggleTransliteration={() => setShowTransliteration((prev) => !prev)}
          textSizeLabel={TEXT_SIZES[textSizeLevel].label}
          onCycleTextSize={cycleTextSize}
          dailyPoem={dailyPoem}
          onDailyPoem={handleDailyPoem}
          isCurrentDaily={current?.id === dailyPoem?.id}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleTheme}
          currentFont={currentFont}
          onCycleFont={cycleFont}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          useDatabase={useDatabase}
          onToggleDatabase={handleToggleDatabase}
        />
      )}

      {/* Splash / Onboarding Screen */}
      <SplashScreen
        isOpen={showSplash}
        onDismiss={() => {
          setShowSplash(false);
          try {
            localStorage.setItem('hasSeenOnboarding', 'true');
          } catch {}
        }}
        showOnboarding={showOnboarding}
        theme={theme}
      />

      {/* Keyboard Shortcut Help */}
      <ShortcutHelp
        isOpen={showShortcutHelp}
        onClose={() => setShowShortcutHelp(false)}
        theme={theme}
      />
    </div>
  );
}
