import { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { useLocation, useRoute } from 'wouter';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
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
import { FEATURES, DESIGN, BRAND, BRAND_HEADER, POEM_META, THEME, GOLD, CATEGORIES, FONTS } from './constants/index.js';
import { usePoemStore } from './stores/poemStore';
import { useAudioStore } from './stores/audioStore';
import { useUIStore } from './stores/uiStore';
import { useModalStore } from './stores/modalStore';
import { fetchPoem as fetchPoemAction } from './stores/actions/fetchPoem';
import { togglePlay as togglePlayAction } from './stores/actions/togglePlay';
import { analyzePoem as analyzePoemAction } from './stores/actions/analyzePoem';
import { getRecentSeenIds, markPoemSeen, pruneSeenPoems } from './utils/seenPoems.js';
import { transliterate } from './utils/transliterate.js';
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
import { updateOGMetaTags } from './utils/ogMetaTags.js';
import DebugPanel from './components/DebugPanel.jsx';
import MysticalConsultationEffect from './components/MysticalConsultationEffect.jsx';

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
import DownvoteButton from './components/auth/DownvoteButton.jsx';
import SavePoemButton from './components/auth/SavePoemButton.jsx';
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

  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [fireTapped, setFireTapped] = useState(false);

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
  const longPressTimer = useRef(null);
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

  // When the carousel is active, show the poem the user has swiped to
  const displayedPoem = carouselPoems.length > 0 ? carouselPoems[carouselIndex] : current;

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
    const targetPoet = selectedCategory !== 'All'
      ? selectedCategory
      : current?.poetArabic; // Arabic name for API compatibility

    if (!targetPoet || !current?.id) return;


    // For poet-selected mode, wait for matching poem before populating.
    // Compare against poetArabic because selectedCategory holds Arabic names (CATEGORIES[x].id).
    if (selectedCategory !== 'All' && current.poetArabic !== selectedCategory) return;

    let cancelled = false;
    clearCarouselPoems();
    explainedPoemIds.current.clear();
    // Fetch 4 additional poems (excluding the current main poem) to fill slots 1-4.
    fetchPoemsByPoet(targetPoet, 4, [current.id]).then((others) => {
      if (cancelled) return;
      // Build carousel with main poem at index 0 so the view never jumps.
      const carouselList = [current, ...others];
      setCarouselPoems(carouselList);
      if (FEATURES.logging) addLog('Carousel', `Populated ${carouselList.length} poems for ${targetPoet} (main poem first)`, 'info');
      // Auto-explain is handled by the autoExplainPending path — no direct analyzePoemAction here.
    }).catch((err) => {
      if (FEATURES.logging) addLog('Carousel', `Failed to fetch poems: ${err.message}`, 'error');
    });
    return () => { cancelled = true; };
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

    const parts = parseInsight(interpretation);
    const translation = parts?.poeticTranslation;
    if (!translation) return;

    // Determine which carousel poem to patch with the AI translation.
    let targetIdx;
    if (carouselExplainTargetId.current) {
      // Carousel-triggered explain: find the poem by ID.
      // Keep the ref alive during streaming so every chunk stamps the correct slide.
      // Only clear once streaming finishes (isInterpreting === false).
      targetIdx = carouselPoems.findIndex(p => p.id === carouselExplainTargetId.current);
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

      // Deep link: restore poet filter from URL
      if (queryParams.poet && !routeParams?.id) {
        setSelectedCategory(queryParams.poet);
      }

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
  // When the carousel is active (user has swiped), explain the carousel poem, not the main poem.
  useEffect(() => {
    const poemToExplain = carouselPoems.length > 0 ? carouselPoems[carouselIndex] : current;
    if (autoExplainPending && poemToExplain?.id && !isFetching && !isInterpreting && !interpretation) {
      setAutoExplainPending(false);
      if (explainedPoemIds.current.has(poemToExplain.id)) return;
      if (ratchetMode || !poemToExplain?.cachedTranslation) {
        explainedPoemIds.current.add(poemToExplain.id);
        // Set the carousel target ref so the patching effect can match by ID.
        // When carouselPoems is empty (initial explain fires before carousel populates),
        // leave the ref null — the patching effect falls through to patch carouselPoems[0].
        if (carouselPoems.length > 0) {
          carouselExplainTargetId.current = poemToExplain.id;
        }
        analyzePoemAction({ current: poemToExplain, addLog, track });
      }
    }
  }, [autoExplainPending, current?.id, carouselIndex, carouselPoems.length, isFetching, isInterpreting, interpretation, ratchetMode]);

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
            style: { background: 'linear-gradient(135deg, #ff5000, #ff9000)', color: 'white', border: 'none' },
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
    const progress = Math.min(1, e.target.scrollTop / 120);
    setHeaderOpacity(progress);
  };

  // Fetch dynamic poet list from API when discover drawer first opens
  useEffect(() => {
    if (!discoverDrawerOpen || poetsFetched) return;
    const loadPoets = async () => {
      try {
        const poets = await fetchPoets();
        setDynamicPoets(poets);
        addLog('Poets', `Loaded ${poets.length} poets from API`, 'info');
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
      const arCount = (displayedPoem?.arabic || '').split('\n').filter(l => l.trim()).length;
      const enCount = cachedTranslation.split('\n').filter(l => l.trim()).length;
      if (enCount >= arCount || arCount === 0) {
        return {
          poeticTranslation: cachedTranslation,
          depth: cachedExplanation || '',
          author: cachedAuthorBio || '',
        };
      }
    }
    return parseInsight(interpretation);
  }, [interpretation, cachedTranslation, cachedExplanation, cachedAuthorBio, ratchetMode, displayedPoem?.arabic]);

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

  // pcm16ToWav imported from ./utils/audio.js (used directly below)

  // Wire Tone.Player end-of-playback — watch audioStore for player changes
  useEffect(() => {
    const player = useAudioStore.getState().player;
    if (player) {
      player.onstop = () => {
        useAudioStore.getState().setPlaying(false);
      };
    }
  }, [useAudioStore.getState().player]);

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

    const englishText = insightParts?.poeticTranslation || displayedPoem?.english || '';
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
    // Stop Tone.Player if active
    const player = useAudioStore.getState().player;
    if (player && player.state === 'started') {
      player.stop();
    }
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
      className={`h-[100dvh] w-full flex flex-col overflow-hidden overscroll-none ${DESIGN.anim} font-sans ${theme.bg} ${theme.text} ${theme.selectionBg}`}
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

      {/* Corner wordmark — top-right, fades out on scroll */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          zIndex: 40,
          pointerEvents: 'none',
          padding: '0.6rem 0.8rem',
          opacity: BRAND_HEADER.containerOpacity * (1 - headerOpacity),
          transition: 'opacity 0.3s ease-out',
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
          <Feather
            style={{ ...BRAND_HEADER.feather, color: 'var(--gold)' }}
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
            className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative z-10 px-6 pr-14 md:px-8 md:pr-0 pb-28 pt-10 md:pt-12"
            style={{ overscrollBehaviorX: 'none' }}
          >
            {/* Top scroll gradient removed — header is now a subtle corner wordmark */}
            <div className="flex flex-col items-center pt-2">
              <div className="w-full max-w-4xl flex flex-col items-center">
                {/* Poem meta: title (dominant) → poet → English combined → vertical separator */}
                <div
                  className={`text-center ${DESIGN.mainMetaPadding} poem-meta-fade z-20 w-full`}
                >
                  <div className="flex flex-col items-center justify-center w-full" dir="rtl">
                    {/* Line 1: Poem title */}
                    <div
                      className="text-center"
                      style={{
                        ...POEM_META.title,
                        textShadow: darkMode ? POEM_META.titleShadow.dark : POEM_META.titleShadow.light,
                      }}
                    >
                      {displayedPoem?.titleArabic || displayedPoem?.title}
                    </div>
                    {/* Line 2: Poet name */}
                    <div
                      className="text-center"
                      style={{
                        ...POEM_META.poet,
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
                              fontSize: 'clamp(0.9rem, 1.8vw, 1.1rem)',
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
                              fontSize: 'clamp(0.75rem, 1.4vw, 0.9rem)',
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
                                  background: realIdx === carouselIndex
                                    ? (darkMode ? 'rgba(197,160,89,1)' : 'rgba(140,100,30,0.85)')
                                    : (darkMode ? 'rgba(197,160,89,0.5)' : 'rgba(140,100,30,0.4)'),
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
                  {carouselPoems.length > 0 ? (
                    <PoemCarousel
                      ref={carouselRef}
                      poems={carouselPoems}
                      currentIndex={carouselIndex}
                      onSlideChange={(idx) => {
                        setCarouselIndex(idx);
                        // Pause audio when browsing via carousel
                        const player = useAudioStore.getState().player;
                        if (player && player.state === 'started') {
                          player.stop();
                        }
                        setIsPlaying(false);
                        // Clear stale interpretation from the previous poem so versePairs
                        // doesn't flash the old translation while the new one loads.
                        setInterpretation(null);
                        carouselExplainTargetId.current = null;
                        // Show translation for the new poem by default
                        setShowTranslation(true);
                        // Auto-explain via autoExplainPending (single explain path).
                        // This avoids the race where carousel-populate and autoExplainPending
                        // both fire analyzePoemAction and fight over interpretation state.
                        const newPoem = carouselPoems[idx];
                        if (FEATURES.logging && newPoem) {
                          addLog('Navigation', `Carousel → ${newPoem.poetArabic || newPoem.poet} - ${newPoem.titleArabic || newPoem.title} | ID: ${newPoem.id}`, 'info');
                        }
                        // Update URL to reflect the currently displayed poem
                        if (newPoem?.id) {
                          navigate('/poem/' + newPoem.id + window.location.search, { replace: true });
                          updateOGMetaTags(newPoem);
                        }
                        if (newPoem && !newPoem.cachedTranslation && !newPoem.english &&
                            !explainedPoemIds.current.has(newPoem.id)) {
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
                        const existingIds = carouselPoems.map(p => p.id);
                        fetchPoemsByPoet(current.poetArabic, 3, existingIds).then((newPoems) => {
                          newPoems.forEach(p => addCarouselPoem(p));
                        }).catch((err) => {
                          if (FEATURES.logging) addLog('Carousel', `Load-more failed: ${err.message}`, 'error');
                        });
                      }}
                    />
                  ) : (
                    <div className="px-4 md:px-20 py-2 text-center">
                      <div className="flex flex-col gap-5 md:gap-7">
                        {versePairs.map((pair, idx) => (
                          <div
                            key={`${current?.id}-${idx}`}
                            className="flex flex-col gap-0.5 verse-fade-up"
                            style={{ animationDelay: `${idx * 80}ms` }}
                          >
                            <p
                              dir="rtl"
                              className={`${currentFontClass} leading-[2.2] arabic-shadow ${DESIGN.anim}`}
                              style={{ fontSize: `calc(${POEM_META.verseArabicSize} * ${textScale})` }}
                            >
                              {pair.ar}
                            </p>
                            {showTransliteration && pair.ar && (
                              <p
                                dir="ltr"
                                className={`font-brand-en italic opacity-50 ${DESIGN.anim}`}
                                style={{
                                  fontSize: `calc(${POEM_META.verseTranslitSize} * ${textScale})`,
                                }}
                              >
                                {transliterate(pair.ar)}
                              </p>
                            )}
                            {showTranslation && pair.en && (
                              <p
                                dir="ltr"
                                className={`font-brand-en italic opacity-60 ${DESIGN.anim} mx-auto`}
                                style={{
                                  fontSize: `calc(${POEM_META.verseEnglishSize} * ${textScale})`,
                                  maxWidth: '90%',
                                }}
                              >
                                {pair.en}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-3 mt-2 mb-4">
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
                      className={`font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
                    >
                      {isPlaying ? 'Playing' : 'Listen'}
                    </span>
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
                <button
                  onClick={() => {
                    setFireTapped(true);
                    setTimeout(() => setFireTapped(false), 400);
                    setDiscoverDrawerOpen(true);
                  }}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      const willEnable = !useUIStore.getState().ratchetMode;
                      useUIStore.getState().toggleRatchetMode();
                      if (willEnable) {
                        toast('🔥 Ratchet Mode activated fr fr', {
                          style: { background: 'linear-gradient(135deg, #ff5000, #ff9000)', color: 'white', border: 'none' },
                          duration: 2500,
                        });
                      } else {
                        toast('Back to scholarly mode', {
                          style: { background: 'rgba(60,60,70,0.92)', color: 'white', border: 'none' },
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

      {/* Theme Toggle — top-right */}
      <div className="fixed top-10 right-2 md:right-[25rem] z-[46]">
        <ThemeToggle />
      </div>

      {/* Text Settings — below theme toggle */}
      <div className="fixed top-[5.5rem] right-2 md:right-[25rem] z-[46]">
        <TextSettingsPill />
      </div>

      {/* Vertical Sidebar - always visible */}
      <VerticalSidebar
        onCopy={handleCopy}
        onShare={handleShare}
        onSave={handleSavePoem}
        onUnsave={handleUnsavePoem}
        isSaved={current ? isPoemSaved(current) : false}
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

      {/* Share Card Modal */}
      {showShareCard && current && (
        <ShareCardModal
          poem={{
            ...current,
            english:
              insightParts?.poeticTranslation ||
              current?.english ||
              current?.cachedTranslation ||
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
