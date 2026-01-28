# Authentication UI Screenshots Guide

This document provides a comprehensive visual guide to all authentication-related UI elements and screens in the Poetry Bil-Araby app.

## Table of Contents
1. [Desktop Views](#desktop-views)
2. [Mobile Views](#mobile-views)
3. [Authentication Flows](#authentication-flows)
4. [User-Specific Controls](#user-specific-controls)
5. [Updated UI (Latest Changes)](#updated-ui-latest-changes)

---

## Updated UI (Latest Changes)

### Desktop - New Button Layout
**Features:**
- "Learn" button (formerly "Dive In")
- Heart/Save button positioned after Discover
- Tighter spacing (52px min-width instead of 56px)
- All buttons fit comfortably in viewport

**Button Order:**
1. Listen
2. Learn (formerly "Dive In")
3. Discover
4. Save ❤️ (heart button - NEW POSITION)
5. _divider_
6. Copy
7. Local/Web toggle
8. Theme
9. Poets
10. Sign In / Account

### Mobile - Heart Functionality
Mobile views now show:
- Heart button in main view when Supabase is configured
- Tooltip "Sign in to save poems" when not authenticated
- Auth modal with Google and Apple OAuth options
- Responsive layout with tighter button spacing

---

## Desktop Views

### 1. Desktop - Not Signed In
**URL:** https://github.com/user-attachments/assets/a85dd901-7ba5-4f28-be6b-bb4c6bf387da

![Desktop Not Signed In](https://github.com/user-attachments/assets/a85dd901-7ba5-4f28-be6b-bb4c6bf387da)

**Key UI Elements:**
- **Control Bar (Bottom):** Shows all navigation controls
  - **Listen** - Play audio recitation
  - **Dive In** - Get AI insights
  - **Discover** - Fetch new poem
  - **Copy** - Copy poem to clipboard
  - **Save** ❤️ - Save to collection (grayed out when not signed in)
  - **Local/Web** - Toggle database/AI mode
  - **Theme** - Change theme and font
  - **Poets** - Filter by poet
  - **Sign In** 🔑 - Authentication button (visible when Supabase configured)

**State:** Not authenticated, Supabase is configured (env vars present)

---

### 2. Authentication Modal - Sign In Options
**URL:** https://github.com/user-attachments/assets/a8b5a2ac-727c-47d0-b282-24d1e5a142b0

![Auth Modal](https://github.com/user-attachments/assets/a8b5a2ac-727c-47d0-b282-24d1e5a142b0)

**Key UI Elements:**
- **Modal Title:** "مرحباً" (Welcome in Arabic)
- **Subtitle:** "Sign in to save poems and preferences"
- **Google OAuth Button:** "Continue with Google" with Google icon
- **Apple OAuth Button:** "Continue with Apple" with Apple icon
- **Terms Notice:** "By signing in, you agree to our Terms of Service and Privacy Policy"
- **Close Button:** X in top-right corner

**Trigger:** Clicking "Sign In" button in control bar

**Functionality:**
- Clicking Google button initiates OAuth flow via Supabase Auth
- Clicking Apple button initiates OAuth flow via Supabase Auth
- Modal closes on successful authentication
- Modal can be dismissed by clicking X or outside the modal

---

### 3. Save Button Tooltip - Not Signed In
**URL:** https://github.com/user-attachments/assets/f2c8e1cd-8ffb-40b5-a2ed-84c1582575a1

![Save Tooltip](https://github.com/user-attachments/assets/f2c8e1cd-8ffb-40b5-a2ed-84c1582575a1)

**Key UI Elements:**
- **Heart Button** ❤️ - Outline only (not filled) when poem is not saved
- **Tooltip:** "Sign in to save poems" appears above button
- **Label:** "Save" below the heart icon

**Trigger:** Clicking the Save button when not authenticated

**Functionality:**
- Tooltip appears for 2 seconds
- Prompts user to sign in to access save functionality
- Prevents unauthenticated users from attempting to save poems

---

## Mobile Views

### 4. Mobile - Not Signed In (Portrait)
**URL:** https://github.com/user-attachments/assets/3e19083c-c0fb-4e60-bd00-bbfb6157344e

![Mobile View](https://github.com/user-attachments/assets/3e19083c-c0fb-4e60-bd00-bbfb6157344e)

**Key UI Elements:**
- **Compact Control Bar:** Shows essential controls only
  - **Listen** - Audio playback
  - **Dive In** - Get insights
  - **Discover** - New poem
  - **More** ... - Overflow menu for additional options

**Note:** On mobile, less frequently used controls (Copy, Save, Theme, Poets, Sign In) are moved to the overflow menu to save space.

**Responsive Breakpoint:** Controls collapse to overflow menu when viewport width < 900px (approximately)

---

### 5. Mobile - Overflow Menu Expanded
**URL:** https://github.com/user-attachments/assets/8725f3e8-5ee0-46c4-9c6d-9f6afd11ed23

![Mobile Overflow Menu](https://github.com/user-attachments/assets/8725f3e8-5ee0-46c4-9c6d-9f6afd11ed23)

**Key UI Elements in Menu:**
- **نسخ (Copy)** - Copy poem to clipboard
- **قاعدة البيانات (Local Database)** - Toggle database/AI mode
- **الوضع النهاري (Theme)** - Change theme
- **تبديل الخط (Font)** - Cycle through fonts (shows current: "Amiri")
- **Poets Section:** List of available poets
  - كل الشعراء (All Poets)
  - نزار قباني (Nizar Qabbani)
  - محمود درويش (Mahmoud Darwish)
  - المتنبي (Al-Mutanabbi)
  - عنترة بن شداد (Antarah)
  - ابن عربي (Ibn Arabi)

**Note:** The overflow menu shows bilingual labels (Arabic + English) for all options.

**Additional Controls Not Shown in Screenshot:**
The Save and Sign In buttons also appear in this overflow menu when scrolled (menu is scrollable with `max-h-[80vh]`).

---

### 6. Mobile - Authentication Modal (NEW)

![Mobile Auth Modal](/tmp/mobile-auth-with-heart.png)

**Key Features:**
- Shows auth modal on mobile viewport
- Google and Apple OAuth buttons
- Arabic welcome message: "مرحباً"
- Terms and privacy policy notice
- Responsive modal design

**Trigger:** Clicking Sign In button on mobile

---

### 7. Mobile - Heart Button Tooltip (NEW)

![Mobile Heart Tooltip](/tmp/mobile-heart-tooltip.png)

**Key Features:**
- Heart button visible in mobile control bar
- Tooltip appears when not authenticated
- Message: "Sign in to save poems"
- Demonstrates save functionality on mobile

**Trigger:** Clicking heart button when not signed in

---

## Authentication Flows

### User Sign-In Flow
```
1. User clicks "Sign In" button (desktop) or in overflow menu (mobile)
   ↓
2. AuthModal opens with Google and Apple options
   ↓
3. User selects provider (Google or Apple)
   ↓
4. Redirect to OAuth provider (external)
   ↓
5. User authenticates with provider
   ↓
6. Redirect back to app with token
   ↓
7. Supabase Auth validates token
   ↓
8. User session established
   ↓
9. UI updates:
   - "Sign In" button → User avatar/icon
   - "Save" button becomes active (not grayed)
   - User settings loaded from database
   - Theme/font preferences applied
```

### User Sign-Out Flow
```
1. User clicks avatar/account button
   ↓
2. Dropdown menu appears with user email
   ↓
3. User clicks "تسجيل الخروج (Sign Out)"
   ↓
4. Supabase Auth clears session
   ↓
5. UI updates:
   - Avatar → "Sign In" button
   - "Save" button grays out
   - Settings revert to defaults (not persisted)
```

### Save Poem Flow

**When Not Signed In:**
```
1. User clicks heart button
   ↓
2. Tooltip appears: "Sign in to save poems"
   ↓
3. Tooltip auto-dismisses after 2 seconds
   ↓
4. No database action
```

**When Signed In:**
```
1. User clicks heart button (outline)
   ↓
2. savePoem() called
   ↓
3. INSERT into saved_poems table with:
   - user_id
   - poem_id (if DB poem) or poem_text (if AI poem)
   - poet, title, english, category metadata
   ↓
4. Heart fills with red color
   ↓
5. Label changes from "Save" to "Saved"
   ↓
6. Poem added to user's collection
```

**Unsave Flow:**
```
1. User clicks filled heart button
   ↓
2. unsavePoem() called
   ↓
3. DELETE from saved_poems where user_id and poem match
   ↓
4. Heart returns to outline
   ↓
5. Label changes from "Saved" to "Save"
```

---

## User-Specific Controls

### Save Button States

| State | Icon | Color | Label | Clickable | Action |
|-------|------|-------|-------|-----------|--------|
| Not signed in | Outline heart | Gold (#C5A059) | "Save" | Yes | Shows tooltip |
| Signed in, not saved | Outline heart | Gold (#C5A059) | "Save" | Yes | Saves poem |
| Signed in, saved | Filled heart | Red (#ef4444) | "Saved" | Yes | Unsaves poem |

### Auth Button States

| State | Icon | Label | Clickable | Action |
|-------|------|-------|-----------|--------|
| Not signed in | Login icon 🔑 | "Sign In" | Yes | Opens AuthModal |
| Signed in | User avatar or User icon | "Account" | Yes | Opens dropdown menu |

### Account Dropdown Menu (When Signed In)

**Contents:**
- **User Email:** Display user's email address
- **Sign Out Button:** 
  - Arabic: تسجيل الخروج
  - English: Sign Out
  - Icon: Logout icon

**Trigger:** Click on avatar/account button

**Position:** Appears above the account button (bottom-up dropdown)

---

## Settings Persistence

### Theme Preference
- **When Signed In:** Theme choice (dark/light) automatically saved to database
- **Auto-Save:** Debounced by 1 second after change
- **On App Start:** Theme loaded from `user_settings` table and applied
- **When Not Signed In:** Theme persists in component state only (resets on refresh)

### Font Preference
- **When Signed In:** Font choice automatically saved to database
- **8 Fonts Available:** Amiri, Alexandria, El Messiri, Lalezar, Rakkas, Fustat, Kufam, Katibeh
- **Auto-Save:** Debounced by 1 second after change
- **On App Start:** Font loaded from `user_settings` table and applied
- **When Not Signed In:** Font persists in component state only (resets on refresh)

### Future Settings (Database Ready)
- **voice_preference:** For selecting recitation voice (schema ready, UI not implemented)
- **transliteration_enabled:** Toggle Arabic transliteration display (schema ready, UI not implemented)

---

## Conditional Rendering

### When Supabase is NOT Configured
```env
# .env.local is missing or incomplete
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**UI Behavior:**
- ❌ "Sign In" button does NOT appear
- ❌ "Save" heart button does NOT appear
- ❌ AuthModal cannot be opened
- ✅ All other features work normally
- ✅ App is fully functional without authentication

### When Supabase IS Configured
```env
# .env.local has valid credentials
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**UI Behavior:**
- ✅ "Sign In" button appears in control bar
- ✅ "Save" heart button appears (grayed when not signed in)
- ✅ AuthModal can be opened
- ✅ OAuth flows work
- ✅ Settings persistence enabled
- ✅ Saved poems functionality enabled

---

## Technical Implementation Notes

### Components
- **AuthModal:** Modal dialog with Google/Apple OAuth buttons
- **AuthButton:** Sign In button or user avatar with dropdown
- **SavePoemButton:** Heart button with tooltip and saved state

### Hooks
- **useAuth():** Manages authentication state and OAuth methods
- **useUserSettings():** Handles settings persistence with auto-save
- **useSavedPoems():** Manages saved poems CRUD operations

### State Management
- Auth state persisted by Supabase Auth (sessions in localStorage)
- User settings synced to database with 1-second debounce
- Saved poems state updated in real-time on save/unsave

### Security
- Row Level Security (RLS) enforced on all tables
- Users can only access their own data
- OAuth handled securely by Supabase
- No credentials in client code

---

## Accessibility

### Keyboard Navigation
- All buttons are keyboard accessible (focusable)
- Modal can be closed with Escape key
- Dropdown menus close on outside click

### ARIA Labels
- `aria-label="Sign In"` on auth button
- `aria-label="Save poem"` / `aria-label="Unsave poem"` on heart button
- `aria-label="User Menu"` on avatar button
- `aria-label="Close"` on modal close button

### Screen Readers
- Bilingual labels (Arabic + English) for all controls
- Semantic HTML (buttons, headings, etc.)
- Proper focus management

---

## Browser Compatibility

### Tested Browsers
- ✅ Chrome/Chromium (Desktop + Mobile)
- ✅ Firefox (Desktop + Mobile)
- ✅ Safari (Desktop + Mobile)
- ✅ Edge (Desktop)

### OAuth Requirements
- Cookies must be enabled
- Third-party cookies may be required for OAuth
- Popup blockers should allow Supabase domain

---

## Summary

The authentication UI is designed to be:
- **Optional:** Works seamlessly with or without Supabase configuration
- **Unobtrusive:** Auth controls blend naturally with existing UI
- **Bilingual:** All labels in Arabic and English
- **Responsive:** Adapts to mobile with overflow menu
- **Accessible:** Keyboard navigation and ARIA labels
- **Secure:** OAuth via Supabase, RLS policies enforce data isolation

All auth-related UI elements follow the existing design system (colors, fonts, spacing) to maintain visual consistency.
