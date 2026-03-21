import { create } from 'zustand';
import { FEATURES } from '../constants/features';

const initialState = {
  poems: [],
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
};

export const usePoemStore = create((set) => ({
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
  setInterpretation: (interpretation) => set({ interpretation }),
  setInterpreting: (isInterpreting) => set({ isInterpreting }),

  resetInterpretation: () => set({ interpretation: null, isInterpreting: false }),

  reset: () => set(initialState),
}));
