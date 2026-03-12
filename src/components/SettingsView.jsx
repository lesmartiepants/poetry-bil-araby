import { X, Moon, Sun } from 'lucide-react';
import { DESIGN } from '../constants/design';
import { THEME, GOLD } from '../constants/theme';
import { FONTS } from '../constants/fonts';

const SettingsView = ({
  isOpen,
  onClose,
  darkMode,
  onToggleDarkMode,
  currentFont,
  onSelectFont,
  user,
  theme,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        className={`relative w-full max-w-lg max-h-[85vh] flex flex-col ${theme.glass} ${theme.border} border ${DESIGN.radius} shadow-2xl`}
      >
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-500/10 flex-shrink-0">
          <div>
            <h2 className={`font-amiri text-2xl ${theme.titleColor}`}>الإعدادات</h2>
            <p className={`font-brand-en text-xs ${theme.text} opacity-50 mt-1`}>Preferences</p>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X size={20} className={theme.text} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-8">
          {/* Theme Section */}
          <div>
            <div className="mb-3">
              <h3 className={`font-amiri text-lg ${theme.titleColor}`}>المظهر</h3>
              <p
                className={`font-brand-en text-[10px] uppercase tracking-[0.12em] ${theme.text} opacity-40`}
              >
                Appearance
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  if (!darkMode) onToggleDarkMode();
                }}
                className={`p-4 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  darkMode
                    ? `${THEME.dark.goldBorder} ${THEME.dark.goldBg10}`
                    : `${theme.border} bg-transparent ${GOLD.goldHoverBorderSubtle}`
                }`}
              >
                <Moon size={24} className={darkMode ? GOLD.goldText : `${theme.text} opacity-50`} />
                <div className="text-center">
                  <p className={`font-amiri text-sm ${darkMode ? GOLD.goldText : theme.text}`}>
                    ليلي
                  </p>
                  <p
                    className={`font-brand-en text-[9px] uppercase tracking-[0.1em] ${theme.text} opacity-40`}
                  >
                    Dark
                  </p>
                </div>
              </button>
              <button
                onClick={() => {
                  if (darkMode) onToggleDarkMode();
                }}
                className={`p-4 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-2 cursor-pointer ${
                  !darkMode
                    ? `${THEME.dark.goldBorder} ${THEME.dark.goldBg10}`
                    : `${theme.border} bg-transparent ${GOLD.goldHoverBorderSubtle}`
                }`}
              >
                <Sun size={24} className={!darkMode ? GOLD.goldText : `${theme.text} opacity-50`} />
                <div className="text-center">
                  <p className={`font-amiri text-sm ${!darkMode ? GOLD.goldText : theme.text}`}>
                    نهاري
                  </p>
                  <p
                    className={`font-brand-en text-[9px] uppercase tracking-[0.1em] ${theme.text} opacity-40`}
                  >
                    Light
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Font Section */}
          <div>
            <div className="mb-3">
              <h3 className={`font-amiri text-lg ${theme.titleColor}`}>الخط</h3>
              <p
                className={`font-brand-en text-[10px] uppercase tracking-[0.12em] ${theme.text} opacity-40`}
              >
                Typography
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => onSelectFont(font.id)}
                  className={`p-3 ${DESIGN.radius} border-2 transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                    currentFont === font.id
                      ? `${THEME.dark.goldBorder} ${THEME.dark.goldBg10}`
                      : `${theme.border} bg-transparent ${GOLD.goldHoverBorderSubtle}`
                  }`}
                >
                  <p
                    className={`${font.family} text-lg ${currentFont === font.id ? GOLD.goldText : theme.text}`}
                    dir="rtl"
                  >
                    بسم الله
                  </p>
                  <div className="text-center">
                    <p className={`font-amiri text-xs ${theme.text} opacity-60`}>{font.labelAr}</p>
                    <p
                      className={`font-brand-en text-[8px] uppercase tracking-[0.1em] ${theme.text} opacity-30`}
                    >
                      {font.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className={`pt-4 border-t border-stone-500/10`}>
              <p className={`font-brand-en text-xs ${theme.text} opacity-30 text-center`}>
                Signed in as {user.email || user.user_metadata?.full_name || 'User'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { SettingsView };
