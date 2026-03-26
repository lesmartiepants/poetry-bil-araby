# Controls Redesign — Sprint Plan

> Issue: #370 | Branch: `controls/sprint-controls-redesign`

## Three-Zone Layout

### Zone 1: Right Strip (VerticalSidebar.jsx)
4 buttons, always visible, no collapse: Copy, Share, Save (heart), User (Radix Popover)

### Zone 2: Top-Left Display Pill (TextSettingsPill.jsx)
Radix Popover trigger showing live state. Expands to: Translation, Romanize, Text Size (Radix ToggleGroup), Font (Radix Select with خط عربي preview)

### Zone 3: Top-Right Theme Toggle (ThemeToggle.jsx)
Sun/Moon button below header wordmark

## New Dependency
- `radix-ui` — Popover, ToggleGroup, Select (accessible, RTL-aware, unstyled)
