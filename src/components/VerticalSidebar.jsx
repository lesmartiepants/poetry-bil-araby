import { useState, useEffect, useRef } from 'react';
import {
  Check,
  Copy,
  Flame,
  Heart,
  LogOut,
  ScrollText,
  Share2,
  UserRound,
} from 'lucide-react';
import { track } from '@vercel/analytics';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';

const GOLD = 'var(--gold)';
const GOLD_RGB = '197,160,89';

const VerticalSidebar = ({
  onCopy,
  onShare,
  onSignIn,
  onSignOut,
  onOpenSavedPoems,
  savedPoemsCount,
  user,
  poem,
  isSaved,
  onSave,
  onUnsave,
}) => {
  const showCopySuccess = useModalStore((s) => s.copyToast);
  const showShareSuccess = useModalStore((s) => s.shareToast);
  const darkMode = useUIStore((s) => s.darkMode);
  const ratchetMode = useUIStore((s) => s.ratchetMode);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const sidebarRef = useRef(null);

  const glassBg = darkMode ? 'rgba(10,10,12,0.88)' : 'rgba(255,255,255,0.9)';

  useEffect(() => {
    if (!accountMenuOpen) return;
    const handler = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [accountMenuOpen]);

  const handleSave = () => {
    if (!user) {
      onSignIn?.('Sign in to save your favourites');
      return;
    }
    if (isSaved) {
      onUnsave?.();
    } else {
      onSave?.();
    }
  };

  const btnStyle = {
    width: 44,
    height: 44,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    background: 'transparent',
    transition: 'background 0.18s, transform 0.15s',
    flexShrink: 0,
  };

  const SidebarBtn = ({ onClick, title, label, style: extraStyle = {}, children, disabled }) => (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      style={{ ...btnStyle, ...extraStyle }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = `rgba(${GOLD_RGB},0.1)`;
          e.currentTarget.style.transform = 'scale(1.05)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = extraStyle.background || 'transparent';
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {children}
    </button>
  );

  return (
    <>
      <style>{`
        @keyframes sidebarSlideIn {
          from { transform: translateY(-50%) translateX(100%); opacity: 0; }
          to   { transform: translateY(-50%) translateX(0);    opacity: 1; }
        }
        @keyframes goldCheckSparkle {
          0%   { transform: scale(0.5) rotate(-10deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(197,160,89,0)); }
          30%  { transform: scale(1.2) rotate(0deg);  opacity: 1; filter: drop-shadow(0 0 8px rgba(197,160,89,0.8)); }
          60%  { transform: scale(1)   rotate(0deg);  opacity: 1; filter: drop-shadow(0 0 4px rgba(197,160,89,0.5)); }
          100% { transform: scale(1)   rotate(0deg);  opacity: 1; filter: drop-shadow(0 0 2px rgba(197,160,89,0.3)); }
        }
        @keyframes accountMenuIn {
          from { opacity: 0; transform: translateX(6px) scale(0.97); }
          to   { opacity: 1; transform: translateX(0)   scale(1); }
        }
      `}</style>

      <div
        ref={sidebarRef}
        style={{
          position: 'fixed',
          right: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 45,
          background: glassBg,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: `1.5px solid rgba(${GOLD_RGB},0.28)`,
          borderRight: 'none',
          borderRadius: '16px 0 0 16px',
          padding: '10px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          animation: 'sidebarSlideIn 0.4s ease-out',
          boxShadow: `-4px 0 32px rgba(0,0,0,${darkMode ? 0.4 : 0.1})`,
        }}
      >
        {/* Save */}
        <SidebarBtn
          onClick={handleSave}
          title={isSaved ? 'Unsave poem' : 'Save poem'}
        >
          <Heart
            size={18}
            color={isSaved ? '#ef4444' : GOLD}
            fill={isSaved ? '#ef4444' : 'none'}
            strokeWidth={1.75}
            style={{ transition: 'color 0.2s, fill 0.2s' }}
          />
        </SidebarBtn>

        {/* Share */}
        <SidebarBtn onClick={onShare} title="Share poem">
          {showShareSuccess ? (
            <Check
              size={18}
              color={GOLD}
              style={{ animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
            />
          ) : (
            <Share2 size={18} color={GOLD} strokeWidth={1.75} />
          )}
        </SidebarBtn>

        {/* Copy */}
        <SidebarBtn onClick={onCopy} title="Copy poem to clipboard">
          {showCopySuccess ? (
            <Check
              size={18}
              color={GOLD}
              style={{ animation: 'goldCheckSparkle 0.5s ease-out forwards' }}
            />
          ) : (
            <Copy size={18} color={GOLD} strokeWidth={1.75} />
          )}
        </SidebarBtn>

        {/* Ratchet */}
        <SidebarBtn
          onClick={() => {
            useUIStore.getState().toggleRatchetMode();
            track('ratchet_mode_toggled', { enabled: !ratchetMode });
          }}
          title={
            ratchetMode
              ? 'Ratchet Mode ON — click to chill 😌'
              : 'Ratchet Mode OFF — click to go off 🔥'
          }
          style={
            ratchetMode
              ? {
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(239,68,68,0.15))',
                  border: '1px solid rgba(249,115,22,0.45)',
                  borderRadius: '12px',
                }
              : {}
          }
        >
          <Flame
            size={18}
            color={ratchetMode ? '#f97316' : GOLD}
            strokeWidth={1.75}
            style={{ transition: 'color 0.2s' }}
          />
        </SidebarBtn>

        {/* Subtle separator */}
        <span
          style={{
            width: 20,
            height: 1,
            background: `rgba(${GOLD_RGB},0.15)`,
            margin: '2px 0',
            display: 'block',
          }}
        />

        {/* Sign In / Account */}
        {user ? (
          <div style={{ position: 'relative' }}>
            <SidebarBtn
              onClick={() => setAccountMenuOpen((v) => !v)}
              title="Account menu"
              style={accountMenuOpen ? { background: `rgba(${GOLD_RGB},0.12)` } : {}}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '11px',
                  fontWeight: 700,
                  fontFamily: 'system-ui, sans-serif',
                  background: `linear-gradient(135deg, rgba(${GOLD_RGB},0.25), rgba(${GOLD_RGB},0.12))`,
                  border: `1.5px solid rgba(${GOLD_RGB},0.45)`,
                  color: GOLD,
                  position: 'relative',
                }}
              >
                {(user.email ?? user.user_metadata?.full_name ?? 'U').charAt(0).toUpperCase()}
                {savedPoemsCount > 0 && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '9px',
                      fontWeight: 700,
                      fontFamily: 'system-ui, sans-serif',
                      background: 'linear-gradient(135deg, var(--gold), #B8943E)',
                      color: '#000',
                      padding: '0 3px',
                    }}
                  >
                    {savedPoemsCount > 99 ? '99+' : savedPoemsCount}
                  </span>
                )}
              </div>
            </SidebarBtn>

            {/* Account dropdown — floats to the left */}
            {accountMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  right: 'calc(100% + 10px)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: darkMode ? 'rgba(10,10,12,0.95)' : 'rgba(253,252,248,0.97)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: `1.5px solid rgba(${GOLD_RGB},0.28)`,
                  borderRadius: '14px',
                  padding: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                  animation: 'accountMenuIn 0.18s ease-out both',
                  boxShadow: `0 8px 32px rgba(0,0,0,${darkMode ? 0.45 : 0.12})`,
                  whiteSpace: 'nowrap',
                  minWidth: 140,
                }}
              >
                <button
                  onClick={() => {
                    onOpenSavedPoems();
                    setAccountMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: darkMode ? 'rgba(255,255,255,0.75)' : 'rgba(30,24,18,0.75)',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 500,
                    transition: 'background 0.15s',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `rgba(${GOLD_RGB},0.1)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <ScrollText size={14} color={GOLD} strokeWidth={1.75} />
                  My Poems
                  {savedPoemsCount > 0 && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: '10px',
                        fontWeight: 700,
                        color: GOLD,
                        opacity: 0.7,
                      }}
                    >
                      {savedPoemsCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    onSignOut();
                    setAccountMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 12px',
                    borderRadius: '9px',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: darkMode ? 'rgba(255,255,255,0.55)' : 'rgba(30,24,18,0.55)',
                    fontSize: '12px',
                    fontFamily: 'system-ui, sans-serif',
                    fontWeight: 500,
                    transition: 'background 0.15s',
                    width: '100%',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `rgba(${GOLD_RGB},0.08)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <LogOut size={14} color={GOLD} strokeWidth={1.75} style={{ opacity: 0.7 }} />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <SidebarBtn onClick={onSignIn} title="Sign in">
            <UserRound size={18} color={GOLD} strokeWidth={1.75} />
          </SidebarBtn>
        )}
      </div>
    </>
  );
};

export default VerticalSidebar;
