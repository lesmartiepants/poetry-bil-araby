# Device QA Checklist (manual, pre-release)

CI runs Chromium-on-Linux only. The features below are **device-only**: their real failure modes cannot be reproduced in CI. Run this checklist on real hardware before any release that touches audio, auth, or the service worker. Half of recent regressions (#552, #556, #557, #561) lived here.

Tag a build, then walk these on the listed devices. Check the box in the PR description.

## iOS Safari (real iPhone, not simulator)

Audio is the recurring offender. Test with the **physical mute switch ON**.

- [ ] **Silent-switch playback** — flip the hardware mute switch ON, press Listen. Audio must still play. (`tts-ios-silent-switch`, #556/#561)
- [ ] **Play → pause → resume** — resume continues near where it paused, not from zero.
- [ ] **Switch voice mid-recitation** — tap the voice pill while playing; old voice stops, new voice starts, no double audio. (`tts-voice-cycle`)
- [ ] **Switch engine mid-recitation** (debug panel) — no orphaned audio keeps playing. (`tts-engine-switch`, #560/#558)
- [ ] **Swipe away while playing** — audio stops immediately, nothing plays in the background. (`tts-stop-on-swipe`, #552)
- [ ] **Word read-along** — highlight tracks the spoken word and auto-scrolls; snaps to last word at the end.
- [ ] **Lock screen / background** — locking the phone or backgrounding the app stops audio cleanly.

## PWA (installed to home screen)

- [ ] **Install** — "Add to Home Screen" works; app opens standalone, portrait, dark. (`pwa-offline`)
- [ ] **Offline** — load a few poems online, go airplane mode, reopen: cached poems/assets still render.
- [ ] **New-release update** — deploy a new build, reopen the installed app: it detects the version change, clears stale cache, reloads to the new build without a manual hard-refresh. (`pwa-release-update`, #557)
- [ ] **No reload loop** — the update reloads exactly once, not repeatedly.

## Auth (real OAuth providers)

- [ ] **Google sign-in** — full redirect round-trip returns signed in. (`auth-oauth`)
- [ ] **Apple sign-in** — same.
- [ ] **Save-before-login stash** — tap Save while logged out → sign in → the poem you were on is saved after redirect. (post-OAuth auto-save)
- [ ] **Session restore** — close and reopen; still signed in.
- [ ] **Sign out** — clears session; saved/settings stop syncing.

## Persistence / sharing (real browser APIs)

- [ ] **WebKit IndexedDB cache** — on iOS, second Listen of the same poem/voice is instant (Blob→ArrayBuffer workaround holds, #554). (`tts-prefetch-cache`)
- [ ] **Settings sync** — change theme/font signed in on device A, sign in on device B: settings carry over. (`settings-sync`)
- [ ] **Native share** — Share card uses the OS share sheet on mobile; falls back to download on desktop. (`share-card`)
- [ ] **Deep link** — open a `/poem/:id` link from Messages/Notes: loads that poem; social preview shows the poem card. (`deep-link`)

## Cross-browser (desktop)

- [ ] **Safari desktop** — playback + highlight work (Safari audio APIs differ from Chrome).
- [ ] **Firefox** — playback + layout sane.

---

Source of truth for which features are device-only: [`feature-manifest.json`](../feature-manifest.json) (`deviceOnly: true`). When you add a device-only feature, add a line here.
