import { useState } from 'react';
import { useLocation } from 'wouter';
import { Popover } from 'radix-ui';
import {
  LogOut,
  Mic,
  Paintbrush,
  UserRound,
  Moon,
  Sun,
  SlidersHorizontal,
  Compass,
  Sparkles,
  Footprints,
  ListChecks,
  ThumbsDown,
} from 'lucide-react';
import { THEME } from '../constants/theme.js';
import { FEATURES } from '../constants/features.js';
import { useUIStore } from '../stores/uiStore';
import { useModalStore } from '../stores/modalStore';
import { voiceDisplayName, voiceGender } from '../constants/voices';
import { tourEntryLabel } from '../utils/tourProgress.js';
import { onboardingEntryLabel, onboardingEntryDescription } from '../utils/onboardingEntry.js';

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
  const curated = useUIStore((s) => s.curated);
  const showDislike = useUIStore((s) => s.showDislike);
  const openDisplaySettings = useModalStore((s) => s.openDisplaySettings);
  const openTour = useModalStore((s) => s.openTour);
  const [, navigate] = useLocation();
  // Controlled so tapping "Display Settings" closes this menu as it opens the panel.
  const [open, setOpen] = useState(false);
  // Read on every open (the menu re-renders when `open` flips), so the label tracks
  // progress the reader made since last time instead of going stale.
  const tourLabel = tourEntryLabel();
  // Same deal for the preference flow: read on every open so the entry reflects
  // whether there are saved answers to change or a feed still to set up.
  const prefsLabel = onboardingEntryLabel();
  const prefsDescription = onboardingEntryDescription();
  const theme = darkMode ? THEME.dark : THEME.light;
  const initial = (user?.email ?? user?.user_metadata?.full_name ?? 'U').charAt(0).toUpperCase();
  const voiceName = voiceDisplayName(liveVoice);

  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[52px]">
      <Popover.Root open={open} onOpenChange={setOpen}>
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
            // Don't return focus to the trigger on close — when "Display Settings" closes this menu
            // and opens the settings panel, that focus return would land outside the panel and
            // immediately dismiss it (Radix focus race).
            onCloseAutoFocus={(e) => e.preventDefault()}
            className={`z-[60] rounded-xl p-2 flex flex-col gap-1 min-w-[12rem] backdrop-blur-xl border ${theme.border} ${darkMode ? 'bg-black/85' : 'bg-white/92'}`}
            style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
          >
            {/* Explore poems — filter/browse by mood, theme, motif, intensity, accessibility */}
            <button
              onClick={() => {
                setOpen(false);
                navigate('/explore');
              }}
              aria-label="Explore poems by mood, theme, and reading difficulty"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <Compass size={16} style={{ color: ink }} />
              <span>Explore Poems</span>
            </button>

            {/* Guided walkthrough — the only entry point. It never opens itself, so a reader
                who wants the tour comes and gets it. Label reflects saved progress. */}
            {FEATURES.tour && (
              <button
                onClick={() => {
                  setOpen(false);
                  openTour();
                }}
                aria-label={tourLabel}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                style={{ color: ink }}
              >
                <Footprints size={16} style={{ color: ink }} />
                <span>{tourLabel}</span>
              </button>
            )}

            {/* Preference flow (/onboarding) — the only entry point outside the debug panel.
                Label follows saved answers: an unanswered reader is invited to set the feed
                up, a returning one is told this CHANGES it, because finishing the flow
                overwrites `onboardingPrefs`. No confirm step: the flow seeds every picker
                from the saved answers and writes nothing until the last one, so backing out
                early leaves them untouched. */}
            {FEATURES.onboardingPrefs && (
              <button
                onClick={() => {
                  setOpen(false);
                  navigate('/onboarding');
                }}
                aria-label={prefsDescription}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                style={{ color: ink }}
              >
                <ListChecks size={16} style={{ color: ink }} />
                <span>{prefsLabel}</span>
              </button>
            )}

            <div className="my-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />

            {/* Reading voice — tap to cycle */}
            <button
              onClick={onCycleVoice}
              aria-label={`Reading voice: ${voiceName}. Tap to change.`}
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
              <span className="opacity-70">{voiceName}</span>
            </button>

            {/* Night / Day — the whole row toggles the theme; the switch reflects the current mode. */}
            <button
              onClick={() => useUIStore.getState().toggleDarkMode()}
              aria-label={darkMode ? 'Switch to day mode' : 'Switch to night mode'}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <span className="flex items-center gap-2">
                {darkMode ? (
                  <Moon size={16} style={{ color: ink }} />
                ) : (
                  <Sun size={16} style={{ color: ink }} />
                )}
                <span>{darkMode ? 'Night' : 'Day'}</span>
              </span>
              {/* Visual switch — knob slides left (night) / right (day). */}
              <span
                aria-hidden="true"
                className="relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200"
                style={{
                  width: 38,
                  height: 22,
                  background: darkMode ? 'rgba(120,120,140,0.30)' : 'rgba(197,160,89,0.55)',
                  border: '1px solid rgba(197,160,89,0.45)',
                }}
              >
                <span
                  className="absolute rounded-full transition-all duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    top: 2,
                    left: darkMode ? 2 : 18,
                    background: ink,
                  }}
                />
              </span>
            </button>

            {/* Curated — biases discovery toward the reader's taste (mood/topic/motif) and hides downvotes. */}
            <button
              onClick={() => useUIStore.getState().toggleCurated()}
              aria-label={curated ? 'Turn curated feed off' : 'Turn curated feed on'}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <span className="flex items-center gap-2">
                <Sparkles size={16} style={{ color: curated ? '#c5a059' : ink }} />
                <span>Curated</span>
              </span>
              <span
                aria-hidden="true"
                className="relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200"
                style={{
                  width: 38,
                  height: 22,
                  background: curated ? 'rgba(197,160,89,0.55)' : 'rgba(120,120,140,0.30)',
                  border: '1px solid rgba(197,160,89,0.45)',
                }}
              >
                <span
                  className="absolute rounded-full transition-all duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    top: 2,
                    left: curated ? 18 : 2,
                    background: ink,
                  }}
                />
              </span>
            </button>

            {/* Dislike button — shows/hides the dislike control in the reader's nav pill. */}
            <button
              onClick={() => useUIStore.getState().toggleShowDislike()}
              aria-label={showDislike ? 'Hide dislike button' : 'Show dislike button'}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <span className="flex items-center gap-2">
                <ThumbsDown size={16} style={{ color: showDislike ? '#c5a059' : ink }} />
                <span>Dislike button</span>
              </span>
              <span
                aria-hidden="true"
                className="relative inline-flex flex-shrink-0 rounded-full transition-colors duration-200"
                style={{
                  width: 38,
                  height: 22,
                  background: showDislike ? 'rgba(197,160,89,0.55)' : 'rgba(120,120,140,0.30)',
                  border: '1px solid rgba(197,160,89,0.45)',
                }}
              >
                <span
                  className="absolute rounded-full transition-all duration-200"
                  style={{
                    width: 16,
                    height: 16,
                    top: 2,
                    left: showDislike ? 18 : 2,
                    background: ink,
                  }}
                />
              </span>
            </button>

            {/* Display Settings — opens the existing text/background settings panel */}
            <button
              onClick={() => {
                setOpen(false);
                openDisplaySettings();
              }}
              aria-label="Display settings"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
              style={{ color: ink }}
            >
              <SlidersHorizontal size={16} style={{ color: ink }} />
              <span>Display Settings</span>
            </button>

            <div className="my-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />

            {/* Design Review — share modal mockup (only shown when FEATURES.designReview is enabled) */}
            {FEATURES.designReview && (
              <>
                <a
                  href="/design-review/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Open share modal design review"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors no-underline"
                  style={{ color: ink }}
                >
                  <Paintbrush size={16} style={{ color: ink }} />
                  <span>Share Modal Design</span>
                </a>
                <div className="my-1 h-px" style={{ background: 'rgba(197,160,89,0.18)' }} />
              </>
            )}

            {/* Auth */}
            {user ? (
              <Popover.Close asChild>
                <button
                  onClick={onSignOut}
                  aria-label="Sign out"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                  style={{ color: ink }}
                >
                  <LogOut size={16} style={{ color: ink }} />
                  <span>Sign Out</span>
                </button>
              </Popover.Close>
            ) : (
              <Popover.Close asChild>
                <button
                  onClick={onSignIn}
                  aria-label="Sign in"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-brand-en hover:bg-gold/10 transition-colors"
                  style={{ color: ink }}
                >
                  <UserRound size={16} style={{ color: ink }} />
                  <span>Sign In</span>
                </button>
              </Popover.Close>
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
