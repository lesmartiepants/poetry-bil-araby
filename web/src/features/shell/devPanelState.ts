import { create } from 'zustand';
import { readJSON, writeJSON } from '@core/storage';

/** Developer panel: shown only in dev and preview builds; the edge tab can be hidden by long-press. */
export const DEV_PANEL_ENABLED = import.meta.env.DEV || import.meta.env.VITE_DEV_PANEL === '1';

interface S { tabVisible: boolean; open: 'none' | 'events' | 'report'; toggleTab: () => void; setOpen: (o: S['open']) => void }
export const useDevPanel = create<S>((set, get) => ({
  tabVisible: readJSON('dev.tabVisible', true),
  open: 'none',
  toggleTab: () => {
    const v = !get().tabVisible;
    writeJSON('dev.tabVisible', v);
    set({ tabVisible: v });
  },
  setOpen: (open) => set({ open }),
}));
