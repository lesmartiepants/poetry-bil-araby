// Cross-feature overlays (Keep, Share, Sign in) opened from anywhere and
// rendered by the app shell, so features never import each other.
import type { ReactNode } from 'react';
import { create } from 'zustand';

export type Overlay =
  | { type: 'keep'; poemId: string }
  | { type: 'keep-lists'; poemId: string }
  | { type: 'share'; poemId: string }
  | { type: 'signin'; then?: Overlay }
  | null;

export interface ToastSpec {
  text: ReactNode;
  action?: string;
  onAction?: () => void;
  /** A quieter first action, such as UNDO beside CHANGE. */
  undo?: () => void;
  alert?: boolean;
  /** The brand mark at the start, for confirmations of keeping. */
  mark?: boolean;
}

interface S { overlay: Overlay; toast: ToastSpec | null;
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
