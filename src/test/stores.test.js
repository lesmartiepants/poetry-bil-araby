import { describe, it, expect, beforeEach } from 'vitest';
import { usePoemStore } from '../stores/poemStore';
import { useAudioStore } from '../stores/audioStore';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { FEATURES } from '../constants/features';
import { THEME } from '../constants/theme';
import { FONTS } from '../constants/fonts';

// ============================================================================
// Poem Store
// ============================================================================
describe('poemStore', () => {
  beforeEach(() => {
    usePoemStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with a seed poem', () => {
      const poems = usePoemStore.getState().poems;
      expect(poems).toHaveLength(1);
      expect(poems[0].arabic).toBeDefined();
    });

    it('starts at index 0', () => {
      expect(usePoemStore.getState().currentIndex).toBe(0);
    });

    it('starts with category All', () => {
      expect(usePoemStore.getState().selectedCategory).toBe('All');
    });

    it('starts not fetching', () => {
      expect(usePoemStore.getState().isFetching).toBe(false);
    });

    it('starts with useDatabase from FEATURES', () => {
      expect(usePoemStore.getState().useDatabase).toBe(FEATURES.database);
    });

    it('starts with no interpretation', () => {
      expect(usePoemStore.getState().interpretation).toBeNull();
    });

    it('starts not interpreting', () => {
      expect(usePoemStore.getState().isInterpreting).toBe(false);
    });

    it('starts with autoExplainPending false', () => {
      expect(usePoemStore.getState().autoExplainPending).toBe(false);
    });

    it('starts with poetsFetched false', () => {
      expect(usePoemStore.getState().poetsFetched).toBe(false);
    });

    it('starts with empty dynamicPoets', () => {
      expect(usePoemStore.getState().dynamicPoets).toEqual([]);
    });

    it('starts with empty poetSearch', () => {
      expect(usePoemStore.getState().poetSearch).toBe('');
    });
  });

  describe('actions', () => {
    it('addPoem appends poem and updates index to it', () => {
      const initialLen = usePoemStore.getState().poems.length;
      const poem = { id: 99, arabic: 'test', poet: 'test' };
      usePoemStore.getState().addPoem(poem);
      const state = usePoemStore.getState();
      expect(state.poems).toHaveLength(initialLen + 1);
      expect(state.poems[state.poems.length - 1]).toBe(poem);
      expect(state.currentIndex).toBe(initialLen);
    });

    it('addPoem appends second poem at end', () => {
      const initialLen = usePoemStore.getState().poems.length;
      const poem1 = { id: 98, arabic: 'a', poet: 'a' };
      const poem2 = { id: 99, arabic: 'b', poet: 'b' };
      usePoemStore.getState().addPoem(poem1);
      usePoemStore.getState().addPoem(poem2);
      expect(usePoemStore.getState().poems).toHaveLength(initialLen + 2);
      expect(usePoemStore.getState().currentIndex).toBe(initialLen + 1);
    });

    it('setCurrentIndex updates index', () => {
      usePoemStore.getState().addPoem({ id: 1 });
      usePoemStore.getState().addPoem({ id: 2 });
      usePoemStore.getState().setCurrentIndex(0);
      expect(usePoemStore.getState().currentIndex).toBe(0);
    });

    it('setCategory updates category', () => {
      usePoemStore.getState().setCategory('Ghazal');
      expect(usePoemStore.getState().selectedCategory).toBe('Ghazal');
    });

    it('setFetching toggles fetching flag', () => {
      usePoemStore.getState().setFetching(true);
      expect(usePoemStore.getState().isFetching).toBe(true);
      usePoemStore.getState().setFetching(false);
      expect(usePoemStore.getState().isFetching).toBe(false);
    });

    it('setAutoExplain toggles autoExplainPending', () => {
      usePoemStore.getState().setAutoExplain(true);
      expect(usePoemStore.getState().autoExplainPending).toBe(true);
    });

    it('setInterpretation sets interpretation text', () => {
      usePoemStore.getState().setInterpretation('deep meaning');
      expect(usePoemStore.getState().interpretation).toBe('deep meaning');
    });

    it('setInterpreting toggles isInterpreting flag', () => {
      usePoemStore.getState().setInterpreting(true);
      expect(usePoemStore.getState().isInterpreting).toBe(true);
    });

    it('resetInterpretation clears interpretation state', () => {
      usePoemStore.getState().setInterpretation('text');
      usePoemStore.getState().setInterpreting(true);
      usePoemStore.getState().resetInterpretation();
      const state = usePoemStore.getState();
      expect(state.interpretation).toBeNull();
      expect(state.isInterpreting).toBe(false);
    });

    it('setDynamicPoets updates dynamicPoets', () => {
      const poets = ['Nizar Qabbani', 'Mahmoud Darwish'];
      usePoemStore.getState().setDynamicPoets(poets);
      expect(usePoemStore.getState().dynamicPoets).toEqual(poets);
    });

    it('setPoetSearch updates poetSearch', () => {
      usePoemStore.getState().setPoetSearch('نزار');
      expect(usePoemStore.getState().poetSearch).toBe('نزار');
    });

    // ── Carousel actions ──

    it('setCarouselPoems sets carousel poems array', () => {
      const poems = [{ id: 10 }, { id: 11 }];
      usePoemStore.getState().setCarouselPoems(poems);
      expect(usePoemStore.getState().carouselPoems).toEqual(poems);
    });

    it('addCarouselPoem appends to carousel poems', () => {
      usePoemStore.getState().setCarouselPoems([{ id: 10 }]);
      usePoemStore.getState().addCarouselPoem({ id: 11 });
      expect(usePoemStore.getState().carouselPoems).toHaveLength(2);
      expect(usePoemStore.getState().carouselPoems[1].id).toBe(11);
    });

    it('updateCarouselPoem patches a specific carousel poem', () => {
      usePoemStore.getState().setCarouselPoems([
        { id: 10, english: '' },
        { id: 11, english: '' },
      ]);
      usePoemStore.getState().updateCarouselPoem(1, { english: 'translated' });
      expect(usePoemStore.getState().carouselPoems[1].english).toBe('translated');
      expect(usePoemStore.getState().carouselPoems[0].english).toBe('');
    });

    it('clearCarouselPoems resets carousel to empty', () => {
      usePoemStore.getState().setCarouselPoems([{ id: 10 }, { id: 11 }]);
      usePoemStore.getState().clearCarouselPoems();
      expect(usePoemStore.getState().carouselPoems).toEqual([]);
    });

    it('setCarouselIndex updates carousel index', () => {
      usePoemStore.getState().setCarouselIndex(3);
      expect(usePoemStore.getState().carouselIndex).toBe(3);
    });

    it('setPoetsFetched updates poetsFetched', () => {
      usePoemStore.getState().setPoetsFetched(true);
      expect(usePoemStore.getState().poetsFetched).toBe(true);
    });

    it('setUseDatabase updates useDatabase', () => {
      usePoemStore.getState().setUseDatabase(false);
      expect(usePoemStore.getState().useDatabase).toBe(false);
    });

    it('setPoems replaces the poems array', () => {
      const poems = [{ id: 1 }, { id: 2 }];
      usePoemStore.getState().setPoems(poems);
      expect(usePoemStore.getState().poems).toBe(poems);
    });

    it('setPoems accepts a functional updater', () => {
      usePoemStore.getState().setPoems([{ id: 1 }]);
      usePoemStore.getState().setPoems((prev) => [...prev, { id: 2 }]);
      expect(usePoemStore.getState().poems).toHaveLength(2);
      expect(usePoemStore.getState().poems[1].id).toBe(2);
    });

    it('reset restores all defaults', () => {
      usePoemStore.getState().addPoem({ id: 1 });
      usePoemStore.getState().setCategory('Ghazal');
      usePoemStore.getState().setFetching(true);
      usePoemStore.getState().setInterpretation('x');
      usePoemStore.getState().reset();
      const state = usePoemStore.getState();
      expect(state.poems).toHaveLength(1); // Re-initialized from seeds
      expect(state.currentIndex).toBe(0);
      expect(state.selectedCategory).toBe('All');
      expect(state.isFetching).toBe(false);
      expect(state.interpretation).toBeNull();
    });
  });

  describe('computed selectors', () => {
    it('filteredPoems returns all poems when category is All', () => {
      const poems = [
        { id: 1, tags: ['Ghazal'] },
        { id: 2, tags: ['Qasida'] },
      ];
      usePoemStore.getState().setPoems(poems);
      expect(usePoemStore.getState().filteredPoems()).toEqual(poems);
    });

    it('filteredPoems filters by poet category', () => {
      const poems = [
        { id: 1, poetArabic: 'نزار قباني', tags: [] },
        { id: 2, poetArabic: 'محمود درويش', tags: [] },
      ];
      usePoemStore.getState().setPoems(poems);
      usePoemStore.getState().setCategory('نزار قباني');
      const filtered = usePoemStore.getState().filteredPoems();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(1);
    });

    it('currentPoem returns poem at currentIndex', () => {
      const poems = [{ id: 1 }, { id: 2 }];
      usePoemStore.getState().setPoems(poems);
      usePoemStore.getState().setCurrentIndex(1);
      expect(usePoemStore.getState().currentPoem()).toEqual({ id: 2 });
    });

    it('currentPoem falls back to first poem when index out of range', () => {
      const poems = [{ id: 1 }];
      usePoemStore.getState().setPoems(poems);
      usePoemStore.getState().setCurrentIndex(99);
      expect(usePoemStore.getState().currentPoem()).toEqual({ id: 1 });
    });

    it('currentPoem returns null when no poems', () => {
      usePoemStore.getState().setPoems([]);
      expect(usePoemStore.getState().currentPoem()).toBeNull();
    });
  });
});

// ============================================================================
// Audio Store
// ============================================================================
describe('audioStore', () => {
  beforeEach(() => {
    useAudioStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts not playing', () => {
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('starts not generating', () => {
      expect(useAudioStore.getState().isGenerating).toBe(false);
    });

    it('starts with no url', () => {
      expect(useAudioStore.getState().url).toBeNull();
    });

    it('starts with no error', () => {
      expect(useAudioStore.getState().error).toBeNull();
    });
  });

  describe('actions', () => {
    it('setPlaying updates isPlaying', () => {
      useAudioStore.getState().setPlaying(true);
      expect(useAudioStore.getState().isPlaying).toBe(true);
    });

    it('setGenerating updates isGenerating', () => {
      useAudioStore.getState().setGenerating(true);
      expect(useAudioStore.getState().isGenerating).toBe(true);
    });

    it('setUrl updates url', () => {
      useAudioStore.getState().setUrl('blob:audio');
      expect(useAudioStore.getState().url).toBe('blob:audio');
    });

    it('setError updates error', () => {
      useAudioStore.getState().setError('TTS failed');
      expect(useAudioStore.getState().error).toBe('TTS failed');
    });

    it('resetAudio clears all audio state', () => {
      useAudioStore.getState().setPlaying(true);
      useAudioStore.getState().setGenerating(true);
      useAudioStore.getState().setUrl('blob:x');
      useAudioStore.getState().setError('err');
      useAudioStore.getState().resetAudio();
      const state = useAudioStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.url).toBeNull();
      expect(state.error).toBeNull();
    });

    it('reset restores all defaults', () => {
      useAudioStore.getState().setPlaying(true);
      useAudioStore.getState().reset();
      expect(useAudioStore.getState().isPlaying).toBe(false);
    });

    it('carousel slide change clears url, isGenerating, and error', () => {
      // Simulate audio state after playing a poem in the carousel
      useAudioStore.getState().setPlaying(true);
      useAudioStore.getState().setUrl('blob:http://localhost/poem-audio-1');
      useAudioStore.getState().setGenerating(true);
      useAudioStore.getState().setError('TTS failed');

      // Simulate what onSlideChange does: stop playback and clear stale audio state
      // (the [current?.id] cleanup effect does NOT fire on carousel navigation because
      // currentPoem() is derived from poems[currentIndex], not carouselIndex)
      useAudioStore.getState().setPlaying(false);
      useAudioStore.getState().setUrl(null);
      useAudioStore.getState().setGenerating(false);
      useAudioStore.getState().setError(null);

      const state = useAudioStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.url).toBeNull();
      expect(state.isGenerating).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});

// ============================================================================
// UI Store
// ============================================================================
describe('uiStore', () => {
  beforeEach(() => {
    useUIStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts in dark mode', () => {
      expect(useUIStore.getState().darkMode).toBe(true);
    });

    it('starts with Amiri font', () => {
      expect(useUIStore.getState().font).toBe('Amiri');
    });

    it('starts at text size 1 (Medium)', () => {
      expect(useUIStore.getState().textSize).toBe(1);
    });

    it('starts with translation shown', () => {
      expect(useUIStore.getState().showTranslation).toBe(true);
    });

    it('starts with transliteration hidden', () => {
      expect(useUIStore.getState().showTransliteration).toBe(false);
    });

    it('starts with debug logs matching FEATURES.debug', () => {
      expect(useUIStore.getState().showDebugLogs).toBe(FEATURES.debug);
    });

    it('starts with empty logs', () => {
      expect(useUIStore.getState().logs).toEqual([]);
    });

    it('starts with headerOpacity at 0', () => {
      expect(useUIStore.getState().headerOpacity).toBe(0);
    });

    it('starts with zeroed cacheStats', () => {
      expect(useUIStore.getState().cacheStats).toEqual({
        audioHits: 0,
        audioMisses: 0,
        insightsHits: 0,
        insightsMisses: 0,
      });
    });
  });

  describe('actions', () => {
    it('setDarkMode sets dark mode to a specific value', () => {
      useUIStore.getState().setDarkMode(false);
      expect(useUIStore.getState().darkMode).toBe(false);
      useUIStore.getState().setDarkMode(true);
      expect(useUIStore.getState().darkMode).toBe(true);
    });

    it('setFont sets font to a specific value', () => {
      useUIStore.getState().setFont('Rakkas');
      expect(useUIStore.getState().font).toBe('Rakkas');
    });

    it('setTextSize sets text size to a specific value', () => {
      useUIStore.getState().setTextSize(3);
      expect(useUIStore.getState().textSize).toBe(3);
    });

    it('setShowTranslation sets to specific value', () => {
      useUIStore.getState().setShowTranslation(false);
      expect(useUIStore.getState().showTranslation).toBe(false);
    });

    it('setShowTransliteration sets to specific value', () => {
      useUIStore.getState().setShowTransliteration(true);
      expect(useUIStore.getState().showTransliteration).toBe(true);
    });

    it('toggleDarkMode flips dark mode', () => {
      useUIStore.getState().toggleDarkMode();
      expect(useUIStore.getState().darkMode).toBe(false);
      useUIStore.getState().toggleDarkMode();
      expect(useUIStore.getState().darkMode).toBe(true);
    });

    it('cycleFont cycles through fonts', () => {
      useUIStore.getState().cycleFont();
      expect(useUIStore.getState().font).toBe(FONTS[1].id); // Alexandria
      useUIStore.getState().cycleFont();
      expect(useUIStore.getState().font).toBe(FONTS[2].id); // El Messiri
    });

    it('cycleFont wraps around', () => {
      for (let i = 0; i < FONTS.length; i++) {
        useUIStore.getState().cycleFont();
      }
      expect(useUIStore.getState().font).toBe(FONTS[0].id); // Back to Amiri
    });

    it('cycleTextSize cycles 0-3 and wraps', () => {
      useUIStore.getState().cycleTextSize(); // 1 -> 2
      expect(useUIStore.getState().textSize).toBe(2);
      useUIStore.getState().cycleTextSize(); // 2 -> 3
      expect(useUIStore.getState().textSize).toBe(3);
      useUIStore.getState().cycleTextSize(); // 3 -> 0
      expect(useUIStore.getState().textSize).toBe(0);
      useUIStore.getState().cycleTextSize(); // 0 -> 1
      expect(useUIStore.getState().textSize).toBe(1);
    });

    it('toggleTranslation flips flag', () => {
      useUIStore.getState().toggleTranslation();
      expect(useUIStore.getState().showTranslation).toBe(false);
    });

    it('toggleTransliteration flips flag', () => {
      useUIStore.getState().toggleTransliteration();
      expect(useUIStore.getState().showTransliteration).toBe(true);
    });

    it('addLog appends a log entry with rich format', () => {
      useUIStore.getState().addLog('Test', 'message', 'info');
      const logs = useUIStore.getState().logs;
      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({ label: 'Test', msg: 'message', type: 'info' });
      expect(logs[0].ts).toBeDefined();
      expect(logs[0].time).toBeDefined();
      expect(logs[0].rel).toBeDefined();
    });

    it('addLog caps at 200 entries', () => {
      for (let i = 0; i < 210; i++) {
        useUIStore.getState().addLog('T', `msg${i}`, 'info');
      }
      expect(useUIStore.getState().logs).toHaveLength(200);
    });

    it('loadSettings applies darkMode and font', () => {
      useUIStore.getState().loadSettings({ darkMode: false, font: 'Rakkas' });
      const state = useUIStore.getState();
      expect(state.darkMode).toBe(false);
      expect(state.font).toBe('Rakkas');
    });

    it('theme derived value returns correct theme object', () => {
      expect(useUIStore.getState().theme()).toBe(THEME.dark);
      useUIStore.getState().toggleDarkMode();
      expect(useUIStore.getState().theme()).toBe(THEME.light);
    });

    it('fontClass derived value returns correct class', () => {
      expect(useUIStore.getState().fontClass()).toBe('font-amiri');
      useUIStore.getState().cycleFont();
      expect(useUIStore.getState().fontClass()).toBe('font-alexandria');
    });

    it('setHeaderOpacity updates headerOpacity', () => {
      useUIStore.getState().setHeaderOpacity(0.75);
      expect(useUIStore.getState().headerOpacity).toBe(0.75);
    });

    it('incrementCacheStat increments a specific cache stat', () => {
      useUIStore.getState().incrementCacheStat('audioHits');
      useUIStore.getState().incrementCacheStat('audioHits');
      useUIStore.getState().incrementCacheStat('insightsMisses');
      const stats = useUIStore.getState().cacheStats;
      expect(stats.audioHits).toBe(2);
      expect(stats.insightsMisses).toBe(1);
      expect(stats.audioMisses).toBe(0);
    });

    it('clearLogs empties the logs array', () => {
      useUIStore.getState().addLog('Test', 'msg', 'info');
      useUIStore.getState().clearLogs();
      expect(useUIStore.getState().logs).toEqual([]);
    });
  });
});

// ============================================================================
// Modal Store
// ============================================================================
describe('modalStore', () => {
  beforeEach(() => {
    useModalStore.getState().reset();
  });

  describe('initial state', () => {
    it('starts with all modals closed', () => {
      const state = useModalStore.getState();
      expect(state.authModal).toBe(false);
      expect(state.authMessage).toBe('');
      expect(state.savedPoems).toBe(false);
      expect(state.splash).toBe(true); // splash always starts open
      expect(state.insightsDrawer).toBe(false);
      expect(state.shortcutHelp).toBe(false);
      expect(state.poetPicker).toBe(false);
      expect(state.poetPickerClosing).toBe(false);
      expect(state.shareCard).toBe(false);
    });

    it('starts with all toasts hidden', () => {
      const state = useModalStore.getState();
      expect(state.copyToast).toBe(false);
      expect(state.shareToast).toBe(false);
      expect(state.insightToast).toBe(false);
    });

    it('starts with onboarding computed from FEATURES + localStorage', () => {
      // Default: FEATURES.onboarding=true + no localStorage => true
      expect(typeof useModalStore.getState().onboarding).toBe('boolean');
    });
  });

  describe('actions', () => {
    it('openAuth opens modal with optional message', () => {
      useModalStore.getState().openAuth('Please sign in');
      const state = useModalStore.getState();
      expect(state.authModal).toBe(true);
      expect(state.authMessage).toBe('Please sign in');
    });

    it('openAuth defaults to empty message', () => {
      useModalStore.getState().openAuth();
      expect(useModalStore.getState().authMessage).toBe('');
    });

    it('closeAuth closes modal and clears message', () => {
      useModalStore.getState().openAuth('msg');
      useModalStore.getState().closeAuth();
      const state = useModalStore.getState();
      expect(state.authModal).toBe(false);
      expect(state.authMessage).toBe('');
    });

    it('openSavedPoems / closeSavedPoems toggle', () => {
      useModalStore.getState().openSavedPoems();
      expect(useModalStore.getState().savedPoems).toBe(true);
      useModalStore.getState().closeSavedPoems();
      expect(useModalStore.getState().savedPoems).toBe(false);
    });

    it('dismissSplash sets splash to false', () => {
      useModalStore.getState().dismissSplash();
      expect(useModalStore.getState().splash).toBe(false);
    });

    it('toggleInsightsDrawer flips state', () => {
      useModalStore.getState().toggleInsightsDrawer();
      expect(useModalStore.getState().insightsDrawer).toBe(true);
      useModalStore.getState().toggleInsightsDrawer();
      expect(useModalStore.getState().insightsDrawer).toBe(false);
    });

    it('setInsightsDrawer sets to specific value', () => {
      useModalStore.getState().setInsightsDrawer(true);
      expect(useModalStore.getState().insightsDrawer).toBe(true);
      useModalStore.getState().setInsightsDrawer(false);
      expect(useModalStore.getState().insightsDrawer).toBe(false);
    });

    it('toggleShortcutHelp flips state', () => {
      useModalStore.getState().toggleShortcutHelp();
      expect(useModalStore.getState().shortcutHelp).toBe(true);
    });

    it('openPoetPicker / closePoetPicker toggle', () => {
      useModalStore.getState().openPoetPicker();
      expect(useModalStore.getState().poetPicker).toBe(true);
      useModalStore.getState().closePoetPicker();
      expect(useModalStore.getState().poetPicker).toBe(false);
    });

    it('setPoetPickerClosing sets closing flag', () => {
      useModalStore.getState().setPoetPickerClosing(true);
      expect(useModalStore.getState().poetPickerClosing).toBe(true);
      useModalStore.getState().setPoetPickerClosing(false);
      expect(useModalStore.getState().poetPickerClosing).toBe(false);
    });

    it('showToast sets toast flag', () => {
      useModalStore.getState().showToast('copy');
      expect(useModalStore.getState().copyToast).toBe(true);
    });

    it('hideToast clears toast flag', () => {
      useModalStore.getState().showToast('share');
      useModalStore.getState().hideToast('share');
      expect(useModalStore.getState().shareToast).toBe(false);
    });

    it('showToastTimed shows then auto-hides after delay', async () => {
      vi.useFakeTimers();
      useModalStore.getState().showToastTimed('copy', 500);
      expect(useModalStore.getState().copyToast).toBe(true);
      vi.advanceTimersByTime(500);
      expect(useModalStore.getState().copyToast).toBe(false);
      vi.useRealTimers();
    });

    it('setPoetPicker opens/closes via boolean', () => {
      useModalStore.getState().setPoetPicker(true);
      expect(useModalStore.getState().poetPicker).toBe(true);
      useModalStore.getState().setPoetPicker(false);
      expect(useModalStore.getState().poetPicker).toBe(false);
    });

    it('setAuthModal opens/closes via boolean and clears message on close', () => {
      useModalStore.getState().setAuthModal(true, 'Sign in please');
      expect(useModalStore.getState().authModal).toBe(true);
      expect(useModalStore.getState().authMessage).toBe('Sign in please');
      useModalStore.getState().setAuthModal(false);
      expect(useModalStore.getState().authModal).toBe(false);
      expect(useModalStore.getState().authMessage).toBe('');
    });

    it('setSavedPoemsOpen sets saved poems modal state', () => {
      useModalStore.getState().setSavedPoemsOpen(true);
      expect(useModalStore.getState().savedPoems).toBe(true);
      useModalStore.getState().setSavedPoemsOpen(false);
      expect(useModalStore.getState().savedPoems).toBe(false);
    });

    it('closeAll closes everything except splash', () => {
      useModalStore.getState().openAuth();
      useModalStore.getState().openSavedPoems();
      useModalStore.getState().setInsightsDrawer(true);
      useModalStore.getState().toggleShortcutHelp();
      useModalStore.getState().openPoetPicker();
      useModalStore.getState().openShareCard();
      useModalStore.getState().closeAll();
      const state = useModalStore.getState();
      expect(state.authModal).toBe(false);
      expect(state.savedPoems).toBe(false);
      expect(state.insightsDrawer).toBe(false);
      expect(state.shortcutHelp).toBe(false);
      expect(state.poetPicker).toBe(false);
      expect(state.shareCard).toBe(false);
      // splash is NOT touched by closeAll
      expect(state.splash).toBe(true);
    });

    it('openShareCard / closeShareCard toggle', () => {
      useModalStore.getState().openShareCard();
      expect(useModalStore.getState().shareCard).toBe(true);
      useModalStore.getState().closeShareCard();
      expect(useModalStore.getState().shareCard).toBe(false);
    });
  });
});
