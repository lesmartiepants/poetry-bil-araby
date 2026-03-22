import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { DESIGN } from '../constants/design.js';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

const SHORTCUTS = [
  { keys: ['Space'], desc: 'Play / Pause audio' },
  { keys: ['→'], desc: 'Discover new poem' },
  { keys: ['E'], desc: 'Explain poem' },
  { keys: ['T'], desc: 'Toggle English translation' },
  { keys: ['R'], desc: 'Toggle transliteration' },
  { keys: ['Esc'], desc: 'Close modal / panel' },
  { keys: ['?'], desc: 'Show this help' },
];

const ShortcutHelp = () => {
  const isOpen = useModalStore((s) => s.shortcutHelp);
  const onClose = () => useModalStore.getState().closeShortcutHelp();
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  if (!isOpen) return null;

  const isDark = theme === THEME.dark;

  return (
    <motion.div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <motion.div
        className={`relative w-full max-w-sm ${theme.glass} ${theme.border} border ${DESIGN.radius} p-8 shadow-2xl`}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X size={20} className={theme.text} />
        </button>

        <h2 className={`font-brand-en text-lg font-bold mb-6 ${theme.text}`}>Keyboard Shortcuts</h2>

        <div className="space-y-3">
          {SHORTCUTS.map(({ keys, desc }) => (
            <div key={desc} className="flex items-center justify-between gap-4">
              <span className={`font-brand-en text-sm ${theme.text} opacity-70`}>{desc}</span>
              <div className="flex gap-1">
                {keys.map((k) => (
                  <kbd
                    key={k}
                    className={`px-2 py-1 rounded-md text-xs font-mono font-bold ${theme.kbd} border`}
                  >
                    {k}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ShortcutHelp;
