import { useState } from 'react';
import {
  Compass,
  Copy,
  Check,
  Share2,
  Languages,
  Settings2,
  CalendarDays,
  Sun,
  Moon,
  Feather,
  Library,
  Sparkles,
  Loader2,
  LogIn,
  LogOut,
} from 'lucide-react';
import { CATEGORIES } from '../constants/categories';

const VerticalSidebar = ({
  onExplain,
  onCopy,
  showCopySuccess,
  onShare,
  showShareSuccess,
  onSignIn,
  onSignOut,
  user,
  theme,
  isInterpreting,
  interpretation,
  showTranslation,
  onToggleTranslation,
  showTransliteration,
  onToggleTransliteration,
  textSizeLabel,
  onCycleTextSize,
  dailyPoem,
  onDailyPoem,
  isCurrentDaily,
  darkMode,
  onToggleDarkMode,
  currentFont,
  onCycleFont,
  selectedCategory,
  onSelectCategory,
  useDatabase,
  onToggleDatabase,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const gold = theme.gold;
  const btnBase =
    'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200';
  const btnHover = theme.goldHoverBg15;
  const subBtnBase =
    'w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200';
  const subBtnHover = theme.goldHoverBg15;

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateY(-50%) translateX(100%); opacity: 0; }
          to { transform: translateY(-50%) translateX(0); opacity: 1; }
        }
      `}</style>
      <div
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-[45] md:hidden rounded-l-2xl bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-xl border-l-2 ${theme.goldBorderAccent} py-3 px-1.5`}
        style={{ animation: 'slideInRight 0.4s ease-out' }}
      >
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={onExplain}
            disabled={isInterpreting || interpretation}
            title="Explain poem"
            className={`${btnBase} ${btnHover} disabled:opacity-50`}
          >
            {isInterpreting ? (
              <Loader2 className="animate-spin" style={{ color: gold }} size={18} />
            ) : (
              <Compass style={{ color: gold }} size={18} />
            )}
          </button>

          <button onClick={onCopy} title="Copy poem" className={`${btnBase} ${btnHover}`}>
            {showCopySuccess ? (
              <Check size={18} className="text-green-500" />
            ) : (
              <Copy style={{ color: gold }} size={18} />
            )}
          </button>

          <button onClick={onShare} title="Share poem" className={`${btnBase} ${btnHover}`}>
            {showShareSuccess ? (
              <Check size={18} className="text-green-500" />
            ) : (
              <Share2 style={{ color: gold }} size={18} />
            )}
          </button>

          <button
            onClick={onToggleTranslation}
            title={showTranslation ? 'Hide translation' : 'Show translation'}
            className={`${btnBase} ${btnHover} ${!showTranslation ? 'opacity-40' : ''}`}
          >
            <Languages style={{ color: gold }} size={18} />
          </button>

          <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            title="Settings"
            className={`${btnBase} ${btnHover} ${settingsOpen ? theme.goldActiveBg : ''}`}
          >
            <Settings2 style={{ color: gold }} size={18} />
          </button>

          {settingsOpen && (
            <div
              className={`flex flex-col items-center gap-0.5 pl-0.5 border-l-2 ${theme.goldBorderMuted}`}
            >
              <button
                onClick={onToggleTransliteration}
                title={showTransliteration ? 'Hide romanization' : 'Show romanization'}
                className={`${subBtnBase} ${subBtnHover} ${!showTransliteration ? 'opacity-40' : ''}`}
              >
                <span
                  className="text-[12px] font-bold leading-none"
                  style={{ color: gold, fontFamily: "'Amiri', serif" }}
                >
                  عA
                </span>
              </button>

              <button
                onClick={onCycleTextSize}
                title={`Text size: ${textSizeLabel}`}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <span className="font-brand-en text-[13px] font-bold" style={{ color: gold }}>
                  Aa
                </span>
              </button>

              {dailyPoem && (
                <button
                  onClick={onDailyPoem}
                  title="Poem of the Day"
                  className={`${subBtnBase} ${subBtnHover} ${isCurrentDaily ? theme.goldActiveBg : ''}`}
                >
                  <CalendarDays style={{ color: gold }} size={16} />
                </button>
              )}

              <button
                onClick={onToggleDarkMode}
                title={darkMode ? 'Light mode' : 'Dark mode'}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                {darkMode ? (
                  <Sun style={{ color: gold }} size={16} />
                ) : (
                  <Moon style={{ color: gold }} size={16} />
                )}
              </button>

              <button
                onClick={onCycleFont}
                title={`Font: ${currentFont}`}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <Feather style={{ color: gold }} size={16} />
              </button>

              <button
                onClick={() => {
                  const catIds = CATEGORIES.map((c) => c.id);
                  const idx = catIds.indexOf(selectedCategory);
                  onSelectCategory(catIds[(idx + 1) % catIds.length]);
                }}
                title="Poet filter"
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <Library style={{ color: gold }} size={16} />
              </button>

              <button
                onClick={onToggleDatabase}
                title={useDatabase ? 'Switch to LLM' : 'Switch to Database'}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                {useDatabase ? (
                  <Library style={{ color: gold }} size={16} />
                ) : (
                  <Sparkles style={{ color: gold }} size={16} />
                )}
              </button>
            </div>
          )}

          <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

          <button
            onClick={() => setSettingsOpen((prev) => !prev)}
            title="Settings"
            className={`${btnBase} ${btnHover} ${settingsOpen ? theme.goldActiveBg : ''}`}
          >
            <Settings2 style={{ color: gold }} size={18} />
          </button>

          {settingsOpen && (
            <div
              className={`flex flex-col items-center gap-0.5 pl-0.5 border-l-2 ${theme.goldBorderMuted}`}
            >
              <button
                onClick={onToggleTransliteration}
                title={showTransliteration ? 'Hide romanization' : 'Show romanization'}
                className={`${subBtnBase} ${subBtnHover} ${!showTransliteration ? 'opacity-40' : ''}`}
              >
                <span
                  className="text-[12px] font-bold leading-none"
                  style={{ color: gold, fontFamily: "'Amiri', serif" }}
                >
                  عA
                </span>
              </button>

              <button
                onClick={onCycleTextSize}
                title={`Text size: ${textSizeLabel}`}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <span className="font-brand-en text-[13px] font-bold" style={{ color: gold }}>
                  Aa
                </span>
              </button>

              {dailyPoem && (
                <button
                  onClick={onDailyPoem}
                  title="Poem of the Day"
                  className={`${subBtnBase} ${subBtnHover} ${isCurrentDaily ? theme.goldActiveBg : ''}`}
                >
                  <CalendarDays style={{ color: gold }} size={16} />
                </button>
              )}

              <button
                onClick={onToggleDarkMode}
                title={darkMode ? 'Light mode' : 'Dark mode'}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                {darkMode ? (
                  <Sun style={{ color: gold }} size={16} />
                ) : (
                  <Moon style={{ color: gold }} size={16} />
                )}
              </button>

              <button
                onClick={onCycleFont}
                title={`Font: ${currentFont}`}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <Feather style={{ color: gold }} size={16} />
              </button>

              <button
                onClick={() => {
                  const catIds = CATEGORIES.map((c) => c.id);
                  const idx = catIds.indexOf(selectedCategory);
                  onSelectCategory(catIds[(idx + 1) % catIds.length]);
                }}
                title="Poet filter"
                className={`${subBtnBase} ${subBtnHover}`}
              >
                <Library style={{ color: gold }} size={16} />
              </button>

              <button
                onClick={onToggleDatabase}
                title={useDatabase ? 'Switch to LLM' : 'Switch to Database'}
                className={`${subBtnBase} ${subBtnHover}`}
              >
                {useDatabase ? (
                  <Library style={{ color: gold }} size={16} />
                ) : (
                  <Sparkles style={{ color: gold }} size={16} />
                )}
              </button>
            </div>
          )}

          <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

          <button
            onClick={user ? onSignOut : onSignIn}
            title={user ? 'Sign out' : 'Sign in'}
            className={`${btnBase} ${btnHover}`}
          >
            {user ? (
              <LogOut style={{ color: gold }} size={18} />
            ) : (
              <LogIn style={{ color: gold }} size={18} />
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export { VerticalSidebar };
