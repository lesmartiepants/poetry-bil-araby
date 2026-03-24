import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useLocation, useRoute } from 'wouter';
import { AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Loader2,
  X,
  Feather,
  Shuffle,
  Paintbrush,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import Sentry from './sentry.js';
import {
  useAuth,
  useUserSettings,
  useSavedPoems,
  useDownvotes,
  usePoemEvents,
} from './hooks/useAuth';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useVolumeDetection, PulseGlowBars } from './hooks/useVolumeDetection.jsx';
import {
  INSIGHTS_SYSTEM_PROMPT,
  RATCHET_SYSTEM_PROMPT,
  DISCOVERY_SYSTEM_PROMPT,
  getTTSContent,
} from './prompts';
import { parseInsight } from './utils/insightParser';
import { repairAndParseJSON } from './utils/jsonRepair';
import { FEATURES, DESIGN, BRAND, THEME, GOLD, CATEGORIES, FONTS } from './constants/index.js';
import { usePoemStore } from './stores/poemStore';
import { useAudioStore } from './stores/audioStore';
import { useUIStore } from './stores/uiStore';
import { useModalStore } from './stores/modalStore';
import { fetchPoem as fetchPoemAction } from './stores/actions/fetchPoem';
import { togglePlay as togglePlayAction } from './stores/actions/togglePlay';
import { analyzePoem as analyzePoemAction } from './stores/actions/analyzePoem';
import { getRecentSeenIds, markPoemSeen, pruneSeenPoems } from './utils/seenPoems.js';
import { filterPoemsByCategory } from './utils/filterPoems.js';
import { pcm16ToWav } from './utils/audio.js';
import {
  API_MODELS,
  TTS_CONFIG,
  discoverTextModels,
  geminiTextFetch,
  fetchTTSWithFallback,
} from './services/gemini.js';
import { CACHE_CONFIG, cacheOperations } from './services/cache.js';
import { prefetchManager } from './services/prefetch.js';
import {
  fetchPoemById,
  fetchRandomPoem,
  saveTranslation,
  pingHealth,
} from './services/database.js';
import './styles/app.css';
import DebugPanel from './components/DebugPanel.jsx';
import DesktopInsightPane from './components/DesktopInsightPane.jsx';
import PoemCard from './components/PoemCard.jsx';
import PoetPicker from './components/PoetPicker.jsx';
import MysticalConsultationEffect from './components/MysticalConsultationEffect.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
const SplashScreen = lazy(() => import('./components/SplashScreen.jsx'));
import InsightsDrawer from './components/InsightsDrawer.jsx';
import VerticalSidebar from './components/VerticalSidebar.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import SavePoemButton from './components/auth/SavePoemButton.jsx';
import DownvoteButton from './components/auth/DownvoteButton.jsx';
import SavedPoemsView from './components/auth/SavedPoemsView.jsx';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Re-export filterPoemsByCategory for backwards compatibility with existing tests
export { filterPoemsByCategory } from './utils/filterPoems.js';

/* =============================================================================
  API, Cache, Prefetch — imported from src/services/
  Audio utility (pcm16ToWav) — imported from src/utils/audio.js
  =============================================================================
*/

/* =============================================================================
  MAIN APPLICATION
  =============================================================================
*/

export default function DiwanApp() {
  const [, navigate] = useLocation();
  const [, routeParams] = useRoute('/poem/:id');

  const mainScrollRef = useRef(null);
  const audioRef = useRef(new Audio());
  const isTogglingPlay = useRef(false);
  const controlBarRef = useRef(null);

  // Volume-based glow effect refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const volumePulseRef = useRef(null);

  const headerOpacity = useUIStore((s) => s.headerOpacity);
  const setHeaderOpacity = useUIStore((s) => s.setHeaderOpacity);
  // ── Poem store (Zustand) ──
  const poems = usePoemStore((s) => s.poems);
  const setPoems = usePoemStore((s) => s.setPoems);
  const currentIndex = usePoemStore((s) => s.currentIndex);
  const setCurrentIndex = usePoemStore((s) => s.setCurrentIndex);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);
  const useDatabase = usePoemStore((s) => s.useDatabase);
  const setUseDatabase = usePoemStore((s) => s.setUseDatabase);
  const isFetching = usePoemStore((s) => s.isFetching);
  const setIsFetching = usePoemStore((s) => s.setFetching);
  const autoExplainPending = usePoemStore((s) => s.autoExplainPending);
  const setAutoExplainPending = usePoemStore((s) => s.setAutoExplain);
  const interpretation = usePoemStore((s) => s.interpretation);
  const setInterpretation = usePoemStore((s) => s.setInterpretation);
  const isInterpreting = usePoemStore((s) => s.isInterpreting);
  const setIsInterpreting = usePoemStore((s) => s.setInterpreting);

  // ── UI store (Zustand) ──
  const darkMode = useUIStore((s) => s.darkMode);
  const setDarkMode = useUIStore((s) => s.setDarkMode);
  const currentFont = useUIStore((s) => s.font);
  const setCurrentFont = useUIStore((s) => s.setFont);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  // ── Audio store (Zustand) ──
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStore((s) => s.setPlaying);
  const isGeneratingAudio = useAudioStore((s) => s.isGenerating);
  const setIsGeneratingAudio = useAudioStore((s) => s.setGenerating);
  const audioUrl = useAudioStore((s) => s.url);
  const setAudioUrl = useAudioStore((s) => s.setUrl);
  const audioError = useAudioStore((s) => s.error);
  const setAudioError = useAudioStore((s) => s.setError);
  const hasAutoLoaded = useRef(false);
  const logs = useUIStore((s) => s.logs);
  const showDebugLogs = useUIStore((s) => s.showDebugLogs);
  const showCopySuccess = useModalStore((s) => s.copyToast);
  const showShareSuccess = useModalStore((s) => s.shareToast);
  const showInsightSuccess = useModalStore((s) => s.insightToast);
  const insightsDrawerOpen = useModalStore((s) => s.insightsDrawer);
  const setInsightsDrawerOpen = useModalStore((s) => s.setInsightsDrawer);
  const cacheStats = useUIStore((s) => s.cacheStats);
  // activeAudioIds, activeInsightIds, pollingIntervalIds are now in poemStore

  // Auth state
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const { settings, saveSettings } = useUserSettings(user);
  const { savedPoems, savePoem, unsavePoem, isPoemSaved } = useSavedPoems(user);
  const { downvotedPoemIds, downvotePoem, undownvotePoem, isPoemDownvoted } = useDownvotes(user);
  const { emitEvent } = usePoemEvents(user);

  const showAuthModal = useModalStore((s) => s.authModal);
  const setShowAuthModal = useModalStore((s) => s.setAuthModal);
  const authModalMessage = useModalStore((s) => s.authMessage);
  const showSavedPoems = useModalStore((s) => s.savedPoems);
  const setShowSavedPoems = useModalStore((s) => s.setSavedPoemsOpen);
  const showSplash = useModalStore((s) => s.splash);
  const showOnboarding = useModalStore((s) => s.onboarding);
  const showTranslation = useUIStore((s) => s.showTranslation);
  const setShowTranslation = useUIStore((s) => s.setShowTranslation);
  const textSizeLevel = useUIStore((s) => s.textSize);
  const setTextSizeLevel = useUIStore((s) => s.setTextSize);
  const showTransliteration = useUIStore((s) => s.showTransliteration);
  const setShowTransliteration = useUIStore((s) => s.setShowTransliteration);
  const showShortcutHelp = useModalStore((s) => s.shortcutHelp);

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

  const TEXT_SIZES = [
    { label: 'S', multiplier: 0.85 },
    { label: 'M', multiplier: 1.0 },
    { label: 'L', multiplier: 1.15 },
    { label: 'XL', multiplier: 1.3 },
  ];

  const cycleTextSize = () => {
    useUIStore.getState().cycleTextSize();
  };

  const textScale = TEXT_SIZES[textSizeLevel].multiplier;

  const filtered = usePoemStore.getState().filteredPoems();
  const current = usePoemStore.getState().currentPoem();

  const addLog = useUIStore.getState().addLog;

  // Track poem view time (emit 'view' event after 3s on same poem)
  useEffect(() => {
    if (!current?.id || !user) return;
    const timer = setTimeout(() => {
      emitEvent(current.id, 'view', { duration_ms: 3000 });
      addLog('Event', `→ view event emitted | poem_id: ${current.id} | duration: 3000ms`, 'info');
    }, 3000);
    return () => clearTimeout(timer);
  }, [current?.id, user]);

  useEffect(() => {
    if (selectedCategory !== 'All') {
      track('poet_filter_changed', { poet: selectedCategory });
      if (filtered.length === 0) {
        if (isFetching) {
          // Another fetch is already in progress; queue a retry for when it completes.
          usePoemStore.getState().setPendingCategory(selectedCategory);
        } else {
          handleFetch();
        }
      } else {
        setCurrentIndex(0);
      }
    } else {
      usePoemStore.getState().setPendingCategory(null); // Clear any pending poet fetch on "All"
      setCurrentIndex(0);
    }
  }, [selectedCategory]);

  // Retry a blocked poet-selection fetch once the current fetch completes.
  // The equality check guards against stale refs: if the user changed category after
  // the block, we only retry for the CURRENT category (matching ref). Without it, a
  // ref left over from a previous category could trigger a spurious extra fetch.
  // This effect intentionally depends only on `isFetching`. `selectedCategory` is read
  // from closure and is always current when this fires. `handleFetch` is omitted because
  // it re-creates on every render and is always in scope at the time the effect runs.
  useEffect(() => {
    if (
      !isFetching &&
      usePoemStore.getState().pendingCategory &&
      usePoemStore.getState().pendingCategory === selectedCategory
    ) {
      usePoemStore.getState().setPendingCategory(null);
      handleFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFetching]);

  // Eagerly populate the discovered model list so it's ready before any user action.
  // Using the default fetch mock in tests means this never consumes a mockResolvedValueOnce.
  // Eagerly discover available AI models via the backend proxy.
  useEffect(() => {
    discoverTextModels(addLog);
  }, []);

  // Auto-load a poem and queue explanation on first mount.
  // If the URL contains /poem/:id, load that specific poem (deep link).
  // OAuth restore and prefetch are handled in poemStore's getInitialPoems().
  useEffect(() => {
    if (!hasAutoLoaded.current) {
      hasAutoLoaded.current = true;

      // Deep link detection via wouter route match: /poem/:id
      if (routeParams?.id && useDatabase) {
        const poemId = routeParams.id;
        track('deep_link_loaded', { poemId });
        addLog('DeepLink', `Loading poem ID ${poemId} from URL`, 'info');
        fetchPoemById(poemId)
          .then((poem) => {
            setPoems([poem]);
            setCurrentIndex(0);
            setAutoExplainPending(true);
            addLog('DeepLink', `Loaded: ${poem.poet} — ${poem.title}`, 'success');
          })
          .catch((err) => {
            addLog('DeepLink', `Failed: ${err.message}`, 'error');
            setAutoExplainPending(true);
            handleFetch();
          });
        prefetchNextVisitPoem();
        return;
      }

      // Clear stashed OAuth poem (already restored by poemStore's getInitialPoems)
      try {
        sessionStorage.removeItem('pendingSavePoem');
      } catch {}

      // If the initial poem already has a cached translation, skip auto-explain
      const initial = poems[0];
      if (initial?.cachedTranslation) {
        addLog(
          'Init',
          `Loaded with cached translation: ${initial.poet} — ${initial.title}`,
          'success'
        );
      } else {
        // No cached translation — queue auto-explain and fetch from DB
        setAutoExplainPending(true);
        if (!initial?.isSeedPoem || !initial?.cachedTranslation) {
          handleFetch();
        }
      }

      // Background: pre-fetch next visit's poem
      prefetchNextVisitPoem();
    }
  }, []);

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

  // Auto-trigger explanation after auto-loaded poem arrives.
  // In ratchet mode, also run for poems that have a cached translation (overrides scholarly cache).
  useEffect(() => {
    if (autoExplainPending && current?.id && !isFetching && !isInterpreting && !interpretation) {
      setAutoExplainPending(false);
      if (ratchetMode || !current?.cachedTranslation) {
        handleAnalyze();
      }
    }
  }, [autoExplainPending, current?.id, isFetching, isInterpreting, interpretation, ratchetMode]);

  // When ratchet mode is toggled, clear the current interpretation so the new prompt is used.
  // When enabling ratchet mode, also queue an auto-explain so insights regenerate immediately.
  // setInterpretation and setAutoExplainPending are stable Zustand actions, intentionally omitted.
  useEffect(() => {
    setInterpretation(null);
    if (ratchetMode && current?.id) {
      setAutoExplainPending(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand actions and current?.id are stable refs
  }, [ratchetMode]);

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

  // Sync `light` class on <html> so CSS vars (--bg-app, --gold) apply to html/body
  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

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

  // headerProgress: 0 = full size center, 1 = compact right corner
  // Slower ramp: full transition over 200px of scroll instead of 60
  const handleScroll = (e) => {
    const progress = Math.min(1, e.target.scrollTop / 200);
    setHeaderOpacity(progress);
  };


  // Extract cached translation fields into stable local variables so useMemo
  // only re-runs when the actual string values change, not on every `current` reference change.
  const cachedTranslation = current?.cachedTranslation;
  const cachedExplanation = current?.cachedExplanation;
  const cachedAuthorBio = current?.cachedAuthorBio;

  const insightParts = useMemo(() => {
    // In ratchet mode, always use the AI-generated interpretation so cached scholarly
    // translations don't override the Gen Z ratchet content.
    if (!ratchetMode && cachedTranslation) {
      return {
        poeticTranslation: cachedTranslation,
        depth: cachedExplanation || '',
        author: cachedAuthorBio || '',
      };
    }
    return parseInsight(interpretation);
  }, [interpretation, cachedTranslation, cachedExplanation, cachedAuthorBio, ratchetMode]);

  const versePairs = useMemo(() => {
    const arLines = (current?.arabic || '').split('\n').filter((l) => l.trim());
    const enSource = insightParts?.poeticTranslation || current?.english || '';
    const enLines = enSource.split('\n').filter((l) => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || '', en: enLines[i] || '' });
    }
    return pairs;
  }, [current, insightParts]);

  // pcm16ToWav imported from ./utils/audio.js (used directly below)

  useEffect(() => {
    const audio = audioRef.current;
    const handleEnded = () => setIsPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => audio.removeEventListener('ended', handleEnded);
  }, []);

  // Volume detection for pulse & glow effect
  useVolumeDetection({
    isPlaying,
    audioRef,
    audioContextRef,
    analyserRef,
    dataArrayRef,
    animationFrameRef,
    sourceNodeRef,
    volumePulseRef,
    addLog,
  });

  const togglePlay = () => togglePlayAction({ audioRef, isTogglingPlay, current, addLog, track });

  const handleAnalyze = () => analyzePoemAction({ current, addLog, track });

  const handleFetch = () => fetchPoemAction({ addLog, track, emitEvent, navigate, markPoemSeen });

  // Keyboard shortcuts
  useKeyboardShortcuts({
    togglePlay,
    handleFetch,
    handleAnalyze,
    isInterpreting,
    interpretation,
    setShowAuthModal,
    setShowSavedPoems,
  });

  // Pre-fetch a poem in the background for the next visit (stored in localStorage with TTL)
  async function prefetchNextVisitPoem() {
    try {
      const poem = await fetchRandomPoem();
      localStorage.setItem(
        'qafiyah_nextPoem',
        JSON.stringify({
          poem,
          storedAt: Date.now(),
        })
      );
    } catch {} // silent fail — prefetch is best-effort
  }

  const handleCopy = async () => {
    addLog(
      'UI Event',
      `📋 Copy button clicked | Poem: ${current?.poet} - ${current?.title}`,
      'info'
    );

    const englishText = insightParts?.poeticTranslation || current?.english || '';
    const textToCopy = `${current?.titleArabic || ''}\n${current?.poetArabic || ''}\n\n${current?.arabic || ''}\n\n---\n\n${current?.title || ''}\n${current?.poet || ''}\n\n${englishText}`;
    const copyChars = textToCopy.length;
    const arabicChars = current?.arabic?.length || 0;
    const englishChars = englishText.length;

    try {
      await navigator.clipboard.writeText(textToCopy);
      track('poem_copied', { poet: current?.poet });
      if (current?.id) {
        emitEvent(current.id, 'copy');
        addLog('Event', `→ copy event emitted | poem_id: ${current.id}`, 'info');
      }
      useModalStore.getState().showToastTimed('copy', 2000);
      addLog(
        'Copy',
        `✓ Copied to clipboard | ${copyChars} chars total (${arabicChars} Arabic + ${englishChars} English)`,
        'success'
      );
    } catch (e) {
      addLog('Copy Error', e.message, 'error');
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
      useModalStore.getState().showToastTimed('share', 2000);
      addLog('Share', `Link copied: ${shareUrl}`, 'success');
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
      navigate('/poem/' + mappedPoem.id, { replace: true });
    } else {
      navigate('/', { replace: true });
    }
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
    setInterpretation(null);
    audioRef.current.pause();
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    // Clear any stuck loading states when poem changes
    setIsGeneratingAudio(false);
    setIsInterpreting(false);
    setAudioError(null);

    // Reset translation visibility so every new poem shows the translation by default
    setShowTranslation(true);

    // Clear all polling intervals to prevent stale requests
    usePoemStore.getState().clearPollingIntervals();

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
  // Only prefetch current poem; next-poem audio prefetch removed to conserve TTS quota (100 RPD per model, free tier)
  useEffect(() => {
    if (!FEATURES.prefetching || !current?.id) return;

    // Prefetch current poem audio after 2s (only if user lingers on this poem)
    const prefetchCurrentAudio = setTimeout(() => {
      prefetchManager.prefetchAudio(current.id, current, addLog);
    }, 2000);

    // Prefetch current poem insights after 5s (only if user stays)
    const prefetchCurrentInsights = setTimeout(() => {
      prefetchManager.prefetchInsights(current.id, current, addLog);
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
        pingHealth()
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
    pingHealth().catch(() => {});

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
      className={`h-[100dvh] w-full flex flex-col overflow-hidden overscroll-none ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} selection:bg-indigo-500`}
      style={{ touchAction: 'pan-y', overflowX: 'hidden' }}
    >
      <DebugPanel controlBarRef={controlBarRef} />

      {/* Ratchet Mode glow overlay — full-screen Easter egg effect */}
      {ratchetMode && (
        <div
          data-testid="ratchet-glow"
          aria-hidden="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 39,
            pointerEvents: 'none',
            animation: 'ratchetGlow 2s ease-in-out infinite',
          }}
        />
      )}

      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          pointerEvents: 'none',
          padding: `${0.13 - headerOpacity * 0.13}rem 1rem ${0.2 - headerOpacity * 0.2}rem`,
          height: headerOpacity > 0 ? `${64 - headerOpacity * 32}px` : 'auto',
          overflow: headerOpacity > 0 ? 'hidden' : 'visible',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: darkMode
            ? `rgba(12,12,14,${0.85 - headerOpacity * 0.45})`
            : `rgba(253,252,248,${0.85 - headerOpacity * 0.45})`,
          backdropFilter: `blur(${12 - headerOpacity * 8}px)`,
          WebkitBackdropFilter: `blur(${12 - headerOpacity * 8}px)`,
          borderBottom: `1px solid ${darkMode ? `rgba(197,160,89,${0.1 - headerOpacity * 0.1})` : `rgba(107,87,68,${0.1 - headerOpacity * 0.1})`}`,
          transition:
            'padding 0.4s ease-out, height 0.4s ease-out, background-color 0.3s, backdrop-filter 0.3s',
        }}
      >
        <div
          className="flex flex-row items-center gap-1.5 header-luminescence"
          style={{
            transform: `scale(${1 - headerOpacity * 0.5})`,
            opacity: 1 - headerOpacity * 0.3,
            transformOrigin: 'center',
            transition: 'transform 0.4s ease-out, opacity 0.3s',
          }}
        >
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span
              style={{
                ...BRAND.arabic,
                color: 'var(--gold)',
                textShadow: '0 0 40px rgba(197,160,89,0.3)',
              }}
            >
              بالعربي
            </span>
            <span
              style={{
                ...BRAND.english,
                color: darkMode ? '#D4D0C8' : '#1A1614',
              }}
            >
              poetry
            </span>
          </h1>
          <Feather
            style={{ ...BRAND.feather, color: 'var(--gold)', alignSelf: 'center' }}
            strokeWidth={1.5}
          />
        </div>
      </header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='none' stroke='%23C5A059' stroke-width='1'/%3E%3Ccircle cx='40' cy='40' r='18' fill='none' stroke='%23C5A059' stroke-width='1'/%3E%3C/svg%3E")`,
              backgroundSize: '60px 60px',
            }}
          />
          <MysticalConsultationEffect active={isInterpreting} theme={theme} />

          <main
            ref={mainScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 px-4 md:px-0 pb-28 pt-10 md:pt-12"
            style={{ overscrollBehaviorX: 'none' }}
          >
            <div
              className="pointer-events-none sticky top-0 z-30"
              style={{
                height: '40px',
                marginLeft: '-2rem',
                marginRight: '-2rem',
                marginBottom: '-40px',
                opacity: headerOpacity,
                background: `linear-gradient(to bottom, ${darkMode ? 'rgba(12,12,14,0.6)' : 'rgba(253,252,248,0.6)'} 0%, ${darkMode ? 'rgba(12,12,14,0.3)' : 'rgba(253,252,248,0.3)'} 40%, transparent 100%)`,
                transition: 'opacity 0.3s ease-out',
              }}
            />
            <div className="flex flex-col items-center pt-2">
              <PoemCard
                current={current}
                versePairs={versePairs}
                insightParts={insightParts}
                isInterpreting={isInterpreting}
                interpretation={interpretation}
                showTransliteration={showTransliteration}
                showTranslation={showTranslation}
                darkMode={darkMode}
                theme={theme}
                currentFontClass={currentFontClass}
                textScale={textScale}
              />
            </div>
          </main>

          {/* Bottom fade — content fades out above the control bar */}
          <div
            className="pointer-events-none fixed bottom-0 left-0 right-0 z-40"
            style={{
              height: '100px',
              background: `linear-gradient(to top, ${darkMode ? '#0c0c0e' : '#FDFCF8'} 0%, ${darkMode ? 'rgba(12,12,14,0.85)' : 'rgba(253,252,248,0.85)'} 30%, ${darkMode ? 'rgba(12,12,14,0.4)' : 'rgba(253,252,248,0.4)'} 60%, transparent 100%)`,
            }}
          />

          <footer className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 safe-bottom">
            {audioError && (
              <div
                className={`mb-2 px-4 py-2 rounded-full text-xs font-medium ${DESIGN.glass} ${theme.glass} border ${theme.border} shadow-lg ${DESIGN.anim} max-w-[calc(100vw-2rem)] text-center`}
              >
                <span className={theme.error}>{audioError}</span>
                <button
                  onClick={() => setAudioError(null)}
                  className="ml-2 opacity-60 hover:opacity-100"
                  aria-label="Dismiss"
                >
                  <X size={12} className="inline" />
                </button>
              </div>
            )}
            <div
              ref={controlBarRef}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border ${DESIGN.glass} ${theme.border} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                {isGeneratingAudio ? (
                  <>
                    <button
                      disabled
                      aria-label="Preparing audio"
                      className="min-w-[46px] min-h-[46px] p-[11px] bg-gold/8 border border-gold/30 cursor-wait transition-all duration-300 flex items-center justify-center rounded-full"
                    >
                      <div className="flex items-center justify-center gap-0.5 h-[21px]">
                        <div
                          className="w-[2px] h-[6px] bg-gold rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-gold rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.15s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[14px] bg-gold rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.3s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[10px] bg-gold rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.45s',
                          }}
                        />
                        <div
                          className="w-[2px] h-[6px] bg-gold rounded-full"
                          style={{
                            animation: 'wave 1.2s ease-in-out infinite',
                            animationDelay: '0.6s',
                          }}
                        />
                      </div>
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                      style={{ opacity: 0.6, animation: 'shimmer 2s ease-in-out infinite' }}
                    >
                      Crafting
                    </span>
                  </>
                ) : (
                  <>
                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? 'Pause recitation' : 'Play recitation'}
                      style={{ willChange: 'transform' }}
                      className={`min-w-[46px] min-h-[46px] w-[46px] h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-transform duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 relative group`}
                    >
                      {audioError ? (
                        <Volume2 className={theme.error} size={21} />
                      ) : isPlaying ? (
                        <>
                          <PulseGlowBars volumePulseRef={volumePulseRef} />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                            <Pause fill={GOLD.gold} size={14} />
                          </div>
                        </>
                      ) : (
                        <Volume2 className={GOLD.goldText} size={21} />
                      )}
                    </button>
                    <span
                      className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                      style={{ opacity: isPlaying ? 0.9 : 0.6 }}
                    >
                      {isPlaying ? 'Playing' : 'Listen'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={handleFetch}
                  disabled={isFetching}
                  aria-label="Discover new poem"
                  className={`discover-btn min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                >
                  {isFetching ? (
                    <Shuffle
                      className={`${GOLD.goldText}`}
                      size={21}
                      style={{ animation: 'discoverShuffle 0.4s ease-in-out infinite' }}
                    />
                  ) : (
                    <Shuffle className={`discover-icon ${GOLD.goldText}`} size={21} />
                  )}
                </button>
                <span
                  className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                  style={{ opacity: 0.6 }}
                >
                  Discover
                </span>
              </div>

              <PoetPicker handleFetch={handleFetch} />

              <SavePoemButton
                poem={current}
                isSaved={isPoemSaved(current)}
                onSave={handleSavePoem}
                onUnsave={handleUnsavePoem}
                disabled={!user}
                onSignIn={(msg) => {
                  setShowAuthModal(true, msg);
                }}
              />

              <DownvoteButton
                poem={current}
                isDownvoted={isPoemDownvoted(current)}
                onDownvote={handleDownvote}
                onUndownvote={handleUndownvote}
                disabled={!user}
                onSignIn={(msg) => {
                  setShowAuthModal(true, msg);
                }}
              />
            </div>
          </footer>
        </div>

        <DesktopInsightPane
          current={current}
          insightParts={insightParts}
          isInterpreting={isInterpreting}
          interpretation={interpretation}
          showTranslation={showTranslation}
          darkMode={darkMode}
          theme={theme}
          selectedCategory={selectedCategory}
          handleAnalyze={handleAnalyze}
        />
      </div>

      {/* Insights Drawer (Mobile bottom sheet) */}
      <AnimatePresence>
        {insightsDrawerOpen && (
          <InsightsDrawer key="insights-drawer" insightParts={insightParts} current={current} />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal key="auth-modal" onSignInWithGoogle={handleSignInWithGoogle} />
        )}
      </AnimatePresence>

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

      {/* Design Review + Bug — stacked bottom-left utility buttons */}
      {FEATURES.designReview && (
        <div
          className="fixed z-[200] flex flex-col items-center gap-1"
          style={{ left: 8, bottom: 8 }}
        >
          <a
            href="/design-review"
            className="w-[44px] h-[44px] flex items-center justify-center no-underline"
            title="Design Review"
            aria-label="Open design review"
          >
            <span
              className={`relative w-5 h-5 rounded-full flex items-center justify-center transition-all duration-200 ${
                darkMode
                  ? 'bg-stone-900/60 border border-gold/20 text-stone-500 hover:text-gold hover:border-gold/40'
                  : 'bg-white/50 border border-gold/20 text-stone-400 hover:text-gold hover:border-gold/40'
              } backdrop-blur-md`}
            >
              <Paintbrush size={9} />
            </span>
          </a>
        </div>
      )}

      {/* Vertical Sidebar - always visible */}
      <VerticalSidebar
        onExplain={() => {
          if (interpretation) {
            useModalStore.getState().toggleInsightsDrawer();
            useModalStore.getState().showToastTimed('insight', 1500);
          } else {
            handleAnalyze();
            setInsightsDrawerOpen(true);
          }
        }}
        onCopy={handleCopy}
        onShare={handleShare}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSavedPoems={handleOpenSavedPoems}
        savedPoemsCount={savedPoems.length}
        user={user}
      />

      {/* Splash / Onboarding Screen (lazy-loaded, deferred from initial bundle) */}
      <AnimatePresence>
        {showSplash && (
          <Suspense fallback={null}>
            <SplashScreen key="splash-screen" />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Keyboard Shortcut Help */}
      <AnimatePresence>{showShortcutHelp && <ShortcutHelp key="shortcut-help" />}</AnimatePresence>
    </div>
  );
}
