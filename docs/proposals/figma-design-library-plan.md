# Plan: Create Figma Design Library for Poetry Bil-Araby

## Context

Poetry Bil-Araby is a React + Tailwind app with a rich, well-defined design system (gold accent, dark/light themes, Arabic typography, ornamental frames) but has zero Figma assets. The goal is to create a new Figma file that serves as the project's **design library** — capturing all colors, typography, spacing, and UI component structures so the team can design from Figma going forward.

## Approach: Figma Plugin

The Figma REST API can't create files or visual nodes — only the **Plugin API** can do that. We'll create a local Figma plugin that, when run inside a new Figma file, generates the entire design library automatically.

**Why a plugin vs manual?** The design system has 20+ colors across 2 modes, 12+ fonts, 15+ components — doing this by hand would take hours. A plugin does it in seconds and can be re-run as the design evolves.

## What the Plugin Creates

### Page 1: Color Styles
- **Variable collection** "Theme" with two modes: Dark / Light
- Color variables for: `gold`, `bg-app`, `text-primary`, `glass`, `border`, `shadow`, `brand-bg`, `brand-border`, `btn-primary`, `error`, `indigo-*` variants
- Visual swatches grid: 80x80 rectangles with color name + hex labels
- All colors registered as **Figma color styles** for library publishing

### Page 2: Typography
- **Text styles** for every type scale defined in `design.js` and `theme.js`:
  - Brand: Reem Kufi (Arabic), Forum (English)
  - Poem title, poet name, verse Arabic, verse transliteration, verse English
  - UI: body, caption, label sizes
- Font specimens showing each of the 12 Google Fonts used
- Size scale reference (S / M / L / XL multipliers)

### Page 3: Spacing & Sizing
- Spacing scale visualization (4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px)
- Border radius tokens (`rounded-2xl` = 16px)
- Touch target reference (44x44 min)
- Safe area inset reference

### Page 4: Icons
- Grid of all 19 Lucide icons used in the app
- Imported as SVG components (Bug, Check, ChevronLeft, ChevronRight, Copy, Flame, Languages, Lightbulb, Loader2, LogOut, Moon, ScrollText, Settings2, Share2, Sun, UserRound, Sparkles, ArrowRight, Feather)

### Page 5: Components
Frame-based representations of key UI components:
- **PoemCard** — ornamental gold frame, title, poet, verse pairs, genre tags
- **VerticalSidebar** — icon buttons, collapsible sections, settings panel
- **DiscoverDrawer** — poet list with search, category filter
- **InsightsDrawer** — mobile bottom sheet with AI interpretation
- **DesktopInsightPane** — right panel with gradient bg
- **ShareCardModal** — share card with QR code area
- **SplashScreen** — brand text, star field background
- **ErrorBanner** — red error strip
- **AuthModal** — sign-in buttons (Google, Apple)
- **Navigation Controls** — prev/next buttons

### Page 6: Layout Reference
- Desktop layout diagram (sidebar + main + insight pane)
- Mobile layout diagram (full-width + bottom drawers)
- Responsive breakpoint annotations (768px)

## Implementation Steps

0. **Create worktree & save plan** on a new branch `figma-design-library`
   - Create a git worktree from the poetry-bil-araby repo
   - Save this plan as `docs/figma-design-library-plan.md`
   - Commit it as the first commit on the branch

1. **Create plugin scaffold** at `figma-plugin/` (in the worktree)
   - `manifest.json` — plugin metadata
   - `code.ts` — main plugin logic

2. **Implement token generators** in `code.ts`:
   - `createColorVariables()` — variable collection with dark/light modes
   - `createColorStyles()` — paint styles for each color
   - `createTextStyles()` — text styles for each typography level
   - `createColorSwatchPage()` — visual swatch grid
   - `createTypographyPage()` — type specimens
   - `createSpacingPage()` — spacing scale
   - `createIconPage()` — icon grid (SVG nodes)
   - `createComponentPage()` — component frames with auto-layout
   - `createLayoutPage()` — layout diagrams

3. **Build the plugin** — compile TS to JS (or write directly in JS for simplicity)

4. **User runs it**:
   - Open Figma desktop → Create new file
   - Plugins → Development → Import plugin from manifest
   - Point to `~/Github/poetry-bil-araby/figma-plugin/manifest.json`
   - Run the plugin → entire library is generated
   - Publish as team library from the file

## Key Files Referenced

| Source file | What we extract |
|---|---|
| `src/constants/theme.js` | All color tokens (THEME.dark, THEME.light, GOLD) |
| `src/constants/design.js` | Typography scales (DESIGN, BRAND, POEM_META), spacing, sizing |
| `src/constants/fonts.js` | Font family definitions and Arabic labels |
| `src/index.css` | CSS variables (--gold, --bg-app), base styles |
| `src/styles/app.css` | Animation keyframes, utility classes |
| `tailwind.config.js` | Extended colors, font families |
| `src/components/*.jsx` | Component structure for frame creation |

## Verification

1. Import the plugin in Figma Desktop
2. Create a blank file, run the plugin
3. Verify all 6 pages are generated with correct content
4. Check color variables have both dark/light mode values
5. Check text styles use the correct Google Fonts
6. Publish as team library and verify styles appear in other files
