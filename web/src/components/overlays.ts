// Cross-feature overlays (Keep, Share, Sign in) opened from anywhere and
// rendered by the app shell, so features never import each other.
import { create } from 'zustand';

export type Overlay =
  | { type: 'keep'; poemId: string }
  | { type: 'keep-lists'; poemId: string }
  | { type: 'share'; poemId: string }
  | { type: 'signin'; then?: Overlay }
  | null;

interface S { overlay: Overlay; toast: { text: string; action?: string; onAction?: () => void; alert?: boolean } | null;
  open: (o: Overlay) => void; close: () => void; showToast: (t: S['toast'], ms?: number) => void }

let timer: number | undefined;
export const useOverlay = create<S>((set) => ({
  overlay: null,
  toast: null,
  open: (overlay) => set({ overlay }),
  close: () => set({ overlay: null }),
  showToast: (toast, ms = 4000) => {
    window.clearTimeout(timer);
    set({ toast });
    if (toast) timer = window.setTimeout(() => set({ toast: null }), ms);
  },
}));
