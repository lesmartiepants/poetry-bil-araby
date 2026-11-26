import { useState } from 'react';
import { useLongPress } from '../../app/useLongPress';
import { DEV_PANEL_ENABLED } from '@components/devlog';
import { useDevPanel } from './devPanelState';

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
  });
  const handlers = {
    ...press,
    onPointerDown: (event: React.PointerEvent) => {
      if (!DEV_PANEL_ENABLED) return;
      setHolding(true);
      press.onPointerDown(event);
    },
    onPointerUp: () => { setHolding(false); press.onPointerUp(); },
    onPointerLeave: () => { setHolding(false); press.onPointerLeave(); },
    onPointerCancel: () => { setHolding(false); press.onPointerCancel(); },
  };
  return DEV_PANEL_ENABLED ? { handlers, holding } : { handlers: {}, holding: false };
}
