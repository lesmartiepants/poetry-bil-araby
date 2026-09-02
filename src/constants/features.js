export const FEATURES = {
  grounding: false,
  debug: true, // Debug panel visibility
  logging: true, // Emit structured logs to console (captured by Vercel/browser)
  caching: true, // Enable IndexedDB caching for audio/insights
  streaming: true, // Enable streaming insights (progressive rendering)
  prefetching: true, // Enable smart prefetching (rate-limited to avoid API issues)
  database: true, // Enable database poem source (requires backend server running)
  landing: true, // Show the splash/landing screen (Zen Haiku) on first visit, then hand off to /onboarding
  onboarding: false, // Unused: the old kinetic walkthrough (phases 1-3) baked into SplashScreen. Superseded by onboardingPrefs, wired in after the landing screen.
  forceOnboarding: false, // Bypass hasSeenOnboarding check (enable to force onboarding every visit)
  onboardingPrefs: true, // Preference pickers (mood/era/topic) at the /onboarding route — salvaged from #517, not on the boot path; reach it from the account menu ("Set up your feed" / "Change your feed") or the debug panel ("Preference Flow")
  drawInspector: true, // الميزان — floating inspector for the last scored discovery draw. A verification tool, not a reader feature: it also requires showDebugLogs (seeded from FEATURES.debug), so turning debug off clears it with the rest of the dev surfaces. Set false to remove it outright.
  designReview: false, // Show design review shortcut icon (still accessible via /design-review URL)
  categoryExplorer: true, // Category Explorer — taxonomy browser + filter playground (Account menu "Explore Poems")
  forceTour: false, // Dev-only: open the walkthrough at boot (mirrors forceOnboarding) so it stays testable without clearing storage
  tour: true, // Guided walkthrough — re-wired to the redesigned reader nav (ReaderActions Listen/Poem Insights + bottom-nav Save/Library/Discover); insights are inline so the 'explain' step is a plain spotlight (no drawer)

  verticalFeed: true, // Vertical swipe feed + tap-to-reveal stanza blooms (replaces horizontal carousel)
  share: true, // Sharing — reader Share action + share card (the vertical-sidebar icon is gone)
  copy: false, // Copy-to-clipboard action — disabled for now
};
