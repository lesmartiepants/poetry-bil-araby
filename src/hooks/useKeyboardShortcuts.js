import { useEffect } from 'react';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

/**
 * Registers global keyboard shortcuts for the app.
 *
 * @param {object} params
 * @param {Function} params.togglePlay       - Toggle audio playback (Space)
 * @param {Function} params.handleFetch      - Fetch next poem (ArrowRight)
 * @param {Function} params.handleAnalyze    - Trigger insight analysis (E)
 * @param {boolean}  params.isInterpreting   - Whether analysis is in progress
 * @param {string|null} params.interpretation - Current interpretation text
 * @param {Function} params.setShowAuthModal  - Close auth modal on Escape
 * @param {Function} params.setShowSavedPoems - Close saved poems on Escape
 */
export function useKeyboardShortcuts({
  togglePlay,
  handleFetch,
  handleAnalyze,
  isInterpreting,
  interpretation,
  setShowAuthModal,
  setShowSavedPoems,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowRight':
          handleFetch();
          break;
        case 'e':
        case 'E':
          if (!isInterpreting && !interpretation) handleAnalyze();
          break;
        case 't':
        case 'T':
          useUIStore.getState().toggleTranslation();
          break;
        case 'r':
        case 'R':
          useUIStore.getState().toggleTransliteration();
          break;
        case 'Escape':
          setShowAuthModal(false);
          setShowSavedPoems(false);
          useModalStore.getState().closeShortcutHelp();
          break;
        case '?':
          useModalStore.getState().toggleShortcutHelp();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInterpreting, interpretation]);
}
