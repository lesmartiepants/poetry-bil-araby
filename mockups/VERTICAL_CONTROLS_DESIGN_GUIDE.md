# Vertical Control Bar Design Mockups

This document presents four distinct design approaches for implementing vertical control bars in the Poetry Bil-Araby application. Each design features three core controls: **Save to Collection** (heart button), **Text Zoom** (increase/decrease text size), and **Transliteration** (toggle romanized Arabic).

## Features Overview

All mockups include these three primary features:

1. **Heart/Save Button** - Save poems to a personal collection/library
2. **Text Zoom Controls** - Adjust poem text size (zoom in/out)
3. **Transliteration Toggle** - Show/hide romanized Arabic pronunciation

## Design Options

### Option 1: Minimalist (Jony Ive / Apple Design Philosophy)

**Philosophy:** "Simplicity is the ultimate sophistication"

**Characteristics:**
- Ultra-minimal aesthetic with maximum restraint
- Subtle glass morphism with 40px blur
- Monochromatic palette with low opacity (3-8%)
- Icons-only interface with hover tooltips
- Right-side placement for natural reading flow
- Extremely thin borders (1px at 6% opacity)
- Gentle hover animations (scale 1.05)
- Active state uses indigo accent with 15% opacity

**Design Principles:**
- Remove everything unnecessary
- Let content be the hero
- Provide just enough visual feedback
- Seamless integration with environment

**File:** `mockups/vertical-controls-option1-minimalist.html`
**Screenshot:** Option 1 shows controls on the right side with heart (active), zoom in/out, and transliteration icons

---

### Option 2: Material Design 3 (Google Design Philosophy)

**Philosophy:** "Material is the metaphor"

**Characteristics:**
- Left-side placement for balance
- Grouped controls with semantic sections
- Vibrant purple accent color (#d0bcff)
- Prominent labels ("COLLECT", "SIZE", "TEXT")
- Material ripple effects on interaction
- Badge indicators (e.g., saved count: 3)
- Larger touch targets (56x56px)
- Zoom feedback popover showing percentage
- Strong visual hierarchy with rounded corners (28px)
- Soft shadows for depth (8px blur, 40% opacity)

**Design Principles:**
- Tactile, grounded in reality
- Bold graphic design
- Meaningful motion
- Clear information hierarchy

**File:** `mockups/vertical-controls-option2-material.html`
**Screenshot:** Option 2 displays grouped controls on left with labels, badge counter, and Material Design styling

---

### Option 3: Notion/Linear (Clean Functionality Philosophy)

**Philosophy:** "Clean tools for focused work"

**Characteristics:**
- Right-side compact vertical bar
- Minimal spacing (1px gaps between controls)
- Small touch targets (40x40px)
- Icon-based with hover tooltips
- Subtle borders (8% opacity)
- Low-contrast glass effect (4% opacity)
- Clean sans-serif typography
- Counter badges for saved items
- Reset button for convenience
- Notion-style tooltips (dark, compact)
- A+/A- text size icons

**Design Principles:**
- Function over decoration
- Calm, focused interface
- Consistent spacing and rhythm
- Tooltip-driven discovery

**File:** `mockups/vertical-controls-option3-notion.html`
**Screenshot:** Option 3 features compact right-side bar with A+/A- zoom controls, heart with counter (7), and transliteration toggle

---

### Option 4: WILD CARD - Brutalist Maximalism (Terminal/Retro CRT)

**Philosophy:** "Form follows fiction - embrace the aesthetic"

**Characteristics:**
- Full-height left sidebar (200px width)
- Retro terminal/CRT aesthetic
- Monochrome green (#00ff00) on black
- System information header with live clock
- Categorized sections (ARCHIVE, DISPLAY, LANGUAGE)
- Hard borders and sharp corners
- Status indicators and counters (042 saved items)
- Footer with system stats (zoom %, mode, status)
- Scan line animation overlay
- Glowing text and box shadows
- Brutalist uppercase typography
- Courier New monospace font
- Button text labels for clarity
- Blinking active states

**Design Principles:**
- Aesthetic maximalism
- Nostalgic computing interface
- Information density
- Playful experimentation
- Breaking conventional UI rules

**File:** `mockups/vertical-controls-option4-wildcard.html`
**Screenshot:** Option 4 shows full-height terminal-style interface with green CRT aesthetic, system time, categorized controls, and status footer

---

## Implementation Notes

### Positioning
- **Option 1:** Right side, centered vertically
- **Option 2:** Left side, centered vertically
- **Option 3:** Right side, centered vertically
- **Option 4:** Left side, full height

### Accessibility
All options include:
- ARIA labels for screen readers
- Keyboard navigation support
- Touch-friendly targets (44px minimum)
- Visual feedback on interaction
- Tooltips for icon-only controls

### Responsiveness
- Mobile: Controls could collapse into bottom sheet or hamburger menu
- Tablet: Maintain vertical bar with adjusted sizing
- Desktop: Full vertical bar as shown

### Feature Details

#### Heart/Save Button
- Toggles saved state
- Shows counter in Options 2, 3, 4
- Active state animation (Option 1: heartbeat pulse)
- Persistent across sessions (localStorage)

#### Text Zoom
- 3 levels: 80%, 100%, 120%
- Smooth transitions
- Visual feedback (Option 2: percentage tooltip)
- Affects Arabic poem text only

#### Transliteration
- Shows romanized Arabic below each line
- Toggle on/off
- Reduced opacity (35-50%)
- Uses Latin script for pronunciation guide

---

## Recommended Implementation Path

1. **Start with Option 1 or 3** for production (clean, unobtrusive)
2. **Consider Option 2** if targeting mobile-first (larger targets, clear labels)
3. **Use Option 4** for special events, theme variations, or easter eggs

## Technical Stack

All mockups are:
- Pure HTML/CSS/JavaScript
- Self-contained and interactive
- Using existing project fonts (Amiri for Arabic)
- Compatible with current THEME constants
- Ready for component extraction

---

**Created:** January 2026  
**Project:** Poetry Bil-Araby  
**Repository:** lesmartiepants/poetry-bil-araby
