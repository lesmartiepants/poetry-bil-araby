import {
  Check,
  Copy,
  Heart,
  LibraryBig,
  LogOut,
  Share2,
  ThumbsDown,
  UserRound,
} from 'lucide-react';
import { Popover } from 'radix-ui';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

const VerticalSidebar = ({
  onCopy,
  onShare,
  onSave,
  onUnsave,
  isSaved,
  onSignIn,
  onSignOut,
  onOpenSavedPoems,
  savedPoemsCount,
  onFlag,
  isDownvoted,
  onUnflag,
  user,
}) => {
  const showCopySuccess = useModalStore((s) => s.copyToast);
  const showShareSuccess = useModalStore((s) => s.shareToast);
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const gold = theme.gold;

  const btnBase =
    'w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200';
  const btnHover = theme.goldHoverBg15;

  return (
    <>
      <style>{`
        @keyframes goldCheckSparkle {
          0% { transform: scale(0.5) rotate(-10deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
          30% { transform: scale(1.2) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 8px rgba(197,160,89,0.8)); }
          60% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 4px rgba(197,160,89,0.5)); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 2px rgba(197,160,89,0.3)); }
        }
        @keyframes popoverSlideIn {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div
        className={`fixed right-2 md:right-[25rem] top-1/2 -translate-y-1/2 z-[45] rounded-2xl backdrop-blur-xl border ${theme.border} py-2 px-1.5 flex flex-col items-center gap-1 ${darkMode ? 'bg-black/70' : 'bg-white/80'}`}
        style={{ width: '2.75rem' }}
      >
        {/* Heart / Save button */}
        <button
          onClick={() => (isSaved ? onUnsave?.() : onSave?.())}
          aria-label={isSaved ? 'Unsave poem' : 'Save poem'}
          className={`${btnBase} ${btnHover}`}
        >
          <Heart
            size={18}
            style={
              isSaved ? { fill: '#ef4444', stroke: '#ef4444' } : { fill: 'none', stroke: gold }
            }
          />
        </button>

        {/* My Poems button */}
        <button
          onClick={onOpenSavedPoems}
          aria-label={savedPoemsCount > 0 ? `My poems, ${savedPoemsCount} saved` : 'My poems'}
          className={`${btnBase} ${btnHover} relative`}
        >
          <LibraryBig style={{ color: gold }} size={18} />
          {savedPoemsCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[1rem] h-4 rounded-full flex items-center justify-center text-[0.5625rem] font-bold px-0.5 font-brand-en"
              style={{
                background: 'linear-gradient(135deg, var(--gold), #B8943E)',
                color: '#000',
              }}
            >
              {savedPoemsCount > 99 ? '99+' : savedPoemsCount}
            </span>
          )}
        </button>

        {/* Share button */}
        <button onClick={onShare} aria-label="Share poem" className={`${btnBase} ${btnHover}`}>
          {showShareSuccess ? (
            <Check
              style={{ color: gold, animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
              size={18}
            />
          ) : (
            <Share2 style={{ color: gold }} size={18} />
          )}
        </button>

        {/* Copy button */}
        <button
          onClick={onCopy}
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

        {/* Flag button */}
        <button
          onClick={() => (isDownvoted ? onUnflag?.() : onFlag?.())}
          aria-label={isDownvoted ? 'Unflag poem' : 'Flag poem'}
          className={`${btnBase} ${btnHover}`}
        >
          <ThumbsDown
            size={18}
            style={
              isDownvoted ? { fill: '#f87171', stroke: '#f87171' } : { fill: 'none', stroke: gold }
            }
          />
        </button>

        {/* User / Account button with Radix Popover */}
        {user ? (
          <Popover.Root>
            <Popover.Trigger asChild>
              <button aria-label="Account menu" className={`${btnBase} ${btnHover} relative`}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6875rem] font-bold font-brand-en"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(197,160,89,0.25), rgba(197,160,89,0.15))',
                    border: '1.5px solid rgba(197,160,89,0.5)',
                    color: gold,
                  }}
                >
                  {(user.email ?? user.user_metadata?.full_name ?? 'U').charAt(0).toUpperCase()}
                </div>
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                side="left"
                sideOffset={8}
                className={`z-[50] rounded-xl p-2 flex flex-col gap-1 backdrop-blur-xl border ${theme.border} ${darkMode ? 'bg-black/80' : 'bg-white/90'}`}
                style={{ animation: 'popoverSlideIn 0.2s ease-out' }}
              >
                <button
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en ${btnHover}`}
                  style={{ color: gold }}
                >
                  <LogOut size={16} style={{ color: gold }} />
                  <span>Sign Out</span>
                </button>
                <Popover.Arrow style={{ fill: gold }} />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        ) : (
          <button onClick={onSignIn} aria-label="Sign in" className={`${btnBase} ${btnHover}`}>
            <UserRound style={{ color: gold }} size={18} />
          </button>
        )}
      </div>
    </>
  );
};

export default VerticalSidebar;
