import { Popover } from 'radix-ui';
import { LogOut, Mic, Sparkles, UserRound } from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { useUIStore } from '../stores/uiStore';
import { voiceGender } from '../constants/voices';

/**
 * AccountMenu — the rightmost bottom-nav item. A person icon that opens an expandable menu holding
 * the reading-voice cycle and the sign-in / sign-out action. (Replaces the old account button in
 * the removed vertical sidebar and the separate voice-cycle pill.)
 *
 * `ink` is the foreground colour for the trigger icon + labels — gold in dark mode, a dark ink in
 * light mode (matching the rest of the bottom nav), per the light-mode control pattern.
 */
export default function AccountMenu({ user, onSignIn, onSignOut, liveVoice, onCycleVoice, ink }) {
  const darkMode = useUIStore((s) => s.darkMode);
  const theme = darkMode ? THEME.dark : THEME.light;
  const initial = (user?.email ?? user?.user_metadata?.full_name ?? 'U').charAt(0).toUpperCase();

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <Popover.Root>
        <Popover.Trigger asChild>
          <button
            aria-label="Account menu"
            className="min-w-[46px] min-h-[46px] p-[11px] bg-transparent border-none cursor-pointer transition-all duration-200 flex items-center justify-center rounded-full hover:scale-105"
          >
            {user ? (
              <span
                className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[0.6875rem] font-bold font-brand-en"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(197,160,89,0.25), rgba(197,160,89,0.15))',
                  border: `1.5px solid ${ink}`,
                  color: ink,
                }}
              >
                {initial}
              </span>
            ) : (
              <UserRound size={21} style={{ color: ink }} />
            )}
          </button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            side="top"
            align="end"
            sideOffset={10}
            className={`z-[60] rounded-xl p-2 flex flex-col gap-1 min-w-[12rem] backdrop-blur-xl border ${theme.border} ${darkMode ? 'bg-black/85' : 'bg-white/92'}`}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {/* Reading voice — tap to cycle */}
            <button
              onClick={onCycleVoice}
              aria-label={`Reading voice: ${liveVoice}. Tap to change.`}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <span className="flex items-center gap-2">
                <Mic
                  size={16}
                  style={{ color: voiceGender(liveVoice) === 'f' ? '#c084fc' : '#60a5fa' }}
                />
                <span>Voice</span>
              </span>
              <span className="opacity-70">{liveVoice}</span>
            </button>

            {/* Design viewers — quick links to the design-sprint mockup viewers */}
            <div className="my-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />
            <a
              href="/design-review/share-modal/index.html"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open share modal designs"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en no-underline hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <Sparkles size={16} style={{ color: ink }} />
              <span>Share Modal Designs</span>
            </a>
            <a
              href="/design-review/login-modal/index.html"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open login modal designs"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en no-underline hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <Sparkles size={16} style={{ color: ink }} />
              <span>Login Modal Designs</span>
            </a>
            <div className="my-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />

            {/* Auth */}
            {user ? (
              <button
                onClick={onSignOut}
                aria-label="Sign out"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                style={{ color: ink }}
              >
                <LogOut size={16} style={{ color: ink }} />
                <span>Sign Out</span>
              </button>
            ) : (
              <button
                onClick={onSignIn}
                aria-label="Sign in"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                style={{ color: ink }}
              >
                <UserRound size={16} style={{ color: ink }} />
                <span>Sign In</span>
              </button>
            )}
            <Popover.Arrow style={{ fill: darkMode ? '#000' : '#fff' }} />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <span
        className="font-brand-en text-[0.53rem] font-bold tracking-[0.08em] uppercase opacity-60 whitespace-nowrap"
        style={{ color: ink }}
      >
        Account
      </span>
    </div>
  );
}
