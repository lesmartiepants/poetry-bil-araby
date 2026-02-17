# Feature Mockups Index

> Consolidated reference for all feature mockups across branches and PRs.
> Last updated: Feb 17, 2026

---

## Quick Summary

All your feature mockups exist — they're spread across **3 open PRs** on separate branches (none merged to `main` yet):

| Feature | Branch | PR | Status |
|---|---|---|---|
| Save / Heart / Transliteration | `copilot/explore-ui-controls-implementation` | [#50](../../pull/50) | OPEN |
| Login / Auth / SSO / Save | `copilot/setup-user-authentication-sso` | [#49](../../pull/49) | OPEN |
| Intro / Main App Layouts | `cursor/intro-main-app-mockups-6919` | [#51](../../pull/51) | OPEN |

---

## Architecture: Where Things Live

```
main (merged)
├── mockups/option-a through option-k    ← 11 base layout mockups (splash/main)
└── e2e/mockup-screenshots.spec.js       ← Playwright screenshot generator

PR #50 branch: copilot/explore-ui-controls-implementation
├── mockups/vertical-controls-option1-minimalist.html
├── mockups/vertical-controls-option3-notion.html
├── mockups/vertical-controls-option4-wildcard.html
├── mockups/vertical-controls-option6-neumorphic.html
├── mockups/vertical-controls-option9-scandinavian.html
├── mockups/screenshot-option{1,3,4,6,9}.png
└── mockups/VERTICAL_CONTROLS_DESIGN_GUIDE.md
    └── Features: ❤️ Heart/Save, 🔍 Text Zoom, 🔤 Transliteration

PR #49 branch: copilot/setup-user-authentication-sso
├── src/hooks/useAuth.js                  ← Auth hook (Google/Apple OAuth)
├── src/supabaseClient.js                 ← Supabase client config
├── src/app.jsx                           ← UI: AuthModal, AuthButton, SavePoemButton
├── src/test/auth.test.jsx                ← Unit tests
├── supabase/migrations/...               ← DB schema (user_settings, saved_poems, etc.)
├── docs/AUTH_UI_SCREENSHOTS.md           ← Visual guide with all UI states
├── docs/AUTHENTICATION_SETUP.md          ← Setup instructions
├── docs/DATABASE_ERD.md                  ← Entity relationship diagram
└── AUTH_IMPLEMENTATION_SUMMARY.md        ← Full implementation overview

PR #51 branch: cursor/intro-main-app-mockups-6919
├── mockups/option-l-celestial-lens.html + .png
├── mockups/option-m-calligraphic-minimal.html + .png
├── mockups/option-n-bento-atlas.html + .png
├── mockups/option-o-desert-horizon.html + .png
├── mockups/option-p-ink-mono.html + .png
├── mockups/option-q-glass-pavilion.html + .png
├── mockups/option-r-library-catalog.html + .png
├── mockups/option-s-rhythm-wave.html + .png
├── mockups/option-t-mosaic-tiles.html + .png
├── mockups/option-u-scroll-story.html + .png
└── INTRO_MAIN_MOCKUPS.md                 ← Gallery index
```

---

## 1. Save / Heart Feature

### Where: PR #50 + PR #49

**Mockups (PR #50 — vertical control bar explorations):**
Each mockup includes a heart/save button with counter badge and active state animations.

| Option | Style | File |
|---|---|---|
| Option 1 | Minimalist (Jony Ive) — icons-only, glass morphism, right-aligned | `vertical-controls-option1-minimalist.html` |
| Option 3 | Notion/Linear — compact 40px, right-aligned, functional | `vertical-controls-option3-notion.html` |
| Option 4 | Brutalist Terminal — full-height left sidebar, CRT retro | `vertical-controls-option4-wildcard.html` |
| Option 6 | Neumorphic (Soft UI) — left sidebar, tactile raised/inset | `vertical-controls-option6-neumorphic.html` |
| Option 9 | Scandinavian Minimal — circular buttons, Nordic clean | `vertical-controls-option9-scandinavian.html` |

**Implementation (PR #49 — full Supabase integration):**
- `SavePoemButton` component in `src/app.jsx`
- Heart icon fills when saved, tooltip for unauthenticated users
- `useSavedPoems()` hook for CRUD operations
- `saved_poems` DB table with RLS policies
- Desktop: heart positioned after Discover button in control bar
- Mobile: heart in main view with overflow menu

---

## 2. Login / Authentication Feature

### Where: PR #49

**Branch:** `copilot/setup-user-authentication-sso`

**UI Components:**
- **AuthModal** — Google + Apple OAuth buttons, Arabic welcome ("مرحباً"), themed
- **AuthButton** — Desktop: user avatar + dropdown; Mobile: compact in overflow menu
- **Sign In flow** — Click "Sign In" → modal → OAuth redirect → session

**Screenshots (embedded in PR #49 body and `docs/AUTH_UI_SCREENSHOTS.md`):**

| Screen | Description |
|---|---|
| Desktop - Not Signed In | Control bar with Sign In button and grayed-out Save |
| Authentication Modal | Google + Apple OAuth options with Arabic welcome |
| Save Button Tooltip | "Sign in to save poems" tooltip on heart click |
| Mobile - Compact Control Bar | Responsive layout with overflow menu |
| Mobile - Overflow Menu | Full menu with bilingual labels (Arabic + English) |
| Mobile - Auth Modal | OAuth on mobile with "مرحباً" welcome |
| Mobile - Heart Tooltip | Heart with "Sign in to save poems" on mobile |

**Implementation files:**
- `src/hooks/useAuth.js` — `useAuth()`, `useUserSettings()`, `useSavedPoems()`
- `src/supabaseClient.js` — Supabase client with env var validation
- `supabase/migrations/20260119000000_auth_and_user_features.sql` — Schema

**Database schema (from `docs/DATABASE_ERD.md`):**
```
auth_users ──┬── user_settings (theme, font, voice, transliteration)
             ├── saved_poems (poem text, poet, title, category)
             ├── discussions (comments, likes_count)
             └── discussion_likes
```

---

## 3. Heart Feature

The heart feature spans both PR #49 and PR #50:

- **PR #50** covers the **visual design exploration** — 5 different control bar styles each including a heart/save button with counter badges, active state animations, and hover effects.
- **PR #49** covers the **full implementation** — `SavePoemButton` React component, Supabase backend, RLS policies, and the actual save/unsave toggle logic.

**Key behavior:**
- Heart outline when not saved, filled when saved
- Counter badge showing total saves
- Tooltip "Sign in to save poems" when unauthenticated
- Smooth animation on toggle

---

## 4. Transliteration Feature

### Where: PR #50

**Branch:** `copilot/explore-ui-controls-implementation`

All 5 vertical control bar mockups include a transliteration toggle:
- Toggles romanized Arabic pronunciation below each Arabic line
- On/off toggle with visual indicator
- Grouped with zoom and heart controls

**Design guide:** `mockups/VERTICAL_CONTROLS_DESIGN_GUIDE.md` on the PR #50 branch

**Note:** PR #49 also has a `transliteration_enabled` boolean in the `user_settings` database table, ready to persist user preference.

---

## 5. Intro / Main App Layout Mockups

### Where: PR #51

**Branch:** `cursor/intro-main-app-mockups-6919`

10 new full-app layout explorations (Options L through U):

| Option | Name | Description |
|---|---|---|
| L | Celestial Lens | Space/cosmic theme |
| M | Calligraphic Minimal | Calligraphy-focused clean layout |
| N | Bento Atlas | Bento box grid layout |
| O | Desert Horizon | Desert landscape aesthetic |
| P | Ink Mono | Monochrome ink wash style |
| Q | Glass Pavilion | Glass morphism architecture |
| R | Library Catalog | Card catalog / library metaphor |
| S | Rhythm Wave | Audio/rhythm visualization |
| T | Mosaic Tiles | Islamic geometric tile patterns |
| U | Scroll Story | Scroll-based narrative experience |

---

## 6. Base Layout Mockups (on `main`)

These 11 mockups are already merged and live in `mockups/`:

| Option | File | Focus |
|---|---|---|
| A | `option-a-refined-serendipity.html` | Refined random discovery |
| B | `option-b-elegant-discovery.html` | Elegant poem browsing |
| C | `option-c-scroll-clean.html` | Clean scroll layout |
| D | `option-d-scroll-exciting.html` | Dynamic scroll experience |
| E | `option-e-scroll-hybrid.html` | Hybrid scroll approach |
| F | `option-f-deco-frame-dropdown.html` | Decorative frame + dropdown |
| G | `option-g-scroll-refined-e-controls.html` | Refined scroll with controls |
| H | `option-h-minimal-deco.html` | Minimal decorative |
| I | `option-i-heavy-frame-inline-category.html` | Heavy frame + inline category |
| J | `option-j-heavy-frame-icon-only-category.html` | Heavy frame + icon-only category |
| K | `option-k-heavy-frame-book-category.html` | Heavy frame + book category (**chosen design**) |

---

## How to View Mockups Locally

```bash
# Base mockups (already on main)
open mockups/option-k-heavy-frame-book-category.html

# Vertical control bar mockups (PR #50)
git fetch origin copilot/explore-ui-controls-implementation
git checkout copilot/explore-ui-controls-implementation -- mockups/vertical-controls-*.html
open mockups/vertical-controls-option1-minimalist.html

# Auth UI screenshots (PR #49)
git fetch origin copilot/setup-user-authentication-sso
git show origin/copilot/setup-user-authentication-sso:docs/AUTH_UI_SCREENSHOTS.md

# Intro/main mockups (PR #51)
git fetch origin cursor/intro-main-app-mockups-6919
git checkout origin/cursor/intro-main-app-mockups-6919 -- mockups/option-l-*.html mockups/option-m-*.html
open mockups/option-l-celestial-lens.html
```

---

## Related GitHub Resources

| Resource | Link |
|---|---|
| PR #49 — Auth/SSO/Login/Save | https://github.com/lesmartiepants/poetry-bil-araby/pull/49 |
| PR #50 — Heart/Save/Zoom/Transliteration Controls | https://github.com/lesmartiepants/poetry-bil-araby/pull/50 |
| PR #51 — Intro/Main Mockups (L-U) | https://github.com/lesmartiepants/poetry-bil-araby/pull/51 |
| PR #53 — Mockup Preview Gallery | https://github.com/lesmartiepants/poetry-bil-araby/pull/53 |
| PR #59 — Design Review Page (MERGED) | https://github.com/lesmartiepants/poetry-bil-araby/pull/59 |
