import { X } from 'lucide-react';
import { DESIGN } from '../constants/design.js';
import { THEME } from '../constants/theme.js';

const SHORTCUTS = [
  { keys: ['Space'], desc: 'Play / Pause audio' },
  { keys: ['→'], desc: 'Discover new poem' },
  { keys: ['E'], desc: 'Explain poem' },
  { keys: ['T'], desc: 'Toggle English translation' },
  { keys: ['R'], desc: 'Toggle transliteration' },
  { keys: ['Esc'], desc: 'Close modal / panel' },
  { keys: ['?'], desc: 'Show this help' },
];

const ShortcutHelp = ({ isOpen, onClose, theme }) => {
  if (!isOpen) return null;

  const isDark = theme === THEME.dark;

  return (
    <div
      className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-label="Keyboard shortcuts"
    >
      <div
        className={`relative w-full max-w-sm ${theme.glass} ${theme.border} border ${DESIGN.radius} p-8 shadow-2xl`}
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
      </div>
    </div>
  );
};

export default ShortcutHelp;
