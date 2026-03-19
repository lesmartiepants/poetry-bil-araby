import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import {
  Play,
  Pause,
  Volume2,
  ChevronDown,
  Loader2,
  Search,
  X,
  Sparkles,
  Feather,
  ScrollText,
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
import { INSIGHTS_SYSTEM_PROMPT, DISCOVERY_SYSTEM_PROMPT, getTTSContent } from './prompts';
import { parseInsight } from './utils/insightParser';
import { repairAndParseJSON } from './utils/jsonRepair';
import seedPoems from './data/seed-poems.json';
import { FEATURES, DESIGN, BRAND, THEME, GOLD, CATEGORIES, FONTS } from './constants/index.js';
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
import DebugPanel from './components/DebugPanel.jsx';
import MysticalConsultationEffect from './components/MysticalConsultationEffect.jsx';
import ErrorBanner from './components/ErrorBanner.jsx';
import ShortcutHelp from './components/ShortcutHelp.jsx';
import SplashScreen from './components/SplashScreen.jsx';
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
  const poetPickerRef = useRef(null);

  // Volume-based glow effect refs
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationFrameRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const volumePulseRef = useRef(null);

  const [headerOpacity, setHeaderOpacity] = useState(0);
  const [poems, setPoems] = useState(() => {
    // 1. Restore from OAuth redirect (avoids flash of seed poem)
    try {
      const stashed = sessionStorage.getItem('pendingSavePoem');
      if (stashed) {
        const poem = JSON.parse(stashed);
        if (poem?.arabic) return [poem];
      }
    } catch {}

    // 2. Restore pre-fetched poem from last visit (with 7-day TTL)
    try {
      const raw = localStorage.getItem('qafiyah_nextPoem');
      if (raw) {
        const { poem, storedAt } = JSON.parse(raw);
        localStorage.removeItem('qafiyah_nextPoem');
        const age = Date.now() - (storedAt || 0);
        if (poem?.arabic && age < 7 * 24 * 60 * 60 * 1000) return [poem];
      }
    } catch {}

    // 3. First-ever visit: pick from seed pool
    if (seedPoems?.length > 0) {
      const idx = Math.floor(Math.random() * seedPoems.length);
      return [seedPoems[idx]];
    }

    // 4. Ultimate fallback (same as original default)
    return [
      {
        id: 1,
        poet: 'Nizar Qabbani',
        poetArabic: 'نزار قباني',
        title: 'My Beloved',
        titleArabic: 'حبيبتي',
        arabic:
          'حُبُّكِ يا عَمِيقَةَ العَيْنَيْنِ\nتَطَرُّفٌ .. تَصَوُّفٌ .. عِبَادَة\nحُبُّكِ مِثْلَ المَوْتِ وَالوِلَادَة\nصَعْبٌ بِأَنْ يُعَادَ مَرَّتَيْنِ',
        english:
          'Your love, O woman of deep eyes,\nIs radicalism… is Sufism… is worship.\nYour love is like Death and like Birth—\nIt is difficult for it to be repeated twice.',
        tags: ['Modern', 'Romantic', 'Ghazal'],
      },
    ];
  });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [poetPickerOpen, setPoetPickerOpen] = useState(false);
  const [poetPickerClosing, setPoetPickerClosing] = useState(false);
  const [dynamicPoets, setDynamicPoets] = useState([]);
  const [poetSearch, setPoetSearch] = useState('');
  const [poetsFetched, setPoetsFetched] = useState(false);
  const poetSearchRef = useRef(null);
  const [darkMode, setDarkMode] = useState(true);
  const [currentFont, setCurrentFont] = useState('Amiri');
  const [useDatabase, setUseDatabase] = useState(FEATURES.database);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioError, setAudioError] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [autoExplainPending, setAutoExplainPending] = useState(false);
  const hasAutoLoaded = useRef(false);
  // When the selectedCategory effect wants to fetch but isFetching is already true,
  // it stores the category here. A retry effect fires once isFetching drops to false.
  const pendingCategoryFetchRef = useRef(null);
  // Always-current mirror of selectedCategory for use inside async callbacks where
  // the closure value would otherwise be stale (e.g. the setPoems functional updater
  // called after an awaited fetch that outlasts the render that started it).
  // Initialized with the mount-time value; kept in sync by the selectedCategory effect.
  const selectedCategoryRef = useRef(selectedCategory);
  const [logs, setLogs] = useState([]);
  const [showDebugLogs, setShowDebugLogs] = useState(FEATURES.debug);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);
  const [showInsightSuccess, setShowInsightSuccess] = useState(false);
  const [insightsDrawerOpen, setInsightsDrawerOpen] = useState(false);
  const [cacheStats, setCacheStats] = useState({
    audioHits: 0,
    audioMisses: 0,
    insightsHits: 0,
    insightsMisses: 0,
  });
  const [isPrefetching, setIsPrefetching] = useState(false);
  const activeAudioRequests = useRef(new Set()); // Track in-flight audio generation requests
  const activeInsightRequests = useRef(new Set()); // Track in-flight insight generation requests
  const pollingIntervals = useRef([]); // Track all polling intervals for cleanup

  // Auth state
  const { user, loading: authLoading, signInWithGoogle, signInWithApple, signOut } = useAuth();
  const { settings, saveSettings } = useUserSettings(user);
  const { savedPoems, savePoem, unsavePoem, isPoemSaved } = useSavedPoems(user);
  const { downvotedPoemIds, downvotePoem, undownvotePoem, isPoemDownvoted } = useDownvotes(user);
  const { emitEvent } = usePoemEvents(user);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [showSavedPoems, setShowSavedPoems] = useState(false);
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

  const TEXT_SIZES = [
    { label: 'S', multiplier: 0.85 },
    { label: 'M', multiplier: 1.0 },
    { label: 'L', multiplier: 1.15 },
    { label: 'XL', multiplier: 1.3 },
  ];

  const cycleTextSize = () => {
    setTextSizeLevel((prev) => (prev + 1) % TEXT_SIZES.length);
  };

  const textScale = TEXT_SIZES[textSizeLevel].multiplier;

  const filtered = useMemo(
    () => filterPoemsByCategory(poems, selectedCategory),
    [poems, selectedCategory]
  );

  // Defensive: poems[0] is always truthy (hardcoded initial poem), but guard against
  // future changes that might empty the array (e.g., setPoems([]) or filter edge cases)
  const current = filtered[currentIndex] || filtered[0] || poems[0] || null;

  const addLog = (label, msg, type = 'info') => {
    const now = performance.now();
    const time = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLogs((prev) => {
      const t0 = prev.length > 0 ? prev[0].ts : now;
      const relSec = ((now - t0) / 1000).toFixed(1);
      return [...prev, { label, msg: String(msg), type, time, ts: now, rel: `+${relSec}s` }];
    });
    if (FEATURES.logging) {
      const logFn =
        type === 'error' ? console.error : type === 'success' ? console.info : console.log;
      logFn(`[${label}] ${msg}`);
    }
  };

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
          pendingCategoryFetchRef.current = selectedCategory;
        } else {
          handleFetch();
        }
      } else {
        setCurrentIndex(0);
      }
    } else {
      pendingCategoryFetchRef.current = null; // Clear any pending poet fetch on "All"
      setCurrentIndex(0);
    }
    // Keep the always-current ref in sync so async callbacks inside handleFetch
    // (e.g. the setPoems functional updater) can read the latest value.
    selectedCategoryRef.current = selectedCategory;
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
      pendingCategoryFetchRef.current &&
      pendingCategoryFetchRef.current === selectedCategory
    ) {
      pendingCategoryFetchRef.current = null;
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
  // OAuth restore and prefetch are handled in the useState lazy initializer.
  useEffect(() => {
    if (!hasAutoLoaded.current) {
      hasAutoLoaded.current = true;

      // Deep link detection via wouter route match: /poem/:id
      if (routeParams?.id && useDatabase) {
        const poemId = routeParams.id;
        track('deep_link_loaded', { poemId });
        addLog('DeepLink', `Loading poem ID ${poemId} from URL`, 'info');
        fetch(`${apiUrl}/api/poems/${poemId}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Poem ${poemId} not found`);
            return res.json();
          })
          .then((poem) => {
            if (poem.arabic) poem.arabic = poem.arabic.replace(/\*/g, '\n');
            poem.isFromDatabase = true;
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

      // Clear stashed OAuth poem (already restored by useState lazy initializer)
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

  // Auto-trigger explanation after auto-loaded poem arrives (skip if cached translation exists)
  useEffect(() => {
    if (autoExplainPending && current?.id && !isFetching && !isInterpreting && !interpretation) {
      setAutoExplainPending(false);
      if (!current?.cachedTranslation) {
        handleAnalyze();
      }
    }
  }, [autoExplainPending, current?.id, isFetching, isInterpreting, interpretation]);

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
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          handleFetch();
          break;
        case 'e':
        case 'E':
          if (!isInterpreting && !interpretation) handleAnalyze();
          break;
        case 't':
        case 'T':
          setShowTranslation((prev) => !prev);
          break;
        case 'r':
        case 'R':
          setShowTransliteration((prev) => !prev);
          break;
        case 'Escape':
          setShowAuthModal(false);
          setShowSavedPoems(false);
          setShowShortcutHelp(false);
          break;
        case '?':
          setShowShortcutHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterpreting, interpretation]);

  // headerProgress: 0 = full size center, 1 = compact right corner
  // Slower ramp: full transition over 200px of scroll instead of 60
  const handleScroll = (e) => {
    const progress = Math.min(1, e.target.scrollTop / 200);
    setHeaderOpacity(progress);
  };

  // Close poet picker on outside click
  useEffect(() => {
    if (!poetPickerOpen) return;
    const handleOutsideClick = (e) => {
      if (poetPickerRef.current && !poetPickerRef.current.contains(e.target)) {
        closePoetPicker();
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [poetPickerOpen]);

  // Fetch dynamic poet list from API when picker first opens
  useEffect(() => {
    if (!poetPickerOpen || poetsFetched) return;
    const fetchPoets = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/poets`);
        if (!res.ok) {
          addLog('Poets', `API error: ${res.status}`, 'warn');
          return;
        }
        const poets = await res.json();
        setDynamicPoets(Array.isArray(poets) ? poets : []);
        addLog('Poets', `Loaded ${poets.length} poets from API`, 'info');
      } catch {
        addLog('Poets', 'Failed to fetch poets from API', 'warn');
      } finally {
        setPoetsFetched(true);
      }
    };
    fetchPoets();
    // apiUrl is a module-level constant; addLog is functionally stable (uses
    // only setLogs and module constants) even though its reference changes per
    // render — poetsFetched gate prevents repeated fetches regardless.
  }, [poetPickerOpen, poetsFetched, addLog]);

  // Focus search input when poet picker opens (delay allows CSS enter animation to complete)
  useEffect(() => {
    let timerId;
    if (poetPickerOpen && poetSearchRef.current) {
      timerId = setTimeout(() => poetSearchRef.current?.focus(), 100);
    }
    if (!poetPickerOpen) setPoetSearch('');
    return () => clearTimeout(timerId);
  }, [poetPickerOpen]);

  const closePoetPicker = () => {
    setPoetPickerClosing(true);
    setTimeout(() => {
      setPoetPickerOpen(false);
      setPoetPickerClosing(false);
    }, 250);
  };

  // Build combined poet list: featured (from CATEGORIES) + dynamic (from API)
  const filteredPoetList = useMemo(() => {
    // Normalize Arabic text: strip tashkeel, normalize letter variants, remove invisible chars
    const normalizeAr = (s) =>
      s
        .normalize('NFC')
        .replace(
          /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]/g,
          ''
        )
        .replace(/[\u200B-\u200F\u202A-\u202E\uFEFF]/g, '')
        .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627') // أ إ آ ٱ → ا
        .replace(/[\u0649\u06CC]/g, '\u064A') // alef maksura ى / Farsi ya ی → Arabic ya ي
        .replace(/\u06A9/g, '\u0643') // Farsi kaf ک → Arabic kaf ك
        .replace(/\u0629/g, '\u0647'); // taa marbuta ة → ha ه
    const search = normalizeAr(poetSearch.trim().toLowerCase());
    const featuredNormIds = new Set(
      CATEGORIES.filter((c) => c.id !== 'All').map((c) => normalizeAr(c.id))
    );

    // Build dynamic entries not already in featured (normalized comparison)
    const apiPoets = dynamicPoets
      .filter((p) => !featuredNormIds.has(normalizeAr(p.name)))
      .map((p) => ({
        id: p.name,
        label: p.name_en || p.name,
        labelAr: p.name,
        poemCount: parseInt(p.poem_count, 10) || 0,
      }));

    // Enrich featured poets with poem counts from API (normalized comparison)
    const featured = CATEGORIES.filter((c) => c.id !== 'All').map((cat) => {
      const catNorm = normalizeAr(cat.id);
      const apiMatch = dynamicPoets.find((p) => normalizeAr(p.name) === catNorm);
      return { ...cat, poemCount: apiMatch ? parseInt(apiMatch.poem_count, 10) : null };
    });

    if (!search) return { featured, all: apiPoets };

    const matchesSearch = (p) =>
      normalizeAr(p.labelAr).includes(search) || p.label.toLowerCase().includes(search);
    const matchFeatured = featured.filter(matchesSearch);
    const matchAll = apiPoets.filter(matchesSearch);
    return { featured: matchFeatured, all: matchAll };
  }, [poetSearch, dynamicPoets]);

  // Extract cached translation fields into stable local variables so useMemo
  // only re-runs when the actual string values change, not on every `current` reference change.
  const cachedTranslation = current?.cachedTranslation;
  const cachedExplanation = current?.cachedExplanation;
  const cachedAuthorBio = current?.cachedAuthorBio;

  const insightParts = useMemo(() => {
    if (cachedTranslation) {
      return {
        poeticTranslation: cachedTranslation,
        depth: cachedExplanation || '',
        author: cachedAuthorBio || '',
      };
    }
    return parseInsight(interpretation);
  }, [interpretation, cachedTranslation, cachedExplanation, cachedAuthorBio]);

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
  useEffect(() => {
    if (isPlaying && audioRef.current) {
      try {
        // Initialize AudioContext and source node if not already created.
        // A MediaElement can only be connected to one MediaElementSourceNode ever,
        // so we must reuse the source node across play/pause cycles.
        if (!audioContextRef.current) {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          const audioContext = new AudioCtx();
          const analyser = audioContext.createAnalyser();

          analyser.fftSize = 32;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);

          // Reuse existing source node or create a new one
          const source =
            sourceNodeRef.current || audioContext.createMediaElementSource(audioRef.current);
          sourceNodeRef.current = source;

          source.connect(analyser);
          analyser.connect(audioContext.destination);

          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          dataArrayRef.current = dataArray;

          if (FEATURES.logging) {
            addLog('Audio Context', 'Initialized volume detection for glow effect', 'info');
          }
        }

        // Resume context if it was suspended (e.g., by browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume();
        }

        const detectVolume = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          let sum = 0;
          for (let i = 0; i < dataArrayRef.current.length; i++) {
            sum += dataArrayRef.current[i];
          }
          const average = sum / dataArrayRef.current.length;
          const normalizedVolume = average / 255;

          if (normalizedVolume > 0.7 && volumePulseRef.current) {
            volumePulseRef.current.classList.add('volume-pulse-active');
            setTimeout(() => {
              if (volumePulseRef.current) {
                volumePulseRef.current.classList.remove('volume-pulse-active');
              }
            }, 150);
          }

          animationFrameRef.current = requestAnimationFrame(detectVolume);
        };

        detectVolume();
      } catch (error) {
        // Gracefully degrade to CSS-only animation
        if (FEATURES.logging) {
          console.error('Failed to initialize Web Audio API:', error);
        }
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying]);

  const PulseGlowBars = () => (
    <div ref={volumePulseRef} className="flex items-center justify-center gap-[3px] h-6">
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{ background: GOLD.gold, animation: 'wave-organic-1 0.9s ease-in-out infinite' }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-2 1.15s ease-in-out infinite 0.1s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-3 0.95s ease-in-out infinite 0.2s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-4 1.1s ease-in-out infinite 0.15s',
        }}
      />
      <div
        className="w-[3px] rounded-[2px] bar-with-glow"
        style={{
          background: GOLD.gold,
          animation: 'wave-organic-5 0.88s ease-in-out infinite 0.05s',
        }}
      />
    </div>
  );

  const togglePlay = async () => {
    if (isTogglingPlay.current) {
      addLog('Audio', 'Play toggle already in progress — skipping', 'info');
      return;
    }
    isTogglingPlay.current = true;
    addLog(
      'UI Event',
      `🎵 Play button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );
    track('audio_play', { poet: current?.poet });

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      track('audio_pause', { poet: current?.poet });
      addLog('UI Event', '⏸️ Pause button clicked', 'info');
      isTogglingPlay.current = false;
      return;
    }

    if (audioUrl) {
      try {
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (e) {
        addLog('Audio', 'Playback failed, resetting audio URL', 'info');
        setAudioUrl(null);
      }
      isTogglingPlay.current = false;
      return;
    }

    // iOS Safari autoplay policy: audio.play() must be called synchronously within a user
    // gesture handler. Calling it here (before any await/setTimeout) "unlocks" the audio
    // element so that deferred playback — after prefetch polling or API generation — is not
    // blocked by the browser's autoplay restrictions. Without this unlock, audio silently
    // fails to play after a TTS prefetch or Gemini generation completes asynchronously.
    // We mute first to prevent a brief audible blip if a previous src is still loaded on
    // the element, then immediately pause and restore muted to its original value.
    if (audioRef.current) {
      const wasMuted = audioRef.current.muted;
      audioRef.current.muted = true;
      const unlockPlay = audioRef.current.play();
      if (unlockPlay !== undefined) {
        unlockPlay.catch(() => {}); // silence errors from empty/invalid src
      }
      audioRef.current.pause();
      audioRef.current.muted = wasMuted;
    }

    // Set loading state FIRST (before duplicate check) for better UX
    setIsGeneratingAudio(true);

    const doGenerate = async () => {
      // CHECK CACHE FIRST
      if (FEATURES.caching && current?.id) {
        const cacheStart = performance.now();
        const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
        const cacheTime = performance.now() - cacheStart;

        if (cached?.blob) {
          const sizeMB = (cached.blob.size / (1024 * 1024)).toFixed(2);
          addLog(
            'Audio Cache',
            `✓ Cache HIT (${cacheTime.toFixed(0)}ms)${cached.metadata?.model ? ` | Model: ${cached.metadata.model}` : ''} | Size: ${sizeMB}MB | Instant playback`,
            'success'
          );
          setCacheStats((prev) => ({ ...prev, audioHits: prev.audioHits + 1 }));

          const u = URL.createObjectURL(cached.blob);
          setAudioUrl(u);
          audioRef.current.src = u;
          audioRef.current.load();
          audioRef.current
            .play()
            .then(() => setIsPlaying(true))
            .catch((err) => {
              if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
              addLog('Audio', `Cached playback failed: ${err.message}`, 'error');
            });
          setIsGeneratingAudio(false); // Clear loading state
          isTogglingPlay.current = false;
          return;
        } else {
          addLog(
            'Audio Cache',
            `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
            'info'
          );
          setCacheStats((prev) => ({ ...prev, audioMisses: prev.audioMisses + 1 }));
        }
      }

      // Mark request as in-flight
      activeAudioRequests.current.add(current?.id);

      const ttsContent = getTTSContent(current);

      // Calculate request metrics
      const requestBody = JSON.stringify({
        contents: [{ parts: [{ text: ttsContent }] }],
        generationConfig: {
          responseModalities: TTS_CONFIG.responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: TTS_CONFIG.voiceName },
            },
          },
        },
      });
      const requestSize = new Blob([requestBody]).size;
      const estimatedTokens = Math.ceil(ttsContent.length / 4);
      const arabicTextChars = current?.arabic?.length || 0;

      addLog(
        'Audio API',
        `→ Starting generation | Model: ${API_MODELS.tts} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${arabicTextChars} chars Arabic | Est. ${estimatedTokens} tokens`,
        'info'
      );

      setAudioError(null);

      try {
        const apiStart = performance.now();
        const url = `${apiUrl}/api/ai/${API_MODELS.tts}/generateContent`;
        const fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        };
        const { res, model: ttsModel } = await fetchTTSWithFallback(url, fetchOptions, {
          addLog,
          label: 'Audio API',
        });

        if (!res.ok) {
          const errorText = await res.text();
          addLog(
            'Audio API Error',
            `[${ttsModel}] HTTP ${res.status}: ${errorText.substring(0, 200)}`,
            'error'
          );
          if (res.status === 429) {
            setAudioError(
              'Recitation temporarily unavailable — too many requests. Please wait a moment and try again.'
            );
            throw new Error('Rate limited (429)');
          }
          throw new Error(`API returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const apiTime = performance.now() - apiStart;

        if (!data.candidates || data.candidates.length === 0) {
          addLog(
            'Audio API Error',
            `[${ttsModel}] No candidates in response. Full response: ${JSON.stringify(data).substring(0, 300)}`,
            'error'
          );
          throw new Error('Recitation failed - no audio candidates returned');
        }

        const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (b64) {
          const conversionStart = performance.now();
          const blob = pcm16ToWav(b64);
          const conversionTime = performance.now() - conversionStart;

          if (blob) {
            // Calculate audio metrics
            const audioSizeMB = (blob.size / (1024 * 1024)).toFixed(2);
            const audioSizeKB = (blob.size / 1024).toFixed(1);
            // Estimate audio duration from PCM samples (24kHz, 16-bit, mono)
            const pcmBytes = atob(b64.replace(/\s/g, '')).length;
            const samples = pcmBytes / 2; // 16-bit = 2 bytes per sample
            const audioDuration = samples / 24000; // 24kHz sample rate
            const tokensPerSecond = (estimatedTokens / (apiTime / 1000)).toFixed(1);
            const totalTime = apiTime + conversionTime;

            addLog(
              'Audio API',
              `✓ [${ttsModel}] Complete | API: ${(apiTime / 1000).toFixed(2)}s | Convert: ${conversionTime.toFixed(0)}ms | Total: ${(totalTime / 1000).toFixed(2)}s`,
              'success'
            );
            addLog(
              'Audio Metrics',
              `[${ttsModel}] Audio: ${audioDuration.toFixed(1)}s | Size: ${audioSizeKB}KB (${audioSizeMB}MB) | Speed: ${tokensPerSecond} tok/s`,
              'success'
            );

            const u = URL.createObjectURL(blob);
            setAudioUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                addLog('Audio', `Playback failed: ${err.message}`, 'error');
              });

            // CACHE THE AUDIO BLOB
            if (FEATURES.caching && current?.id) {
              const cacheStart = performance.now();
              await cacheOperations.set(CACHE_CONFIG.stores.audio, current.id, {
                blob,
                metadata: {
                  poet: current.poet,
                  title: current.title,
                  size: blob.size,
                  duration: audioDuration,
                  model: ttsModel,
                },
              });
              const cacheTime = performance.now() - cacheStart;
              addLog(
                'Audio Cache',
                `Audio cached for future playback (${cacheTime.toFixed(0)}ms) | Saves ${(apiTime / 1000).toFixed(1)}s on replay`,
                'success'
              );
            }
          }
        }
      } catch (e) {
        Sentry.captureException(e);
        addLog('Audio System Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
        track('audio_error', { error: (e.message || '').slice(0, 100) });
        setIsPlaying(false);
      } finally {
        setIsGeneratingAudio(false);
        activeAudioRequests.current.delete(current?.id); // Clean up in-flight tracking
        isTogglingPlay.current = false;
      }
    };

    // Check if request already in flight - poll until it completes
    if (activeAudioRequests.current.has(current?.id)) {
      addLog('Audio', `Audio generation already in progress - waiting for completion`, 'info');

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeAudioRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and play
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
          if (cached?.blob) {
            addLog(
              'Audio',
              `✓ Background audio generation completed${cached.metadata?.model ? ` [${cached.metadata.model}]` : ''} - playing from cache`,
              'success'
            );
            const u = URL.createObjectURL(cached.blob);
            setAudioUrl(u);
            audioRef.current.src = u;
            audioRef.current.load();
            audioRef.current
              .play()
              .then(() => setIsPlaying(true))
              .catch((err) => {
                if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                addLog('Audio', `Playback failed: ${err.message}`, 'error');
              });
          } else {
            addLog(
              'Audio',
              'Prefetch failed — retrying audio generation automatically...',
              'error'
            );
            if (!isTogglingPlay.current) {
              isTogglingPlay.current = true;
              await doGenerate();
            }
            return;
          }
          setIsGeneratingAudio(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some large poems take 40+ seconds)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeAudioRequests.current.has(current?.id)) {
          addLog(
            'Audio',
            `Audio generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.audio, current.id);
            if (finalCheck?.blob) {
              addLog('Audio', `✓ Audio completed after extended wait - playing now`, 'success');
              const u = URL.createObjectURL(finalCheck.blob);
              setAudioUrl(u);
              audioRef.current.src = u;
              audioRef.current.load();
              audioRef.current
                .play()
                .then(() => setIsPlaying(true))
                .catch((err) => {
                  if (FEATURES.logging) console.warn('[Audio] Playback failed:', err.message);
                  addLog('Audio', `Playback failed: ${err.message}`, 'error');
                });
            } else {
              addLog('Audio', `Audio generation timeout - please try again`, 'error');
            }
            activeAudioRequests.current.delete(current?.id);
            setIsGeneratingAudio(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      isTogglingPlay.current = false;
      return;
    }

    await doGenerate();
  };

  const handleAnalyze = async () => {
    addLog(
      'UI Event',
      `🔍 Dive In button clicked | Poem: ${current?.poet} - ${current?.title} | ID: ${current?.id}`,
      'info'
    );

    if (interpretation || isInterpreting) return;
    track('insight_requested', { poet: current?.poet });

    // Set loading state FIRST (before duplicate check) for better UX
    setIsInterpreting(true);

    // Check if request already in flight - poll until it completes
    if (activeInsightRequests.current.has(current?.id)) {
      addLog(
        'Insights',
        `Insights generation already in progress - waiting for completion`,
        'info'
      );

      // Poll every 500ms to check if the request completed
      const pollInterval = setInterval(async () => {
        if (!activeInsightRequests.current.has(current?.id)) {
          clearInterval(pollInterval);
          pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);

          // Request completed - check cache and display
          const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
          if (cached?.interpretation) {
            addLog(
              'Insights',
              `✓ Background insights generation completed - displaying results`,
              'success'
            );
            setInterpretation(cached.interpretation);
          } else {
            addLog('Insights', `Background insights generation failed - retrying`, 'info');
            // Retry the request
            setTimeout(() => handleAnalyze(), 100);
            return;
          }
          setIsInterpreting(false);
        }
      }, 500);

      pollingIntervals.current.push(pollInterval);

      // Safety timeout - clear after 60 seconds (some insights take time)
      setTimeout(() => {
        clearInterval(pollInterval);
        pollingIntervals.current = pollingIntervals.current.filter((id) => id !== pollInterval);
        if (activeInsightRequests.current.has(current?.id)) {
          addLog(
            'Insights',
            `Insights generation taking longer than expected - checking one more time...`,
            'info'
          );

          // Final check before giving up
          setTimeout(async () => {
            const finalCheck = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
            if (finalCheck?.interpretation) {
              addLog(
                'Insights',
                `✓ Insights completed after extended wait - displaying now`,
                'success'
              );
              setInterpretation(finalCheck.interpretation);
            } else {
              addLog('Insights', `Insights generation timeout - please try again`, 'error');
            }
            activeInsightRequests.current.delete(current?.id);
            setIsInterpreting(false);
          }, 10000); // Wait 10 more seconds for slow API
        }
      }, 60000);

      return;
    }

    // Mark request as in-flight
    activeInsightRequests.current.add(current?.id);

    // CHECK CACHE FIRST
    if (FEATURES.caching && current?.id) {
      const cacheStart = performance.now();
      const cached = await cacheOperations.get(CACHE_CONFIG.stores.insights, current.id);
      const cacheTime = performance.now() - cacheStart;

      if (cached?.interpretation) {
        const charCount = cached.interpretation.length;
        const estTokens = Math.ceil(charCount / 4);
        addLog(
          'Insights Cache',
          `✓ Cache HIT (${cacheTime.toFixed(0)}ms) | ${charCount} chars (≈${estTokens} tokens) | Instant load`,
          'success'
        );
        setCacheStats((prev) => ({ ...prev, insightsHits: prev.insightsHits + 1 }));
        setInterpretation(cached.interpretation);
        setIsInterpreting(false); // Clear loading state
        activeInsightRequests.current.delete(current?.id); // Clean up tracking
        return;
      } else {
        addLog(
          'Insights Cache',
          `✗ Cache MISS (${cacheTime.toFixed(0)}ms) | Generating from API...`,
          'info'
        );
        setCacheStats((prev) => ({ ...prev, insightsMisses: prev.insightsMisses + 1 }));
      }
    }

    let insightText = '';
    let apiStartTime = null;

    try {
      // Use streaming if feature flag is enabled
      if (FEATURES.streaming) {
        const poetInfo = current?.poet ? ` by ${current.poet}` : '';
        const promptText = `Deep Analysis of${poetInfo}:\n\n${current?.arabic}`;
        const requestSize = new Blob([
          JSON.stringify({ contents: [{ parts: [{ text: promptText }] }] }),
        ]).size;
        const estimatedInputTokens = Math.ceil(
          (promptText.length + INSIGHTS_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = promptText.length;
        const arabicTextChars = current?.arabic?.length || 0;
        const systemPromptChars = INSIGHTS_SYSTEM_PROMPT.length;

        addLog(
          'Insights API',
          `→ Starting streaming | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars} chars (${arabicTextChars} Arabic + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          'info'
        );

        setInterpretation(''); // Clear previous interpretation
        apiStartTime = performance.now();
        const apiStart = apiStartTime;
        let firstChunkTime = null;
        let chunkCount = 0;
        let totalTime = 0;

        const insightsStreamBody = JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
        });
        const res = await geminiTextFetch(
          'streamGenerateContent',
          insightsStreamBody,
          'Insights failed',
          addLog
        );

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and add to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6).trim();
              if (jsonStr === '[DONE]') continue;

              try {
                const data = JSON.parse(jsonStr);
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  if (!firstChunkTime) {
                    firstChunkTime = performance.now() - apiStart;
                    addLog(
                      'Insights API',
                      `← First chunk received (${firstChunkTime.toFixed(0)}ms) | Streaming...`,
                      'info'
                    );
                  }
                  chunkCount++;
                  accumulatedText += text;
                  setInterpretation(accumulatedText); // Real-time UI update
                }
              } catch (parseError) {
                // Skip malformed JSON chunks
                console.debug('Skipping malformed chunk:', jsonStr);
              }
            }
          }
        }

        insightText = accumulatedText;
        totalTime = performance.now() - apiStart;
        const charCount = insightText.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        const tokensPerSecond = (estimatedTokens / (totalTime / 1000)).toFixed(1);
        const avgChunkSize = charCount / chunkCount;

        addLog(
          'Insights API',
          `✓ Streaming complete | Total: ${(totalTime / 1000).toFixed(2)}s | TTFT: ${(firstChunkTime / 1000).toFixed(2)}s | ${chunkCount} chunks`,
          'success'
        );
        addLog(
          'Insights Metrics',
          `${charCount} chars (≈${estimatedTokens} tokens) | ${tokensPerSecond} tok/s | Avg chunk: ${avgChunkSize.toFixed(0)} chars`,
          'success'
        );
      } else {
        // Non-streaming fallback (original implementation)
        addLog('Insights', 'Analyzing poem...', 'info');
        const poetInfoFallback = current?.poet ? ` by ${current.poet}` : '';
        const insightsFallbackBody = JSON.stringify({
          contents: [
            { parts: [{ text: `Deep Analysis of${poetInfoFallback}:\n\n${current?.arabic}` }] },
          ],
          systemInstruction: { parts: [{ text: INSIGHTS_SYSTEM_PROMPT }] },
        });
        const res = await geminiTextFetch(
          'generateContent',
          insightsFallbackBody,
          'Insights failed',
          addLog
        );
        const data = await res.json();
        insightText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        setInterpretation(insightText);
        addLog('Insights', 'Analysis complete', 'success');
      }

      // CACHE THE INSIGHTS
      if (FEATURES.caching && current?.id && insightText) {
        const cacheStart = performance.now();
        await cacheOperations.set(CACHE_CONFIG.stores.insights, current.id, {
          interpretation: insightText,
          metadata: {
            poet: current.poet,
            title: current.title,
            charCount: insightText.length,
            tokens: Math.ceil(insightText.length / 4),
          },
        });
        const cacheTime = performance.now() - cacheStart;
        const elapsedTime = apiStartTime
          ? ((performance.now() - apiStartTime) / 1000).toFixed(1)
          : '2-8';
        addLog(
          'Insights Cache',
          `Insights cached for future use (${cacheTime.toFixed(0)}ms) | Saves ${elapsedTime}s on reload`,
          'success'
        );
      }

      // Save translation back to database for future visitors (fire-and-forget)
      if (current?.isFromDatabase && current?.id && insightText && apiUrl) {
        const parts = parseInsight(insightText);
        if (parts?.poeticTranslation) {
          fetch(`${apiUrl}/api/poems/${current.id}/translation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              translation: parts.poeticTranslation.replace(/\n/g, '*'),
              explanation: parts.depth || null,
              authorBio: parts.author || null,
            }),
          }).catch(() => {});
        }
      }

      track('insight_completed', {
        poet: current?.poet,
        cached: !!(FEATURES.caching && current?.id && insightText),
      });

      // Flash gold check sparkle on the sidebar icon
      if (insightText) {
        setShowInsightSuccess(true);
        setTimeout(() => setShowInsightSuccess(false), 1500);
      }
    } catch (e) {
      Sentry.captureException(e);
      addLog('Analysis Error', `${e.message} | Poem ID: ${current?.id}`, 'error');
      track('insight_error', { error: (e.message || '').slice(0, 100) });
      // Show partial results if streaming was interrupted
      if (FEATURES.streaming && insightText) {
        addLog('Insights', 'Showing partial results', 'warning');
      }
    } finally {
      setIsInterpreting(false);
      activeInsightRequests.current.delete(current?.id); // Clean up in-flight tracking
    }
  };

  const handleFetch = async () => {
    addLog(
      'UI Event',
      `🐰 Discover button clicked | Category: ${selectedCategory} | Source: ${useDatabase ? 'Database' : 'LLM'}`,
      'info'
    );

    if (isFetching) {
      addLog('Discovery', `Discovery already in progress - please wait`, 'info');
      return;
    }

    setIsFetching(true);

    try {
      const apiStart = performance.now();

      // DATABASE MODE: Fetch from local PostgreSQL API
      if (useDatabase) {
        addLog('Discovery DB', `→ Querying database | Category: ${selectedCategory}`, 'info');

        // Dedup: prune stale entries and build exclude list
        pruneSeenPoems();
        const seenIds = getRecentSeenIds();

        const categoryObj = CATEGORIES.find((c) => c.id === selectedCategory);
        const poetName = categoryObj?.labelAr || selectedCategory;
        const queryParams = new URLSearchParams();
        if (selectedCategory !== 'All') queryParams.set('poet', poetName);
        if (seenIds.length > 0) queryParams.set('exclude', seenIds.join(','));
        const qs = queryParams.toString();
        const url = `${apiUrl}/api/poems/random${qs ? '?' + qs : ''}`;

        if (seenIds.length > 0) {
          addLog('Discovery DB', `Excluding ${seenIds.length} recently seen poems`, 'info');
        }

        try {
          const res = await fetch(url);

          if (!res.ok) {
            throw new Error(`Database API returned ${res.status} ${res.statusText}`);
          }

          // Clear any previous backend errors on success

          const newPoem = await res.json();
          const apiTime = performance.now() - apiStart;

          // Process database poems: replace * with newlines
          if (newPoem.arabic) {
            newPoem.arabic = newPoem.arabic.replace(/\*/g, '\n');
          }
          if (newPoem.cachedTranslation) {
            newPoem.cachedTranslation = newPoem.cachedTranslation.replace(/\*/g, '\n');
          }

          // Mark as database poem
          newPoem.isFromDatabase = true;

          // Track this poem as seen for dedup
          markPoemSeen(newPoem.id);

          const arabicPoemChars = newPoem?.arabic?.length || 0;

          addLog(
            'Discovery DB',
            `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | DB ID: ${newPoem.id} | Arabic: ${arabicPoemChars} chars`,
            'success'
          );
          addLog('Discovery DB', `Poet: ${newPoem.poet} | Title: ${newPoem.title}`, 'success');
          track('poem_discovered', { source: 'database', poet: newPoem.poet });
          emitEvent(newPoem.id, 'serve', { source: 'database' });
          addLog(
            'Event',
            `→ serve event emitted | poem_id: ${newPoem.id} | source: database`,
            'info'
          );

          setPoems((prev) => {
            const updated = [...prev, newPoem];
            // Use the always-current ref so a user who switched poets while this
            // fetch was in flight doesn't see a poem from the wrong poet.
            const freshFiltered = filterPoemsByCategory(updated, selectedCategoryRef.current);
            const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
            if (newIdx !== -1) setCurrentIndex(newIdx);
            return updated;
          });
          // Update URL to reflect current poem
          navigate('/poem/' + newPoem.id, { replace: true });
          // Auto-analyze to fetch English translation if no cached translation is available
          if (!newPoem.cachedTranslation) {
            setAutoExplainPending(true);
          }
        } catch (dbError) {
          // Handle database-specific errors
          const errorMessage = dbError.message.includes('Failed to fetch')
            ? 'Backend server is not running. Please start it with: npm run dev:server'
            : dbError.message;

          addLog('Discovery DB Error', errorMessage, 'error');
          throw dbError; // Re-throw to be caught by outer catch
        }
      } else {
        // LLM MODE: Original implementation
        const prompt =
          selectedCategory === 'All'
            ? 'Find a masterpiece Arabic poem. COMPLETE text.'
            : `Find a famous poem by ${selectedCategory}. COMPLETE text.`;

        const requestBody = JSON.stringify({
          contents: [{ parts: [{ text: `${prompt} JSON only.` }] }],
          systemInstruction: { parts: [{ text: DISCOVERY_SYSTEM_PROMPT }] },
          generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8192 },
        });

        const requestSize = new Blob([requestBody]).size;
        const estimatedInputTokens = Math.ceil(
          (prompt.length + DISCOVERY_SYSTEM_PROMPT.length) / 4
        );
        const promptChars = prompt.length;
        const systemPromptChars = DISCOVERY_SYSTEM_PROMPT.length;

        addLog(
          'Discovery API',
          `→ Searching ${selectedCategory} | Request: ${(requestSize / 1024).toFixed(1)}KB | ${promptChars + systemPromptChars} chars (${promptChars} prompt + ${systemPromptChars} system) | Est. ${estimatedInputTokens} tokens`,
          'info'
        );

        const res = await geminiTextFetch(
          'generateContent',
          requestBody,
          'Discovery failed',
          addLog
        );

        const data = await res.json();
        const apiTime = performance.now() - apiStart;

        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedPoem = repairAndParseJSON(rawText);
        // Log if repair was needed (original raw text had fences or truncation)
        const cleanJson = (rawText || '').replace(/```json|```/g, '').trim();

        // Normalize tags: convert object to array if needed
        if (
          parsedPoem.tags &&
          typeof parsedPoem.tags === 'object' &&
          !Array.isArray(parsedPoem.tags)
        ) {
          addLog(
            'Discovery Tags',
            `Converting tags from object to array | Original: ${JSON.stringify(parsedPoem.tags)}`,
            'info'
          );
          parsedPoem.tags = [
            parsedPoem.tags.Era || parsedPoem.tags.era || 'Unknown',
            parsedPoem.tags.Mood || parsedPoem.tags.mood || 'Unknown',
            parsedPoem.tags.Type || parsedPoem.tags.type || 'Unknown',
          ];
        }

        const newPoem = { ...parsedPoem, id: Date.now() };

        const responseSize = new Blob([cleanJson]).size;
        const estimatedOutputTokens = Math.ceil(cleanJson.length / 4);
        const tokensPerSecond = (estimatedOutputTokens / (apiTime / 1000)).toFixed(1);
        const jsonChars = cleanJson.length;
        const arabicPoemChars = newPoem?.arabic?.length || 0;
        const englishPoemChars = newPoem?.english?.length || 0;

        // Log tags for debugging
        const tagsType = Array.isArray(newPoem?.tags) ? 'array' : typeof newPoem?.tags;
        const tagsContent = Array.isArray(newPoem?.tags)
          ? `[${newPoem.tags.join(', ')}]`
          : JSON.stringify(newPoem?.tags);
        addLog(
          'Discovery Tags',
          `Type: ${tagsType} | Count: ${Array.isArray(newPoem?.tags) ? newPoem.tags.length : 'N/A'} | Content: ${tagsContent}`,
          'info'
        );

        addLog(
          'Discovery API',
          `✓ Poem found | API: ${(apiTime / 1000).toFixed(2)}s | Response: ${(responseSize / 1024).toFixed(1)}KB | ${jsonChars} chars`,
          'success'
        );
        addLog(
          'Discovery Metrics',
          `${estimatedOutputTokens} tokens | ${tokensPerSecond} tok/s | Arabic: ${arabicPoemChars} chars | English: ${englishPoemChars} chars | Poet: ${newPoem.poet}`,
          'success'
        );
        track('poem_discovered', { source: 'ai', poet: newPoem.poet });
        emitEvent(newPoem.id, 'serve', { source: 'ai' });
        addLog('Event', `→ serve event emitted | poem_id: ${newPoem.id} | source: ai`, 'info');
        setPoems((prev) => {
          const updated = [...prev, newPoem];
          // Use the always-current ref so a user who switched poets while this
          // fetch was in flight doesn't see a poem from the wrong poet.
          const freshFiltered = filterPoemsByCategory(updated, selectedCategoryRef.current);
          const newIdx = freshFiltered.findIndex((p) => p.id === newPoem.id);
          if (newIdx !== -1) setCurrentIndex(newIdx);
          return updated;
        });
        navigate('/', { replace: true });
      }
    } catch (e) {
      Sentry.captureException(e);
      addLog(
        'Discovery Error',
        `${e.message} | Source: ${useDatabase ? 'Database' : 'Gemini'}`,
        'error'
      );
    }
    setIsFetching(false);
  };

  // Pre-fetch a poem in the background for the next visit (stored in localStorage with TTL)
  async function prefetchNextVisitPoem() {
    try {
      const res = await fetch(`${apiUrl}/api/poems/random`);
      if (!res.ok) return;
      const poem = await res.json();
      if (poem.arabic) poem.arabic = poem.arabic.replace(/\*/g, '\n');
      if (poem.cachedTranslation)
        poem.cachedTranslation = poem.cachedTranslation.replace(/\*/g, '\n');
      poem.isFromDatabase = true;
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
    pollingIntervals.current.forEach((interval) => clearInterval(interval));
    pollingIntervals.current = [];

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
    if (!useDatabase || !apiUrl) return; // Only ping if database mode is enabled

    const keepAlivePing = setInterval(
      () => {
        fetch(`${apiUrl}/api/health`)
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
    fetch(`${apiUrl}/api/health`).catch(() => {});

    return () => clearInterval(keepAlivePing);
  }, [useDatabase, apiUrl]);

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
          padding: 16px 24px;
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

        @media (min-width: 768px) {
          .minimal-frame {
            padding: 28px 40px;
          }
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

        @keyframes discoverShuffle {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(-15deg); }
          75% { transform: rotate(15deg); }
          100% { transform: rotate(0deg); }
        }
        .discover-btn:hover .discover-icon {
          animation: discoverShuffle 0.5s ease-in-out;
        }

        @keyframes insightsDrawerIn {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }

        @keyframes poetPickerIn {
          0%   { opacity: 0; transform: translate(-50%, 16px) scale(0.9); }
          60%  { opacity: 1; transform: translate(-50%, -4px) scale(1.02); }
          100% { opacity: 1; transform: translate(-50%, 0) scale(1); }
        }
        @keyframes poetPickerOut {
          0%   { opacity: 1; transform: translate(-50%, 0) scale(1); }
          40%  { opacity: 0.8; transform: translate(-50%, -3px) scale(1.01); }
          100% { opacity: 0; transform: translate(-50%, 20px) scale(0.9); }
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

      `}</style>

      <DebugPanel
        logs={logs}
        onClear={() => setLogs([])}
        darkMode={darkMode}
        poem={current}
        visible={showDebugLogs}
        controlBarRef={controlBarRef}
        appState={{
          mode: useDatabase ? 'database' : 'ai',
          theme: darkMode ? 'dark' : 'light',
          font: currentFont,
        }}
      />

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
                color: '#C5A059',
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
            style={{ ...BRAND.feather, color: '#C5A059', alignSelf: 'center' }}
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

                    <div
                      className="relative z-10 flex flex-col items-center justify-center w-full"
                      dir="rtl"
                    >
                      <div
                        className="font-amiri font-bold text-center"
                        style={{
                          fontSize: 'clamp(1.4rem, 4vw, 2.25rem)',
                          color: '#C5A059',
                          lineHeight: 1.4,
                          textShadow: darkMode ? '0 0 30px rgba(197,160,89,0.15)' : 'none',
                        }}
                      >
                        {current?.titleArabic || current?.title}
                      </div>
                      <div
                        style={{
                          width: '40px',
                          height: '1px',
                          background: '#C5A059',
                          opacity: 0.5,
                          margin: '0.5rem auto',
                        }}
                      />
                      <div
                        className="font-tajawal text-center"
                        style={{
                          fontSize: 'clamp(0.8rem, 2vw, 1rem)',
                          color: darkMode ? '#a8a29e' : '#57534e',
                          lineHeight: 1.4,
                        }}
                      >
                        {current?.poetArabic || current?.poet}
                      </div>
                      {(current?.poet !== current?.poetArabic ||
                        current?.title !== current?.titleArabic) && (
                        <div
                          className="font-brand-en text-center italic"
                          dir="ltr"
                          style={{
                            fontSize: 'clamp(0.7rem, 1.3vw, 0.8rem)',
                            color: darkMode ? '#78716c' : '#a8a29e',
                            marginTop: '0.5rem',
                          }}
                        >
                          {current?.title !== current?.titleArabic && <span>{current.title}</span>}
                          {current?.title !== current?.titleArabic &&
                            current?.poet !== current?.poetArabic && (
                              <span className="opacity-40"> — </span>
                            )}
                          {current?.poet !== current?.poetArabic && <span>{current.poet}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`relative w-full group pt-1 pb-2 ${DESIGN.mainMarginBottom}`}>
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
                              className={`font-brand-en italic opacity-40 ${DESIGN.anim} mx-auto`}
                              style={{
                                fontSize: `calc(clamp(1rem, 1.5vw, 1.125rem) * ${textScale})`,
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
                          <PulseGlowBars />
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

              <div
                ref={poetPickerRef}
                className="relative flex flex-col items-center gap-0.5 min-w-[52px]"
              >
                <button
                  onClick={() => {
                    if (poetPickerOpen) {
                      closePoetPicker();
                    } else {
                      setPoetPickerOpen(true);
                    }
                  }}
                  aria-label="Filter by poet"
                  className={`relative min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105 ${poetPickerOpen ? 'bg-[#C5A059]/10' : ''}`}
                >
                  <ScrollText className={GOLD.goldText} size={21} />
                  {selectedCategory !== 'All' && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#C5A059] shadow-[0_0_6px_rgba(197,160,89,0.5)]" />
                  )}
                </button>
                <span
                  className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase whitespace-nowrap ${GOLD.goldText}`}
                  style={{ opacity: 0.6 }}
                >
                  Poets
                </span>
                {(poetPickerOpen || poetPickerClosing) && (
                  <div
                    className="absolute bottom-full mb-2 left-1/2 w-auto min-w-[14rem] max-w-[18rem] rounded-2xl border border-[#C5A059]/25 bg-black/95 backdrop-blur-2xl shadow-2xl py-2.5 z-[200]"
                    style={{
                      animation: poetPickerClosing
                        ? 'poetPickerOut 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards'
                        : 'poetPickerIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
                    }}
                  >
                    {/* Search input */}
                    <div className="px-3 pb-2 mb-1 border-b border-[#C5A059]/15">
                      <div className="relative flex items-center">
                        <Search className="absolute left-2 text-[#C5A059]/40" size={13} />
                        <input
                          ref={poetSearchRef}
                          type="text"
                          value={poetSearch}
                          onChange={(e) => setPoetSearch(e.target.value)}
                          placeholder="Search poets..."
                          aria-label="Search poets"
                          className="w-full bg-white/5 border border-[#C5A059]/15 rounded-lg pl-7 pr-3 py-1.5 text-[16px] text-stone-200 placeholder-stone-600 focus:outline-none focus:border-[#C5A059]/40 font-tajawal transition-colors"
                        />
                        {poetSearch && (
                          <button
                            onClick={() => setPoetSearch('')}
                            className="absolute right-2 text-stone-500 hover:text-stone-300"
                            aria-label="Clear search"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable poet list */}
                    <div
                      className="max-h-[280px] overflow-y-auto overflow-x-hidden"
                      style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: 'rgba(197,160,89,0.2) transparent',
                      }}
                    >
                      {/* "All Poets" option — shown when there is no active search */}
                      {!poetSearch && (
                        <button
                          data-testid="poet-picker-button"
                          onClick={() => {
                            setSelectedCategory('All');
                            closePoetPicker();
                          }}
                          className={`w-full text-right px-5 py-2.5 transition-all duration-150 ${selectedCategory === 'All' ? 'bg-[#C5A059]/15 border-r-2 border-[#C5A059]' : 'hover:bg-[#C5A059]/8 border-r-2 border-transparent'}`}
                        >
                          <span
                            className={`block text-[17px] ${selectedCategory === 'All' ? 'text-[#C5A059]' : 'text-stone-300'}`}
                            dir="rtl"
                            style={{ fontFamily: "'Reem Kufi', sans-serif", fontWeight: 500 }}
                          >
                            كل الشعراء
                          </span>
                          <span
                            className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === 'All' ? 'text-[#C5A059]/70' : 'opacity-40'}`}
                          >
                            All Poets
                          </span>
                        </button>
                      )}

                      {/* Featured poets section */}
                      {filteredPoetList.featured.length > 0 && (
                        <>
                          {!poetSearch && (
                            <div className="px-4 pt-2 pb-1">
                              <span className="text-[9px] font-brand-en uppercase tracking-widest text-[#C5A059]/35 font-bold">
                                Featured
                              </span>
                            </div>
                          )}
                          {filteredPoetList.featured.map((cat) => (
                            <button
                              key={cat.id}
                              data-testid="poet-picker-button"
                              onClick={() => {
                                // Re-selecting the same specific poet: selectedCategory won't change so
                                // the selectedCategory effect won't fire. Call handleFetch() directly
                                // so the user always gets a fresh poem on each explicit selection.
                                if (cat.id === selectedCategory && cat.id !== 'All') {
                                  handleFetch();
                                } else {
                                  setSelectedCategory(cat.id);
                                }
                                closePoetPicker();
                              }}
                              className={`w-full text-right px-5 py-2 transition-all duration-150 ${selectedCategory === cat.id ? 'bg-[#C5A059]/15 border-r-2 border-[#C5A059]' : 'hover:bg-[#C5A059]/8 border-r-2 border-transparent'}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`block text-[16px] truncate ${selectedCategory === cat.id ? 'text-[#C5A059]' : 'text-stone-300'}`}
                                    dir="rtl"
                                    style={{
                                      fontFamily: "'Reem Kufi', sans-serif",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {cat.labelAr}
                                  </span>
                                  <span
                                    className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === cat.id ? 'text-[#C5A059]/70' : 'opacity-40'}`}
                                  >
                                    {cat.label}
                                  </span>
                                </div>
                                {cat.poemCount !== null && cat.poemCount !== undefined && (
                                  <span className="text-[9px] font-brand-en text-[#C5A059]/40 bg-[#C5A059]/8 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                    {cat.poemCount.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Dynamic poets from API */}
                      {filteredPoetList.all.length > 0 && (
                        <>
                          <div className="px-4 pt-2 pb-1">
                            <span className="text-[9px] font-brand-en uppercase tracking-widest text-[#C5A059]/35 font-bold">
                              {poetSearch ? 'Results' : 'More Poets'}
                            </span>
                          </div>
                          {filteredPoetList.all.map((p) => (
                            <button
                              key={p.id}
                              data-testid="poet-picker-button"
                              onClick={() => {
                                if (p.id === selectedCategory && p.id !== 'All') {
                                  handleFetch();
                                } else {
                                  setSelectedCategory(p.id);
                                }
                                closePoetPicker();
                              }}
                              className={`w-full text-right px-5 py-2 transition-all duration-150 ${selectedCategory === p.id ? 'bg-[#C5A059]/15 border-r-2 border-[#C5A059]' : 'hover:bg-[#C5A059]/8 border-r-2 border-transparent'}`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span
                                    className={`block text-[16px] truncate ${selectedCategory === p.id ? 'text-[#C5A059]' : 'text-stone-300'}`}
                                    dir="rtl"
                                    style={{
                                      fontFamily: "'Reem Kufi', sans-serif",
                                      fontWeight: 500,
                                    }}
                                  >
                                    {p.labelAr}
                                  </span>
                                  <span
                                    className={`block text-[10px] font-brand-en mt-0.5 ${selectedCategory === p.id ? 'text-[#C5A059]/70' : 'opacity-40'}`}
                                  >
                                    {p.label}
                                  </span>
                                </div>
                                {p.poemCount > 0 && (
                                  <span className="text-[9px] font-brand-en text-[#C5A059]/40 bg-[#C5A059]/8 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                                    {p.poemCount.toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </button>
                          ))}
                        </>
                      )}

                      {/* Loading state */}
                      {!poetsFetched && dynamicPoets.length === 0 && (
                        <div className="px-5 py-3 text-center">
                          <Loader2
                            className="inline-block text-[#C5A059]/40 animate-spin"
                            size={16}
                          />
                          <span className="block text-[10px] font-brand-en text-stone-600 mt-1">
                            Loading poets...
                          </span>
                        </div>
                      )}

                      {/* No results */}
                      {poetSearch &&
                        filteredPoetList.featured.length === 0 &&
                        filteredPoetList.all.length === 0 && (
                          <div className="px-5 py-3 text-center">
                            <span
                              className="block text-[12px] text-stone-500 font-tajawal"
                              dir="rtl"
                            >
                              لا نتائج
                            </span>
                            <span className="block text-[10px] font-brand-en text-stone-600 mt-0.5">
                              No matching poets
                            </span>
                          </div>
                        )}
                    </div>

                    {/* Active filter indicator */}
                    {selectedCategory !== 'All' && !poetSearch && (
                      <div className="mt-1 pt-1.5 border-t border-[#C5A059]/10 px-4 pb-0.5">
                        <button
                          onClick={() => {
                            setSelectedCategory('All');
                            closePoetPicker();
                          }}
                          className="flex items-center gap-1.5 text-[10px] font-brand-en text-[#C5A059]/50 hover:text-[#C5A059]/80 transition-colors"
                        >
                          <X size={10} />
                          Clear filter
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <SavePoemButton
                poem={current}
                isSaved={isPoemSaved(current)}
                onSave={handleSavePoem}
                onUnsave={handleUnsavePoem}
                disabled={!user}
                onSignIn={(msg) => {
                  setAuthModalMessage(msg);
                  setShowAuthModal(true);
                }}
              />

              <DownvoteButton
                poem={current}
                isDownvoted={isPoemDownvoted(current)}
                onDownvote={handleDownvote}
                onUndownvote={handleUndownvote}
                disabled={!user}
                onSignIn={(msg) => {
                  setAuthModalMessage(msg);
                  setShowAuthModal(true);
                }}
              />
            </div>
          </footer>
        </div>

        <div className="hidden md:block h-full border-l">
          <div
            className={`${DESIGN.paneWidth} h-full flex flex-col z-30 ${DESIGN.anim} ${theme.glass} ${theme.border}`}
          >
            <div className="p-6 pb-4 border-b border-stone-500/10">
              <div className="flex items-center justify-between">
                <h3 className="font-brand-en italic font-semibold text-[clamp(1rem,1.8vw,1.125rem)] text-indigo-600 tracking-tight">
                  Poetic Insight
                </h3>
                {selectedCategory !== 'All' && (
                  <span
                    key={selectedCategory}
                    className="font-amiri text-[11px] px-2.5 py-0.5 rounded-full border border-[#C5A059]/25 text-[#C5A059]/80 bg-[#C5A059]/5"
                    style={{ animation: 'fadeIn 0.3s ease-out' }}
                  >
                    {CATEGORIES.find((c) => c.id === selectedCategory)?.labelAr}
                  </span>
                )}
              </div>
              <p className="text-[10px] opacity-30 uppercase font-brand-en truncate mt-1">
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

      {/* Insights Drawer (Mobile bottom sheet) */}
      <InsightsDrawer
        isOpen={insightsDrawerOpen}
        onClose={() => setInsightsDrawerOpen(false)}
        isInterpreting={isInterpreting}
        insightParts={insightParts}
        interpretation={interpretation}
        showTranslation={showTranslation}
        current={current}
        theme={theme}
        darkMode={darkMode}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthModalMessage('');
        }}
        onSignInWithGoogle={handleSignInWithGoogle}
        theme={theme}
        message={authModalMessage}
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

      {/* Design Review + Bug — stacked bottom-left utility buttons */}
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
                ? 'bg-stone-900/60 border border-[#C5A059]/20 text-stone-500 hover:text-[#C5A059] hover:border-[#C5A059]/40'
                : 'bg-white/50 border border-[#8B7355]/20 text-stone-400 hover:text-[#8B7355] hover:border-[#8B7355]/40'
            } backdrop-blur-md`}
          >
            <Paintbrush size={9} />
          </span>
        </a>
      </div>

      {/* Vertical Sidebar - always visible */}
      <VerticalSidebar
        onExplain={() => {
          if (interpretation) {
            // Already have insight — toggle drawer open/closed
            setInsightsDrawerOpen((prev) => !prev);
            setShowInsightSuccess(true);
            setTimeout(() => setShowInsightSuccess(false), 1500);
          } else {
            // No insight yet — fetch and open drawer
            handleAnalyze();
            setInsightsDrawerOpen(true);
          }
        }}
        onCopy={handleCopy}
        showCopySuccess={showCopySuccess}
        onShare={handleShare}
        showShareSuccess={showShareSuccess}
        showInsightSuccess={showInsightSuccess}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onOpenSavedPoems={handleOpenSavedPoems}
        savedPoemsCount={savedPoems.length}
        user={user}
        theme={theme}
        isInterpreting={isInterpreting}
        interpretation={interpretation}
        showTranslation={showTranslation}
        onToggleTranslation={() => {
          setShowTranslation((prev) => !prev);
          if (!interpretation && !isInterpreting) handleAnalyze();
        }}
        showTransliteration={showTransliteration}
        onToggleTransliteration={() => setShowTransliteration((prev) => !prev)}
        textSizeLabel={TEXT_SIZES[textSizeLevel].label}
        onCycleTextSize={cycleTextSize}
        darkMode={darkMode}
        onToggleDarkMode={handleToggleTheme}
        currentFont={currentFont}
        onCycleFont={cycleFont}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        showDebugLogs={showDebugLogs}
        onToggleDebugLogs={() => setShowDebugLogs((prev) => !prev)}
      />

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
