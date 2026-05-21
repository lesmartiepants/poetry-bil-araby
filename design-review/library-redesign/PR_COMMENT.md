<!--
  Paste-ready PR comment.
  Copy everything BELOW the line and paste into the PR comment box.
  Image URLs point to raw.githubusercontent.com on this branch and will render
  once this commit is on the remote.
-->

# 🎨 Library redesign — three design options · **mobile-first**

The "library feature" in this app is the **Saved Poems** modal (`src/components/auth/SavedPoemsView.jsx` — *قصائدي المحفوظة / My Saved Poems*). Below are three alternative directions, each delivered as a high-fidelity static mockup on **iPhone 14 Pro** (390 × 844, 3× DPI) and on desktop. All mockups use the project's existing tokens (gold `#C5A059`, lapis `#4A7CC9`, glass surfaces, `Reem Kufi` / `Amiri` / `Fustat` / `Bodoni Moda` / `Forum` / `Tajawal`). **No production code is changed.**

Full source + light variants + desktop shots: [`design-review/library-redesign/`](https://github.com/lesmartiepants/poetry-bil-araby/tree/copilot/redesign-library-feature/design-review/library-redesign).

![Mobile trio — A · B · C side-by-side](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/trio-dark.png)

---

## 📱 Option A — *Majlis* · مَجلِس
**iOS reader-style sheet · swipe-to-remove.** A quiet, library-of-rare-books feel. Big gold display title in `Reem Kufi`, italic `Bodoni Moda` subtitle, horizontally-scrolling poet/recency chips. Each saved poem is a "leaf" with Roman numeral, Arabic title, gold rule, and an `Amiri` excerpt; swiping left reveals a destructive **Remove** action (mid-gesture in the screenshot). Bottom tab bar uses Apple-style icon + caption with the `Library` tab in gold.

✅ Most reading-focused; lowest implementation cost.
⚠️ One column, no grouping or bulk actions.

| Dark | Light |
| :---: | :---: |
| ![Option A — mobile dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-a-majlis-dark.png) | ![Option A — mobile light](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-a-majlis-light.png) |

<details><summary>🖥️ Desktop variant</summary>

![Option A — desktop dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-a-majlis-dark.png)

</details>

---

## 📱 Option B — *Diwan Grid* · ديوان
**2-column mosaic · sticky search · multi-select bottom action bar.** A glassy header with `قَصائِدي · 12 / MY DIWAN`, persistent search + sort dropdown, and horizontally-scrolling poet chips. Tapping a tile's checkbox enters **selection mode**: a lapis bar shows `2 selected · Done` and the bottom tab bar morphs into a contextual action bar with **Export · Share · Pin · Remove** (Remove in destructive red). Selected tiles get a lapis border and tinted background.

✅ Scales gracefully to many poems; richest feature set; most native iOS multi-select pattern (Photos / Files).
⚠️ Highest implementation cost; smaller per-poem reading area.

| Dark | Light |
| :---: | :---: |
| ![Option B — mobile dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-b-diwan-grid-dark.png) | ![Option B — mobile light](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-b-diwan-grid-light.png) |

<details><summary>🖥️ Desktop variant</summary>

![Option B — desktop dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-b-diwan-grid-dark.png)

</details>

---

## 📱 Option C — *Khazana* · خَزانَة
**Native bottom sheet · half-snap · iOS swipe actions.** This is where Khazana feels most native. The library is a **bottom sheet** with a drag-handle and three snap points (peek / half / full); the currently-reading poem (here المتنبي · الكبر) stays softly visible behind the scrim so the user never loses their place. Pinned cards sit in a horizontal scroll strip with gold borders. Rows are grouped `Today · This week · Earlier` with `Forum`-serif uppercase labels. A row mid-screen demos **iOS trailing swipe actions** (blue **Pin**, red **Remove**), exactly like Mail / Messages.

✅ Best reading flow; pinning + time grouping = real personal treasury; sheet pattern is deeply iOS-native.
⚠️ Sheet snap-points are new to the app; require careful gesture wiring.

| Dark | Light |
| :---: | :---: |
| ![Option C — mobile dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-c-khazana-dark.png) | ![Option C — mobile light](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/mobile/option-c-khazana-light.png) |

<details><summary>🖥️ Desktop variant</summary>

![Option C — desktop dark](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-c-khazana-dark.png)

</details>

---

### Mobile-pattern matrix

| | A · Majlis | B · Diwan Grid | C · Khazana |
| :--- | :---: | :---: | :---: |
| Sheet style | Full-screen page | Full-screen page | Bottom sheet · 3 snap points |
| Primary list | 1-col card stack | 2-col mosaic | Time-grouped rows |
| Per-item gesture | Swipe-to-remove | Tap → checkbox | iOS trailing (Pin · Remove) |
| Bulk actions | — | ✅ contextual action bar | — |
| Pinned strip | — | featured tile | ✅ horizontal scroll |
| Reader-flow preserved | tab bar | tab bar | ✅ poem visible behind sheet |
| Native iOS analogue | Apple News / Books | Photos / Files multi-select | Apple Music / Maps |

### Recommendation
- **Ship one:** Option **C** (Khazana) as the primary on mobile — the bottom-sheet pattern is the most native and uniquely preserves the reading flow. Layer in Option **B**'s contextual action bar once a user has > ~10 saved poems.
- **Smallest diff:** Option **A** (Majlis) — a near drop-in replacement for the current `SavedPoemsView` that brings typography in line with the main poem view.

cc reviewers — happy to iterate on whichever direction resonates. Tap the dark/light toggles in your favourite mockup HTML to preview the alternate palette.
