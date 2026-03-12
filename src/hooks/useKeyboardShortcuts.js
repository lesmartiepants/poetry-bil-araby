import { useEffect } from 'react';

/**
 * useKeyboardShortcuts
 *
 * Registers keyboard shortcut handlers for the application.
 * Only fires when focus is not on input elements (INPUT, TEXTAREA, SELECT).
 *
 * @param {Object} handlers - Callback functions for each shortcut
 * @param {Function} handlers.onSpace - Handler for Space key (play/pause audio)
 * @param {Function} handlers.onArrowRight - Handler for → key (discover new poem)
 * @param {Function} handlers.onExplain - Handler for E key (explain poem)
 * @param {Function} handlers.onToggleTranslation - Handler for T key (toggle translation)
 * @param {Function} handlers.onToggleTransliteration - Handler for R key (toggle transliteration)
 * @param {Function} handlers.onEscape - Handler for Esc key (close modal/panel)
 * @param {Function} handlers.onHelp - Handler for ? key (show help)
 * @param {Array} deps - Dependencies array for useEffect
 */
export function useKeyboardShortcuts(handlers, deps = []) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlers.onSpace?.();
          break;
        case 'ArrowRight':
          handlers.onArrowRight?.();
          break;
        case 'e':
        case 'E':
          handlers.onExplain?.();
          break;
        case 't':
        case 'T':
          handlers.onToggleTranslation?.();
          break;
        case 'r':
        case 'R':
          handlers.onToggleTransliteration?.();
          break;
        case 'Escape':
          handlers.onEscape?.();
          break;
        case '?':
          handlers.onHelp?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, deps);
}
