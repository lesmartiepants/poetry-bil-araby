import { useState } from 'react';
import { useLongPress } from '../../app/useLongPress';
import { useOverlay } from '@components/overlays';
import { DEV_PANEL_ENABLED, useDevPanel } from './devPanelState';

/**
 * 1.6 / 1.7: hold the tab bar, or the dock or mark on a poem, to hide or show the
 * developer edge tab. A toast confirms the change; `holding` lights the pressed ring.
 * Dev and preview builds only: elsewhere the handlers do nothing.
 */
export function useDevTabHold() {
  const toggle = useDevPanel((s) => s.toggleTab);
  const [holding, setHolding] = useState(false);
  const press = useLongPress(() => {
    if (!DEV_PANEL_ENABLED) return;
    toggle();
    const shown = useDevPanel.getState().tabVisible;
    useOverlay.getState().showToast({
      text: <>Developer tab {shown ? 'shown' : 'hidden'} <span className="toast__hint">hold again to {shown ? 'hide' : 'show'}</span></>,
    }, 2600);
  });
  const handlers = {
    ...press,
    onPointerDown: () => { if (DEV_PANEL_ENABLED) setHolding(true); press.onPointerDown(); },
    onPointerUp: () => { setHolding(false); press.onPointerUp(); },
    onPointerLeave: () => { setHolding(false); press.onPointerLeave(); },
    onPointerCancel: () => { setHolding(false); press.onPointerCancel(); },
  };
  return DEV_PANEL_ENABLED ? { handlers, holding } : { handlers: {}, holding: false };
}
