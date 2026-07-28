export const FEATURES = {
  grounding: false,
  debug: true, // Debug panel visibility
  logging: true, // Emit structured logs to console (captured by Vercel/browser)
  caching: true, // Enable IndexedDB caching for audio/insights
  streaming: true, // Enable streaming insights (progressive rendering)
  prefetching: true, // Enable smart prefetching (rate-limited to avoid API issues)
  database: true, // Enable database poem source (requires backend server running)
  landing: false, // Show the splash/landing screen on first visit (disabled: boot straight into the reader)
  onboarding: false, // Show kinetic walkthrough (phases 1-3) on first visit
  forceOnboarding: false, // Bypass hasSeenOnboarding check (enable to force onboarding every visit)
  designReview: false, // Show design review shortcut icon (still accessible via /design-review URL)
  tour: true, // Guided walkthrough — re-wired to the redesigned reader nav (ReaderActions Listen/Poem Insights + bottom-nav Save/Library/Discover); insights are inline so the 'explain' step is a plain spotlight (no drawer)

  verticalFeed: true, // Vertical swipe feed + tap-to-reveal stanza blooms (replaces horizontal carousel)
  share: true, // Sharing — reader Share action + share card (the vertical-sidebar icon is gone)
  copy: false, // Copy-to-clipboard action — disabled for now
};
