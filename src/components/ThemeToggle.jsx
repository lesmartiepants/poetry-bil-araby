import { Sun, Moon } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';

const ThemeToggle = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const gold = theme.gold;

  return (
    <button
      onClick={() => useUIStore.getState().toggleDarkMode()}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-xl border ${theme.border} ${
        darkMode ? 'bg-black/70' : 'bg-white/80'
      } ${theme.goldHoverBg15}`}
    >
      {darkMode ? (
        <Sun style={{ color: gold }} size={20} />
      ) : (
        <Moon style={{ color: gold }} size={20} />
      )}
    </button>
  );
};

export default ThemeToggle;
