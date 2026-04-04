export const FEATURES = {
  grounding: false,
  debug: true, // Debug panel visibility
  logging: true, // Emit structured logs to console (captured by Vercel/browser)
  caching: true, // Enable IndexedDB caching for audio/insights
  streaming: true, // Enable streaming insights (progressive rendering)
  prefetching: true, // Enable smart prefetching (rate-limited to avoid API issues)
  database: true, // Enable database poem source (requires backend server running)
  onboarding: true, // Show kinetic walkthrough + preference pickers on every visit (skip-to-app button always visible)
  forceOnboarding: false, // (legacy — no-op; onboarding now always shows when enabled above)
  designReview: false, // Show design review shortcut icon (still accessible via /design-review URL)
};
