import { useEffect, useState } from 'react';
import SavedPoemsView from '../SavedPoemsView.jsx';
import SavedPoemsView_A_Majlis from './SavedPoemsView_A_Majlis.jsx';
import SavedPoemsView_B_DiwanGrid from './SavedPoemsView_B_DiwanGrid.jsx';
import SavedPoemsView_C_Khazana from './SavedPoemsView_C_Khazana.jsx';
import { DEMO_SAVED_POEMS } from './demoSavedPoems.js';

/**
 * LibraryHost — TEMPORARY tester host that picks which Saved-Poems variant to
 * render based on `?lib=` URL query param (and a localStorage fallback).
 *
 *   ?lib=0   → original (legacy SavedPoemsView)
 *   ?lib=a   → Option A · Majlis        ← user's preferred direction
 *   ?lib=b   → Option B · Diwan Grid
 *   ?lib=c   → Option C · Khazana
 *
 *   ?libDemo=1 → use the bundled demo data so the variants are testable
 *                even when the signed-in user has no real saved poems.
 *
 * Once a final direction is chosen, this whole `library-v2/` folder can be
 * removed and the chosen variant moved into `SavedPoemsView.jsx` as the new
 * default — all of the wiring lives here.
 */
const LS_KEY = 'libraryV2.variant';
const LS_DEMO = 'libraryV2.demo';

export const LIBRARY_VARIANTS = [
  { id: '0', label: 'Original', sublabel: 'الأصلي' },
  { id: 'a', label: 'A · Majlis', sublabel: 'مَجلِس' },
  { id: 'b', label: 'B · Diwan', sublabel: 'ديوان' },
  { id: 'c', label: 'C · Khazana', sublabel: 'خَزانَة' },
];

const readInitial = () => {
  if (typeof window === 'undefined') return { variant: 'a', demo: false };
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get('lib');
  const fromLs = window.localStorage?.getItem(LS_KEY);
  const variant = (fromUrl || fromLs || 'a').toLowerCase();
  const demoFromUrl = params.get('libDemo');
  const demoFromLs = window.localStorage?.getItem(LS_DEMO);
  const demo = demoFromUrl != null ? demoFromUrl === '1' : demoFromLs === '1';
  const valid = LIBRARY_VARIANTS.some((v) => v.id === variant);
  return { variant: valid ? variant : 'a', demo };
};

export const useLibraryVariant = () => {
  const [{ variant, demo }, setState] = useState(readInitial);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const sync = () => setState(readInitial());
    window.addEventListener('popstate', sync);
    window.addEventListener('libraryVariantChange', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('libraryVariantChange', sync);
    };
  }, []);

  const setVariant = (id) => {
    if (typeof window === 'undefined') return;
    window.localStorage?.setItem(LS_KEY, id);
    const url = new URL(window.location.href);
    url.searchParams.set('lib', id);
    window.history.replaceState({}, '', url);
    window.dispatchEvent(new Event('libraryVariantChange'));
  };

  const setDemo = (on) => {
    if (typeof window === 'undefined') return;
    window.localStorage?.setItem(LS_DEMO, on ? '1' : '0');
    const url = new URL(window.location.href);
    if (on) url.searchParams.set('libDemo', '1');
    else url.searchParams.delete('libDemo');
    window.history.replaceState({}, '', url);
    window.dispatchEvent(new Event('libraryVariantChange'));
  };

  return { variant, demo, setVariant, setDemo };
};

const LibraryHost = ({
  isOpen,
  onClose,
  savedPoems,
  onSelectPoem,
  onUnsavePoem,
  theme,
  currentFontClass,
  darkMode,
  currentPoem,
}) => {
  const { variant, demo } = useLibraryVariant();

  // When the demo toggle is on and the user has nothing saved, use demo data.
  // We do NOT replace real saved poems if the user has any.
  const effectivePoems =
    demo && (!savedPoems || savedPoems.length === 0) ? DEMO_SAVED_POEMS : savedPoems;

  const sharedProps = {
    isOpen,
    onClose,
    savedPoems: effectivePoems,
    onSelectPoem,
    onUnsavePoem,
    theme,
    darkMode,
  };

  if (variant === 'a') return <SavedPoemsView_A_Majlis {...sharedProps} />;
  if (variant === 'b') return <SavedPoemsView_B_DiwanGrid {...sharedProps} />;
  if (variant === 'c')
    return <SavedPoemsView_C_Khazana {...sharedProps} currentPoem={currentPoem} />;

  // Original
  return (
    <SavedPoemsView
      isOpen={isOpen}
      onClose={onClose}
      savedPoems={effectivePoems}
      onSelectPoem={onSelectPoem}
      onUnsavePoem={onUnsavePoem}
      theme={theme}
      currentFontClass={currentFontClass}
    />
  );
};

export default LibraryHost;
