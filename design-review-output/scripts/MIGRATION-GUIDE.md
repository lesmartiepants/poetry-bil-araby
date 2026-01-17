# Capture Scripts Migration Guide

## 🎯 Overview

The design review system has been reorganized with a round-based structure. **Old capture scripts** in `/scripts` and `/design-review-output/scripts` are now **deprecated**.

Use the new **generic capture script** instead: `scripts/capture-template.js`

## Old vs New

### ❌ Old Approach (Deprecated)

```bash
# Scattered scripts with hardcoded paths
scripts/capture-aurora-options.js
scripts/capture-constellation-updated.js
design-review-output/scripts/capture-mandala-andalusian.js
... (26 total scripts)
```

Each script had:
- Hardcoded output paths
- Specific mockup IDs
- Manual dark/light mode logic
- No round awareness

### ✅ New Approach (Use This)

```bash
# One generic script that works for any component/theme/round
node scripts/capture-template.js <component> <theme> [--round=N]
```

The new script:
- Auto-discovers HTML files in `previews/` folder
- Automatically captures dark and light modes
- Supports round-based structure
- Works with any component type

## Examples

### Capture Round 1 Designs

```bash
# Capture all aurora options from round 1
node scripts/capture-template.js splash aurora --round=1

# Capture constellation from round 1
node scripts/capture-template.js splash constellation --round=1
```

### Capture Round 2 Designs

```bash
# After creating round 2 and adding new HTML previews
node scripts/capture-template.js splash aurora --round=2
node scripts/capture-template.js splash geometric --round=2
```

### Future: Control Bar Component

```bash
# Same script works for different components
node scripts/capture-template.js control-bar primary --round=1
node scripts/capture-template.js control-bar secondary --round=1
```

## How It Works

1. **Auto-Discovery**: Scans `component/round-N/theme/previews/` for HTML files
2. **Naming Convention**: Generates `mockups/[basename]-dark.png` and `[basename]-light.png`
3. **Theme Toggle Detection**: Automatically finds and clicks theme toggle buttons
4. **Smart Defaults**: Uses round=1 if not specified

## Migration Path for Old Scripts

If you have old capture scripts that you need to preserve:

1. **Don't delete them yet** - they may have custom logic worth keeping
2. **Review the logic** - see if anything special is needed
3. **Add to capture-template.js** - extend the generic script if needed
4. **Test thoroughly** - ensure screenshots match expectations
5. **Archive old scripts** - move to `scripts/archive/` when confirmed working

## Batch Capture

For capturing all themes in a round:

```bash
# Create a simple wrapper script
for theme in aurora constellation geometric ink light mandala manuscript particles zen; do
  echo "Capturing $theme..."
  node scripts/capture-template.js splash $theme --round=1
done
```

Or use the theme config:

```bash
# Read from config and capture all themes
node scripts/capture-all.js splash --round=1
```

(Note: `capture-all.js` can be created to read from `config/splash-themes.json` and loop through themes)

## Need Help?

- **Script fails**: Check that `component/round-N/theme/previews/` exists and has HTML files
- **No light mode**: Script will warn if no theme toggle button is found
- **Path issues**: Make sure you're running from the project root
- **Round not found**: Use `node scripts/start-new-round.js` to create a new round first
