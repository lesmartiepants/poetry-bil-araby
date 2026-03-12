import { useState, useEffect, useRef } from 'react';
import { LogIn, LogOut, User, BookOpen, Settings2 } from 'lucide-react';
import { GOLD } from '../constants/theme';

const AuthButton = ({
  user,
  darkMode,
  onSignIn,
  onSignOut,
  onOpenSavedPoems,
  onOpenSettings,
  theme,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const clickOut = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', clickOut);
    return () => document.removeEventListener('mousedown', clickOut);
  }, []);

  if (!user) {
    return (
      <div className="flex flex-col items-center gap-1 min-w-[56px]">
        <button
          onClick={onSignIn}
          className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
          aria-label="Sign In"
        >
          <LogIn size={21} className={GOLD.goldText} />
        </button>
        <span
          className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
        >
          Sign In
        </span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-1 min-w-[56px]" ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className={`min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-300 flex items-center justify-center rounded-full ${GOLD.goldHoverBg} hover:scale-105`}
        aria-label="User Menu"
      >
        {user.user_metadata?.avatar_url ? (
          <img
            src={user.user_metadata.avatar_url}
            alt="User avatar"
            className="w-[21px] h-[21px] rounded-full object-cover"
          />
        ) : (
          <User size={21} className={GOLD.goldText} />
        )}
      </button>
      <span
        className={`font-brand-en text-[8.5px] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap ${GOLD.goldText}`}
      >
        Account
      </span>

      {showMenu && (
        <div
          className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 min-w-[200px] ${darkMode ? 'bg-[rgba(20,18,16,0.98)] border-[rgba(197,160,89,0.15)] shadow-[0_-10px_40px_rgba(0,0,0,0.7)]' : 'bg-white/95 border-stone-200 shadow-[0_-10px_40px_rgba(0,0,0,0.15)]'} backdrop-blur-[48px] border rounded-3xl p-3 z-50`}
        >
          <div className="px-4 py-3 border-b border-[rgba(197,160,89,0.08)]">
            <p className={`font-brand-en text-xs ${GOLD.goldText} font-medium truncate`}>
              {user.email || user.user_metadata?.full_name || 'User'}
            </p>
          </div>
          <button
            onClick={() => {
              onOpenSavedPoems();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <BookOpen size={18} className={GOLD.goldText} />
            <div className="flex flex-col items-start">
              <div className={`font-amiri text-base ${GOLD.goldText} font-medium`}>قصائدي</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">
                My Poems
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              onOpenSettings();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 border-b border-[rgba(197,160,89,0.08)] hover:bg-[rgba(197,160,89,0.08)]"
          >
            <Settings2 size={18} className={GOLD.goldText} />
            <div className="flex flex-col items-start">
              <div className={`font-amiri text-base ${GOLD.goldText} font-medium`}>الإعدادات</div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">
                Settings
              </div>
            </div>
          </button>
          <button
            onClick={() => {
              onSignOut();
              setShowMenu(false);
            }}
            className="w-full p-[14px_20px] cursor-pointer rounded-2xl transition-all duration-200 flex items-center gap-3 hover:bg-[rgba(197,160,89,0.08)]"
          >
            <LogOut size={18} className={GOLD.goldText} />
            <div className="flex flex-col items-start">
              <div className={`font-amiri text-base ${GOLD.goldText} font-medium`}>
                تسجيل الخروج
              </div>
              <div className="font-brand-en text-[9px] uppercase tracking-[0.12em] opacity-45 text-[#a8a29e]">
                Sign Out
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export { AuthButton };
