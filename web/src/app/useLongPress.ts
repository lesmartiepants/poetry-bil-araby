import { useEffect, useRef } from 'react';

/** Long press (default 600 ms) without breaking ordinary taps. */
export function useLongPress(onLong: () => void, ms = 600) {
  const t = useRef<number>();
  const fired = useRef(false);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const start = (event: React.PointerEvent) => {
    if (!event.isPrimary || event.button !== 0) return;
    window.clearTimeout(t.current);
    fired.current = false;
    t.current = window.setTimeout(() => {
      fired.current = true;
      onLong();
    }, ms);
  };
  const cancel = () => window.clearTimeout(t.current);
  return {
    onPointerDown: start,
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onClickCapture: (e: React.MouseEvent) => {
      if (fired.current && e.detail !== 0) {
        e.preventDefault();
        e.stopPropagation();
        fired.current = false;
      }
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
