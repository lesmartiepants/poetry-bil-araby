import { Sun, Moon } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';

const GOLD = 'var(--gold)';
const GOLD_RGB = '197,160,89';

const DayNightToggle = () => {
  const darkMode = useUIStore((s) => s.darkMode);
  const toggleDarkMode = useUIStore((s) => s.toggleDarkMode);

  const glassBg = darkMode ? 'rgba(12,12,14,0.88)' : 'rgba(253,252,248,0.94)';

  return (
    <button
      onClick={toggleDarkMode}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        position: 'fixed',
        top: '0.75rem',
        right: '0.75rem',
        zIndex: 50,
        width: 42,
        height: 42,
        borderRadius: '12px',
        background: glassBg,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1.5px solid rgba(${GOLD_RGB},0.22)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'border-color 0.2s, background 0.2s, box-shadow 0.2s',
        boxShadow: `0 2px 12px rgba(0,0,0,${darkMode ? 0.3 : 0.07})`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `rgba(${GOLD_RGB},0.45)`;
        e.currentTarget.style.boxShadow = `0 4px 20px rgba(${GOLD_RGB},0.15)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `rgba(${GOLD_RGB},0.22)`;
        e.currentTarget.style.boxShadow = `0 2px 12px rgba(0,0,0,${darkMode ? 0.3 : 0.07})`;
      }}
    >
      {darkMode ? (
        <Sun size={17} color={GOLD} strokeWidth={1.6} />
      ) : (
        <Moon size={17} color={GOLD} strokeWidth={1.6} />
      )}
    </button>
  );
};

export default DayNightToggle;
