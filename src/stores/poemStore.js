import { create } from 'zustand';
import { FEATURES } from '../constants/features';
import { filterPoemsByCategory } from '../utils/filterPoems.js';
import seedPoems from '../data/seed-poems.json';

const FALLBACK_POEM = {
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
};

function getInitialPoems() {
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
  // 4. Ultimate fallback
  return [FALLBACK_POEM];
}

const initialState = {
  poems: getInitialPoems(),
  currentIndex: 0,
  selectedCategory: 'All',
  isFetching: false,
  autoExplainPending: false,
  useDatabase: FEATURES.database,
  poetsFetched: false,
  dynamicPoets: [],
  poetSearch: '',
  interpretation: null,
  isInterpreting: false,
  pendingCategory: null,
};

export const usePoemStore = create((set, get) => ({
  ...initialState,

  addPoem: (poem) =>
    set((state) => ({
      poems: [...state.poems, poem],
      currentIndex: state.poems.length,
    })),

  setPoems: (poemsOrFn) =>
    set((state) => ({
      poems: typeof poemsOrFn === 'function' ? poemsOrFn(state.poems) : poemsOrFn,
    })),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setCategory: (selectedCategory) => set({ selectedCategory }),
  setFetching: (isFetching) => set({ isFetching }),
  setUseDatabase: (useDatabase) => set({ useDatabase }),
  setAutoExplain: (autoExplainPending) => set({ autoExplainPending }),
  setDynamicPoets: (dynamicPoets) => set({ dynamicPoets }),
  setPoetSearch: (poetSearch) => set({ poetSearch }),
  setPoetsFetched: (poetsFetched) => set({ poetsFetched }),
  setPendingCategory: (pendingCategory) => set({ pendingCategory }),
  setInterpretation: (interpretation) => set({ interpretation }),
  setInterpreting: (isInterpreting) => set({ isInterpreting }),

  resetInterpretation: () => set({ interpretation: null, isInterpreting: false }),

  // Computed selectors
  filteredPoems: () => {
    const { poems, selectedCategory } = get();
    return filterPoemsByCategory(poems, selectedCategory);
  },
  currentPoem: () => {
    const { poems, currentIndex, selectedCategory } = get();
    const filtered = filterPoemsByCategory(poems, selectedCategory);
    return filtered[currentIndex] || filtered[0] || poems[0] || null;
  },

  reset: () => set({ ...initialState, poems: getInitialPoems() }),
}));
