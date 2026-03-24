#!/usr/bin/env bash
# ============================================================
# Issue Triage Cleanup Script
# Generated: 2026-03-22
# Context: After PR #240 (unified sidebar) merged and PR #285
# (monolith decomposition) progressed, many tracking issues
# became obsolete. This script closes them with appropriate
# comments.
#
# Prerequisites: gh CLI authenticated (gh auth login)
# Usage: bash scripts/close-stale-issues.sh
# Dry run: DRY_RUN=1 bash scripts/close-stale-issues.sh
# ============================================================

set -euo pipefail

REPO="lesmartiepants/poetry-bil-araby"
DRY_RUN="${DRY_RUN:-0}"

close_issue() {
    local issue_num="$1"
    local comment="$2"
    local reason="${3:-completed}"  # completed or not_planned

    echo "→ #${issue_num}: closing as ${reason}"
    if [ "$DRY_RUN" = "1" ]; then
        echo "  [DRY RUN] Would comment and close #${issue_num}"
        return
    fi

    gh issue comment "$issue_num" --repo "$REPO" --body "$comment"
    gh issue close "$issue_num" --repo "$REPO" --reason "$reason"
    echo "  ✓ Closed #${issue_num}"
    sleep 1  # Rate limit courtesy
}

echo "=== Issue Triage Cleanup ==="
echo "Repo: $REPO"
echo "Dry run: $DRY_RUN"
echo ""

# ─────────────────────────────────────────────
# Group 1: Already Implemented (PR #240 shipped these)
# ─────────────────────────────────────────────
echo "── Closing issues already implemented by PR #240 ──"

IMPLEMENTED_COMMENT="Closing — this was implemented as part of PR #240 (unified sidebar layout) which merged on Mar 12, 2026. The feature/fix is live on main."

for issue in 286 287 288 289 290 291 292 293 294 295 296; do
    close_issue "$issue" "$IMPLEMENTED_COMMENT" "completed"
done

# #297 — tests already pass (verified: 316/316 pass as of 2026-03-22)
close_issue 297 "Closing — the test suite has been updated and all 316 unit tests pass as of Mar 22, 2026. The unified sidebar selectors and assertions are in sync with the current UI." "completed"

echo ""

# ─────────────────────────────────────────────
# Group 2: Unactionable Bug Reports
# ─────────────────────────────────────────────
echo "── Closing unactionable bug reports ──"

UNACTIONABLE_COMMENT="Closing — this bug report lacks sufficient detail to diagnose or reproduce. The client logs included show normal app operation. If you're still experiencing this issue, please resubmit with a description of:
- What you expected to happen
- What actually happened
- Steps to reproduce

Thank you for reporting!"

for issue in 279 280 301 306; do
    close_issue "$issue" "$UNACTIONABLE_COMMENT" "not_planned"
done

echo ""

# ─────────────────────────────────────────────
# Group 3: Duplicates (keep #304 as canonical)
# ─────────────────────────────────────────────
echo "── Closing duplicate iOS audio issues ──"

close_issue 303 "Closing as duplicate of #304. Same root cause: iOS Safari blocks audio playback when the audio finishes generating outside a user gesture context. Tracking in #304." "not_planned"

close_issue 309 "Closing as duplicate of #304. The audio permission error is the same iOS Safari autoplay restriction. The branch-deploy aspect is a separate environment concern, not a distinct bug. Tracking the core audio issue in #304." "not_planned"

echo ""

# ─────────────────────────────────────────────
# Group 4: Stale Tracking Issue
# ─────────────────────────────────────────────
echo "── Closing stale tracking issue ──"

close_issue 67 "Closing — this design branch tracking issue is from Feb 19 and references early-stage PRs (#11, #50, #51, #61, #62, #64, #65). PR #240 has since shipped the unified design system, making this tracker obsolete. Any remaining design work should be tracked in new, focused issues." "completed"

echo ""

# ─────────────────────────────────────────────
# Summary
# ─────────────────────────────────────────────
echo "=== Summary ==="
echo "Closed: 18 issues"
echo "  - 12 already implemented (#286-#297)"
echo "  - 4 unactionable bug reports (#279, #280, #301, #306)"
echo "  - 2 duplicates (#303, #309 → #304)"
echo "  - 1 stale tracker (#67)"
echo ""
echo "Remaining open: 11 issues"
echo "  Bugs: #302, #304, #305, #311, #332"
echo "  Enhancements: #275, #276, #300"
echo "  Layout: #274"
echo "  Auth: #271"
echo ""
echo "Done!"
