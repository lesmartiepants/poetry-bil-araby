<!--
  Paste-ready PR comment.
  Copy everything BELOW the line and paste into the PR comment box.
  The image URLs point to raw.githubusercontent.com on this branch,
  so they will render once this commit is pushed.
-->

# 🎨 Library redesign — three design options

The "library feature" in this app is the **Saved Poems** modal (`src/components/auth/SavedPoemsView.jsx` — *قصائدي المحفوظة / My Saved Poems*). Below are three alternative design directions for it. All mockups are static HTML using the project's existing tokens (gold `#C5A059`, lapis `#4A7CC9`, glass surfaces, `rounded-2xl`, `Reem Kufi` / `Amiri` / `Fustat` / `Bodoni Moda` / `Forum` / `Tajawal`). **No production code is changed in this PR.**

Full write-up, source, and light-mode shots: [`design-review/library-redesign/`](https://github.com/lesmartiepants/poetry-bil-araby/tree/copilot/redesign-library-feature/design-review/library-redesign).

---

## ✨ Option A — *Majlis* · مَجلِس
**Editorial card stack — gold hairlines, serif-heavy.** A quiet, library-of-rare-books direction. Each saved poem is a "leaf" with a Roman numeral, a gold `Reem Kufi` Arabic title, the poet in `Fustat`, a 60px gold rule, then an `Amiri` excerpt. Hover reveals a *read · share · remove* triad.

✅ Lowest cost; matches the editorial DNA of the existing poem view.
⚠️ One column, no grouping or bulk actions — less "collection-like".

![Option A — Majlis (dark)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-a-majlis-dark.png)

<details><summary>Light mode</summary>

![Option A — Majlis (light)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-a-majlis-light.png)

</details>

---

## 🧱 Option B — *Diwan Grid* · ديوان
**Mosaic tile board · multi-select · search & sort.** A 3-column tile mosaic with one featured tile, a real search, poet-filter chips, a sort dropdown, and a lapis selection bar that exposes **Export · Share · Remove** for bulk actions.

✅ Scales to many poems; adds the most missing capabilities (search, sort, multi-select, export).
⚠️ Highest implementation cost; less reading-focused.

![Option B — Diwan Grid (dark)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-b-diwan-grid-dark.png)

<details><summary>Light mode</summary>

![Option B — Diwan Grid (light)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-b-diwan-grid-light.png)

</details>

---

## 🗝️ Option C — *Khazana* · خَزانَة
**Right-side drawer · timeline grouping · pinned favourites.** Slides in from the right and leaves the current poem visible behind a soft scrim, so the reader never loses their place. Pinned favourites live in a horizontal strip; the rest are grouped by *Today · This week · Earlier*. Hover reveals inline `Read · Pin · Remove` chips per row.

✅ Best for the reading flow; pinning + time grouping feel like a real personal treasury.
⚠️ Drawer pattern is new to the app and needs careful mobile work.

![Option C — Khazana (dark)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-c-khazana-dark.png)

<details><summary>Light mode</summary>

![Option C — Khazana (light)](https://raw.githubusercontent.com/lesmartiepants/poetry-bil-araby/copilot/redesign-library-feature/design-review/library-redesign/screenshots/option-c-khazana-light.png)

</details>

---

### At a glance

| Capability                  | A · Majlis | B · Diwan Grid | C · Khazana |
| --------------------------- | :--------: | :------------: | :---------: |
| Search                      | ✅         | ✅             | ✅          |
| Poet/category filter        | chips      | chips + sort   | search only |
| Time grouping               | —          | sort           | ✅ sections |
| Pinned / favourites         | —          | featured tile  | ✅ strip    |
| Multi-select & bulk actions | —          | ✅             | —           |
| Reading-flow preserved      | modal      | modal          | ✅ drawer   |
| Implementation cost         | 🟢 low     | 🟠 high        | 🟡 medium   |
| Mobile fit                  | 🟡 ok      | 🟠 needs reflow | 🟢 native pattern |

### Recommendation
- **If we ship one:** Option C (Khazana) as the primary, with Option B's bulk actions layered in once a user has > ~10 saved poems.
- **If we want the smallest diff:** Option A (Majlis) — it's a near drop-in replacement for the current `SavedPoemsView` and brings typography in line with the main poem view.

cc reviewers — happy to iterate on whichever direction resonates.
