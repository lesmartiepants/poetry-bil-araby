import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Loader2,
  Feather,
  Lightbulb,
  Paintbrush,
  Check,
  X,
  Rabbit,
  Heart,
  Mic,
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
import { useQueryParams } from './hooks/useQueryParams';
import { useVolumeDetection, PulseGlowBars } from './hooks/useVolumeDetection.jsx';
import {
  INSIGHTS_SYSTEM_PROMPT,
  RATCHET_SYSTEM_PROMPT,
  DISCOVERY_SYSTEM_PROMPT,
  getTTSContent,
} from './prompts';
import { parseInsight } from './utils/insightParser';
import { repairAndParseJSON } from './utils/jsonRepair';
import {
  FEATURES,
  DESIGN,
  BRAND,
  BRAND_HEADER,
  POEM_META,
  THEME,
  GOLD,
  CATEGORIES,
  FONTS,
  nextVoice,
  voiceGender,
} from './constants/index.js';
import { usePoemStore } from './stores/poemStore';
import { useAudioStore } from './stores/audioStore';
import { useUIStore } from './stores/uiStore';
import { useModalStore } from './stores/modalStore';
import { fetchPoem as fetchPoemAction } from './stores/actions/fetchPoem';
import {
  togglePlay as togglePlayAction,
  dismissTTSProgress,
  abortPlay,
} from './stores/actions/togglePlay';
import { analyzePoem as analyzePoemAction, cancelAnalysis } from './stores/actions/analyzePoem';
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
  fetchPoets,
  fetchRandomPoem,
  fetchPoemsByPoet,
  saveTranslation,
  pingHealth,
} from './services/database.js';
import './styles/app.css';
import './styles/tts-highlight.css';
import { updateOGMetaTags } from './utils/ogMetaTags.js';
import { computeWordTimings } from './utils/wordTiming.js';
import { computeWordTimingsFromAudio } from './utils/audioWordTiming.js';
import { alignTranscriptTimings } from './utils/alignTranscriptTimings.js';
import { smoothWordTimings } from './utils/smoothWordTimings.js';
import { evenDistributeTimings } from './utils/evenDistributeTimings.js';
import { verseLetterWeightedTimings } from './utils/verseLetterWeightedTimings.js';
import { applySilenceAwarePacing } from './utils/silenceAwareTimings.js';
import { applyVerseDelays } from './utils/applyVerseDelays.js';
import { useSilenceDetector } from './hooks/useSilenceDetector.js';
import {
  useTTSHighlight,
  startPlayer,
  getPlaybackElapsed,
  pauseOffset,
  playbackStartTime,
  isSeeking,
} from './hooks/useTTSHighlight.js';
import { useIdleTimer } from './hooks/useIdleTimer.js';
import DebugPanel from './components/DebugPanel.jsx';
import MysticalConsultationEffect from './components/MysticalConsultationEffect.jsx';
import SquoctogonBackground from './components/SquoctogonBackground.jsx';

import ShortcutHelp from './components/ShortcutHelp.jsx';
const SplashScreen = lazy(() => import('./components/SplashScreen.jsx'));
import InsightOverlay from './components/InsightOverlay.jsx';
import ShareCardModal from './components/ShareCardModal.jsx';
import DiscoverDrawer, { GoldenFireIcon } from './components/DiscoverDrawer.jsx';
import PoemCarousel from './components/PoemCarousel.jsx';
import VerticalSidebar from './components/VerticalSidebar.jsx';
import TextSettingsPill from './components/TextSettingsPill.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';
import AuthModal from './components/auth/AuthModal.jsx';
import SavedPoemsView from './components/auth/SavedPoemsView.jsx';
import PlayControlsStrip from './components/PlayControlsStrip.jsx';

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
  const [queryParams, setQueryParams] = useQueryParams();

  const mainScrollRef = useRef(null);
  const audioRef = useRef(null); // Legacy ref — Tone.Player now lives in audioStore
  const isTogglingPlay = useRef(false);
  const controlBarRef = useRef(null);
  // Tracks which poem ID triggered the current carousel auto-explain, so the
  // patching effect can match by ID rather than by carouselIndex (prevents race
  // where poem 1's interpretation lands after the user has swiped to poem 2).
  const carouselExplainTargetId = useRef(null);
  const carouselRef = useRef(null);
  // Tracks poem IDs that have already had analyzePoemAction fired, so we never
  // fire it more than once per poem (prevents flickering/repeated translations).
  const explainedPoemIds = useRef(new Set());
  // autoExplainPending acts as a natural queue: setting it true when isInterpreting
  // is true causes the autoExplainPending effect to retry once isInterpreting clears.

  // Volume-based glow effect refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const volumePulseRef = useRef(null);
  // Ref for the floating idle-state listen button — interactions inside it
  // won't reset the idle timer (user can listen without waking the chrome UI).
  const listenButtonIdleRef = useRef(null);
  // Settings controls that stay visible during zen mode — interacting with them
  // should NOT reset the idle timer (user adjusts settings without waking chrome).
  const themeToggleRef = useRef(null);
  const textSettingsRef = useRef(null);

  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [bgScrollY, setBgScrollY] = useState(0);
  const [fireTapped, setFireTapped] = useState(false);

  // Zen idle mode — hides chrome after 2s of inactivity, leaving only the poem,
  // the settings controls (Aa / sun icon), and a gentle floating listen button.
  // Only deliberate taps/clicks wake the chrome back — scroll is ignored.
  const { isIdle } = useIdleTimer(2_000, [listenButtonIdleRef, themeToggleRef, textSettingsRef]);

  // ── Poem store (Zustand) ──
  const poems = usePoemStore((s) => s.poems);
  const setPoems = usePoemStore((s) => s.setPoems);
  const currentIndex = usePoemStore((s) => s.currentIndex);
  const setCurrentIndex = usePoemStore((s) => s.setCurrentIndex);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);
  const setSelectedCategory = usePoemStore((s) => s.setCategory);
  const dynamicPoets = usePoemStore((s) => s.dynamicPoets);
  const setDynamicPoets = usePoemStore((s) => s.setDynamicPoets);
  const poetsFetched = usePoemStore((s) => s.poetsFetched);
  const setPoetsFetched = usePoemStore((s) => s.setPoetsFetched);
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
  const carouselPoems = usePoemStore((s) => s.carouselPoems);
  const carouselIndex = usePoemStore((s) => s.carouselIndex);
  const setCarouselPoems = usePoemStore((s) => s.setCarouselPoems);
  const clearCarouselPoems = usePoemStore((s) => s.clearCarouselPoems);
  const setCarouselIndex = usePoemStore((s) => s.setCarouselIndex);
  const addCarouselPoem = usePoemStore((s) => s.addCarouselPoem);
  const updateCarouselPoem = usePoemStore((s) => s.updateCarouselPoem);

  // ── Modal store (Zustand) ──
  const discoverDrawerOpen = useModalStore((s) => s.discoverDrawer);
  const setDiscoverDrawerOpen = useModalStore((s) => s.setDiscoverDrawer);
  // ── UI store (Zustand) ──
  const darkMode = useUIStore((s) => s.darkMode);
  const setDarkMode = useUIStore((s) => s.setDarkMode);
  const currentFont = useUIStore((s) => s.font);
  const setCurrentFont = useUIStore((s) => s.setFont);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  const bgOpacity = useUIStore((s) => s.bgOpacity);
  const bgColor = useUIStore((s) => s.bgColor);
  const bgParallax = useUIStore((s) => s.bgParallax);
  const bgPattern = useUIStore((s) => s.bgPattern);
  const sparkleEnabled = useUIStore((s) => s.sparkleEnabled);
  const sparkleMode = useUIStore((s) => s.sparkleMode);
  const sparkleGlow = useUIStore((s) => s.sparkleGlow);
  const sparkleBrightness = useUIStore((s) => s.sparkleBrightness);
  const sparkleSpeed = useUIStore((s) => s.sparkleSpeed);
  const sparkleAmount = useUIStore((s) => s.sparkleAmount);
  const sparkleColor = useUIStore((s) => s.sparkleColor);
  // ── Audio store (Zustand) ──
  const isPlaying = useAudioStore((s) => s.isPlaying);
  const setIsPlaying = useAudioStore((s) => s.setPlaying);
  const isGeneratingAudio = useAudioStore((s) => s.isGenerating);
  const setIsGeneratingAudio = useAudioStore((s) => s.setGenerating);
  const audioUrl = useAudioStore((s) => s.url);
  const setAudioUrl = useAudioStore((s) => s.setUrl);
  const audioError = useAudioStore((s) => s.error);
  const setAudioError = useAudioStore((s) => s.setError);
  const audioPlayer = useAudioStore((s) => s.player);
  // Real per-word timings from the Live TTS transcript (null in REST mode / pre-audio).
  const serverWordTimings = useAudioStore((s) => s.wordTimings);
  const liveVoice = useUIStore((s) => s.liveVoice);
  const setLiveVoice = useUIStore((s) => s.setLiveVoice);
  const highlightStyle = useUIStore((s) => s.highlightStyle);
  const hasAutoLoaded = useRef(false);
  const longPressTimer = useRef(null);
  const pendingSaveHandled = useRef(false);
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
  const showShareCard = useModalStore((s) => s.shareCard);

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
    addLog('Font', `Switched to ${FONTS[nextIdx].label}`, 'user');
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

  // When the carousel is active, show the poem the user has swiped to
  const displayedPoem = carouselPoems.length > 0 ? carouselPoems[carouselIndex] : current;

  const addLog = useUIStore.getState().addLog;

  // Log every time the displayed Arabic poem changes on screen
  useEffect(() => {
    if (!displayedPoem?.id) return;
    const source = carouselPoems.length > 0 ? `carousel[${carouselIndex}]` : 'main';
    const chars = displayedPoem.arabic?.length || 0;
    addLog(
      'Render',
      `Arabic poem shown: ${displayedPoem.poet} — ${displayedPoem.title} | id: ${displayedPoem.id} | ${chars} chars | source: ${source}`,
      'info'
    );
  }, [displayedPoem?.id]);

  // Log when a translation appears or is cleared on screen (not every streaming chunk)
  const prevInterpretationRef = useRef(null);
  useEffect(() => {
    const prev = prevInterpretationRef.current;
    prevInterpretationRef.current = interpretation;
    if (!prev && interpretation) {
      addLog('Render', `Translation appeared | poem id: ${displayedPoem?.id ?? 'unknown'}`, 'info');
    } else if (prev && !interpretation) {
      addLog('Render', `Translation cleared | poem id: ${displayedPoem?.id ?? 'unknown'}`, 'info');
    }
  }, [interpretation]);

  // Track poem view time (emit 'view' event after 3s on same poem)
  useEffect(() => {
    if (!current?.id || !user) return;
    const timer = setTimeout(() => {
      emitEvent(current.id, 'view', { duration_ms: 3000 });
      addLog('Event', `→ view event emitted | poem_id: ${current.id} | duration: 3000ms`, 'info');
    }, 3000);
    return () => clearTimeout(timer);
  }, [current?.id, user]);

  // Show a loading toast while the translation is streaming, dismiss when done
  const prevIsInterpretingRef = useRef(false);
  useEffect(() => {
    const prev = prevIsInterpretingRef.current;
    prevIsInterpretingRef.current = isInterpreting;
    if (!prev && isInterpreting) {
      toast.loading('Translating poem…', {
        id: 'translation-progress',
        duration: Infinity,
        icon: (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 0.55, ease: 'easeInOut' }}
          >
            <Rabbit size={16} />
          </motion.div>
        ),
      });
    } else if (prev && !isInterpreting) {
      if (interpretation) {
        toast.success('Translation ready', { id: 'translation-progress', duration: 2500 });
      } else {
        toast.dismiss('translation-progress');
      }
    }
  }, [isInterpreting]);

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
    // Sync poet filter to URL
    if (queryParams.poet !== (selectedCategory === 'All' ? undefined : selectedCategory)) {
      setQueryParams({ poet: selectedCategory === 'All' ? null : selectedCategory });
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

  // Pre-populate the carousel when the poet filter changes (database mode only).
  // In "All" mode, use the current poem's poet so every home-screen poem gets a carousel.
  // In poet-filter mode, wait until the main poem fetch settles (current.poet === selectedCategory).
  useEffect(() => {
    if (!FEATURES.prefetching || !useDatabase) {
      clearCarouselPoems();
      return;
    }

    // Determine which poet to fetch for.
    // The API filters by Arabic poet name (po.name column), so always use poetArabic.
    const targetPoet = selectedCategory !== 'All' ? selectedCategory : current?.poetArabic; // Arabic name for API compatibility

    if (!targetPoet || !current?.id) return;

    // For poet-selected mode, wait for matching poem before populating.
    // Compare against poetArabic because selectedCategory holds Arabic names (CATEGORIES[x].id).
    if (selectedCategory !== 'All' && current.poetArabic !== selectedCategory) return;

    // If returning from OAuth, pendingCarouselPoems is still in sessionStorage at this point
    // (hasAutoLoaded runs after this effect). Skip populate — hasAutoLoaded will restore it.
    try {
      if (sessionStorage.getItem('pendingCarouselPoems')) return;
    } catch {}

    let cancelled = false;
    clearCarouselPoems();
    explainedPoemIds.current.clear();
    // Fetch 4 additional poems (excluding the current main poem) to fill slots 1-4.
    fetchPoemsByPoet(targetPoet, 4, [current.id])
      .then((others) => {
        if (cancelled) return;
        // Build carousel with main poem at index 0 so the view never jumps.
        const carouselList = [current, ...others];
        setCarouselPoems(carouselList);
        if (FEATURES.logging)
          addLog(
            'Carousel',
            `Populated ${carouselList.length} poems for ${targetPoet} (main poem first)`,
            'info'
          );
        // Auto-explain is handled by the autoExplainPending path — no direct analyzePoemAction here.
      })
      .catch((err) => {
        if (FEATURES.logging) addLog('Carousel', `Failed to fetch poems: ${err.message}`, 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [selectedCategory, useDatabase, current?.poetArabic, current?.id]);

  // When interpretation arrives from an analysis triggered by a carousel poem, patch that
  // poem's english field so PoemCarousel (which reads poem.english) can render the translation.
  // Always prefer the AI-generated translation over the DB translation — it's higher quality.
  //
  // IMPORTANT: we match by poem ID (carouselExplainTargetId ref), NOT by carouselIndex.
  // Without this, if the user swipes while an explain is in-flight, the arriving translation
  // is stamped onto whichever poem is currently active — not the one that was being explained.
  useEffect(() => {
    if (!interpretation || carouselPoems.length === 0) return;

    const parts = parseInsight(interpretation, addLog);
    const translation = parts?.poeticTranslation;
    if (!translation) return;

    // Determine which carousel poem to patch with the AI translation.
    let targetIdx;
    if (carouselExplainTargetId.current) {
      // Carousel-triggered explain: find the poem by ID.
      // Keep the ref alive during streaming so every chunk stamps the correct slide.
      // Only clear once streaming finishes (isInterpreting === false).
      targetIdx = carouselPoems.findIndex((p) => p.id === carouselExplainTargetId.current);
      if (!isInterpreting) carouselExplainTargetId.current = null;
    } else {
      // Initial explain (fired before carousel existed): target is always poem 0
      // because the carousel is built as [current, ...others].
      targetIdx = 0;
    }

    if (targetIdx === -1 || targetIdx >= carouselPoems.length) return;

    // During streaming, interpretation grows chunk by chunk. Always update if the
    // new translation is longer — this ensures the final complete translation lands
    // on the carousel poem, not just the first partial streaming chunk.
    // Only write poem.english after streaming completes — patching on every chunk
    // causes unnecessary re-renders and makes the Arabic verse animation replay
    // each time Embla reacts to the slide height changing.
    if (isInterpreting) return;

    const existing = carouselPoems[targetIdx].english || '';
    if (existing.length >= translation.length) return;

    updateCarouselPoem(targetIdx, { english: translation });
    // Do NOT call setInterpretation(null) here — interpretation must persist so
    // versePairs and insightParts can render the translation in the main view.
    // The interpretation is cleared in onSlideChange when the user swipes.
  }, [interpretation, carouselPoems.length, isInterpreting]);

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

      // Restore carousel position unconditionally — pendingCarouselPoems is only written
      // before an OAuth redirect, so it's safe to read-and-clear on every load.
      try {
        const rawPoems = sessionStorage.getItem('pendingCarouselPoems');
        const rawIdx = sessionStorage.getItem('pendingCarouselIndex');
        sessionStorage.removeItem('pendingCarouselPoems');
        sessionStorage.removeItem('pendingCarouselIndex');
        if (rawPoems) {
          const restoredPoems = JSON.parse(rawPoems);
          const targetIdx = rawIdx ? parseInt(rawIdx, 10) : 0;
          if (Array.isArray(restoredPoems) && restoredPoems.length > 0) {
            setCarouselPoems(restoredPoems);
            setCarouselIndex(targetIdx);
            addLog(
              'Init',
              `Restored carousel: ${restoredPoems.length} poems, index ${targetIdx}`,
              'success'
            );
          }
        }
      } catch {}

      // Restore pre-OAuth debug logs unconditionally — pendingLogs is only written
      // before an OAuth redirect, so it's safe to read-and-clear on every load.
      try {
        const savedLogs = sessionStorage.getItem('pendingLogs');
        if (savedLogs) {
          sessionStorage.removeItem('pendingLogs');
          const parsed = JSON.parse(savedLogs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            useUIStore.setState((s) => ({ logs: [...parsed, ...s.logs] }));
          }
        }
      } catch {}

      // Deep link: restore poet filter from URL
      if (queryParams.poet && !routeParams?.id) {
        setSelectedCategory(queryParams.poet);
      }

      // Deep link detection via wouter route match: /poem/:id
      if (routeParams?.id && useDatabase) {
        const poemId = routeParams.id;
        track('deep_link_loaded', { poemId });
        addLog('DeepLink', `Loading poem ID ${poemId} from URL`, 'request');
        fetchPoemById(poemId)
          .then((poem) => {
            setPoems([poem]);
            setCurrentIndex(0);
            setAutoExplainPending(true);
            updateOGMetaTags(poem);
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

      // Check if we're returning from an OAuth redirect with a stashed poem.
      // Do NOT remove pendingSavePoem here — the user effect needs it to auto-save
      // once the auth session resolves (which happens async after this effect).
      let restoredFromOAuth = false;
      try {
        if (sessionStorage.getItem('pendingSavePoem')) {
          restoredFromOAuth = true;
        }
      } catch {}

      const initial = poems[0];

      if (restoredFromOAuth && initial?.arabic) {
        // Restored from OAuth — stay on this poem, just queue explanation
        addLog('Init', `Restored from login: ${initial.poet} — ${initial.title}`, 'success');
        setAutoExplainPending(true);
        if (initial.id) navigate('/poem/' + initial.id + window.location.search, { replace: true });
      } else if (initial?.cachedTranslation) {
        // Has cached translation — no fetch needed
        addLog(
          'Init',
          `Loaded with cached translation: ${initial.poet} — ${initial.title}`,
          'success'
        );
      } else if (initial?.isSeedPoem) {
        // Seed poem — don't auto-fetch, let user press Discover to avoid flash
        setAutoExplainPending(true);
      } else {
        // No cached translation — queue auto-explain and fetch from DB
        setAutoExplainPending(true);
        handleFetch();
      }

      // Background: pre-fetch next visit's poem
      prefetchNextVisitPoem();
    }
  }, []);

  // After OAuth redirect, once the user is signed in, auto-save the stashed poem and clean up.
  // Guard against multiple rapid onAuthStateChange fires (INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED, etc.)
  useEffect(() => {
    if (!user || pendingSaveHandled.current) return;
    let stashed;
    try {
      stashed = sessionStorage.getItem('pendingSavePoem');
    } catch {}
    if (!stashed) return;
    pendingSaveHandled.current = true;
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
  // When the carousel is active (user has swiped), explain the carousel poem, not the main poem.
  useEffect(() => {
    const poemToExplain = carouselPoems.length > 0 ? carouselPoems[carouselIndex] : current;
    if (autoExplainPending && poemToExplain?.id && !isFetching && !isInterpreting) {
      setAutoExplainPending(false);
      if (explainedPoemIds.current.has(poemToExplain.id)) return;
      // Always AI-translate carousel poems (even if they have a DB scholarly translation),
      // so every swiped poem gets the same high-quality AI rendering.
      if (ratchetMode || !poemToExplain?.cachedTranslation || carouselPoems.length > 0) {
        explainedPoemIds.current.add(poemToExplain.id);
        // Set the carousel target ref so the patching effect can match by ID.
        // When carouselPoems is empty (initial explain fires before carousel populates),
        // leave the ref null — the patching effect falls through to patch carouselPoems[0].
        if (carouselPoems.length > 0) {
          carouselExplainTargetId.current = poemToExplain.id;
        }
        setInterpretation(null);
        analyzePoemAction({ current: poemToExplain, addLog, track });
      }
    }
  }, [
    autoExplainPending,
    current?.id,
    carouselIndex,
    carouselPoems.length,
    isFetching,
    isInterpreting,
    interpretation,
    ratchetMode,
  ]);

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

  // Easter egg: type "yalla" anywhere (desktop) to toggle Ratchet Mode
  useEffect(() => {
    const SECRET = 'yalla';
    let buffer = '';
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      buffer = (buffer + e.key).slice(-SECRET.length);
      if (buffer === SECRET) {
        const willEnable = !useUIStore.getState().ratchetMode;
        useUIStore.getState().toggleRatchetMode();
        if (willEnable) {
          toast('🔥 Ratchet Mode activated fr fr', {
            style: {
              background: 'linear-gradient(135deg, #ff5000, #ff9000)',
              color: 'white',
              border: 'none',
            },
            duration: 2500,
          });
        } else {
          toast('Back to scholarly mode', {
            style: { background: 'rgba(60,60,70,0.92)', color: 'white', border: 'none' },
            duration: 2500,
          });
        }
        buffer = '';
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleScroll = (e) => {
    const scrollTop = e.target.scrollTop;
    const progress = Math.min(1, scrollTop / 120);
    setHeaderOpacity(progress);
    setBgScrollY(scrollTop);
  };

  // Fetch dynamic poet list from API when discover drawer first opens
  useEffect(() => {
    if (!discoverDrawerOpen || poetsFetched) return;
    const loadPoets = async () => {
      try {
        const poets = await fetchPoets();
        setDynamicPoets(poets);
        addLog('Poets', `Loaded ${poets.length} poets from API`, 'success');
      } catch {
        addLog('Poets', 'Failed to fetch poets from API', 'warn');
      } finally {
        setPoetsFetched(true);
      }
    };
    loadPoets();
    // addLog is a stable reference from useUIStore.getState()
    // even though its reference changes per render — poetsFetched gate prevents
    // repeated fetches regardless.
  }, [discoverDrawerOpen, poetsFetched, addLog]);

  // Extract cached translation fields into stable local variables so useMemo
  // only re-runs when the actual string values change, not on every `displayedPoem` reference change.
  // Use displayedPoem so carousel swipes reflect the correct poem's cached translations.
  const cachedTranslation = displayedPoem?.cachedTranslation;
  const cachedExplanation = displayedPoem?.cachedExplanation;
  const cachedAuthorBio = displayedPoem?.cachedAuthorBio;

  const insightParts = useMemo(() => {
    // In ratchet mode, always use the AI-generated interpretation so cached scholarly
    // translations don't override the Gen Z ratchet content.
    if (!ratchetMode && cachedTranslation) {
      // Skip cached translation if it has fewer lines than the Arabic poem —
      // this means the AI truncated and we should re-generate rather than
      // permanently display an incomplete translation.
      const arCount = (displayedPoem?.arabic || '').split('\n').filter((l) => l.trim()).length;
      const enCount = cachedTranslation.split('\n').filter((l) => l.trim()).length;
      if (enCount >= arCount || arCount === 0) {
        return {
          poeticTranslation: cachedTranslation,
          depth: cachedExplanation || '',
          author: cachedAuthorBio || '',
        };
      }
    }
    return parseInsight(interpretation, addLog);
  }, [
    interpretation,
    cachedTranslation,
    cachedExplanation,
    cachedAuthorBio,
    ratchetMode,
    displayedPoem?.arabic,
    addLog,
  ]);

  const versePairs = useMemo(() => {
    const arLines = (displayedPoem?.arabic || '').split('\n').filter((l) => l.trim());
    const enSource = insightParts?.poeticTranslation || displayedPoem?.english || '';
    const enLines = enSource.split('\n').filter((l) => l.trim());
    const pairs = [];
    const max = Math.max(arLines.length, enLines.length);
    for (let i = 0; i < max; i++) {
      pairs.push({ ar: arLines[i] || '', en: enLines[i] || '' });
    }
    return pairs;
  }, [displayedPoem, insightParts]);

  // ── TTS highlight: word list and per-verse offsets ──
  const { allWords, wordOffsets } = useMemo(() => {
    const allWords = [];
    const wordOffsets = [];
    versePairs.forEach((pair) => {
      wordOffsets.push(allWords.length);
      const words = (pair.ar || '').split(/\s+/).filter(Boolean);
      words.forEach((w) => allWords.push(w));
    });
    return { allWords, wordOffsets };
  }, [versePairs]);

  // Estimate total audio duration from the player buffer (0 when no audio loaded)
  const audioDuration = useMemo(() => {
    if (audioPlayer?.buffer?.duration) return audioPlayer.buffer.duration;
    return 0;
  }, [audioPlayer]);

  // When no audio is loaded, use a character-weighted simulated duration (~650ms/word)
  const effectiveDuration = audioDuration || allWords.length * 0.65;

  // Build per-verse word groups — needed for VAD boundary alignment
  const verseWords = useMemo(
    () =>
      wordOffsets.map((startIdx, v) => {
        const endIdx = v + 1 < wordOffsets.length ? wordOffsets[v + 1] : allWords.length;
        return allWords.slice(startIdx, endIdx);
      }),
    [allWords, wordOffsets]
  );

  const wordTimings = useMemo(() => {
    // Best source: REAL per-word timings from the Live TTS transcript, aligned onto
    // the displayed tokens. These are exact (the model reported what it said and the
    // audio byte position tells us when), so they beat every estimate. Used when the
    // alignment confidently covers the line; otherwise we fall through to VAD.
    if (serverWordTimings && serverWordTimings.length > 0) {
      if (FEATURES.logging) {
        const lastSrv = serverWordTimings[serverWordTimings.length - 1];
        const first3 = serverWordTimings
          .slice(0, 3)
          .map((t) => `${t.word}@${t.start.toFixed(2)}-${t.end.toFixed(2)}`)
          .join(' ');
        useUIStore
          .getState()
          .addLog(
            'WordTiming:Server',
            `${serverWordTimings.length} words | span=0–${lastSrv?.end?.toFixed(2) ?? '?'}s | ${first3}`
          );
      }
      const aligned = alignTranscriptTimings(allWords, serverWordTimings);
      // Gate on how well the TRANSCRIBED words matched the display (a right-poem
      // check), not whole-line coverage. While streaming, only a prefix of the poem
      // is transcribed — but that prefix always leads the playhead by seconds, so the
      // lit word is exact and the rest fills in before playback reaches it. Requiring
      // whole-line confidence here would reject every partial update and keep us on
      // the estimate until the poem was nearly over (the original bug).
      const transcriptMatchRatio =
        aligned && serverWordTimings.length ? aligned.matchedCount / serverWordTimings.length : 0;
      if (
        aligned &&
        aligned.timings.length === allWords.length &&
        aligned.matchedCount >= 1 &&
        transcriptMatchRatio >= 0.5
      ) {
        if (FEATURES.logging) {
          const lastAligned = aligned.timings[aligned.timings.length - 1];
          const first3 = aligned.timings
            .slice(0, 3)
            .map((t) => `${t.word}@${t.start.toFixed(2)}-${t.end.toFixed(2)}`)
            .join(' ');
          const last3 = aligned.timings
            .slice(-3)
            .map((t) => `${t.word}@${t.start.toFixed(2)}-${t.end.toFixed(2)}`)
            .join(' ');
          useUIStore
            .getState()
            .addLog(
              'WordTiming:Aligned',
              `matched=${aligned.matchedCount}/${serverWordTimings.length} transcript (${(transcriptMatchRatio * 100).toFixed(0)}%) | ${allWords.length} display words | span=0–${lastAligned?.end?.toFixed(2) ?? '?'}s | eff=${effectiveDuration.toFixed(2)}s | [${first3}] … [${last3}]`
            );
        }
        // A/B smoothing of the per-word spans to kill the bursty flash/stick pattern.
        // Toggle live via localStorage('ttsSmoothMode'): 'smooth' (min-dwell redistribute,
        // default), 'even' (verse-anchored even distribution), or 'raw' (transcript as-is).
        let mode = 'even';
        try {
          mode = localStorage.getItem('ttsSmoothMode') || 'even';
        } catch {
          /* localStorage unavailable */
        }
        try {
          let timingMode = 'even';
          let enableSilenceAware = false;
          try {
            timingMode = localStorage.getItem('ttsTimingMode') || 'even';
            enableSilenceAware = localStorage.getItem('ttsEnableSilenceAware') === 'true';
          } catch {}
          
          let result = aligned.timings;
          if (timingMode === 'smooth') result = smoothWordTimings(result);
          else if (timingMode === 'verseLetterWeighted') result = verseLetterWeightedTimings(result, wordOffsets);
          else if (timingMode === 'even') result = evenDistributeTimings(result, wordOffsets, { charWeighted: false, minDwell: 0.18 });
          
          // Apply verse delays (for even and verseLetterWeighted modes)
          if ((timingMode === 'even' || timingMode === 'verseLetterWeighted') && wordOffsets && wordOffsets.length > 0) {
            let verseDelayMs = 0;
            try { verseDelayMs = parseFloat(localStorage.getItem('ttsVerseDelayMs') || '0'); } catch {}
            const verseDelaySeconds = Math.max(0, verseDelayMs / 1000);
            if (verseDelaySeconds > 0) {
              result = applyVerseDelays(result, wordOffsets, verseDelaySeconds);
            }
          }
          
          // Apply silence awareness as optional post-pass (currently scaffolded, needs PCM integration)
          if (enableSilenceAware) {
            result = applySilenceAwarePacing(result, []);
          }
          
          return result;
        } catch (err) {
          if (FEATURES.logging) console.warn('[WordTiming] timing mode failed, using raw', err);
        }
        return aligned.timings;
      }
      if (FEATURES.logging)
        useUIStore
          .getState()
          .addLog(
            'WordTiming',
            `Live alignment rejected (transcript match ${(transcriptMatchRatio * 100).toFixed(0)}%, matched ${aligned?.matchedCount ?? 0}/${serverWordTimings.length}) — using VAD`
          );
    }
    // When actual audio is loaded, derive timings from the waveform (VAD alignment).
    // This is far more accurate than character-count estimation because it uses the
    // real pauses between verses detected in the audio signal.
    if (audioPlayer?.buffer?.loaded) {
      try {
        const vadTimings = computeWordTimingsFromAudio(audioPlayer.buffer, verseWords);
        if (vadTimings && vadTimings.length === allWords.length) {
          if (FEATURES.logging) {
            useUIStore
              .getState()
              .addLog('WordTiming', `VAD timings: ${vadTimings.length} words from audio buffer`);
          }
          return vadTimings;
        }
      } catch (err) {
        if (FEATURES.logging)
          useUIStore
            .getState()
            .addLog('WordTiming', `VAD failed: ${err.message} — using char-weighted`, 'error');
      }
    }
    // Fallback: character-count proportional distribution (used pre-audio or on VAD failure)
    return computeWordTimings(allWords, effectiveDuration);
  }, [audioPlayer, verseWords, allWords, wordOffsets, effectiveDuration, serverWordTimings]);

  // When the streaming player is active, audioPlayer.buffer is undefined so
  // effectiveDuration falls back to a char-count estimate (~0.65s/word). That
  // estimate is shorter than real recitation time, causing useTTSHighlight's
  // "snap to last word" guard (elapsed >= totalDuration) to fire prematurely —
  // the highlight jumps to the end while the voice still has words left.
  // Fix: use the actual end time from word timings when available.
  // IMPORTANT: take the MAX of the estimate and the timings' last end, never the
  // raw last end. While streaming, the aligned array's not-yet-transcribed tail
  // collapses onto the last matched word's end (e.g. ~3s early in the stream), so
  // wordTimings[last].end is tiny until the full transcript lands. Using it raw
  // pushed the snap-to-last-word threshold down to a few seconds → instant
  // jump-to-end. The char estimate is a sane floor; the real (full) span exceeds
  // it once the stream completes, and generation outruns playback so the full
  // span is in place long before the playhead reaches it.
  const highlightTotalDuration = useMemo(() => {
    const lastEnd = wordTimings.length > 0 ? wordTimings[wordTimings.length - 1].end : 0;
    return Math.max(effectiveDuration, lastEnd > 0 ? lastEnd : 0);
  }, [wordTimings, effectiveDuration]);

  // Per-verse start times — first word of each verse's timing.start
  const verseStartTimes = useMemo(() => {
    return wordOffsets.map((offset) => wordTimings[offset]?.start ?? 0);
  }, [wordOffsets, wordTimings]);

  // One ref per word — stable array, recreated only when word count changes
  const wordRefs = useMemo(
    () => Array.from({ length: allWords.length }, () => ({ current: null })),
    [allWords.length]
  );

  // Container ref — useTTSHighlight also needs to know which verse is active
  // for the English line tts-line-active treatment (managed below via rAF).

  const [currentVerseIndex, setCurrentVerseIndex] = useState(0);

  useTTSHighlight({
    wordRefs,
    timings: wordTimings,
    totalDuration: highlightTotalDuration,
    wordOffsets,
    onVerseChange: setCurrentVerseIndex,
  });

  // Periodic playback-position diagnostic — logs elapsed time, the active word, and
  // the highlight duration ceiling every 3 s during playback. Paste the output to
  // see if highlight timing tracks the voice or drifts.
  // Latest timing snapshot in a ref so the playback-diagnostic effect can key on
  // isPlaying alone (start/end fire once per playback) while still reading fresh
  // timings on each tick — during streaming wordTimings updates ~once per word.
  const timingDiagRef = useRef(null);
  useEffect(() => {
    timingDiagRef.current = { wordTimings, allWords, highlightTotalDuration, effectiveDuration };
  }, [wordTimings, allWords, highlightTotalDuration, effectiveDuration]);

  const matchIdx = (wt, elapsed) => {
    for (let i = 0; i < wt.length; i++) {
      if (elapsed >= wt[i].start && elapsed < wt[i].end) return i;
    }
    return -1;
  };

  useEffect(() => {
    if (!FEATURES.logging || !isPlaying) return;
    const addLog = useUIStore.getState().addLog;
    const voice = useUIStore.getState().liveVoice;
    const snap = () => timingDiagRef.current || { wordTimings, allWords, highlightTotalDuration, effectiveDuration };
    const spanOf = (wt) => (wt.length ? wt[wt.length - 1].end : 0);

    const s0 = snap();
    addLog(
      'Highlight:start',
      `words=${s0.allWords.length} | timings=${s0.wordTimings.length} | span=0–${spanOf(s0.wordTimings).toFixed(2)}s | eff=${s0.effectiveDuration.toFixed(2)}s | total=${s0.highlightTotalDuration.toFixed(2)}s | voice=${voice}`
    );

    let snapLogged = false;
    const id = setInterval(() => {
      const { wordTimings: wt, allWords: aw, highlightTotalDuration: total } = snap();
      const elapsed = getPlaybackElapsed();
      const clock = useAudioStore.getState().player?.getCurrentTime ? 'player' : 'wall';
      const idx = matchIdx(wt, elapsed);
      const snapped = wt.length > 0 && elapsed >= total;
      addLog(
        'Highlight:tick',
        `t=${elapsed.toFixed(2)}s (${clock}) | word[${idx}]="${aw[idx] ?? 'none'}" | total=${total.toFixed(2)}s | span=${spanOf(wt).toFixed(2)}s | snap=${snapped}`
      );
      // Capture the moment the snap-to-last-word guard engages. If t is well short
      // of the real audio length, this is a premature jump-to-end.
      if (snapped && !snapLogged) {
        snapLogged = true;
        addLog(
          'Highlight:SNAP',
          `snapped to last word @ t=${elapsed.toFixed(2)}s | total=${total.toFixed(2)}s | span=${spanOf(wt).toFixed(2)}s — premature if t ≪ audio length`
        );
      }
    }, 2000);

    return () => {
      clearInterval(id);
      // End-of-playback snapshot (issue #571): where was the highlight when audio
      // stopped? Compare t against the audio length to see the async gap.
      const { wordTimings: wt, allWords: aw, highlightTotalDuration: total } = snap();
      const elapsed = getPlaybackElapsed();
      const idx = matchIdx(wt, elapsed);
      addLog(
        'Highlight:end',
        `playback stopped @ t=${elapsed.toFixed(2)}s | highlight word[${idx}]/${aw.length} | total=${total.toFixed(2)}s | span=${spanOf(wt).toFixed(2)}s`
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // pcm16ToWav imported from ./utils/audio.js (used directly below)

  // Wire Tone.Player end-of-playback — audioPlayer is a reactive selector (line 193)
  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.onstop = () => {
        if (isSeeking.value) {
          isSeeking.value = false;
          return;
        }
        useAudioStore.getState().setPlaying(false);
      };
    }
  }, [audioPlayer]);

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

  const togglePlay = () =>
    togglePlayAction({ audioRef, isTogglingPlay, current: displayedPoem, addLog, track });

  // Cycle the reading voice (the pill next to Listen). Voice is part of the audio
  // cache key, so playback regenerates in the new voice. If audio is currently
  // playing or generating, stop it and restart in the new voice so the change is
  // immediate; otherwise just drop any stale in-memory audio.
  const cycleVoice = () => {
    const next = nextVoice(liveVoice);
    setLiveVoice(next);
    const { isPlaying: playing, isGenerating, player, resetAudio } = useAudioStore.getState();
    const wasActive = playing || isGenerating;
    abortPlay(); // cancel any in-flight Live stream / generation
    if (player) {
      try {
        player.stop();
      } catch {}
    }
    resetAudio();
    addLog('Settings', `Voice → ${next}`, 'user');
    track?.('voice_change', { voice: next });
    // Restart in the new voice once the reset has settled.
    if (wasActive) setTimeout(() => togglePlay(), 0);
  };

  const handleAnalyze = () => {
    // When in carousel mode, record which poem we're explaining so the patching
    // effect (line ~418) can stamp the arriving translation onto the right slide
    // instead of falling back to carouselPoems[0].
    if (carouselPoems.length > 0 && displayedPoem?.id) {
      carouselExplainTargetId.current = displayedPoem.id;
    }
    analyzePoemAction({ current: displayedPoem, addLog, track });
  };

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
      `📋 Copy button clicked | Poem: ${displayedPoem?.poet} - ${displayedPoem?.title}`,
      'user'
    );

    const englishText = insightParts?.poeticTranslation || displayedPoem?.english || '';
    const textToCopy = `${displayedPoem?.titleArabic || ''}\n${displayedPoem?.poetArabic || ''}\n\n${displayedPoem?.arabic || ''}\n\n---\n\n${displayedPoem?.title || ''}\n${displayedPoem?.poet || ''}\n\n${englishText}`;
    const copyChars = textToCopy.length;
    const arabicChars = displayedPoem?.arabic?.length || 0;
    const englishChars = englishText.length;

    try {
      await navigator.clipboard.writeText(textToCopy);
      track('poem_copied', { poet: displayedPoem?.poet });
      if (displayedPoem?.id) {
        emitEvent(displayedPoem?.id, 'copy');
        addLog('Event', `→ copy event emitted | poem_id: ${displayedPoem?.id}`, 'info');
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
    addLog('UI Event', 'Share button clicked', 'user');
    track('poem_shared', { poet: displayedPoem?.poet });

    // Open the share card modal for visual sharing
    useModalStore.getState().openShareCard();
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
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(displayedPoem || current));
        const { carouselPoems: cp, carouselIndex: ci } = usePoemStore.getState();
        if (cp.length > 0) {
          sessionStorage.setItem('pendingCarouselPoems', JSON.stringify(cp));
          sessionStorage.setItem('pendingCarouselIndex', String(ci));
        }
      } catch {}
    }
    // Save logs before OAuth redirect so they persist after page reload
    try {
      const currentLogs = useUIStore.getState().logs;
      if (currentLogs?.length > 0) {
        sessionStorage.setItem('pendingLogs', JSON.stringify(currentLogs.slice(-100)));
      }
    } catch {}
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
        sessionStorage.setItem('pendingSavePoem', JSON.stringify(displayedPoem || current));
        const { carouselPoems: cp, carouselIndex: ci } = usePoemStore.getState();
        if (cp.length > 0) {
          sessionStorage.setItem('pendingCarouselPoems', JSON.stringify(cp));
          sessionStorage.setItem('pendingCarouselIndex', String(ci));
        }
      } catch {}
    }
    // Save logs before OAuth redirect so they persist after page reload
    try {
      const currentLogs = useUIStore.getState().logs;
      if (currentLogs?.length > 0) {
        sessionStorage.setItem('pendingLogs', JSON.stringify(currentLogs.slice(-100)));
      }
    } catch {}
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

    const { error } = await savePoem(displayedPoem);
    if (error) {
      addLog('Save Error', error.message, 'error');
    } else {
      addLog('Save', `Saved poem: ${displayedPoem?.poet} - ${displayedPoem?.title}`, 'success');
      track('poem_saved', { poet: displayedPoem?.poet });
      if (displayedPoem?.id) {
        emitEvent(displayedPoem?.id, 'save');
        addLog(
          'Event',
          `→ save event emitted (dual-write) | poem_id: ${displayedPoem?.id}`,
          'info'
        );
      }
    }
  };

  const handleUnsavePoem = async () => {
    const { error } = await unsavePoem(displayedPoem?.id, displayedPoem?.arabic);
    if (error) {
      addLog('Unsave Error', error.message, 'error');
    } else {
      track('poem_unsaved', { poet: displayedPoem?.poet });
      addLog('Unsave', `Removed poem: ${displayedPoem?.poet} - ${displayedPoem?.title}`, 'success');
    }
  };

  const handleDownvote = async () => {
    addLog(
      'UI Event',
      `👎 Flag button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'user'
    );

    if (!user) {
      addLog('Downvote', 'Not authenticated — opening sign-in', 'info');
      handleSignIn();
      return;
    }

    addLog('Downvote', `→ Sending downvote to Supabase | poem_id: ${current?.id}`, 'request');
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
      'user'
    );
    addLog('Undownvote', `→ Removing downvote from Supabase | poem_id: ${current?.id}`, 'request');

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
    // Update URL for DB poems, preserving any existing query params (e.g. ?poet=)
    const qs = window.location.search;
    if (typeof mappedPoem.id === 'number') {
      navigate('/poem/' + mappedPoem.id + qs);
    } else {
      navigate('/' + qs);
    }
  };

  const handleToggleDarkMode = () => {
    const newTheme = darkMode ? 'light' : 'dark';
    track('theme_changed', { theme: newTheme });
    setDarkMode(!darkMode);
    addLog('Theme', `Switched to ${newTheme} mode`, 'user');
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

  // Share a poem directly from the saved library. The ShareCardModal reads
  // from `displayedPoem`, so we first promote the saved poem to current via
  // handleSelectSavedPoem (which closes the library and updates the carousel)
  // and then open the modal on the next tick once state has settled.
  const handleShareSavedPoem = (sp) => {
    handleSelectSavedPoem(sp);
    setTimeout(() => {
      try {
        useModalStore.getState().openShareCard();
      } catch (err) {
        addLog('Share Error', err?.message || String(err), 'error');
      }
    }, 80);
  };

  const handleToggleTranslation = (showTranslation) => {
    addLog('Translation', `Translation ${showTranslation ? 'shown' : 'hidden'}`, 'user');
  };

  const handleToggleTransliteration = (showTransliteration) => {
    addLog(
      'Transliteration',
      `Transliteration ${showTransliteration ? 'shown' : 'hidden'}`,
      'info'
    );
  };

  const handleTextSizeChange = (level) => {
    addLog('TextSize', `Text size changed to level ${level}`, 'user');
  };

  const handleKeyboardShortcut = (key, action) => {
    addLog('Keyboard', `Shortcut: ${key} → ${action}`, 'user');
  };

  const handleSplashDismissed = () => {
    addLog('Splash', 'Splash screen dismissed', 'user');
  };

  const handleSplashShown = () => {
    addLog('Splash', 'Splash screen shown', 'info');
  };
  // ── End logging hooks ─────────────────────────────────────────────

  useEffect(() => {
    setInterpretation(null);
    // Stop any active player. Stop unconditionally — streaming and iOS HTMLAudio
    // players have no `.state` property, so a `state === 'started'` gate would skip
    // them and leave audio playing after the poem changes.
    const player = useAudioStore.getState().player;
    if (player) {
      try {
        player.stop();
      } catch {
        /* already stopped */
      }
    }
    setIsPlaying(false);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    // Clear any stuck loading states when poem changes
    dismissTTSProgress();
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
      'user'
    );
  }, [current?.id]);

  // Prefetch triggers - run background prefetching when poem changes
  // Only prefetch current poem; next-poem audio prefetch removed to conserve TTS quota (flash: ~100 RPD, pro: 50 RPD on Tier 1)
  useEffect(() => {
    if (!FEATURES.prefetching || !current?.id) return;

    // Warm up the backend immediately so it's awake by the time prefetch fires at 2s.
    // Render free tier cold starts take up to ~15s; this ping starts the wake-up clock.
    pingHealth().catch(() => {});

    // Prefetch current poem audio after 500ms (backend warmup ping fires first, so Render
    // is already waking up — no need for the old 2s conservative delay)
    const prefetchCurrentAudio = setTimeout(() => {
      prefetchManager.prefetchAudio(current.id, current, addLog);
    }, 500);

    // Prefetch current poem insights after 5s (only if user stays)
    const prefetchCurrentInsights = setTimeout(() => {
      prefetchManager.prefetchInsights(current.id, current, addLog);
    }, 5000);

    // Cleanup timeouts on unmount or when dependencies change
    return () => {
      clearTimeout(prefetchCurrentAudio);
      clearTimeout(prefetchCurrentInsights);
    };
  }, [current?.id]);

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
      className={`h-full w-full flex flex-col overflow-hidden overscroll-none ${DESIGN.animColors} font-sans ${theme.bg} ${theme.text} ${theme.selectionBg}`}
      style={{ touchAction: 'manipulation', overflowX: 'hidden' }}
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
            background:
              'radial-gradient(ellipse at center, rgba(255,80,0,0.22) 0%, rgba(255,40,0,0.08) 60%, transparent 100%)',
            animation: 'ratchetGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Corner wordmark — top-right, fades out on scroll and when idle */}
      <motion.header
        animate={{
          opacity: isIdle ? 0 : BRAND_HEADER.containerOpacity * (1 - headerOpacity),
          y: isIdle ? -14 : 0,
        }}
        transition={
          isIdle
            ? { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
            : { type: 'spring', stiffness: 300, damping: 28, mass: 0.8 }
        }
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 40,
          pointerEvents: 'none',
          padding: '0.6rem 0.8rem',
        }}
      >
        <div className="flex flex-row items-center gap-1">
          <span
            style={{
              ...BRAND_HEADER.english,
              color: darkMode ? '#D4D0C8' : '#1A1614',
            }}
          >
            poetry
          </span>
          <span
            style={{
              ...BRAND_HEADER.arabic,
              color: 'var(--gold)',
            }}
          >
            بالعربي
          </span>
          <Feather style={{ ...BRAND_HEADER.feather, color: 'var(--gold)' }} strokeWidth={1.5} />
        </div>
      </motion.header>

      <div className="flex flex-row w-full relative flex-1 min-h-0">
        <div className="flex-1 flex flex-col relative h-full overflow-hidden">
          {/* Islamic pattern tiling background — from geometric-explorer catalog */}
          <SquoctogonBackground
            darkMode={darkMode}
            scrollY={bgScrollY}
            opacityScale={bgOpacity}
            colorOverride={bgColor}
            parallaxFactor={bgParallax}
            patternName={bgPattern}
            topThirdOnly
          />
          <MysticalConsultationEffect
            active={isInterpreting}
            scrollY={bgScrollY}
            sparkleEnabled={sparkleEnabled}
            sparkleMode={sparkleMode}
            sparkleGlow={sparkleGlow}
            sparkleBrightness={sparkleBrightness}
            sparkleSpeed={sparkleSpeed}
            sparkleAmount={sparkleAmount}
            sparkleColor={sparkleColor}
          />

          <main
            ref={mainScrollRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 px-6 pr-14 md:px-8 md:pr-0 pb-28 pt-10 md:pt-12"
            style={{ overscrollBehaviorX: 'none' }}
          >
            {/* Top scroll gradient removed — header is now a subtle corner wordmark */}
            <div className="flex flex-col items-center pt-2">
              <div className="w-full max-w-4xl flex flex-col items-center">
                {/* Poem meta: title (dominant) → poet → English combined → vertical separator */}
                <div className={`text-center ${DESIGN.mainMetaPadding} poem-meta-fade z-20 w-full`}>
                  <div className="flex flex-col items-center justify-center w-full" dir="rtl">
                    {/* Line 1: Poem title */}
                    <div
                      className="text-center"
                      style={{
                        ...POEM_META.title,
                        fontSize: `calc(${POEM_META.title.fontSize} * ${textScale})`,
                        textShadow: darkMode
                          ? POEM_META.titleShadow.dark
                          : POEM_META.titleShadow.light,
                      }}
                    >
                      {displayedPoem?.titleArabic || displayedPoem?.title}
                    </div>
                    {/* Line 2: Poet name */}
                    <div
                      className="text-center"
                      style={{
                        ...POEM_META.poet,
                        fontSize: `calc(${POEM_META.poet.fontSize} * ${textScale})`,
                        color: darkMode ? POEM_META.poetColor.dark : POEM_META.poetColor.light,
                      }}
                    >
                      {displayedPoem?.poetArabic || displayedPoem?.poet}
                    </div>
                    {/* Line 3: English title and poet — two distinct lines */}
                    {(displayedPoem?.poet || displayedPoem?.title) && (
                      <>
                        <div dir="ltr" style={POEM_META.separator} />
                        {displayedPoem?.title && (
                          <div
                            className="text-center"
                            dir="ltr"
                            style={{
                              fontFamily: "'Bodoni Moda', serif",
                              fontSize: `calc(clamp(0.9rem, 1.8vw, 1.1rem) * ${textScale})`,
                              color: darkMode ? 'var(--gold)' : 'var(--gold)',
                              fontWeight: 500,
                              letterSpacing: '0.02em',
                            }}
                          >
                            {displayedPoem.title}
                          </div>
                        )}
                        {displayedPoem?.poet && (
                          <div
                            className="text-center mt-0.5"
                            dir="ltr"
                            style={{
                              fontFamily: "'Forum', serif",
                              fontSize: `calc(clamp(0.75rem, 1.4vw, 0.9rem) * ${textScale})`,
                              color: darkMode ? 'rgba(212,200,168,0.7)' : 'rgba(120,100,60,0.7)',
                              fontWeight: 400,
                              letterSpacing: '0.03em',
                            }}
                          >
                            {displayedPoem.poet}
                          </div>
                        )}
                      </>
                    )}
                    {/* Carousel dot indicators — positioned under the English poet name */}
                    {carouselPoems.length > 1 && (
                      <div className="flex justify-center gap-1.5 mt-3" dir="ltr">
                        {(() => {
                          const maxDots = 5;
                          const total = carouselPoems.length;
                          const start = Math.max(0, Math.min(carouselIndex - 2, total - maxDots));
                          const end = Math.min(start + maxDots, total);
                          return carouselPoems.slice(start, end).map((_, i) => {
                            const realIdx = start + i;
                            return (
                              <button
                                key={realIdx}
                                onClick={() => carouselRef.current?.scrollTo(realIdx)}
                                aria-label={`Go to poem ${realIdx + 1}`}
                                style={{
                                  width: realIdx === carouselIndex ? 16 : 6,
                                  height: 6,
                                  borderRadius: 3,
                                  background:
                                    realIdx === carouselIndex
                                      ? darkMode
                                        ? 'rgba(197,160,89,1)'
                                        : 'rgba(140,100,30,0.85)'
                                      : darkMode
                                        ? 'rgba(197,160,89,0.5)'
                                        : 'rgba(140,100,30,0.4)',
                                  transition: 'all 0.25s ease',
                                  border: 'none',
                                  padding: 0,
                                  cursor: 'pointer',
                                }}
                              />
                            );
                          });
                        })()}
                      </div>
                    )}
                    {/* Bottom spacing before verses */}
                    <div style={{ height: '0.5rem' }} />
                  </div>
                </div>

                <div className={`relative w-full group pt-1 pb-2 ${DESIGN.mainMarginBottom}`}>
                  {carouselPoems.length > 0 && (
                    <PoemCarousel
                      ref={carouselRef}
                      poems={carouselPoems}
                      currentIndex={carouselIndex}
                      onSlideChange={(idx, direction) => {
                        setCarouselIndex(idx);
                        // Stop audio and reset TTS state when navigating poems
                        const { player: activePlayer, resetAudio } = useAudioStore.getState();
                        // Stop unconditionally. Streaming and iOS HTMLAudio players have no
                        // `.state` property, so the old `state === 'started'` gate skipped
                        // stop() for them and the audio kept playing in the background after a swipe.
                        if (activePlayer) {
                          try {
                            activePlayer.stop();
                          } catch {
                            /* already stopped */
                          }
                        }
                        if (audioUrl) URL.revokeObjectURL(audioUrl);
                        abortPlay();
                        resetAudio();
                        isTogglingPlay.current = false;
                        pauseOffset.value = 0;
                        playbackStartTime.value = 0;
                        document
                          .querySelectorAll('.tts-active, .tts-past')
                          .forEach((el) => el.classList.remove('tts-active', 'tts-past'));
                        dismissTTSProgress();
                        cancelAnalysis();
                        setInterpretation(null);
                        // If an analysis was in-flight and got cancelled, un-mark it so
                        // swiping back to that poem will re-trigger its translation.
                        if (
                          carouselExplainTargetId.current &&
                          usePoemStore.getState().isInterpreting
                        ) {
                          explainedPoemIds.current.delete(carouselExplainTargetId.current);
                        }
                        carouselExplainTargetId.current = null;
                        setShowTranslation(true);
                        const newPoem = usePoemStore.getState().carouselPoems[idx];
                        if (FEATURES.logging && newPoem) {
                          const fromPoem = carouselPoems[carouselIndex];
                          addLog(
                            'Carousel',
                            `Swipe ${direction || '?'} | ${fromPoem?.poetArabic || fromPoem?.poet || '?'} → ${newPoem.poetArabic || newPoem.poet} - ${newPoem.titleArabic || newPoem.title} | ${carouselIndex}→${idx}`,
                            'user'
                          );
                        }
                        if (newPoem?.id) {
                          navigate('/poem/' + newPoem.id + window.location.search, {
                            replace: true,
                          });
                          updateOGMetaTags(newPoem);
                        }
                        if (newPoem && !newPoem.english) {
                          // Always (re-)queue translation for poems without one — this handles
                          // the case where a previous analysis was cancelled mid-stream, leaving
                          // the poem with no translation and its ID stuck in explainedPoemIds.
                          explainedPoemIds.current.delete(newPoem.id);
                          setAutoExplainPending(true);
                        }
                      }}
                      darkMode={darkMode}
                      showTranslation={showTranslation}
                      showTransliteration={showTransliteration}
                      textScale={textScale}
                      currentFontClass={currentFontClass}
                      POEM_META={POEM_META}
                      DESIGN={DESIGN}
                      onLoadMore={() => {
                        if (!current?.poetArabic) return;
                        const existingIds = carouselPoems.map((p) => p.id);
                        fetchPoemsByPoet(current.poetArabic, 3, existingIds)
                          .then((newPoems) => {
                            newPoems.forEach((p) => addCarouselPoem(p));
                          })
                          .catch((err) => {
                            if (FEATURES.logging)
                              addLog('Carousel', `Load-more failed: ${err.message}`, 'error');
                          });
                      }}
                      highlightStyle={highlightStyle}
                      activeVersePairs={versePairs}
                      wordRefs={wordRefs}
                      wordOffsets={wordOffsets}
                    />
                  )}
                </div>
              </div>
            </div>
          </main>

          {/* Bottom fade — content fades out above the control bar; slides away with footer when idle */}
          <motion.div
            className="pointer-events-none fixed bottom-0 left-0 right-0 z-40"
            animate={isIdle ? { opacity: 0, y: 60 } : { opacity: 1, y: 0 }}
            transition={
              isIdle
                ? { duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }
                : { type: 'spring', stiffness: 280, damping: 26 }
            }
            style={{
              height: '100px',
              background: `linear-gradient(to top, ${darkMode ? '#0c0c0e' : '#FDFCF8'} 0%, ${darkMode ? 'rgba(12,12,14,0.85)' : 'rgba(253,252,248,0.85)'} 30%, ${darkMode ? 'rgba(12,12,14,0.4)' : 'rgba(253,252,248,0.4)'} 60%, transparent 100%)`,
            }}
          />

          <motion.footer
            className="fixed bottom-0 left-0 right-0 py-2 pb-3 md:pb-2 px-4 flex flex-col items-center z-50 safe-bottom"
            animate={isIdle ? { opacity: 0, y: 70 } : { opacity: 1, y: 0 }}
            transition={
              isIdle
                ? { duration: 0.75, ease: [0.16, 1, 0.3, 1], delay: 0.12 }
                : { type: 'spring', stiffness: 280, damping: 26 }
            }
            style={{ pointerEvents: isIdle ? 'none' : 'auto' }}
          >
            {/* Highlight mode: Listen (one-shot) → PlayControlsStrip (exclusive) */}
            {highlightStyle !== 'none' && (
              <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
                <AnimatePresence mode="wait">
                  {isPlaying || isGeneratingAudio || audioPlayer !== null ? (
                    <PlayControlsStrip
                      key="play-controls"
                      player={audioPlayer}
                      isPlaying={isPlaying}
                      isLoading={isGeneratingAudio}
                      verseStartTimes={verseStartTimes}
                      currentVerseIndex={currentVerseIndex}
                      onPlayPause={togglePlay}
                      wordRefs={wordRefs}
                      wordOffsets={wordOffsets}
                      timings={wordTimings}
                      totalDuration={highlightTotalDuration}
                      onVerseChange={setCurrentVerseIndex}
                    />
                  ) : (
                    <motion.button
                      key="listen-trigger"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      onClick={togglePlay}
                      aria-label="Start recitation"
                      className={`min-h-[44px] px-6 py-2 rounded-full border ${theme.border} ${DESIGN.glass} ${GOLD.goldText} font-brand-en text-sm font-medium tracking-wide hover:bg-white/10 active:scale-95 transition-all duration-150`}
                      style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                    >
                      Listen
                    </motion.button>
                  )}
                </AnimatePresence>
                {/* Voice cycle pill — persistent so the voice can be changed mid-playback
                    (tapping restarts in the new voice). 44px target per the design spec. */}
                <button
                  onClick={cycleVoice}
                  aria-label={`Reading voice: ${liveVoice}. Tap to change.`}
                  title="Change reading voice"
                  className={`min-h-[44px] flex items-center gap-1.5 pl-3 pr-3.5 py-2 rounded-full border ${theme.border} ${DESIGN.glass} ${GOLD.goldText} font-brand-en text-xs font-medium tracking-wide hover:bg-white/10 active:scale-95 transition-all duration-150`}
                  style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.4)' }}
                >
                  <Mic
                    size={16}
                    style={{ color: voiceGender(liveVoice) === 'f' ? '#c084fc' : '#60a5fa' }}
                  />
                  {liveVoice}
                </button>
              </div>
            )}
            <div
              ref={controlBarRef}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border ${DESIGN.glass} ${theme.border} ${DESIGN.anim} max-w-[calc(100vw-2rem)] w-fit`}
              style={{
                boxShadow:
                  'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.15), 0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            >
              {highlightStyle === 'none' && (
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
                        className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                        style={{ animation: 'shimmer 2s ease-in-out infinite' }}
                      >
                        Loading
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
                            <PulseGlowBars volumePulseRef={volumePulseRef} isPlaying={true} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-30 transition-opacity duration-200 pointer-events-none">
                              <Pause fill={GOLD.gold} size={14} />
                            </div>
                          </>
                        ) : audioUrl ? (
                          <>
                            <PulseGlowBars volumePulseRef={null} isPlaying={false} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-60 transition-opacity duration-200 pointer-events-none">
                              <Play fill={GOLD.gold} size={14} />
                            </div>
                          </>
                        ) : (
                          <Volume2 className={GOLD.goldText} size={21} />
                        )}
                      </button>
                      <span
                        className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                      >
                        {isPlaying ? 'Playing' : audioUrl ? 'Paused' : 'Listen'}
                      </span>
                    </>
                  )}
                </div>
              )}

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={() => {
                    setFireTapped(true);
                    setTimeout(() => setFireTapped(false), 400);
                    dismissTTSProgress();
                    setDiscoverDrawerOpen(true);
                  }}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      const willEnable = !useUIStore.getState().ratchetMode;
                      useUIStore.getState().toggleRatchetMode();
                      if (willEnable) {
                        toast('🔥 Ratchet Mode activated fr fr', {
                          style: {
                            background: 'linear-gradient(135deg, #ff5000, #ff9000)',
                            color: 'white',
                            border: 'none',
                          },
                          duration: 2500,
                        });
                      } else {
                        toast('Back to scholarly mode', {
                          style: {
                            background: 'rgba(60,60,70,0.92)',
                            color: 'white',
                            border: 'none',
                          },
                          duration: 2500,
                        });
                      }
                      longPressTimer.current = null;
                    }, 2000);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  onTouchMove={() => {
                    if (longPressTimer.current) {
                      clearTimeout(longPressTimer.current);
                      longPressTimer.current = null;
                    }
                  }}
                  disabled={isFetching}
                  aria-label="Open discover"
                  className={`relative w-[46px] h-[46px] bg-transparent border-none cursor-pointer flex items-center justify-center rounded-full hover:scale-105 ${fireTapped ? 'fire-tap' : ''}`}
                  style={{
                    background: isFetching ? 'rgba(197,160,89,0.08)' : 'transparent',
                    transition: fireTapped ? 'none' : 'transform 0.3s',
                  }}
                >
                  <GoldenFireIcon size={34} />
                </button>
                <span
                  className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                >
                  Discover
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={() =>
                    isPoemSaved(displayedPoem) ? handleUnsavePoem() : handleSavePoem()
                  }
                  aria-label={isPoemSaved(displayedPoem) ? 'Unsave poem' : 'Save poem'}
                  className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
                >
                  <Heart
                    size={21}
                    style={
                      isPoemSaved(displayedPoem)
                        ? { fill: '#ef4444', stroke: '#ef4444' }
                        : { fill: 'none', stroke: GOLD.gold }
                    }
                  />
                </button>
                <span
                  className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                >
                  {isPoemSaved(displayedPoem) ? 'Saved' : 'Save'}
                </span>
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={() => {
                    if (interpretation) {
                      useModalStore.getState().toggleInsightsDrawer();
                      useModalStore.getState().showToastTimed('insight', 1500);
                    } else {
                      handleAnalyze();
                      setInsightsDrawerOpen(true);
                    }
                  }}
                  disabled={isInterpreting}
                  aria-label="Explain poem meaning"
                  className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${isInterpreting ? 'opacity-50' : ''}`}
                >
                  {isInterpreting ? (
                    <Loader2 className="animate-spin" style={{ color: GOLD.gold }} size={21} />
                  ) : showInsightSuccess ? (
                    <Check style={{ color: GOLD.gold }} size={21} />
                  ) : (
                    <Lightbulb
                      className={GOLD.goldText}
                      size={21}
                      style={{ opacity: interpretation ? 1 : 0.7 }}
                    />
                  )}
                </button>
                <span
                  className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                >
                  Explain
                </span>
              </div>
            </div>
          </motion.footer>

          {/* Floating idle listen / pause button — only visible when chrome is hidden.
              Attached to listenButtonIdleRef so tapping it does NOT wake the UI chrome;
              the user can control playback while staying in immersive zen mode. */}
          <AnimatePresence>
            {isIdle && (
              <motion.div
                ref={listenButtonIdleRef}
                className="fixed z-[55] flex justify-center"
                style={{ bottom: '1.25rem', left: 0, right: 0, pointerEvents: 'auto' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 8 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ type: 'spring', stiffness: 200, damping: 26, delay: 0.35 }}
              >
                <button
                  onClick={togglePlay}
                  aria-label={isPlaying ? 'Pause recitation' : 'Listen to poem'}
                  className={`px-6 py-2 rounded-full border ${theme.border} ${DESIGN.glass} ${GOLD.goldText} font-brand-en text-sm font-medium tracking-wide hover:bg-white/10 transition-all duration-150`}
                  style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.45)' }}
                >
                  {isPlaying ? 'Pause' : 'Listen'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Insights Overlay (replaces drawer + desktop pane) */}
      <InsightOverlay
        open={insightsDrawerOpen}
        insightParts={insightParts}
        currentPoem={current}
        isInterpreting={isInterpreting}
        interpretation={interpretation}
        onClose={() => setInsightsDrawerOpen(false)}
        ratchetMode={ratchetMode}
        handleAnalyze={handleAnalyze}
      />

      {/* Discover Drawer */}
      <AnimatePresence>
        {discoverDrawerOpen && (
          <DiscoverDrawer
            key="discover-drawer"
            onSurpriseMe={() => {
              setSelectedCategory('All');
              handleFetch();
            }}
            onSelectPoet={(id) => {
              setSelectedCategory(id);
              // handleFetch() removed — selectedCategory effect handles it
            }}
          />
        )}
      </AnimatePresence>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthModal key="auth-modal" onSignInWithGoogle={handleSignInWithGoogle} />
        )}
      </AnimatePresence>

      {/* Saved Poems View — Khazana drawer */}
      <SavedPoemsView
        isOpen={showSavedPoems}
        onClose={() => setShowSavedPoems(false)}
        savedPoems={savedPoems}
        onSelectPoem={handleSelectSavedPoem}
        onUnsavePoem={handleUnsavePoemFromList}
        onSharePoem={handleShareSavedPoem}
        theme={theme}
        darkMode={darkMode}
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

      {/* Theme Toggle — top-right, always visible (settings stay in zen mode) */}
      <div ref={themeToggleRef} className="fixed top-10 right-2 md:right-[25rem] z-[46]">
        <ThemeToggle />
      </div>

      {/* Text Settings — below theme toggle, always visible (settings stay in zen mode) */}
      <div ref={textSettingsRef} className="fixed top-[5.5rem] right-2 md:right-[25rem] z-[46]">
        <TextSettingsPill />
      </div>

      {/* Vertical Sidebar — hides in zen idle mode */}
      <VerticalSidebar
        onCopy={handleCopy}
        onShare={handleShare}
        onSave={handleSavePoem}
        onUnsave={handleUnsavePoem}
        isSaved={displayedPoem ? isPoemSaved(displayedPoem) : false}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSavedPoems={handleOpenSavedPoems}
        savedPoemsCount={savedPoems.length}
        onFlag={handleDownvote}
        isDownvoted={current ? isPoemDownvoted(current) : false}
        onUnflag={handleUndownvote}
        user={user}
        isIdle={isIdle}
      />

      {/* Splash / Onboarding Screen (lazy-loaded, deferred from initial bundle) */}
      <AnimatePresence>
        {showSplash && (
          <Suspense fallback={null}>
            <SplashScreen key="splash-screen" />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Share Card Modal */}
      {showShareCard && displayedPoem && (
        <ShareCardModal
          poem={{
            ...displayedPoem,
            english:
              insightParts?.poeticTranslation ||
              displayedPoem?.english ||
              displayedPoem?.cachedTranslation ||
              '',
          }}
          onClose={() => useModalStore.getState().closeShareCard()}
        />
      )}

      {/* Keyboard Shortcut Help */}
      <AnimatePresence>{showShortcutHelp && <ShortcutHelp key="shortcut-help" />}</AnimatePresence>
    </div>
  );
}
