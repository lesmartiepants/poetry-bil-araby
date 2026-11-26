import { create } from 'zustand';
import { readJSON, writeJSON } from '@core/storage';

import { setDevLogOpen } from '@components/devlog';
import { useOverlay } from '@components/overlays';

interface S {
  tabVisible: boolean;
  open: 'none' | 'events' | 'report';
  toggleTab: () => void;
  setOpen: (o: S['open']) => void;
}
export const useDevPanel = create<S>((set, get) => ({
  tabVisible: true,
  open: 'none',
  toggleTab: () => {
    const v = !get().tabVisible;
    writeJSON('dev.tabVisible', v);
    set({ tabVisible: v });
    useOverlay
      .getState()
      .showToast({
        text: v
          ? 'Developer tab shown · hold again to hide'
          : 'Developer tab hidden · hold again to show',
      });
  },
  setOpen: (open) => {
    setDevLogOpen(open !== 'none');
    set({ open });
  },
}));

export function restoreDevTab() {
  useDevPanel.setState({ tabVisible: readJSON('dev.tabVisible', true) });
}
