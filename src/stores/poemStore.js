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

  setPoems: (poems) => set({ poems }),
  setCurrentIndex: (currentIndex) => set({ currentIndex }),
  setCategory: (selectedCategory) => set({ selectedCategory }),
  setFetching: (isFetching) => set({ isFetching }),
  setAutoExplain: (autoExplainPending) => set({ autoExplainPending }),
  setInterpretation: (interpretation) => set({ interpretation }),
  setInterpreting: (isInterpreting) => set({ isInterpreting }),

  resetInterpretation: () => set({ interpretation: null, isInterpreting: false }),

  reset: () => set(initialState),
}));
