import { useState, useEffect, useRef } from 'react';
import { Sun, Moon } from 'lucide-react';
import { GOLD } from '../constants/theme';

const ThemeDropdown = ({ darkMode, onToggleDarkMode, currentFont, onCycleFont, fonts }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  const handleCycleFont = () => {
    onCycleFont();
    setIsOpen(false);
  };

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setIsOpen(false);
  };

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label="Theme options"
      >
        {darkMode ? (
          <Sun size={21} className={GOLD.goldText} />
        ) : (
          <Moon size={21} className={GOLD.goldText} />
        )}
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        Theme
      </span>

      {isOpen && (
        <div
          className={`absolute bottom-full right-[-20px] mb-3 min-w-[200px] ${darkMode ? 'bg-[rgba(20,18,16,0.98)] border-[rgba(197,160,89,0.15)] shadow-[0_-10px_40px_rgba(0,0,0,0.7)]' : 'bg-white/95 border-stone-200 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]'} backdrop-blur-[48px] border rounded-3xl p-3 z-50`}
        >
          <button
            onClick={handleCycleFont}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div
              className={`font-amiri text-[clamp(1rem,1.8vw,1.125rem)] ${GOLD.goldText} mb-[3px] font-medium`}
            >
              تبديل الخط
            </div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">
              Cycle Font: {currentFont}
            </div>
          </button>
          <button
            onClick={handleToggleDarkMode}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex flex-col items-center hover:bg-[rgba(197,160,89,0.08)]"
          >
            <div
              className={`font-amiri text-[clamp(1rem,1.8vw,1.125rem)] ${GOLD.goldText} mb-[3px] font-medium`}
            >
              {darkMode ? 'الوضع النهاري' : 'الوضع الليلي'}
            </div>
            <div className="font-brand-en text-[clamp(8px,1vw,9px)] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export { ThemeDropdown };
