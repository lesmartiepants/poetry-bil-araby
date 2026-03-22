import { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Bug,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flame,
  Languages,
  Loader2,
  LogOut,
  Moon,
  ScrollText,
  Settings2,
  Share2,
  Sun,
  UserRound,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import { THEME } from '../constants/theme.js';
import { FONTS } from '../constants/fonts.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { usePoemStore } from '../stores/poemStore';

const TEXT_SIZES = [
  { label: 'S', multiplier: 0.85 },
  { label: 'M', multiplier: 1.0 },
  { label: 'L', multiplier: 1.15 },
  { label: 'XL', multiplier: 1.3 },
];

const VerticalSidebar = ({
  onExplain,
  onCopy,
  onShare,
  onSignIn,
  onSignOut,
  onOpenSavedPoems,
  savedPoemsCount,
  user,
}) => {
  // Store reads
  const showCopySuccess = useModalStore((s) => s.copyToast);
  const showShareSuccess = useModalStore((s) => s.shareToast);
  const showInsightSuccess = useModalStore((s) => s.insightToast);
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const isInterpreting = usePoemStore((s) => s.isInterpreting);
  const interpretation = usePoemStore((s) => s.interpretation);
  const showTranslation = useUIStore((s) => s.showTranslation);
  const showTransliteration = useUIStore((s) => s.showTransliteration);
  const textSizeLevel = useUIStore((s) => s.textSize);
  const textSizeLabel = TEXT_SIZES[textSizeLevel].label;
  const currentFont = useUIStore((s) => s.font);
  const selectedCategory = usePoemStore((s) => s.selectedCategory);
  const showDebugLogs = useUIStore((s) => s.showDebugLogs);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  const [expanded, setExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [poetPickerOpen, setPoetPickerOpen] = useState(false);
  const sidebarRef = useRef(null);
  const scrollRef = useRef(null);

  // Collapse settings/account menu when tapping outside the sidebar
  useEffect(() => {
    if (!settingsOpen && !accountMenuOpen && !expanded) return;
    const handleOutsideClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        if (settingsOpen) setSettingsOpen(false);
        if (accountMenuOpen) setAccountMenuOpen(false);
        if (expanded) setExpanded(false);
      }
    };
    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [settingsOpen, accountMenuOpen, expanded]);

  const gold = theme.gold;
  const btnBase =
    'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200';
  const btnHover = theme.goldHoverBg15;
  const subBtnBase =
    'w-11 h-11 rounded-lg flex items-center justify-center transition-all duration-200';
  const subBtnHover = theme.goldHoverBg15;
  const labelCls =
    'text-[7px] leading-none -mt-0.5 font-brand-en tracking-[0.12em] uppercase opacity-60';

  const scrollSidebarToBottom = () => {
    if (scrollRef.current) {
      setTimeout(
        () =>
          scrollRef.current?.scrollTo({
            top: scrollRef.current?.scrollHeight,
            behavior: 'smooth',
          }),
        350
      );
    }
  };

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateY(-50%) translateX(100%); opacity: 0; }
          to { transform: translateY(-50%) translateX(0); opacity: 1; }
        }
        @keyframes goldCheckSparkle {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
          30% { transform: scale(1.2) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 8px rgba(197,160,89,0.8)); }
          60% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 4px rgba(197,160,89,0.5)); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 2px rgba(197,160,89,0.3)); }
        }
        .sidebar-drawer {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .sidebar-drawer.open {
          grid-template-rows: 1fr;
        }
        .sidebar-drawer-inner {
          overflow: hidden;
        }
      `}</style>
      <div
        ref={sidebarRef}
        className="fixed right-0 md:right-[24.5rem] top-1/2 -translate-y-1/2 z-[45] rounded-l-2xl md:rounded-2xl bg-gradient-to-b from-black/70 via-black/60 to-black/70 backdrop-blur-xl border-l-2 md:border-2 border-gold/40 py-2 transition-all duration-300"
        style={{
          animation: 'slideInRight 0.4s ease-out',
          maxHeight: 'calc(100dvh - 14rem)',
          width: expanded ? '3.75rem' : '2.5rem',
          paddingLeft: expanded ? '0.375rem' : '0.25rem',
          paddingRight: expanded ? '0.375rem' : '0.25rem',
        }}
      >
        {/* Toggle handle — always visible, icon hints when collapsed */}
        <button
          onClick={() => {
            if (expanded) {
              setSettingsOpen(false);
              setExpanded(false);
            } else {
              setExpanded(true);
            }
          }}
          className="flex flex-col items-center gap-1.5 py-1 px-0.5 group w-full"
          title={expanded ? 'Collapse controls' : 'Open controls'}
          aria-label={expanded ? 'Collapse sidebar controls' : 'Open sidebar controls'}
        >
          {expanded ? (
            <ChevronRight
              style={{ color: gold, opacity: 0.5 }}
              size={14}
              className="group-hover:opacity-80 transition-opacity"
            />
          ) : (
            <>
              <ChevronLeft
                style={{ color: gold, opacity: 0.5 }}
                size={14}
                className="group-hover:opacity-80 transition-opacity"
              />
              <Brain
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <Copy
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <Settings2
                style={{ color: gold, opacity: 0.6 }}
                size={16}
                className="group-hover:opacity-90 transition-opacity"
              />
              <ChevronLeft
                style={{ color: gold, opacity: 0.5 }}
                size={14}
                className="group-hover:opacity-80 transition-opacity"
              />
            </>
          )}
        </button>

        {/* Expanded controls — animated grid drawer */}
        <div className={`sidebar-drawer ${expanded ? 'open' : ''}`}>
          <div className="sidebar-drawer-inner">
            <div
              ref={scrollRef}
              className="overflow-y-auto overflow-x-hidden flex flex-col items-center gap-1"
              style={{ maxHeight: 'calc(100dvh - 16rem)' }}
            >
              <button
                onClick={onExplain}
                disabled={isInterpreting}
                title={interpretation ? 'Insight available — tap to confirm' : 'Explain poem'}
                aria-label="Explain poem meaning"
                className={`${btnBase} ${btnHover} ${isInterpreting ? 'opacity-50' : ''}`}
              >
                {isInterpreting ? (
                  <Loader2 className="animate-spin" style={{ color: gold }} size={18} />
                ) : showInsightSuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Brain style={{ color: gold }} size={18} />
                )}
              </button>
              <span
                className={labelCls}
                style={{ color: gold, opacity: interpretation ? 0.9 : 0.6 }}
              >
                Explain
              </span>

              <button
                onClick={onCopy}
                title="Copy poem"
                aria-label="Copy poem to clipboard"
                className={`${btnBase} ${btnHover}`}
              >
                {showCopySuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Copy style={{ color: gold }} size={18} />
                )}
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Copy
              </span>

              <button onClick={onShare} title="Share poem" className={`${btnBase} ${btnHover}`}>
                {showShareSuccess ? (
                  <Check
                    style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
                    size={18}
                  />
                ) : (
                  <Share2 style={{ color: gold }} size={18} />
                )}
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Share
              </span>

              <button
                onClick={() => useUIStore.getState().toggleTransliteration()}
                title={showTransliteration ? 'Hide romanization' : 'Show romanization'}
                className={`${btnBase} ${btnHover} ${showTransliteration ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
              >
                <span
                  className="text-[12px] font-bold leading-none"
                  style={{ color: gold, fontFamily: "'Amiri', serif" }}
                >
                  عA
                </span>
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Romanize
              </span>

              <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

              <button
                onClick={() => {
                  setSettingsOpen((prev) => !prev);
                  if (!settingsOpen) scrollSidebarToBottom();
                }}
                title="Settings"
                className={`${btnBase} ${btnHover} ${settingsOpen ? theme.goldActiveBg : ''}`}
              >
                <Settings2
                  style={{
                    color: gold,
                    transition: 'transform 0.3s',
                    transform: settingsOpen ? 'rotate(60deg)' : 'none',
                  }}
                  size={18}
                />
              </button>
              <span className={labelCls} style={{ color: gold }}>
                Settings
              </span>

              {/* Smooth animated settings drawer */}
              <div className={`sidebar-drawer ${settingsOpen ? 'open' : ''}`}>
                <div className="sidebar-drawer-inner">
                  <div
                    className={`flex flex-col items-center gap-1 pl-0.5 border-l-2 ${theme.goldBorderMuted}`}
                  >
                    <button
                      onClick={() => useUIStore.getState().toggleTranslation()}
                      title={showTranslation ? 'Hide translation' : 'Show translation'}
                      className={`${subBtnBase} ${subBtnHover} ${showTranslation ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
                    >
                      <Languages style={{ color: gold }} size={16} />
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Translate
                    </span>

                    <button
                      onClick={() => useUIStore.getState().cycleTextSize()}
                      title={`Text size: ${textSizeLabel}`}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      <span
                        className="text-[13px] font-bold leading-none"
                        style={{ color: gold, fontFamily: "'Forum', serif" }}
                      >
                        T±
                      </span>
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Size
                    </span>

                    <button
                      onClick={() => useUIStore.getState().toggleDarkMode()}
                      title={darkMode ? 'Light mode' : 'Dark mode'}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      {darkMode ? (
                        <Sun style={{ color: gold }} size={16} />
                      ) : (
                        <Moon style={{ color: gold }} size={16} />
                      )}
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      {darkMode ? 'Light' : 'Dark'}
                    </span>

                    <button
                      onClick={() => useUIStore.getState().cycleFont()}
                      title={`Font: ${currentFont}`}
                      className={`${subBtnBase} ${subBtnHover}`}
                    >
                      <span
                        className="text-[15px] font-bold leading-none"
                        style={{ color: gold, fontFamily: "'Amiri', serif" }}
                      >
                        ي
                      </span>
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Font
                    </span>

                    <button
                      onClick={() => useUIStore.getState().toggleDebugLogs()}
                      title={showDebugLogs ? 'Hide dev logs' : 'Show dev logs'}
                      className={`${subBtnBase} ${subBtnHover} ${showDebugLogs ? theme.goldActiveBg + ' border ' + theme.goldBorderSubtle : 'opacity-40'}`}
                    >
                      <Bug style={{ color: gold }} size={16} />
                    </button>
                    <span className={labelCls} style={{ color: gold }}>
                      Logs
                    </span>

                    <button
                      onClick={() => {
                        useUIStore.getState().toggleRatchetMode();
                        track('ratchet_mode_toggled', { enabled: !ratchetMode });
                      }}
                      title={
                        ratchetMode
                          ? 'Ratchet Mode: ON — click to chill 😌'
                          : 'Ratchet Mode: OFF — click to go off 🔥'
                      }
                      aria-label={ratchetMode ? 'Disable Ratchet Mode' : 'Enable Ratchet Mode'}
                      aria-pressed={ratchetMode}
                      className={`${subBtnBase} ${subBtnHover} ${ratchetMode ? 'border ' + theme.goldBorderSubtle : 'opacity-40'}`}
                      style={
                        ratchetMode
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(239,68,68,0.15))',
                              borderColor: 'rgba(249,115,22,0.5)',
                            }
                          : {}
                      }
                    >
                      <Flame style={{ color: ratchetMode ? '#f97316' : gold }} size={16} />
                    </button>
                    <span className={labelCls} style={{ color: ratchetMode ? '#f97316' : gold }}>
                      {ratchetMode ? '🔥 Ratchet' : 'Ratchet'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-6 h-px bg-stone-500/30 mx-auto my-1" />

              {user ? (
                <>
                  <button
                    onClick={() => {
                      setAccountMenuOpen((prev) => !prev);
                      if (!accountMenuOpen) scrollSidebarToBottom();
                    }}
                    title="Account"
                    aria-label={
                      savedPoemsCount > 0
                        ? `Account menu, ${savedPoemsCount} saved poem${savedPoemsCount === 1 ? '' : 's'}`
                        : 'Account menu'
                    }
                    className={`${btnBase} ${btnHover} ${accountMenuOpen ? theme.goldActiveBg : ''} relative`}
                  >
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold font-brand-en"
                      style={{
                        background:
                          'linear-gradient(135deg, rgba(197,160,89,0.25), rgba(197,160,89,0.15))',
                        border: '1.5px solid rgba(197,160,89,0.5)',
                        color: gold,
                      }}
                    >
                      {(user.email ?? user.user_metadata?.full_name ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    {savedPoemsCount > 0 && (
                      <span
                        className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-brand-en"
                        style={{
                          background: 'linear-gradient(135deg, var(--gold), #B8943E)',
                          color: '#000',
                          padding: '0 3px',
                        }}
                      >
                        {savedPoemsCount > 99 ? '99+' : savedPoemsCount}
                      </span>
                    )}
                  </button>
                  <span className={labelCls} style={{ color: gold }}>
                    Account
                  </span>

                  {/* Account submenu drawer */}
                  <div className={`sidebar-drawer ${accountMenuOpen ? 'open' : ''}`}>
                    <div className="sidebar-drawer-inner">
                      <div
                        className={`flex flex-col items-center gap-1 pl-0.5 border-l-2 ${theme.goldBorderMuted}`}
                      >
                        <button
                          onClick={() => {
                            onOpenSavedPoems();
                            setAccountMenuOpen(false);
                          }}
                          title="My saved poems"
                          aria-label="View saved poems"
                          className={`${subBtnBase} ${subBtnHover}`}
                        >
                          <ScrollText style={{ color: gold }} size={16} />
                        </button>
                        <span className={labelCls} style={{ color: gold }}>
                          My Poems
                        </span>

                        <button
                          onClick={() => {
                            onSignOut();
                            setAccountMenuOpen(false);
                          }}
                          title="Sign out"
                          aria-label="Sign out"
                          className={`${subBtnBase} ${subBtnHover}`}
                        >
                          <LogOut style={{ color: gold }} size={16} />
                        </button>
                        <span className={labelCls} style={{ color: gold }}>
                          Sign Out
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={onSignIn} title="Sign in" className={`${btnBase} ${btnHover}`}>
                    <UserRound style={{ color: gold }} size={18} />
                  </button>
                  <span className={labelCls} style={{ color: gold }}>
                    Sign In
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerticalSidebar;
