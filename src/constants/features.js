export const FEATURES = {
  grounding: false,
  debug: true, // Debug panel visibility
  logging: true, // Emit structured logs to console (captured by Vercel/browser)
  caching: true, // Enable IndexedDB caching for audio/insights
  streaming: true, // Enable streaming insights (progressive rendering)
  prefetching: true, // Enable smart prefetching (rate-limited to avoid API issues)
  database: true, // Enable database poem source (requires backend server running)
  onboarding: false, // Show kinetic walkthrough (phases 1-3) on first visit — disabled during reader preview
  forceOnboarding: false, // Bypass hasSeenOnboarding check (enable to force onboarding every visit)
  splash: false, // Show animated splash on first visit — disabled during reader preview
  designReview: false, // Show design review shortcut icon (still accessible via /design-review URL)
  verticalFeed: true, // Vertical swipe feed + tap-to-reveal stanza blooms (replaces horizontal carousel)
};
