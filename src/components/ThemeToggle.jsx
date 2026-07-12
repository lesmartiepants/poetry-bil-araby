import { Sun, Moon } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';

const ThemeToggle = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  // Light-mode control pattern: the pale gold (var(--gold)) fails AA on the cream
  // background, so use a dark ink for the icon in light mode. Dark mode stays gold.
  const gold = darkMode ? theme.gold : '#1a1200';

  return (
    <button
      onClick={() => useUIStore.getState().toggleDarkMode()}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 backdrop-blur-xl border ${theme.border} ${
        darkMode ? 'bg-black/70' : 'bg-white/80'
      } ${theme.goldHoverBg15}`}
    >
      {darkMode ? (
        <Sun style={{ color: gold }} size={18} />
      ) : (
        <Moon style={{ color: gold }} size={18} />
      )}
    </button>
  );
};

export default ThemeToggle;
