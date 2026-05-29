#!/usr/bin/env bash
# Creates a focused PR for the Aa-settings design links feature.
# Run from the repo root on a clean working tree:  bash scripts/create-aa-settings-pr.sh
#
# NOTE: Do NOT use `git cherry-pick 1967185 9dbbba8` — those commits were based on the
# 266-line version of TextSettingsPill.jsx. main is now 519 lines (Background + Sparkles
# sections added in #485-490), so cherry-pick would place the links in the wrong position
# (after Highlight Style, not at the end). This script inserts them correctly before
# </Popover.Content>.
set -euo pipefail

BRANCH="fix/aa-settings-links"
FILE="src/components/TextSettingsPill.jsx"

echo "→ Fetching latest main..."
git fetch origin main

echo "→ Creating branch '$BRANCH' from origin/main..."
git checkout -b "$BRANCH" origin/main

echo "→ Applying design-links patch to $FILE..."
python3 - <<'PYEOF'
import re

with open("src/components/TextSettingsPill.jsx", "r") as f:
    content = f.read()

# 1. Add Palette and Hexagon to the lucide-react import
content = re.sub(
    r"(import \{[^}]+)(ExternalLink, Sparkles)(\s*\} from 'lucide-react';)",
    r"\1\2, Palette, Hexagon\3",
    content,
)

# 2. Insert Design Links section just before </Popover.Content>
design_links_block = """
            {/* Design Links */}
            <div
              className="mt-3 pt-3"
              style={{
                borderTop: `1px solid ${darkMode ? 'rgba(197,160,89,0.15)' : 'rgba(197,160,89,0.25)'}`,
              }}
            >
              <a
                href="/design-review"
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 opacity-60 hover:opacity-100 border border-transparent hover:border-gold/30`}
                style={{ color: gold, textDecoration: 'none' }}
              >
                <Palette size={14} style={{ color: gold }} />
                <span>Design Review</span>
              </a>
              <a
                href="/geometric-explorer"
                className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all duration-200 mt-1 opacity-60 hover:opacity-100 border border-transparent hover:border-gold/30`}
                style={{ color: gold, textDecoration: 'none' }}
              >
                <Hexagon size={14} style={{ color: gold }} />
                <span>Geometric Explorer</span>
              </a>
            </div>"""

# Insert before the first </Popover.Content>
content = content.replace(
    "          </Popover.Content>",
    design_links_block + "\n          </Popover.Content>",
    1,  # replace only the first occurrence
)

with open("src/components/TextSettingsPill.jsx", "w") as f:
    f.write(content)

print("Patch applied.")
PYEOF

echo "→ Staging and committing..."
git add "$FILE"
git commit -m "$(cat <<'EOF'
feat(design): add Design Review and Geometric Explorer links to Aa settings

Adds two navigation links at the bottom of the Aa settings popover:
- Design Review (/design-review)
- Geometric Explorer (/geometric-explorer)

Links open in the same tab so the browser back button returns to the poem view.

Co-authored-by: Siraj <lesmartiepants@users.noreply.github.com>
EOF
)"

echo "→ Pushing..."
git push origin "$BRANCH"

echo "→ Creating PR..."
gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "feat(design): add Design Review and Geometric Explorer links to Aa settings" \
  --body "$(cat <<'EOF'
## Summary

- Adds **Design Review** and **Geometric Explorer** nav links to the bottom of the Aa settings popover (`TextSettingsPill.jsx`)
- Both links open in the **same tab** — no `target="_blank"` — so the browser back button returns to the poem view
- Imports `Palette` and `Hexagon` icons from lucide-react

## Changed files

- `src/components/TextSettingsPill.jsx`

## Test plan

- [ ] Open the Aa settings popover (Ⓐ pill in the toolbar)
- [ ] Click **Design Review** — opens `/design-review` in the same tab, back button returns to poems
- [ ] Click **Geometric Explorer** — opens `/geometric-explorer` in the same tab, back button returns to poems
- [ ] Verify both icons render correctly in dark and light mode
- [ ] Run `npm run test:run` — confirm no regressions

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"

echo ""
echo "Done! PR created for branch '$BRANCH'."
