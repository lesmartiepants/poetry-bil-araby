# Design Review Output

This directory contains design explorations and iterative review workflow for UI components.

## 📁 Directory Structure

```
design-review-output/
├── splash/                              # Splash screen component
│   ├── round-1/                        # Initial design exploration
│   │   ├── interactive-review.html    # Full comparison matrix interface
│   │   ├── master-comparison.html     # Gallery view of all themes
│   │   ├── streamlined-review.html    # Side-by-side review with keyboard nav
│   │   ├── design-review.json         # Exported feedback and selections
│   │   ├── design-review.md           # Design analysis documentation
│   │   ├── current-state/             # Baseline screenshots (shared)
│   │   │   ├── 1-aurora-splash-full.png
│   │   │   ├── 2-constellation-walkthrough.png
│   │   │   └── ...
│   │   ├── aurora/                    # Individual design theme
│   │   │   ├── visual-comparison.html # Theme-specific review page
│   │   │   ├── design-analysis.md     # Theme documentation
│   │   │   ├── readme.md
│   │   │   ├── mockups/               # Static PNG screenshots
│   │   │   │   ├── option-1-refined-dark.png
│   │   │   │   ├── option-1-refined-light.png
│   │   │   │   └── ...
│   │   │   └── previews/              # Interactive HTML previews
│   │   │       ├── option-1-refined.html
│   │   │       ├── option-2-cinematic.html
│   │   │       └── option-3-minimal.html
│   │   ├── constellation/             # Same structure
│   │   ├── geometric/
│   │   ├── ink/
│   │   ├── light/
│   │   ├── mandala/
│   │   ├── manuscript/
│   │   ├── particles/
│   │   └── zen/
│   │
│   ├── round-2/                        # Second iteration based on feedback
│   │   ├── FEEDBACK-FROM-ROUND-1.json # Copy of round-1/design-review.json
│   │   ├── interactive-review.html
│   │   ├── streamlined-review.html
│   │   ├── design-review.json         # New feedback from round 2
│   │   ├── round-2-themes.json        # Generated theme config
│   │   ├── README.md                  # Round-specific instructions
│   │   ├── aurora/                    # Only themes that need revision
│   │   │   ├── mockups/
│   │   │   │   ├── option-1-refined-v2-dark.png
│   │   │   │   ├── option-4-twinkling-dark.png
│   │   │   │   └── ...
│   │   │   └── previews/
│   │   │       ├── option-1-refined-v2.html
│   │   │       ├── option-4-twinkling.html
│   │   │       └── ...
│   │   └── constellation/
│   │
│   ├── round-3/                        # Third iteration
│   │   └── ...
│   │
│   └── final/                          # Approved final designs
│       ├── selected-designs.json
│       ├── aurora-option-1-refined.html
│       ├── constellation-option-2-minimal.html
│       └── mockups/
│           ├── aurora-option-1-refined-dark.png
│           └── ...
│
├── control-bar/                         # Future component - same structure
│   ├── round-1/
│   └── final/
│
└── scripts/                             # Shared utilities
    ├── start-new-round.js              # Create new round directory
    ├── finalize-designs.js             # Copy approved designs to final/
    ├── capture-template.js             # Generic screenshot capture
    ├── MIGRATION-GUIDE.md              # Guide for updating old scripts
    └── config/
        ├── splash-themes.json          # Theme configuration
        └── splash-round-2-themes.json  # Generated per-round configs
```

## 🔄 Iterative Design Workflow

### Phase 1: Initial Exploration (Round 1)

1. **Create initial designs** - Build HTML preview files in `splash/round-1/[theme]/previews/`
2. **Capture screenshots** - Run `node scripts/capture-template.js splash [theme] --round=1`
3. **Review designs** - Open `splash/round-1/streamlined-review.html` in browser
4. **Provide feedback** - Use keyboard shortcuts to navigate, mark keepers, add notes
5. **Export selections** - Click "Export" button → saves `design-review.json`

### Phase 2: Refinement (Round 2+)

1. **Start new round** - Run `node scripts/start-new-round.js splash 2`
   - Creates `splash/round-2/` directory structure
   - Copies previous feedback as `FEEDBACK-FROM-ROUND-1.json`
   - Auto-detects themes needing work based on feedback
   - Creates theme directories with `mockups/` and `previews/` folders

2. **Read feedback** - Review `FEEDBACK-FROM-ROUND-1.json` to understand requested changes

3. **Create refined designs** - Build new HTML previews based on feedback
   - Example feedback: *"bring back the brand title from particles, make constellations twinkling"*
   - Action: Create `constellation/previews/option-1-twinkling-v2.html`

4. **Capture screenshots** - Run `node scripts/capture-template.js splash constellation --round=2`

5. **Review & repeat** - Open `splash/round-2/streamlined-review.html`, provide feedback, export

### Phase 3: Finalization

1. **Finalize approved designs** - Run `node scripts/finalize-designs.js splash`
   - Auto-detects latest round
   - Reads `design-review.json` to find "kept" selections
   - Copies approved preview HTML and mockup PNGs to `splash/final/`
   - Generates `selected-designs.json` summary

2. **Integration** - Final designs are now ready to integrate into the app

## 🛠️ Command Reference

### Start New Round

```bash
node scripts/start-new-round.js <component> <round-number>

# Example
node scripts/start-new-round.js splash 2
node scripts/start-new-round.js control-bar 1
```

### Capture Screenshots

```bash
node scripts/capture-template.js <component> <theme> [--round=N]

# Examples
node scripts/capture-template.js splash aurora --round=1
node scripts/capture-template.js splash constellation --round=2
node scripts/capture-template.js control-bar primary --round=1

# Default round is 1 if not specified
node scripts/capture-template.js splash zen
```

### Finalize Approved Designs

```bash
node scripts/finalize-designs.js <component> [--round=N]

# Examples
node scripts/finalize-designs.js splash              # Auto-detects latest round
node scripts/finalize-designs.js splash --round=2   # Specific round
node scripts/finalize-designs.js control-bar
```

### Batch Capture All Themes

```bash
# Capture all themes in a round
for theme in aurora constellation geometric ink light mandala manuscript particles zen; do
  node scripts/capture-template.js splash $theme --round=1
done
```

## 🎨 Review Interfaces

### Streamlined Review (`streamlined-review.html`)
**Best for:** Sequential review with easy navigation

- **Keyboard shortcuts**: Arrow keys (themes), 1/2/3 (options), K (keep), N (note)
- **Features**: Side-by-side comparison, note modal, localStorage persistence
- **Use case**: Step through each theme methodically

### Interactive Review (`interactive-review.html`)
**Best for:** Comparison matrix with filtering

- **Features**: Filter by complexity/speed/themes, side-by-side table view, feedback modal
- **Use case**: Compare options across multiple dimensions

### Master Comparison (`master-comparison.html`)
**Best for:** High-level overview

- **Features**: Gallery cards with quick stats, links to theme pages
- **Use case**: Navigate to specific themes quickly

## 📝 Feedback & Selection Format

### Exported JSON Structure

```json
{
  "timestamp": "2026-01-17T11:49:50.471Z",
  "summary": {
    "totalThemes": 9,
    "keptCount": 17,
    "notesCount": 17
  },
  "selections": [
    {
      "key": "particles-1",
      "theme": "Particle Field",
      "option": "Refined Particles",
      "description": "Improved hierarchy with larger title",
      "note": "love the slow animation, but miss the brand logo"
    }
  ],
  "allNotes": {
    "particles-1": "love the slow animation, but miss the brand logo",
    "constellation-1": "bring back the brand title from particles..."
  }
}
```

### How Notes Drive Next Round

Claude reads your notes and:
1. **Parses specific requests** - "bring back brand title from particles"
2. **Cross-references files** - Reads `particles/previews/option-1.html`
3. **Extracts components** - Copies title HTML/CSS
4. **Creates refined version** - New file in `round-2/constellation/previews/`
5. **Generates screenshots** - Captures for review

## 🎯 Adding New Components

### Bootstrap a New Component

```bash
# 1. Create component directory structure
mkdir -p design-review-output/control-bar/round-1

# 2. Copy review templates from splash
cp splash/round-1/*.html control-bar/round-1/

# 3. Create theme folders
mkdir -p control-bar/round-1/primary/{mockups,previews}
mkdir -p control-bar/round-1/secondary/{mockups,previews}

# 4. Create theme config
cat > scripts/config/control-bar-themes.json <<EOF
{
  "component": "control-bar",
  "themes": [
    { "id": "primary", "name": "Primary Style", "description": "..." },
    { "id": "secondary", "name": "Secondary Style", "description": "..." }
  ]
}
EOF

# 5. Create HTML previews in theme/previews/ folders

# 6. Capture screenshots
node scripts/capture-template.js control-bar primary --round=1

# 7. Review and iterate!
```

## 🔧 Customization

### Review HTML Files

All three review HTML files (`interactive-review.html`, `master-comparison.html`, `streamlined-review.html`) use:
- **Relative paths** - `./theme/mockups/`, `./theme/previews/`
- **Dynamic theme discovery** - Scans directory structure
- **localStorage** - Persists state across page refreshes

To customize:
- Edit HTML files in `splash/round-1/`
- Changes apply to current round only
- New rounds copy templates from previous round

### Capture Script

`scripts/capture-template.js` can be customized:
- **Viewport size** - Default: `1920x1080`
- **Wait times** - Animation settle time: `1500ms`
- **Theme toggle selector** - Searches: `button[class*="theme"]`, `.theme-toggle`
- **Screenshot options** - `fullPage: false` (captures viewport only)

## 📚 Documentation

- **`scripts/MIGRATION-GUIDE.md`** - Migrating from old capture scripts
- **`splash/round-1/design-review.md`** - Original design analysis
- **`splash/round-N/README.md`** - Round-specific instructions (auto-generated)

## 🤝 Agent Integration

The **ui-ux-reviewer agent** (`.claude/agents/ui-ux-reviewer.md`) is configured to:
- Understand the round-based structure
- Bootstrap new components automatically
- Generate designs based on feedback JSON
- Capture screenshots and organize files
- Create review HTML interfaces

See agent documentation for details.

## 🔍 Troubleshooting

### Review pages show 404 for images/iframes
- Check that theme folders exist at same level as HTML file
- Verify preview HTML files exist in `theme/previews/`
- Check browser console for exact missing paths

### Capture script fails
- Ensure `theme/previews/` directory exists with HTML files
- Check that Playwright browsers are installed: `npx playwright install chromium`
- Verify HTML file has valid `file://` path

### Can't find theme toggle button
- Script looks for: `button[class*="theme"]`, `button[id*="theme"]`, `.theme-toggle`
- Add one of these selectors to your HTML
- Or update selector in `capture-template.js`

### localStorage not persisting
- Review interface uses `localStorage.setItem('design-review-state', ...)`
- Each round has same key - manually clear if needed: Dev Tools → Application → Local Storage
- Or use different browser profiles for different rounds

## 📊 Statistics

**Splash Component - Round 1:**
- 9 design themes
- 27 design options total
- 17 kept selections
- 17 detailed feedback notes
- 54 mockup screenshots (dark + light)

---

**Need Help?** Open an issue or check the [MIGRATION-GUIDE.md](scripts/MIGRATION-GUIDE.md) for common scenarios.
